import { clean, fmtDMY, nz, hexRGB, saveBlob } from './formatters';
import { REPORTS, RORDER } from './constants';
import Parser from './parser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

const DARK = '#1f497d',
  LB = '#b8cce4',
  LB2 = '#dce6f1',
  LB3 = '#c5d9f1',
  GREEN = '#99ff66',
  ORANGE = '#ffcc66';

// cell: t text, cs/rs span, bg, color, b bold, al align, fs font px, nb no border, n numeric
export const C = (t, o) => Object.assign({ t: t == null ? '' : String(t), cs: 1, rs: 1, b: 0, al: 'left' }, o || {});

export function specNandan(date, rowsOf) {
  const R = [],
    F = 12.5,
    spacer = () => R.push({ h: 6, cells: [C('', { cs: 5, fs: 2 })] });
  const head = t => R.push({ cells: [C(t, { cs: 5, bg: LB, b: 1, al: 'center' })] });
  R.push({
    h: 34,
    cells: [
      C('NANDAN SMELTERS REPORT', { cs: 4, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 20 }),
      C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 17 })
    ]
  });
  const getRows = sec => rowsOf('nandan', date, sec);
  getRows('stock').forEach((r, i) =>
    R.push({ cells: [C(i === 0 ? 'STOCK' : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] })
  );
  spacer();
  head('YESTERDAY INCOMING MATERIALS');
  getRows('incoming').forEach(r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
  spacer();
  head('YESTERDAY OUTGOING MATERIALS');
  getRows('outgoing').forEach(r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
  spacer();
  head('TOTAL PRODUCTION IN 24HR');
  R.push({ cells: ['GRADE', 'SPONGE', 'KILN 1', 'KILN 2', 'TOTAL'].map(t => C(t, { b: 1, al: 'center' })) });
  const prod = getRows('production').map(r => {
    const m = /^(.*?)\s+[–-]\s+(.*)$/.exec(r.label);
    return { g: m ? m[1] : '', name: m ? m[2] : r.label, v: r.vals };
  });
  for (let i = 0; i < prod.length; i++) {
    const p = prod[i];
    if (/^TOTAL$/i.test(p.name)) {
      R.push({ cells: [C('TOTAL', { cs: 4, b: 1, al: 'center' }), C(p.v[2], { bg: LB, b: 1, al: 'center', n: 1 })] });
      continue;
    }
    const cells = [];
    const first = i === 0 || prod[i - 1].g !== p.g || !p.g;
    if (first) {
      let k = 1;
      while (p.g && i + k < prod.length && prod[i + k].g === p.g) k++;
      cells.push(C(p.g, { rs: k, b: 1, al: 'center' }));
    }
    cells.push(C(p.name, { b: 1, al: 'center' }));
    [0, 1, 2].forEach(j => cells.push(C(p.v[j], { al: 'center', b: nz(p.v[j]), n: 1 })));
    R.push({ cells });
  }
  spacer();
  [
    ['pending_sale', 'BALANCE PENDING OUTGOING (SAUDA SALE)', 'QTY OUT', 'SALE'],
    ['pending_purchase', 'BALANCE PENDING INCOMING (SAUDA PURCHASE)', 'QTY IN', 'PURCHASE']
  ].forEach(([sec, t, q, side], si) => {
    R.push({ cells: [C(t, { cs: 4, bg: LB, b: 1, al: 'center' }), C(q, { bg: LB, b: 1, al: 'center' })] });
    getRows(sec).forEach((r, i) =>
      R.push({ cells: [C(i === 0 ? side : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] })
    );
    if (si === 0) spacer();
  });
  return { W: [173, 157, 196, 164, 150], F, rows: R };
}

export function specSponge(date, rowsOf) {
  const R = [],
    F = 12.5,
    get = sec => rowsOf('sponge', date, sec),
    spacer = () => R.push({ h: 6, cells: [C('', { cs: 5, fs: 2 })] });
  const head = t => R.push({ cells: [C(t, { cs: 5, bg: LB, b: 1, al: 'center' })] });
  const line = r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] });
  R.push({
    h: 34,
    cells: [
      C('HINDUSTAN IRON & SPONGE REPORT (SPONGE)', { cs: 4, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 20 }),
      C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 17 })
    ]
  });
  get('stock').forEach((r, i) => {
    const first = C(i === 0 ? 'STOCK' : '', { b: 1 });
    if (/^TOTAL\b/i.test(r.label))
      R.push({ cells: [first, C(r.label, { cs: 3, bg: LB2, b: 1, al: 'center' }), C(r.vals[0], { bg: LB2, b: 1, al: 'right', n: 1 })] });
    else
      R.push({ cells: [first, C(r.label, { cs: 2, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 }), C('')] });
  });
  spacer();
  head('YESTERDAY INCOMING MATERIALS');
  get('incoming').forEach(line);
  spacer();
  head('YESTERDAY OUTGOING MATERIALS');
  get('outgoing').forEach(line);
  spacer();
  head('TOTAL PRODUCTION IN 24HR');
  R.push({ cells: ['GRADE', 'SPONGE', 'KILN 1', 'KILN 2', 'TOTAL'].map(t => C(t, { b: 1, al: 'center' })) });
  const prod = get('production').map(r => {
    const m = /^(.*?)\s+[\u2013-]\s+(.*)$/.exec(r.label);
    return { g: m ? m[1] : '', name: m ? m[2] : r.label, v: r.vals };
  });
  for (let i = 0; i < prod.length; i++) {
    const p = prod[i];
    if (/^TOTAL$/i.test(p.name)) {
      R.push({ cells: [C('TOTAL', { cs: 4, b: 1, al: 'center' }), C(p.v[2], { bg: LB, b: 1, al: 'center', n: 1 })] });
      continue;
    }
    const cells = [];
    const first = i === 0 || prod[i - 1].g !== p.g || !p.g;
    if (first) {
      let k = 1;
      while (p.g && i + k < prod.length && prod[i + k].g === p.g) k++;
      cells.push(C(p.g, { rs: k, b: 1, al: 'center' }));
    }
    cells.push(C(p.name, { b: 1, al: 'center' }));
    [0, 1, 2].forEach(j => cells.push(C(p.v[j], { al: 'center', b: nz(p.v[j]), n: 1 })));
    R.push({ cells });
  }
  spacer();
  [
    ['pending_sale', 'BALANCE PENDING OUTGOING (SAUDA SALE)', 'QTY OUT', 'SALE'],
    ['pending_purchase', 'BALANCE PENDING INCOMING (SAUDA PURCHASE)', 'QTY IN', 'PURCHASE']
  ].forEach(([sec, t, q, side], si) => {
    R.push({ cells: [C(t, { cs: 4, bg: LB, b: 1, al: 'center' }), C(q, { bg: LB, b: 1, al: 'center' })] });
    get(sec).forEach((r, i) =>
      R.push({ cells: [C(i === 0 ? side : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] })
    );
    if (si === 0) spacer();
  });
  return { W: [175, 205, 213, 210, 149], F, rows: R };
}

