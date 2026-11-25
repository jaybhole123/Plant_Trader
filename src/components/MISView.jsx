import React, { useState, useEffect, useRef } from 'react';
import { REPORTS, MET, MK, PCOL } from '../utils/constants';
import { fmtDate, fnum, dayN, daysOf, shift, gpct, saveBlob } from '../utils/formatters';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

Chart.register(...registerables);

export function MISView({ rows, showToast }) {
  const [plant, setPlant] = useState('all');
  const [preset, setPreset] = useState('monthly');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [modalData, setModalData] = useState(null);

  const chartRefs = useRef({});
  const chartInstances = useRef({});

  const numv = v => {
    const x = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
    return isFinite(x) ? x : 0;
  };

  const secSum = (rs, sec, ci) => {
    const a = rs.filter(r => r.sec === sec),
      b = a.filter(r => !/^\s*total/i.test(r.label));
    return (b.length ? b : a).reduce((s, r) => s + numv(r.vals[ci]), 0);
  };

  const misData = () => {
    const by = {},
      out = {};
    rows.forEach(r => {
      if (r.draft || !MET[r.rep]) return;
      by[r.rep] = by[r.rep] || {};
      (by[r.rep][r.date] = by[r.rep][r.date] || []).push(r);
    });
    for (const rep in by) {
      out[rep] = {};
      for (const d in by[rep]) {
        const rs = by[rep][d],
          m = MET[rep],
          g = x => (x ? secSum(rs, x[0], x[1]) : 0);
        out[rep][d] = {
          p: g(m.p),
          i: g(m.i),
          o: g(m.o),
          d: (m.d || []).reduce((s, x) => s + g(x), 0)
        };
      }
    }
    return out;
  };

  const misTot = (D, reps, a, b) => {
    const o = {};
    reps.forEach(r => {
      const t = { p: 0, i: 0, o: 0, d: 0, n: 0 };
      let ld = '';
      for (const d in D[r] || {}) {
        if (d >= a && d <= b) {
          const x = D[r][d];
          t.p += x.p;
          t.i += x.i;
          t.o += x.o;
          t.n++;
          if (d >= ld) {
            ld = d;
            t.d = x.d;
          }
        }
      }
      o[r] = t;
    });
    return o;
  };

  const sumT = T =>
    Object.values(T).reduce(
      (s, t) => ({ p: s.p + t.p, i: s.i + t.i, o: s.o + t.o, d: s.d + t.d, n: s.n + t.n }),
      { p: 0, i: 0, o: 0, d: 0, n: 0 }
    );

  const gtxt = (g, bad) => {
    const cls = g == null ? 'na' : (g >= 0) !== !!bad ? 'up' : 'dn';
    return (
      <i className={`gr ${cls}`}>
        {g == null
          ? 'vs previous: no data'
          : (g >= 0 ? '▲ ' : '▼ ') + Math.abs(g).toFixed(1) + '% vs previous'}
      </i>
    );
  };

  const D = misData();
  const allDates = [...new Set(Object.values(D).flatMap(x => Object.keys(x)))].sort();

  if (!allDates.length) {
    return (
      <div className="gap">
        <b>No saved data yet.</b> Upload a PDF or add a manual entry on any plant page and click Save. This dashboard
        reads only saved records.
      </div>
    );
  }

  const N = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, yearly: 365 };
  const anchor = allDates[allDates.length - 1];
  let curFrom,
    curTo = anchor;

  if (preset === 'custom' && from && to) {
    curFrom = from;
    curTo = to;
    if (curFrom > curTo) {
      curFrom = to;
      curTo = from;
    }
  } else if (preset === 'fy') {
    const y = +anchor.slice(0, 4),
      m = +anchor.slice(5, 7);
    curFrom = (m >= 4 ? y : y - 1) + '-04-01';
  } else {
    curFrom = shift(curTo, -((N[preset] || 30) - 1));
  }

  const span = dayN(curFrom, curTo),
    pto = shift(curFrom, -1),
    pfrom = shift(curFrom, -span);
  const reps = plant === 'all' ? Object.keys(REPORTS) : [plant],
    names = reps.map(r => REPORTS[r].name);
  const C = misTot(D, reps, curFrom, curTo),
    P = misTot(D, reps, pfrom, pto),
    tc = sumT(C),
    tp = sumT(P);

  const bk = d =>
    span <= 31 ? d : span <= 92 ? shift(d, -((new Date(d).getUTCDay() + 6) % 7)) : d.slice(0, 7);
  const bl = l =>
    l.length === 10 ? +l.slice(8) + ' ' + (['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+l.slice(5, 7) - 1]) : (['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+l.slice(5, 7) - 1]) + ' ' + l.slice(0, 4);

  const labs = [...new Set(daysOf(curFrom, curTo).map(bk))];
  const ser = (rs, k) =>
    labs.map(l =>
      rs.reduce(
        (s, r) =>
          s +
          Object.entries(D[r] || {}).reduce(
            (q, [d, x]) => q + (d >= curFrom && d <= curTo && bk(d) === l ? x[k] : 0),
            0
          ),
        0
      )
    );

  const order = reps.slice().sort((a, b) => C[b].p - C[a].p),
    withP = order.filter(r => C[r].p > 0);
  const best = withP[0],
    worst = withP.length > 1 ? withP[withP.length - 1] : null;

  const ctx = {
    from: curFrom,
    to: curTo,
    sumHead: ['Plant', 'Production (MT)', 'Share %', 'Incoming (MT)', 'Outgoing (MT)', 'Pending (MT)', 'Production vs previous %'],
    sumBody: order.map(r => [
      REPORTS[r].name,
      fnum(C[r].p),
      tc.p ? ((C[r].p / tc.p) * 100).toFixed(1) : '0.0',
      fnum(C[r].i),
      fnum(C[r].o),
      fnum(C[r].d),
      gpct(C[r].p, P[r].p) == null ? '-' : gpct(C[r].p, P[r].p).toFixed(1)
    ]),
    dayHead: ['Date', 'Plant', 'Production (MT)', 'Incoming (MT)', 'Outgoing (MT)', 'Pending (MT)'],
    dayBody: reps.flatMap(r =>
      Object.keys(D[r] || {})
        .filter(d => d >= curFrom && d <= curTo)
        .sort()
        .map(d => [
          fmtDate(d),
          REPORTS[r].name,
          fnum(D[r][d].p),
          fnum(D[r][d].i),
          fnum(D[r][d].o),
          fnum(D[r][d].d)
        ])
    ),
    by: reps.map(r => ({ r, n: REPORTS[r].name, c: C[r], p: P[r] }))
  };

  const drillK = k => {
    const m = MK.find(x => x[0] === k);
    setModalData({
      title: m[1] + ' by plant',
      headers: ['Plant', 'Current (MT)', 'Previous (MT)', 'Change'],
      rows: ctx.by.map(x => [
        x.n,
        fnum(x.c[k]),
        fnum(x.p[k]),
        gtxt(gpct(x.c[k], x.p[k]), k === 'd')
      ])
    });
  };

  const drillP = r => {
    const n = REPORTS[r].name,
      dayRows = ctx.dayBody.filter(x => x[1] === n);
    setModalData({
      title: n + ' · daily detail',
      headers: ['Date', 'Production', 'Incoming', 'Outgoing', 'Pending'],
      rows: dayRows.map(x => [x[0], x[2], x[3], x[4], x[5]])
    });
  };

  const handleExportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    [
      ['Plant Summary', ctx.sumHead, ctx.sumBody],
      ['Daily Detail', ctx.dayHead, ctx.dayBody]
    ].forEach(s => {
      const ws = wb.addWorksheet(s[0]);
      ws.addRow(s[1]).font = { bold: true };
      s[2].forEach(r => ws.addRow(r));
      ws.columns.forEach(col => (col.width = 22));
    });
    saveBlob(
      new Blob([await wb.xlsx.writeBuffer()], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      'MIS_' + ctx.from + '_to_' + ctx.to + '.xlsx'
    );
    if (showToast) showToast('Downloading Excel');
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Plant-Wise MIS Report: ' + fmtDate(ctx.from) + ' to ' + fmtDate(ctx.to), 14, 14);
    autoTable(doc, {
      head: [ctx.sumHead],
      body: ctx.sumBody,
      startY: 20,
      headStyles: { fillColor: [31, 73, 125] }
    });
    autoTable(doc, {
      head: [ctx.dayHead],
      body: ctx.dayBody,
      startY: doc.lastAutoTable.finalY + 8,
      headStyles: { fillColor: [31, 73, 125] }
    });
    saveBlob(doc.output('blob'), 'MIS_' + ctx.from + '_to_' + ctx.to + '.pdf');
    if (showToast) showToast('Downloading PDF');
  };

  useEffect(() => {
    Object.values(chartInstances.current).forEach(c => c && c.destroy());
    chartInstances.current = {};

    const base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    };
    const click = {
      onClick: (e, els) => {
        if (els.length) drillP(reps[els[0].index]);
      }
    };
    const cols = reps.map(r => PCOL[Object.keys(REPORTS).indexOf(r) % 6]);

    if (chartRefs.current.c1) {
      chartInstances.current.c1 = new Chart(chartRefs.current.c1, {
        type: 'doughnut',
        data: {
          labels: names,
          datasets: [{ data: reps.map(r => C[r].p), backgroundColor: cols, borderColor: '#fff', borderWidth: 3 }]
        },
        options: Object.assign({}, base, click, { cutout: '62%' })
      });
    }

    if (chartRefs.current.c2) {
      chartInstances.current.c2 = new Chart(chartRefs.current.c2, {
        type: 'bar',
        data: {
          labels: names,
          datasets: [{ label: 'Production (MT)', data: reps.map(r => C[r].p), backgroundColor: cols }]
        },
        options: Object.assign({}, base, click, { plugins: { legend: { display: false } } })
      });
    }

    if (chartRefs.current.c3) {
      chartInstances.current.c3 = new Chart(chartRefs.current.c3, {
        type: 'line',
        data: {
          labels: labs.map(bl),
          datasets: [
            ['p', 'Production', '#1f6fd1'],
            ['i', 'Incoming', '#e8871e'],
            ['o', 'Outgoing', '#16794a']
          ].map(m => ({
            label: m[1],
            data: ser(reps, m[0]),
            borderColor: m[2],
            backgroundColor: m[2],
            tension: 0.3,
            pointRadius: 2
          }))
        },
        options: base
      });
    }

    if (chartRefs.current.c4) {
      chartInstances.current.c4 = new Chart(chartRefs.current.c4, {
        type: 'bar',
        data: {
          labels: names,
          datasets: [
            { label: 'Incoming', data: reps.map(r => C[r].i), backgroundColor: '#e8871e' },
            { label: 'Outgoing', data: reps.map(r => C[r].o), backgroundColor: '#16794a' }
          ]
        },
        options: Object.assign({}, base, click, {
          scales: { x: { stacked: true }, y: { stacked: true } }
        })
      });
    }

    if (chartRefs.current.c5) {
      chartInstances.current.c5 = new Chart(chartRefs.current.c5, {
        type: 'line',
        data: {
          labels: labs.map(bl),
          datasets: reps.map((r, i) => ({
            label: names[i],
            data: ser([r], 'p'),
            fill: true,
            borderColor: cols[i],
            backgroundColor: cols[i] + '88',
            tension: 0.3,
            pointRadius: 0
          }))
        },
        options: Object.assign({}, base, { scales: { y: { stacked: true } } })
      });
    }

    if (chartRefs.current.c6) {
      chartInstances.current.c6 = new Chart(chartRefs.current.c6, {
        type: 'bar',
        data: {
          labels: names,
          datasets: [
            { label: 'Previous period', data: reps.map(r => P[r].p), backgroundColor: '#b6c2cd' },
            { label: 'Current period', data: reps.map(r => C[r].p), backgroundColor: '#1f6fd1' }
          ]
        },
        options: Object.assign({}, base, click)
      });
    }

    return () => {
      Object.values(chartInstances.current).forEach(c => c && c.destroy());
    };
  }, [curFrom, curTo, plant, reps.length]);

  return (
    <div>
      <div className="mf">
        <label>
          Plant
          <select value={plant} onChange={e => setPlant(e.target.value)}>
            <option value="all">All plants</option>
            {Object.keys(REPORTS).map(r => (
              <option key={r} value={r}>
                {REPORTS[r].name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Period
          <select
            value={preset}
            onChange={e => {
              const val = e.target.value;
              setPreset(val);
              if (val === 'custom') {
                setFrom(curFrom);
                setTo(curTo);
              }
            }}
          >
            <option value="daily">Daily (latest day)</option>
            <option value="weekly">Weekly (7 days)</option>
            <option value="monthly">Monthly (30 days)</option>
            <option value="quarterly">Quarterly (90 days)</option>
            <option value="yearly">Yearly (365 days)</option>
            <option value="fy">Financial year (Apr-Mar)</option>
            <option value="custom">Custom range</option>
          </select>
        </label>

        {preset === 'custom' && (
          <>
            <label>
              From
              <input type="date" value={from || curFrom} onChange={e => setFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="date" value={to || curTo} onChange={e => setTo(e.target.value)} />
            </label>
          </>
        )}

        <div className="sp">
          <button className="btn" onClick={handleExportPdf}>
            Export PDF
          </button>
          <button className="btn primary" onClick={handleExportXlsx}>
            Export Excel
          </button>
        </div>
      </div>

      <div className="hero">
        <div className="hl">Plant-wise MIS performance</div>
        <div className="ht">
          {fmtDate(curFrom)} to {fmtDate(curTo)}
        </div>
        <p>
          ({span} days; compared with {fmtDate(pfrom)} to {fmtDate(pto)}).{' '}
          {best ? (
            <>
              Highest production: <b>{REPORTS[best].name}</b> ({fnum(C[best].p)} MT
              {tc.p ? ', ' + ((C[best].p / tc.p) * 100).toFixed(1) + '% share' : ''}).
            </>
          ) : (
            'No production recorded in this period.'
          )}{' '}
          {worst ? (
            <>
              Lowest: <b>{REPORTS[worst].name}</b> ({fnum(C[worst].p)} MT).
            </>
          ) : (
            ''
          )}{' '}
          Total outgoing {fnum(tc.o)} MT against incoming {fnum(tc.i)} MT.
        </p>
      </div>

      <div className="kpis" style={{ '--n': 5, gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))' }}>
        {MK.map(m => (
          <div
            key={m[0]}
            className="kpi mk4"
            style={{ '--c': m[2], cursor: 'pointer' }}
            onClick={() => drillK(m[0])}
          >
            <span>{m[1]}</span>
            <b>
              {fnum(tc[m[0]])}
              <small>MT</small>
            </b>
            {gtxt(gpct(tc[m[0]], tp[m[0]]), m[0] === 'd')}
          </div>
        ))}
        <div className="kpi">
          <span>Reports saved</span>
          <b>{tc.n}</b>
          <i className="gr na">plant-days in range</i>
        </div>
      </div>

      <div className="gap">
        <b>Financial metrics not available.</b> Revenue, Expenses, Net Profit / Loss and Profit Margin cannot be
        calculated: the saved records hold quantities (MT) only, with no rates, amounts or cost heads, so nothing is
        shown instead of guessing. To enable them, the data needed is: sale rate and purchase rate per material, and
        plant-wise cost entries (raw material, power, labour, other). Tell me which of these you can capture and I will
        add the entry fields and the calculations.
      </div>

      <div className="mc" style={{ marginBottom: '14px' }}>
        <h3>Plant-wise ranking (click a plant for daily detail)</h3>
        <div className="ovf">
          <table className="mt k">
            <thead>
              <tr>
                <th>Plant</th>
                <th>Production (MT)</th>
                <th>Share</th>
                <th>Incoming</th>
                <th>Outgoing</th>
                <th>Pending</th>
                <th>vs previous</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {order.map((r, i) => (
                <tr key={r} onClick={() => drillP(r)} style={{ cursor: 'pointer' }}>
                  <td>
                    {i + 1}. {REPORTS[r].name}
                  </td>
                  <td>{fnum(C[r].p)}</td>
                  <td>{tc.p ? ((C[r].p / tc.p) * 100).toFixed(1) + '%' : '-'}</td>
                  <td>{fnum(C[r].i)}</td>
                  <td>{fnum(C[r].o)}</td>
                  <td>{fnum(C[r].d)}</td>
                  <td>{gtxt(gpct(C[r].p, P[r].p))}</td>
                  <td>
                    {C[r].n ? (
                      r === best ? (
                        <span className="tag hi">Top</span>
                      ) : r === worst ? (
                        <span className="tag lo">Lowest</span>
                      ) : (
                        <span className="tag">Active</span>
                      )
                    ) : (
                      <span className="tag">No data</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mg">
        {[
          ['c1', 'Production share by plant'],
          ['c2', 'Plant-wise production (MT)'],
          ['c3', 'Production, incoming and outgoing trend'],
          ['c4', 'Incoming vs outgoing by plant'],
          ['c5', 'Production trend by plant (area)'],
          ['c6', 'Current vs previous period production']
        ].map(x => (
          <div key={x[0]} className="mc">
            <h3>{x[1]}</h3>
            <div className="cv">
              <canvas ref={el => (chartRefs.current[x[0]] = el)} />
            </div>
          </div>
        ))}
      </div>

      <div className="msum" style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '14px' }}>
        Basis per plant (from saved sections): Nandan and Hindustan Sponge: production total, incoming, outgoing,
        pending sauda sale and purchase. Dhaatu Sponge: same. Dhaatu Billet: production, yesterday incoming, outgoing,
        pending. Wire Rod: production and dispatch from Billets and Wire Rod Stock. Hindustan Billet: production and
        dispatch from Billets Stock. Rows labelled TOTAL are not double counted.
      </div>

      {modalData && (
        <div className="modal on" onMouseDown={e => e.target.classList.contains('modal') && setModalData(null)}>
          <div className="box">
            <h3>{modalData.title}</h3>
            <div className="ovf" style={{ padding: '16px 24px' }}>
              <table className="mt">
                <thead>
                  <tr>
                    {modalData.headers.map((h, i) => (
                      <th key={i}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modalData.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((col, j) => (
                        <td key={j}>{col}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="actions" style={{ padding: '0 24px 20px', marginTop: '6px' }}>
              <button className="btn" onClick={() => setModalData(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
