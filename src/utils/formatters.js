import { MONTHS, REPORTS } from './constants';

export const pad = n => String(n).padStart(2, '0');

export const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

export const fmtDate = s => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : '—';
};

export const fmtDMY = s => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? m[3] + '-' + m[2] + '-' + m[1] : '';
};

export const fmtHD = d => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? m[3] + '-' + MONTHS[+m[2] - 1] + '-' + m[1] : d;
};

export const shift = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  return isoOf(new Date(y, m - 1, d + n));
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const clean = s => String(s == null ? '' : s).replace(/[–—]/g, '-');

export const isNum = s => /^-?\d+(?:\.\d+)?$/.test(String(s == null ? '' : s).trim());

export const numv = v => {
  const x = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return isFinite(x) ? x : 0;
};

export const cNum = numv;

export const cFmt = n => (n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }));

export const fnum = n => (Math.round((n || 0) * 100) / 100).toLocaleString('en-IN');

export const cSum = (rows, i) => rows.reduce((a, r) => a + cNum(r.vals[i]), 0);

export const cTot = (rows, i) => {
  if (!rows.length) return null;
  const t = rows.filter(r => /^TOTAL\b/i.test(r.label));
  return cSum(t.length ? t : rows, i);
};

export const fname = (rep, ext, d) => (REPORTS[rep] ? REPORTS[rep].name.replace(/\s+/g, '_') : rep) + '_' + (d || '') + '.' + ext;

export const nz = v => isNum(v) && parseFloat(v) !== 0;

export const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export const dayN = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1;

export const daysOf = (a, b) => {
  const o = [];
  for (let d = a; d <= b; d = shift(d, 1)) o.push(d);
  return o;
};

export const gpct = (c, p) => (p ? ((c - p) / p) * 100 : null);

export const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 60000); // 60s safe timeout for browser download completion
};
