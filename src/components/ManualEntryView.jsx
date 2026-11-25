import React, { useState, useEffect } from 'react';
import { REPORTS, DEF } from '../utils/constants';
import { fmtDate, uid } from '../utils/formatters';
import Parser from '../utils/parser';

export function ManualEntryView({ rep, date, liveRows, initialNote = '', onSave, onCancel, showToast }) {
  const R = REPORTS[rep];
  const [note, setNote] = useState(initialNote);

  const [secs, setSecs] = useState(() => {
    const initialSecs = {};
    const repLive = liveRows.filter(r => r.rep === rep);
    for (const sk in R.secs) {
      const own = repLive.filter(r => r.sec === sk && r.date === date);
      if (own.length) {
        initialSecs[sk] = own.map(r => ({ label: r.label, vals: r.vals.slice() }));
      } else {
        const prev = repLive.filter(r => r.date < date).map(r => r.date).sort().pop();
        const tpl = prev
          ? repLive.filter(r => r.sec === sk && r.date === prev).map(r => ({ label: r.label, vals: [] }))
          : [];
        initialSecs[sk] = tpl.length ? tpl : ((DEF[rep] || {})[sk] || []).map(l => ({ label: l, vals: [] }));
      }
    }
    return initialSecs;
  });

  const handleLabelChange = (sk, index, val) => {
    setSecs(prev => {
      const next = { ...prev };
      next[sk] = [...next[sk]];
      next[sk][index] = { ...next[sk][index], label: val };
      return next;
    });
  };

  const handleValChange = (sk, index, colIndex, val) => {
    setSecs(prev => {
      const next = { ...prev };
      next[sk] = [...next[sk]];
      const curVals = (next[sk][index].vals || []).slice();
      curVals[colIndex] = val;
      next[sk][index] = { ...next[sk][index], vals: curVals };
      return next;
    });
  };

  const handleAddRow = sk => {
    setSecs(prev => {
      const next = { ...prev };
      next[sk] = [...(next[sk] || []), { label: '', vals: [] }];
      return next;
    });
  };

  const handleRemoveRow = (sk, index) => {
    setSecs(prev => {
      const next = { ...prev };
      next[sk] = next[sk].filter((_, i) => i !== index);
      return next;
    });
  };

  let filledCount = 0;
  for (const sk in secs) {
    (secs[sk] || []).forEach(r => {
      if (r.label.trim() && (r.vals || []).some(v => (v || '').trim() !== '')) {
        filledCount++;
      }
    });
  }

  const handleSave = () => {
    const out = [];
    for (const [sk, S] of Object.entries(R.secs)) {
      for (const r of secs[sk] || []) {
        const label = (r.label || '').trim();
        const vals = S.cols.map((c, j) => {
          let v = ((r.vals && r.vals[j]) || '').trim();
          if (c[1] === 'n') v = v.replace(/,/g, '.');
          return v;
        });
        if (!label || vals.every(v => v === '')) continue;
        for (let j = 0; j < vals.length; j++) {
          if (S.cols[j][1] === 'n' && vals[j] !== '' && !Parser.isNum(vals[j])) {
            if (showToast) showToast(label + ' · ' + S.cols[j][0] + ' must be a number', true);
            return;
          }
        }
        out.push({ id: uid(), rep, sec: sk, date, label, vals });
      }
    }
    if (!out.length && !note.trim()) {
      if (showToast) showToast('Enter at least one value or note', true);
      return;
    }
    onSave(out, note);
  };

  return (
    <div>
      <div className="ehead">
        <b>{R.name}</b>
        <span>Manual entry for {fmtDate(date)} · change the date from the top bar</span>
      </div>

      {Object.entries(R.secs).map(([sk, S]) => {
        const rows = secs[sk] || [];
        const one = S.cols.length === 1;
        return (
          <section key={sk} className="esec">
            <div className="esh">
              <h2>{S.t}</h2>
              <span className="ecnt">{rows.length}</span>
              <button className="btn sm" onClick={() => handleAddRow(sk)}>
                + Add row
              </button>
            </div>
            {rows.length ? (
              rows.map((r, i) => (
                <div key={i} className={`er${one ? ' one' : ''}`}>
                  <input
                    className="el"
                    placeholder="Material / name"
                    value={r.label}
                    onChange={e => handleLabelChange(sk, i, e.target.value)}
                  />
                  <button className="ex" title="Remove row" onClick={() => handleRemoveRow(sk, i)}>
                    ✕
                  </button>
                  <div className="efs">
                    {S.cols.map((c, j) => (
                      <label key={j} className="ef">
                        <span>{c[0]}</span>
                        <input
                          className="ev"
                          inputMode={c[1] === 'n' ? 'decimal' : undefined}
                          placeholder={one ? c[0] : c[1] === 'n' ? '0' : ''}
                          value={(r.vals && r.vals[j]) || ''}
                          onChange={e => handleValChange(sk, i, j, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="eempty">No rows yet. Click “+ Add row”.</div>
            )}
          </section>
        );
      })}

      <section className="esec">
        <div className="esh">
          <h2>Note / Remarks</h2>
        </div>
        <div style={{ padding: '4px 0' }}>
          <textarea
            style={{
              width: '100%',
              minHeight: '70px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            placeholder="Enter note or remark for this date..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>
      </section>

      <div className="efoot">
        <span>{filledCount} rows filled</span>
        <div>
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
