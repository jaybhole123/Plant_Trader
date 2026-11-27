import React, { useState } from 'react';
import { RORDER, TITLES } from '../utils/constants';
import { fmtHD } from '../utils/formatters';
import { ofKey } from '../utils/storage';

export function HistoryView({
  rep,
  rows,
  onPreview,
  onDownload,
  tab,
  setTab,
  historyCount,
  ofMeta,
  onViewOrigPdf
}) {
  const [q, setQ] = useState('');
  const [plant, setPlant] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const all = (rep ? [rep] : RORDER).flatMap(r =>
    [...new Set(rows.filter(x => !x.draft && x.rep === r).map(x => x.date))]
      .sort()
      .reverse()
      .map(d => ({ r, d }))
  );

  const cleanQ = q.trim().toLowerCase();
  const list = all.filter(x => {
    if (from && x.d < from) return false;
    if (to && x.d > to) return false;
    if (!rep && plant && x.r !== plant) return false;
    if (
      cleanQ &&
      !(
        (TITLES[x.r] || '').toLowerCase().includes(cleanQ) ||
        fmtHD(x.d).toLowerCase().includes(cleanQ) ||
        x.d.includes(cleanQ)
      )
    )
      return false;
    return true;
  });

  const handleClear = () => {
    setQ('');
    setPlant('');
    setFrom('');
    setTo('');
  };

  return (
    <div>
      {rep && (
        <div className="tabs">
          <button className={tab !== 'hist' ? 'on' : ''} onClick={() => setTab('data')}>
            Report
          </button>
          <button className={tab === 'hist' ? 'on' : ''} onClick={() => setTab('hist')}>
            History <span className="n">{historyCount}</span>
          </button>
        </div>
      )}

      <div className="mc">
        <h3>History{rep ? '' : ' · all plants'}</h3>
        <div className="hfilter">
          <label className="hf-s">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search plant or date (e.g. Nandan, 25-Nov)"
              value={q}
              onChange={e => setQ(e.target.value)}
              autoComplete="off"
            />
          </label>

          {!rep && (
            <label className="hf-pl" title="Filter by plant">
              <select value={plant} onChange={e => setPlant(e.target.value)} aria-label="Plant">
                <option value="">All plants</option>
                {RORDER.map(r => (
                  <option key={r} value={r}>
                    {TITLES[r]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="hf-p" title="From date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <input
              type="date"
              aria-label="From date"
              value={from}
              onChange={e => {
                const val = e.target.value;
                if (to && val > to) {
                  setFrom(to);
                  setTo(val);
                } else {
                  setFrom(val);
                }
              }}
              onClick={e => {
                try {
                  if (e.target.showPicker) e.target.showPicker();
                } catch (x) {}
              }}
            />
          </label>
          <span className="hf-to">to</span>
          <label className="hf-p" title="To date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <input
              type="date"
              aria-label="To date"
              value={to}
              onChange={e => {
                const val = e.target.value;
                if (from && val < from) {
                  setTo(from);
                  setFrom(val);
                } else {
                  setTo(val);
                }
              }}
              onClick={e => {
                try {
                  if (e.target.showPicker) e.target.showPicker();
                } catch (x) {}
              }}
            />
          </label>
          <button className="btn sm" onClick={handleClear}>
            Clear
          </button>
        </div>

        <div className="hcnt">
          {all.length ? 'Showing ' + list.length + ' of ' + all.length + ' reports' : ''}
        </div>

        <div>
          {!all.length ? (
            <p style={{ color: 'var(--muted)', margin: 0 }}>No saved reports yet. Upload a PDF and click Save.</p>
          ) : !list.length ? (
            <p style={{ color: 'var(--muted)', margin: 0 }}>No reports match this filter.</p>
          ) : (
            <div className="ovf">
              <table className="mt h">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Plant</th>
                    <th>Date</th>
                    <th>Preview</th>
                    <th>Download</th>
                    <th>Original PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x, i) => {
                    const k = ofKey(x.r, x.d);
                    const hasOrig = !!(ofMeta && ofMeta[k]);
                    return (
                      <tr key={`${x.r}|${x.d}`}>
                        <td>{i + 1}</td>
                        <td>{TITLES[x.r]}</td>
                        <td>{fmtHD(x.d)}</td>
                        <td>
                          <button className="btn sm" onClick={() => onPreview(x.r, x.d)}>
                            Preview
                          </button>
                        </td>
                        <td>
                          <button className="btn sm primary" onClick={() => onDownload(x.r, x.d)}>
                            Download
                          </button>
                        </td>
                        <td>
                          {hasOrig ? (
                            <button
                              className="btn sm"
                              onClick={() => onViewOrigPdf && onViewOrigPdf(k)}
                              title={ofMeta[k].name}
                            >
                              Original PDF
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