export function specBillet(date, rowsOf) {
  const R = [],
    F = 11.5,
    NC = 11,
    spacer = () => R.push({ h: 7, cells: [C('', { cs: NC, fs: 2 })] });
  const get = sec => rowsOf('billet', date, sec);
  const num = (v, o) => C(v, Object.assign({ al: 'center', b: nz(v), n: 1 }, o || {}));
  const H = (t, o) => C(t, Object.assign({ b: 1, al: 'center' }, o || {}));
  R.push({
    h: 32,
    cells: [
      C('HINDUSTAN IRON & SPONGE REPORT (BILLET)', { cs: 10, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 18 }),
      C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 13 })
    ]
  });
  // raw material
  R.push({ cells: [C('RAW MATERIAL CONSUMPTION', { cs: NC, bg: LB2, b: 1, al: 'center' })] });
  R.push({
    h: 20,
    cells: [
      H('MATERIAL', { rs: 2 }),
      H('OPENING', { rs: 2 }),
      H('RECEIVED', { cs: 2 }),
      H('TOTAL RECEIVED', { rs: 2 }),
      H('ISSUE', { rs: 2 }),
      H('TRANS.', { rs: 2 }),
      H('CONSUMPTION', { rs: 2 }),
      H('CLOSING', { rs: 2 }),
      H('KG/TONS', { rs: 2 }),
      H('KG/HEAT', { rs: 2 })
    ]
  });
  R.push({ h: 20, cells: [H('OUT SIDE'), H('IN HOUSE')] });
  get('raw').forEach(r => {
    const tot = /^TOTAL$/i.test(r.label),
      bg = tot ? LB3 : undefined;
    R.push({
      cells: [
        C(r.label, { b: 1, bg, al: tot ? 'center' : 'left' }),
        ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => num(r.vals[i], { bg, b: tot || nz(r.vals[i]) }))
      ]
    });
  });
  // charge mix
  R.push({ cells: [C('CHARGE MIX MATERIAL', { cs: NC, bg: LB2, b: 1, al: 'center' })] });
  R.push({
    h: 20,
    cells: [
      H('MATERIAL', { rs: 2 }),
      H('OPENING', { rs: 2 }),
      H('RECEIVED', { cs: 2 }),
      H('TOTAL RECEIVED', { rs: 2 }),
      H('CONSUMPTION', { rs: 2, cs: 2 }),
      H('CLOSING', { rs: 2, cs: 2 }),
      H('METAL %', { rs: 2, cs: 2 })
    ]
  });
  R.push({ h: 20, cells: [H('OUT SIDE'), H('IN HOUSE')] });
  get('charge').forEach(r => {
    const tot = /^TOTAL$/i.test(r.label),
      bg = tot ? LB3 : undefined,
      o = i => num(r.vals[i], { bg, b: tot || nz(r.vals[i]) });
    R.push({
      cells: [
        C(r.label, { b: 1, bg, al: tot ? 'center' : 'left' }),
        o(0),
        o(1),
        o(2),
        o(3),
        { ...o(4), cs: 2 },
        { ...o(5), cs: 2 },
        { ...o(6), cs: 2 }
      ]
    });
  });
  // summary lookups
  const sm = {};
  get('summary').forEach(r => {
    sm[clean(r.label).toUpperCase()] = r;
  });
  const sv = label => {
    const r = sm[label];
    return r ? r.vals[0] : '';
  };
  const big = label => R.push({ cells: [C(label, { cs: 6, b: 1, al: 'center' }), num(sv(label), { cs: 5, b: 1 })] });
  big('TOTAL PRODUCTION (LIQUID)');
  big('TOTAL CONSUMPTION');
  spacer();
  // billets blocks
  const bl = get('billets');
  let gk = null;
  bl.forEach(r => {
    const g = /^BILLETS\s+(\d+)\s*X\s*(\d+)/i.exec(r.label),
      p = /^(\d+ X \d+ mm)\s+[–-]\s+(.*)$/.exec(r.label);
    const key = g ? g[1] + 'x' + g[2] : p ? p[1].replace(/\s*mm$/, '').replace(/\s*X\s*/, 'x') : '';
    if (key !== gk) {
      if (gk !== null) spacer();
      R.push({
        cells: [
          C('', { cs: 3, nb: 1 }),
          H('OPENING'),
          H('PRODUCTION'),
          H('TRANSFER'),
          H('DISPATCH'),
          H('CLOSING', { cs: 2 }),
          H('REMARK', { cs: 2 })
        ]
      });
      gk = key;
    }
    const name = p ? p[2] : r.label;
    const bg = /\(NORMAL\)/i.test(name)
      ? GREEN
      : /\(TESTED\)/i.test(name)
      ? ORANGE
      : /meter/i.test(name)
      ? LB
      : undefined;
    R.push({
      cells: [
        C(name, { cs: 3, b: 1, al: 'center', bg }),
        num(r.vals[0]),
        num(r.vals[1]),
        num(r.vals[2]),
        num(r.vals[3]),
        num(r.vals[4], { cs: 2 }),
        C(r.vals[5], { cs: 2, b: 1, al: 'center' })
      ]
    });
  });
  if (bl.length) spacer();
  big('TOTAL CONSUMPTION');
  big('BURNING LOSS + SLAG');
  big('TOTAL FINISH MATERIAL');
  spacer();
  // bottom block
  R.push({ cells: [H('TOTAL', { cs: 3 }), H('QTY'), H('SMS PRODUCTION', { cs: 7, bg: LB3 })] });
  const two = (l1, k1, l2, k2) =>
    R.push({
      cells: [
        C(l1, { cs: 3, b: 1, al: 'center' }),
        num(sv(k1), { b: 1 }),
        k2 ? C(l2, { cs: 4, b: 1, al: 'center' }) : C('', { cs: 7 }),
        ...(k2 ? [num(sv(k2), { cs: 3, b: 1 })] : [])
      ]
    });
  two(
    'PRODUCTION (LIQUID)',
    'TOTAL PRODUCTION (LIQUID)',
    'TOTAL PRODUCTION (LIQUID)',
    'SMS PRODUCTION - TOTAL PRODUCTION (LIQUID)'
  );
  two(
    'TOTAL NORMAL BILLET',
    'TOTAL NORMAL BILLET',
    'STANDARD LOSS + LAUNDER LOSS',
    'STANDARD LOSS + LAUNDER LOSS'
  );
  two(
    'TOTAL TESTED BILLET',
    'TOTAL TESTED BILLET',
    'TOTAL FINISH MATERIAL (SOLID)',
    'TOTAL FINISH MATERIAL (SOLID)'
  );
  two(
    'TOTAL 4.3 meter, 5/4 meter, 2/3 Meter, Scraps/End Cut',
    'TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT'
  );
  R.push({
    cells: [
      C('REPORTS & SMS REPORT DIFFERENCE QTY', { cs: 5, bg: LB, b: 1, al: 'center' }),
      num(sv('REPORTS & SMS REPORT DIFFERENCE QTY'), { cs: 6, b: 1 })
    ]
  });
  const KNOWN = [
    'TOTAL PRODUCTION (LIQUID)',
    'TOTAL CONSUMPTION',
    'BURNING LOSS + SLAG',
    'TOTAL FINISH MATERIAL',
    'SMS PRODUCTION - TOTAL PRODUCTION (LIQUID)',
    'TOTAL NORMAL BILLET',
    'STANDARD LOSS + LAUNDER LOSS',
    'TOTAL TESTED BILLET',
    'TOTAL FINISH MATERIAL (SOLID)',
    'TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT',
    'REPORTS & SMS REPORT DIFFERENCE QTY'
  ];
  get('summary')
    .filter(r => !KNOWN.includes(clean(r.label).toUpperCase()))
    .forEach(r => R.push({ cells: [C(r.label, { cs: 5, b: 1, al: 'center' }), num(r.vals[0], { cs: 6, b: 1 })] }));
  return { W: [145, 70, 69, 71, 89, 71, 75, 102, 76, 62, 97], F, rows: R };
}

