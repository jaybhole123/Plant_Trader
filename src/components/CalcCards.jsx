import React from 'react';
import { cTot, cSum, cNum, cFmt } from '../utils/formatters';

export function CalcCards({ rep, visible, all }) {
  if (all) return null;
  // visible can be called with (sec) directly
  const g = sec => (typeof visible === 'function' ? visible(sec) : []);
  const sub = (a, b) => (a == null || b == null ? null : a - b);
  let K = [];

  if (rep === 'nandan') {
    const inc = cTot(g('incoming'), 0),
      out = cTot(g('outgoing'), 0),
      pr = g('production');
    const pt = pr.filter(r => /^TOTAL$/i.test(r.label.trim())),
      pn = pr.filter(r => !/\bTOTAL\b/i.test(r.label));
    const prod = pr.length ? (pt.length ? cSum(pt, 2) : cSum(pn, 2)) : null;
    const net = sub(inc, out);
    K = [
      { t: 'Closing Stock', v: cTot(g('stock'), 0), u: 'MT' },
      { t: 'Incoming', v: inc, u: 'MT', c: 'in' },
      { t: 'Outgoing', v: out, u: 'MT', c: 'out' },
      { t: 'Net Movement', v: net, u: 'MT', s: 'Incoming − Outgoing', c: net == null ? '' : net >= 0 ? 'in' : 'out' },
      { t: 'Production (24 hr)', v: prod, u: 'MT', s: pr.length ? 'Kiln 1: ' + cFmt(cSum(pn, 0)) + ' · Kiln 2: ' + cFmt(cSum(pn, 1)) : '' },
      { t: 'Pending Sale', v: cTot(g('pending_sale'), 0), u: 'MT' },
      { t: 'Pending Purchase', v: cTot(g('pending_purchase'), 0), u: 'MT' }
    ];
  } else if (rep === 'sponge') {
    const inc = cTot(g('incoming'), 0),
      out = cTot(g('outgoing'), 0),
      pr = g('production');
    const pt = pr.filter(r => /^TOTAL$/i.test(r.label.trim())),
      pn = pr.filter(r => !/\bTOTAL\b/i.test(r.label));
    const prod = pr.length ? (pt.length ? cSum(pt, 2) : cSum(pn, 2)) : null;
    const ga = pn.filter(r => /^A\s*GRADE/i.test(r.label)),
      gb = pn.filter(r => /^B\s*GRADE/i.test(r.label));
    const stk = re => {
      const r = g('stock').find(x => re.test(x.label));
      return r ? cNum(r.vals[0]) : null;
    };
    const net = sub(inc, out);
    K = [
      { t: 'Sponge Stock', v: stk(/^TOTAL SPONGE/i), u: 'MT' },
      { t: 'Lloyd Iron Stock', v: stk(/^TOTAL LLOYD/i), u: 'MT' },
      { t: 'Iron Ore Pellet Stock', v: stk(/^TOTAL IRON ORE PELLET/i), u: 'MT' },
      { t: 'Incoming', v: inc, u: 'MT', c: 'in' },
      { t: 'Outgoing', v: out, u: 'MT', c: 'out' },
      { t: 'Net Movement', v: net, u: 'MT', s: 'Incoming − Outgoing', c: net == null ? '' : net >= 0 ? 'in' : 'out' },
      { t: 'Production (24 hr)', v: prod, u: 'MT', s: pr.length ? 'A Grade: ' + cFmt(cSum(ga, 2)) + ' · B Grade: ' + cFmt(cSum(gb, 2)) : '' },
      { t: 'Pending Sale', v: cTot(g('pending_sale'), 0), u: 'MT' },
      { t: 'Pending Purchase', v: cTot(g('pending_purchase'), 0), u: 'MT' }
    ];
  } else if (rep === 'dhaatu') {
    const inc = cTot(g('incoming'), 0),
      out = cTot(g('outgoing'), 0),
      pr = g('production'),
      st = g('stock');
    const pt = pr.filter(r => /^TOTAL$/i.test(r.label.trim())),
      pn = pr.filter(r => !/\bTOTAL\b/i.test(r.label));
    const prod = pr.length ? (pt.length ? cSum(pt, 0) : cSum(pn, 0)) : null;
    const ga = pn.filter(r => /^A\s*GRADE/i.test(r.label)),
      gb = pn.filter(r => /^B\s*GRADE/i.test(r.label));
    const net = sub(inc, out);
    K = [
      { t: 'Sponge Iron Stock', v: st.length ? cSum(st.filter(r => /SPONGE IRON/i.test(r.label)), 0) : null, u: 'MT' },
      { t: 'Incoming', v: inc, u: 'MT', c: 'in' },
      { t: 'Outgoing', v: out, u: 'MT', c: 'out' },
      { t: 'Net Movement', v: net, u: 'MT', s: 'Incoming − Outgoing', c: net == null ? '' : net >= 0 ? 'in' : 'out' },
      { t: 'Production (24 hr)', v: prod, u: 'MT', s: pr.length ? 'A Grade: ' + cFmt(cSum(ga, 0)) + ' · B Grade: ' + cFmt(cSum(gb, 0)) : '' },
      { t: 'Pending Sale', v: cTot(g('pending_sale'), 0), u: 'MT' },
      { t: 'Pending Purchase', v: cTot(g('pending_purchase'), 0), u: 'MT' }
    ];
  } else if (rep === 'wire') {
    const sm = re => {
      const r = g('summary').find(x => re.test(x.label));
      return r ? cNum(r.vals[0]) : null;
    };
    const pd = re => {
      const r = g('production').find(x => re.test(x.label));
      return r ? cNum(r.vals[0]) : null;
    };
    const cl = re => {
      const r = g('stock').find(x => re.test(x.label));
      return r ? cNum(r.vals[5]) : null;
    };
    K = [
      { t: 'Liquid Production', v: sm(/^TOTAL PRODUCTION \(LIQUID\)/i), u: 'MT' },
      { t: 'Total Consumption', v: sm(/^TOTAL CONSUMPTION/i), u: 'MT' },
      { t: 'Finish Material (Solid)', v: sm(/FINISH MATERIA/i), u: 'MT' },
      { t: 'Wire Rod Production', v: pd(/^WIRE ROD/i), u: 'MT', c: 'in' },
      { t: 'Billet Production', v: pd(/^BILLET/i), u: 'MT' },
      { t: 'Wire Rod Closing', v: cl(/^WIRE ROD/i), u: 'MT' },
      { t: 'Billets Closing', v: cl(/^BILLETS/i), u: 'MT' },
      { t: 'Burning Loss + Slag', v: sm(/^BURNING LOSS/i), u: 'MT', c: 'out' }
    ];
  } else if (rep === 'dbillet') {
    const sm = re => {
      const r = g('summary').find(x => re.test(x.label));
      return r ? cNum(r.vals[0]) : null;
    };
    const pr = g('production'),
      gp = re => {
        const r = pr.find(x => re.test(x.label));
        return r ? cNum(r.vals[0]) : 0;
      };
    K = [
      { t: 'Billets Stock', v: cTot(g('stock'), 0), u: 'MT' },
      { t: 'Billets Incoming', v: cTot(g('incoming'), 0), u: 'MT', c: 'in' },
      { t: 'Total Metal', v: sm(/^TOTAL METAL/i), u: 'MT' },
      { t: 'Structure Stock', v: sm(/^TOTAL STRUCTURE STOCK/i), u: 'MT', s: 'Light + Heavy' },
      { t: 'Total Sales', v: sm(/^TOTAL SALES/i), u: 'MT', c: 'out' },
      { t: 'Yest. Billet Incoming', v: cTot(g('yincoming'), 0), u: 'MT', c: 'in' },
      { t: 'Yest. Outgoing', v: cTot(g('outgoing'), 0), u: 'MT', c: 'out' },
      {
        t: 'Structure Prod. (24 hr)',
        v: cTot(pr, 0),
        u: 'MT',
        s: pr.length ? 'Light: ' + cFmt(gp(/GOOD QUALITY \(LIGHT/i)) + ' · Heavy: ' + cFmt(gp(/GOOD QUALITY \(HEAVY/i)) : ''
      }
    ];
  } else {
    const sm = re => {
      const r = g('summary').find(x => re.test(x.label));
      return r ? cNum(r.vals[0]) : null;
    };
    const bp = cTot(g('billets'), 1),
      cm = cTot(g('charge'), 4);
    K = [
      { t: 'Raw Material Consumed', v: cTot(g('raw'), 6) },
      { t: 'Charge Mix Consumed', v: cm },
      { t: 'Liquid Production', v: sm(/^TOTAL PRODUCTION \(LIQUID\)/i) },
      { t: 'Billet Production', v: bp },
      { t: 'Billet Dispatch', v: cTot(g('billets'), 3) },
      { t: 'Billet Closing Stock', v: cTot(g('billets'), 4) },
      { t: 'Finish Material (Solid)', v: sm(/FINISH MATERIAL/i) },
      { t: 'Yield %', v: bp != null && cm ? (bp / cm) * 100 : null, u: '%', s: 'Billet production ÷ Charge mix consumed' }
    ];
  }

  return (
    <div className="kpis" style={{ '--n': K.length }}>
      {K.map((c, i) => (
        <div key={i} className={`kpi ${c.c || ''}`}>
          <span>{c.t}</span>
          <b>
            {c.v == null ? '—' : cFmt(c.v)}
            {c.u && c.v != null ? <small>{c.u}</small> : null}
          </b>
          {c.s ? <em>{c.s}</em> : null}
        </div>
      ))}
    </div>
  );
}
