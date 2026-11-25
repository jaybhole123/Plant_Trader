import React, { useState, useEffect } from 'react';
import { REPORTS } from '../utils/constants';
import Parser from '../utils/parser';

export function EditRowModal({ isOpen, row, onClose, onSave, showToast }) {
  const [rep, setRep] = useState('nandan');
  const [sec, setSec] = useState('stock');
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [vals, setVals] = useState([]);

  useEffect(() => {
    if (row) {
      setRep(row.rep);
      setSec(row.sec);
      setDate(row.date);
      setLabel(row.label || '');
      setVals((row.vals || []).slice());
    }
  }, [row]);

  if (!isOpen || !row) return null;

  const R = REPORTS[rep];
  const S = R && R.secs[sec] ? R.secs[sec] : { cols: [], t: '' };

  const handleValChange = (index, value) => {
    setVals(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSave = () => {
    if (!date) {
      if (showToast) showToast('Choose a date', true);
      return;
    }
    if (!label.trim()) {
      if (showToast) showToast('Enter the material name', true);
      return;
    }
    const cleanVals = S.cols.map((c, i) => {
      let v = (vals[i] || '').trim();
      if (c[1] === 'n') v = v.replace(/,/g, '.');
      return v;
    });
    for (let i = 0; i < cleanVals.length; i++) {
      if (S.cols[i][1] === 'n' && cleanVals[i] !== '' && !Parser.isNum(cleanVals[i])) {
        if (showToast) showToast(S.cols[i][0] + ' must be a number', true);
        return;
      }
    }
    if (cleanVals.every(v => v === '')) {
      if (showToast) showToast('Enter at least one value', true);
      return;
    }
    onSave({
      id: row.id,
      rep,
      sec,
      date,
      label: label.trim(),
      vals: cleanVals
    });
  };

  return (
    <div className="modal on" onMouseDown={e => e.target.classList.contains('modal') && onClose()}>
      <div className="box">
        <h3>Edit row · {S.t}</h3>
        <div className="form">
          <div className="grid">
            <label>
              Date
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <label className="wide">
              Material / Name
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. SPONGE IRON" />
            </label>
            {S.cols.map((c, i) => (
              <label key={i}>
                {c[0]}
                <input
                  inputMode={c[1] === 'n' ? 'decimal' : undefined}
                  value={vals[i] || ''}
                  onChange={e => handleValChange(i, e.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="actions">
            <button className="btn primary" onClick={handleSave}>
              Update
            </button>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