export function specDhaatu(date, rowsOf) {
  const R = [],
    F = 12.5,
    get = sec => rowsOf('dhaatu', date, sec),
    spacer = () => R.push({ h: 6, cells: [C('', { cs: 5, fs: 2 })] });
  const head = t => R.push({ cells: [C(t, { cs: 5, bg: LB, b: 1, al: 'center' })] });
  const line = r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] });
  R.push({
    h: 34,
    cells: [
      C('HINDUSTAN DHAATU REPORT (SPONGE)', { cs: 4, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 20 }),
      C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 17 })
    ]
  });
  get('stock').forEach((r, i) =>
    R.push({ cells: [C(i === 0 ? 'STOCK' : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] })
  );
  spacer();
  head('YESTERDAY INCOMING MATERIALS');
  get('incoming').forEach(line);
  spacer();
  head('YESTERDAY OUTGOING MATERIALS');
  get('outgoing').forEach(line);
  spacer();
  head('TOTAL PRODUCTION IN 24HR');
  get('production').forEach(r => {
    if (/^TOTAL$/i.test(r.label.trim()))
      return R.push({ cells: [C('TOTAL', { cs: 4, b: 1, al: 'center' }), C(r.vals[0], { bg: LB, b: 1, al: 'right', n: 1 })] });
    const m = /^([AB])\s*GRADE\s*(.*)$/i.exec(r.label);
    R.push({
      cells: [
        C(m ? m[1].toUpperCase() + ' Grade' : '', { cs: 2, b: 1, al: 'center' }),
        C(m ? m[2] : r.label, { cs: 2, b: 1, al: 'center' }),
        C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })
      ]
    });
  });
  spacer();
  [
    ['pending_sale', 'BALANCE PENDING OUTGOING (SAUDA SALE)', 'QTY OUT'],
    ['pending_purchase', 'BALANCE PENDING INCOMING (SAUDA PURCHASE)', 'QTY IN']
  ].forEach(([sec, t, q], si) => {
    R.push({ cells: [C(t, { cs: 4, bg: LB, b: 1, al: 'center' }), C(q, { bg: LB, b: 1, al: 'center' })] });
    get(sec).forEach(line);
    if (!si) spacer();
  });
  return { W: [173, 157, 196, 164, 150], F, rows: R };
}

