import React from 'react';
import { fmtDate, shift, isoOf } from '../utils/formatters';

export function Header({ title, date, onDateChange, all, onBurgerClick, showDatebar }) {
  return (
    <header className="top">
      <button className="burger" id="burger" aria-label="Open menu" onClick={onBurgerClick}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 id="ttl">{title}</h1>
      {showDatebar && (
        <div className={`datebar ${all ? 'off' : ''}`} id="datebar">
          <button className="ib" title="Previous day" onClick={() => onDateChange(shift(date, -1))}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <label className="dpick">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 11h18" />
            </svg>
            <span>{fmtDate(date)}</span>
            <input
              type="date"
              aria-label="Choose date"
              value={date}
              onChange={e => e.target.value && onDateChange(e.target.value)}
              onClick={e => {
                try {
                  if (e.target.showPicker) e.target.showPicker();
                } catch (x) {}
              }}
            />
          </label>
          <button className="ib" title="Next day" onClick={() => onDateChange(shift(date, 1))}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <span className="vr" />
          <button className="today" onClick={() => onDateChange(isoOf(new Date()))}>
            Today
          </button>
        </div>
      )}
    </header>
  );
}
