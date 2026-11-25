import React from 'react';
import { TITLES, REPORTS } from '../utils/constants';

export const ICONS = {
  nandan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V10l6 4V10l6 4V6h6v15z" />
    </svg>
  ),
  sponge: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </svg>
  ),
  billet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l9-4 9 4-9 4zM3 8v8l9 4 9-4V8M12 12v8" />
    </svg>
  ),
  dhaatu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c1 3.2 5 5 5 10a5 5 0 01-10 0c0-2 1-3.3 2-4.2 0 1.8.8 2.7 1.8 3C10.5 8 10.8 5.5 12 3z" />
    </svg>
  ),
  dbillet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5" />
    </svg>
  ),
  wire: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </svg>
  ),
  hst: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 2" />
    </svg>
  ),
  rpt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6" />
    </svg>
  ),
  mis: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  brand: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l9-4 9 4-9 4zM3 8v8l9 4 9-4V8M12 12v8" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M12 17v-6M9.5 13.5L12 11l2.5 2.5" />
    </svg>
  ),
  fileBtn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </svg>
  ),
  manual: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
};

export function Sidebar({ page, onSelectPage, rowCounts, isOpen, onClose }) {
  const items = [
    ['mis', TITLES.mis],
    ['nandan', TITLES.nandan],
    ['sponge', TITLES.sponge],
    ['billet', TITLES.billet],
    ['dhaatu', TITLES.dhaatu],
    ['dbillet', TITLES.dbillet],
    ['wire', TITLES.wire],
    ['rpt', TITLES.rpt],
    ['hst', TITLES.hst]
  ];

  return (
    <aside className={`side ${isOpen ? 'open' : ''}`}>
      <div className="brand">
        <div className="mk">{ICONS.brand}</div>
        <div>
          <b>Plant Daily Reports</b>
          <span>Daily numbers from PDF</span>
        </div>
      </div>
      <nav className="nav" aria-label="Reports">
        {items.map(([key, title]) => {
          const isSpecial = key === 'mis' || key === 'rpt' || key === 'hst';
          const cnt = rowCounts && rowCounts[key] ? rowCounts[key] : 0;
          return (
            <button
              key={key}
              data-p={key}
              className={page === key ? 'on' : ''}
              aria-current={page === key ? 'page' : undefined}
              onClick={() => {
                onSelectPage(key);
                if (onClose) onClose();
              }}
            >
              {ICONS[key]}
              <span>{title}</span>
              {!isSpecial && <span className="n">{cnt}</span>}
            </button>
          );
        })}
      </nav>
      <p className="sfoot">Saved in this browser only. Download Excel or PDF to keep a copy elsewhere.</p>
    </aside>
  );
}