export function specWire(date, rowsOf) {
  const R = [],
    F = 11.5,
    NC = 8,
    get = sec => rowsOf('wire', date, sec),
    spacer = () => R.push({ h: 6, cells: [C('', { cs: NC, fs: 2 })] });
  const num = (v, o) => C(v, Object.assign({ al: 'center', b: nz(v), n: 1 }, o || {}));
  const H = (t, o) => C(t, Object.assign({ b: 1, al: 'center' }, o || {}));
  const isT = r => /^TOTAL$/i.test(r.label.trim());
  const MAIN = /^(TOTAL CONSUMPTION|TOTAL PRODUCTION \(LIQUID\))/i,
    MID = /^(STANDERD|TOTAL FINISH)/i,
    END = /^(BURNING|REPORTS)/i;
  const sum = re => get('summary').filter(r => re.test(r.label));
  const sline = rows =>
    rows.forEach(r => R.push({ cells: [C(r.label, { cs: 5, b: 1, al: 'center' }), num(r.vals[0], { cs: 3, b: 1 })] }));
  const sect = t => R.push({ cells: [C(t, { cs: NC, bg: LB2, b: 1, al: 'center' })] });

  R.push({
    h: 32,
    cells: [
      C('HINDUSTAN DHAATU REPORT (WIRE ROD)', { cs: 7, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 18 }),
      C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 13 })
    ]
  });
  sect('RAW MATERIAL CONSUMPTION');
  R.push({ cells: ['MATERIAL', 'OPENING', 'RECEIVED', 'TRANSFER', 'CONSUMPTION', 'CLOSING', 'KG/T', 'KG/H'].map(t => H(t)) });
  get('raw').forEach(r => {
    const t = isT(r),
      cells = [C(r.label, { b: 1 })];
    for (let i = 0; i < 5; i++) cells.push(num(r.vals[i], t ? { bg: LB, b: 1 } : {}));
    if (t && !r.vals[5] && !r.vals[6]) cells.push(H('IN HOUSE MATERIAL', { cs: 2, fs: 9 }));
    else cells.push(num(r.vals[5]), num(r.vals[6]));
    R.push({ cells });
  });
  spacer();
  sect('CHARGE MIX MATERIAL');
  R.push({
    cells: [H('MATERIAL'), H('OPENING'), H('RECEIVED'), H('CONSUMPTION', { cs: 2 }), H('CLOSING'), H('METAL%', { cs: 2 })]
  });
  get('charge').forEach(r => {
    const o = isT(r) ? { bg: LB, b: 1 } : {};
    R.push({
      cells: [
        C(r.label, { b: 1 }),
        num(r.vals[0], o),
        num(r.vals[1], o),
        num(r.vals[2], Object.assign({ cs: 2 }, o)),
        num(r.vals[3], o),
        num(r.vals[4], Object.assign({ cs: 2 }, o))
      ]
    });
  });
  sline(sum(MAIN));
  spacer();
  sect('BILLETS & WIRE ROD STOCK');
  R.push({
    cells: [H('ITEM', { cs: 2 })].concat(
      ['OPENING', 'PRODUCTION', 'REPAIR RECEIVED', 'TRANSFER', 'DISPATCH', 'CLOSING'].map(t => H(t, { fs: 10 }))
    )
  });
  get('stock').forEach(r =>
    R.push({ cells: [C(r.label, { cs: 2, b: 1 })].concat([0, 1, 2, 3, 4, 5].map(i => num(r.vals[i]))) })
  );
  spacer();
  R.push({
    cells: [H('', { cs: 3 })].concat(['REPAIR', 'REJECTION', 'WIRE END', 'MILL SCALE', 'END CUT'].map(t => H(t, { bg: LB })))
  });
  get('scrap').forEach(r =>
    R.push({ cells: [C(r.label, { cs: 3, b: 1 })].concat([0, 1, 2, 3, 4].map(i => num(r.vals[i]))) })
  );
  sline(sum(MID));
  spacer();
  R.push({
    cells: [C('TOTAL', { cs: 5, bg: LB, b: 1, al: 'center' }), C('QTY', { cs: 3, bg: LB, b: 1, al: 'center' })]
  });
  sline(get('production'));
  sline(sum(END));
  sline(get('summary').filter(r => ![MAIN, MID, END].some(re => re.test(r.label))));
  return { W: [128, 66, 66, 66, 80, 66, 64, 74], F, rows: R };
}

export function specDBillet(date, rowsOf) {
  const R = [],
    F = 12,
    get = sec => rowsOf('dbillet', date, sec),
    spacer = () => R.push({ h: 6, cells: [C('', { cs: 3, fs: 2 })] });
  const isT = r => /^TOTAL$/i.test(r.label.trim());
  const val = (v, o) => C(v, Object.assign({ al: 'right', b: nz(v), n: 1 }, o || {}));
  const sizeHead = () =>
    R.push({ cells: [C('SIZE', { cs: 2, bg: LB, b: 1, al: 'center' }), C('QTY', { bg: LB, b: 1, al: 'center' })] });
  const block = (title, rows) => {
    const body = rows.filter(r => !isT(r)),
      tot = rows.find(isT);
    body.forEach((r, i) =>
      R.push({
        cells: [
          i === 0 ? C(title, { rs: body.length, b: 1, al: 'center' }) : null,
          C(r.label, { b: 1, al: 'center' }),
          val(r.vals[0])
        ].filter(Boolean)
      })
    );
    if (tot) R.push({ cells: [C('TOTAL', { cs: 2, b: 1, al: 'center' }), val(tot.vals[0], { bg: LB, b: 1 })] });
  };
  const list = (rows, hl) =>
    rows.forEach(r =>
      R.push({
        cells: [
          C(r.label, { cs: 2, b: 1, al: 'center' }),
          val(r.vals[0], /^TOTAL\b/i.test(r.label) || hl ? { bg: LB, b: 1 } : {})
        ]
      })
    );
  R.push({
    h: 32,
    cells: [
      C('HINDUSTAN DHAATU REPORT (BILLET)', { cs: 2, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 18 }),
      C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 15 })
    ]
  });
  sizeHead();
  block('BILLETS STOCK', get('stock'));
  block('BILLETS INCOMING', get('incoming'));
  list(get('summary'));
  spacer();
  R.push({ cells: [C('YESTERDAY INCOMING & OUTGOING MATERIALS', { cs: 3, bg: LB, b: 1, al: 'center' })] });
  sizeHead();
  block('BILLETS INCOMING', get('yincoming'));
  block('OUTGOING MATERIALS', get('outgoing'));
  spacer();
  R.push({
    cells: [
      C('TOTAL STRUCTURE PRODUCTION IN 24HR', { cs: 2, bg: LB, b: 1, al: 'center' }),
      C('QTY', { bg: LB, b: 1, al: 'center' })
    ]
  });
  list(get('production'));
  spacer();
  get('pending').forEach(r => R.push({ cells: [C(r.label, { cs: 2, b: 1 }), val(r.vals[0])] }));
  return { W: [150, 300, 120], F, rows: R };
}

export const getSheetSpec = (rep, date, rowsOf, getNote) => {
  const sp =
    rep === 'nandan'
      ? specNandan(date, rowsOf)
      : rep === 'sponge'
      ? specSponge(date, rowsOf)
      : rep === 'dhaatu'
      ? specDhaatu(date, rowsOf)
      : rep === 'dbillet'
      ? specDBillet(date, rowsOf)
      : rep === 'wire'
      ? specWire(date, rowsOf)
      : specBillet(date, rowsOf);

  const noteText = getNote ? getNote(rep, date) : '';
  if (noteText && noteText.trim()) {
    const totalCols = sp.W.length;
    sp.rows.push({ h: 6, cells: [C('', { cs: totalCols, fs: 2 })] });
    sp.rows.push({
      h: 24,
      cells: [
        C('NOTE: ' + noteText.trim(), {
          cs: totalCols,
          bg: '#fff9e6',
          color: '#8a5b00',
          b: 1,
          al: 'left',
          fs: 11
        })
      ]
    });
  }
  return sp;
};

export function layoutCells(sp) {
  const occ = [],
    out = [];
  sp.rows.forEach((r, ri) => {
    let c = 0;
    r.cells.forEach(k => {
      while (occ[ri] && occ[ri][c]) c++;
      for (let y = 0; y < k.rs; y++)
        for (let x = 0; x < k.cs; x++) (occ[ri + y] = occ[ri + y] || [])[c + x] = 1;
      out.push({ r: ri, c, k });
      c += k.cs;
    });
  });
  return out;
}

export function addSheetPage(doc, rep, d, rowsOf, getNote) {
  const PW = doc.internal.pageSize.getWidth(),
    PH = doc.internal.pageSize.getHeight(),
    M = 20,
    BM = 26;
  const sp = getSheetSpec(rep, d, rowsOf, getNote),
    tw = sp.W.reduce((a, b) => a + b, 0),
    s = (PW - 2 * M) / tw;
  const draw = (t, k) => {
    const body = sp.rows.map(r =>
      r.cells.map(c => ({
        content: clean(c.t),
        colSpan: c.cs,
        rowSpan: c.rs,
        styles: Object.assign(
          {
            halign: c.al,
            valign: 'middle',
            fontStyle: c.b ? 'bold' : 'normal',
            fontSize: (c.fs || sp.F) * s * k,
            textColor: hexRGB(c.color || '#000000'),
            fillColor: hexRGB(c.bg || '#ffffff'),
            minCellHeight: c.rs > 1 ? 0 : (r.h || 19) * s * k
          },
          c.nb ? { lineWidth: 0 } : {}
        )
      }))
    );
    const cs = {};
    sp.W.forEach((w, i) => (cs[i] = { cellWidth: w * s * k }));
    const side = (PW - tw * s * k) / 2;
    autoTable(t, {
      startY: M,
      body,
      theme: 'grid',
      margin: { left: side, right: side, bottom: BM },
      tableWidth: tw * s * k,
      columnStyles: cs,
      styles: {
        font: 'helvetica',
        cellPadding: { top: 1 * k, bottom: 1 * k, left: 2.5, right: 2.5 },
        lineColor: [0, 0, 0],
        lineWidth: 0.6,
        overflow: 'linebreak'
      },
      tableLineColor: [0, 0, 0],
      tableLineWidth: 1.4
    });
  };
  let k = 1;
  for (; k > 0.55; k -= 0.03) {
    const t = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    draw(t, k);
    if (t.getNumberOfPages() === 1 && t.lastAutoTable.finalY <= PH - BM) break;
  }
  draw(doc, Math.max(k, 0.55));
}

export function exportPdf(rep, dates, rowsOf, fname, getNote) {
  if (!dates.length) throw new Error('No data to export');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  dates.forEach((d, di) => {
    if (di) doc.addPage();
    addSheetPage(doc, rep, d, rowsOf, getNote);
  });
  doc.save(fname);
}

export async function exportXlsx(rep, dates, rowsOf, fname, getNote) {
  if (!dates.length) throw new Error('No data to export');
  const wb = new ExcelJS.Workbook();
  const thin = { style: 'thin', color: { argb: 'FF000000' } },
    box = { top: thin, left: thin, bottom: thin, right: thin };
  dates.forEach(d => {
    const sp = getSheetSpec(rep, d, rowsOf, getNote),
      ws = wb.addWorksheet(fmtDMY(d));
    ws.columns = sp.W.map(w => ({ width: w / 6.4 }));
    sp.rows.forEach((r, i) => (ws.getRow(i + 1).height = (r.h || 19) * 0.78));
    layoutCells(sp).forEach(({ r, c, k }) => {
      const r1 = r + 1,
        c1 = c + 1,
        r2 = r + k.rs,
        c2 = c + k.cs;
      if (k.rs > 1 || k.cs > 1) ws.mergeCells(r1, c1, r2, c2);
      for (let y = r1; y <= r2; y++)
        for (let x = c1; x <= c2; x++) if (!k.nb) ws.getCell(y, x).border = box;
      const cell = ws.getCell(r1, c1);
      if (k.n && Parser.isNum(k.t)) {
        cell.value = Number(k.t);
        const dec = (k.t.split('.')[1] || '').length;
        cell.numFmt = dec ? '0.' + '0'.repeat(dec) : '0';
      } else cell.value = clean(k.t);
      cell.font = {
        name: 'Calibri',
        size: Math.round((k.fs || sp.F) * 0.75 * 10) / 10 + 1,
        bold: !!k.b,
        color: { argb: 'FF' + (k.color || '#000000').slice(1).toUpperCase() }
      };
      cell.alignment = { horizontal: k.al, vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF' + (k.bg || '#ffffff').slice(1).toUpperCase() }
      };
    });
    ws.pageSetup = {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
    };
    ws.views = [{ showGridLines: false }];
  });
  const buf = await wb.xlsx.writeBuffer();
  saveBlob(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fname
  );
}
