/* ===== PDF PARSER (position based) ===== */
const Parser = (function () {
  const TOL = 3.6;
  const isNum = s => /^-?\d+(?:\.\d+)?$/.test(s);

  function tokenize(items, pageH, offset) {
    const out = [];
    for (const it of items) {
      const str = it.str;
      if (!str || !str.trim()) continue;
      const w = it.width || 0;
      const re = /\S+/g; let m;
      while ((m = re.exec(str))) {
        out.push({ s: m[0], x: it.transform[4] + (str.length ? w * m.index / str.length : 0), t: offset + pageH - it.transform[5] });
      }
    }
    return out;
  }

  function toLines(toks) {
    toks.sort((a, b) => a.t - b.t || a.x - b.x);
    const lines = []; let cur = null, last = -1e9;
    for (const k of toks) {
      if (!cur || k.t - last > TOL) { cur = { t: k.t, toks: [] }; lines.push(cur); }
      cur.toks.push(k); last = k.t;
    }
    lines.forEach(l => { l.toks.sort((a, b) => a.x - b.x); l.text = l.toks.map(k => k.s).join(' '); });
    return lines;
  }

  function assignCols(nums, centers) {
    const out = centers.map(() => '');
    if (nums.length === centers.length) { nums.forEach((n, i) => out[i] = n.s); return out; }
    nums.forEach(n => {
      let bi = 0, bd = 1e9;
      centers.forEach((c, i) => { const d = Math.abs(c - n.x); if (d < bd) { bd = d; bi = i; } });
      if (out[bi] === '') out[bi] = n.s;
    });
    return out;
  }

  const lab = toks => toks.map(k => k.s).join(' ');

  function parseNandan(lines, opts) {
    const rows = []; let sec = 'stock'; const grades = []; const prod = [];
    for (const L of lines) {
      const T = L.text.toUpperCase(), toks = L.toks;
      if ((/NANDAN|SMELTERS/.test(T) || (opts && opts.sponge && /HINDUSTAN/.test(T))) && /REPORT/.test(T)) continue;
      if (/YESTERDAY INCOMING/.test(T)) { sec = 'incoming'; continue; }
      if (/YESTERDAY OUTGOING/.test(T)) { sec = 'outgoing'; continue; }
      if (/TOTAL PRODUCTION IN/.test(T)) { sec = 'production'; continue; }
      if (/BALANCE PENDING OUTGOING/.test(T)) { sec = 'pending_sale'; continue; }
      if (/BALANCE PENDING INCOMING/.test(T)) { sec = 'pending_purchase'; continue; }
      if (sec === 'production') {
        if (/KILN/.test(T)) continue;
        const left = toks.filter(k => k.x < 100), main = toks.filter(k => k.x >= 100);
        const nums = main.filter(k => isNum(k.s));
        const name = lab(main.filter(k => !isNum(k.s)));
        const gm = lab(left).toUpperCase().match(/^([AB])\s*GRADE$/);
        if (!nums.length || !name) { if (gm) grades.push({ t: L.t, g: gm[1] }); continue; }
        const vals = nums.length === 1 ? ['', '', nums[0].s] : assignCols(nums, [308, 417, 520]);
        prod.push({ t: L.t, label: name, vals, g: gm ? gm[1] : null });
        continue;
      }
      if (opts && opts.sponge) {
        // value sits in the right-hand columns; numbers inside the label (e.g. 110 x 110) are kept
        const vt = toks.filter(k => k.x >= 400 && isNum(k.s));
        if (!vt.length) continue;
        const sv = vt[vt.length - 1];
        const lo = (sec === 'incoming' || sec === 'outgoing') ? 0 : 100;
        const sl = toks.filter(k => k.x >= lo && k.x < sv.x - 1);
        if (!sl.length) continue;
        rows.push({ sec, label: lab(sl), vals: [sv.s] });
        continue;
      }
      const nums = toks.filter(k => isNum(k.s));
      if (!nums.length) continue;
      const val = nums[nums.length - 1];
      let l = toks.filter(k => k.x < val.x - 1 && !isNum(k.s));
      if (!(opts && opts.dhaatu && (sec === 'incoming' || sec === 'outgoing')) && l.some(k => k.x >= 140)) l = l.filter(k => k.x >= 140);
      if (!l.length) continue;
      rows.push({ sec, label: lab(l), vals: [val.s] });
    }
    // production rows go after stock/incoming/outgoing in logical order
    prod.forEach(p => {
      let g = p.g;
      if (!g && grades.length) { const n = grades.reduce((a, b) => Math.abs(b.t - p.t) < Math.abs(a.t - p.t) ? b : a); if (Math.abs(n.t - p.t) < 14) g = n.g; }
      rows.push({ sec: 'production', label: g ? g + ' Grade – ' + p.label : p.label, vals: p.vals });
    });
    return rows;
  }

  function parseDhaatu(lines) {
    const rows = parseNandan(lines.filter(L => !/DHAATU/.test(L.text.toUpperCase())), { dhaatu: true });
    rows.forEach(r => { if (r.sec === 'production') r.vals = [r.vals.filter(v => v !== '').pop() || '']; });
    return rows;
  }

  function parseDBillet(lines) {
    const rows = []; let sec = 'stock', yest = false;
    for (const L of lines) {
      const T = L.text.toUpperCase().replace(/\s+/g, ' ').trim(), toks = L.toks;
      if (/DHAATU REPORT/.test(T) || /^SIZE QTY$/.test(T)) continue;
      if (/^NOTE/.test(T)) break;
      if (/YESTERDAY INCOMING/.test(T)) { yest = true; continue; }
      if (/^TOTAL STRUCTURE PRODUCTION/.test(T)) { sec = 'production'; continue; }
      if (/^BILLETS STOCK\b/.test(T)) sec = 'stock';
      else if (/^BILLETS INCOMING\b/.test(T)) sec = yest ? 'yincoming' : 'incoming';
      else if (/^OUTGOING MATERIALS\b/.test(T)) sec = 'outgoing';
      else if (/^BALANCE PENDING\b/.test(T)) sec = 'pending';
      const vt = toks.filter(k => k.x >= 480 && isNum(k.s));
      if (!vt.length) continue;
      let l = toks.filter(k => k.x < 480);
      if (['stock', 'incoming', 'yincoming', 'outgoing'].includes(sec)) l = l.filter(k => k.x >= 140);
      if (!l.length) continue;
      const label = lab(l);
      rows.push({ sec, label, vals: [vt[vt.length - 1].s] });
      if (sec === 'incoming' && /^TOTAL$/i.test(label)) sec = 'summary';
    }
    return rows;
  }

  function parseWire(lines) {
    const rows = [], seen = new Set(); let region = 'raw', blk = null;
    const addSummary = (label, v) => { const key = label.toUpperCase(); if (!label || seen.has(key)) return; seen.add(key); rows.push({ sec: 'summary', label, vals: [v] }); };
    const segs = toks => { const out = []; let prev = -1; toks.filter(k => k.x >= 150 && isNum(k.s)).forEach(n => { out.push({ label: lab(toks.filter(k => k.x > prev && k.x < n.x)), val: n.s, x: n.x }); prev = n.x; }); return out; };
    const CEN = { wire: [217, 287, 373, 441, 498, 555], stk5: [217, 287, 367, 444, 527], scrap: [225, 293, 373, 443, 535] };
    for (const L of lines) {
      const T = L.text.toUpperCase().replace(/\s+/g, ' ').trim(), toks = L.toks;
      if (/DHAATU REPORT/.test(T)) continue;
      if (/RAW MATERIAL CONSUMPTION/.test(T)) { region = 'raw'; continue; }
      if (/CHARGE MIX MATERIAL/.test(T)) { region = 'charge'; continue; }
      if (/^TOTAL QTY\b/.test(T)) { region = 'bottom'; blk = null; continue; }
      const nums = toks.filter(k => k.x >= 150 && isNum(k.s));
      if (!nums.length) {
        if (/OPENING.*PRODUCTION.*REPAIR.*RECEIVED/.test(T)) { blk = { kind: 'wire', label: '' }; region = 'blk'; }
        else if (/OPENING.*PRODUCTION.*TRANSFER.*DISPATCH.*CLOSING/.test(T)) { blk = { kind: 'stk5', label: '' }; region = 'blk'; }
        else if (/REPAIR.*REJECTION.*WIRE.*MILL.*SCALE.*END.*CUT/.test(T)) { blk = { kind: 'scrap', label: '' }; region = 'blk'; }
        else if (region === 'blk' && blk) { const l = toks.filter(k => k.x < 200); if (l.length) blk.label = (blk.label + ' ' + lab(l)).trim(); }
        continue;
      }
      if (region === 'blk' && blk) {
        if (nums.length < 4) continue;
        const cen = CEN[blk.kind], v = nums.length === cen.length ? nums.map(n => n.s) : assignCols(nums, cen);
        if (blk.kind === 'scrap') rows.push({ sec: 'scrap', label: 'REPAIR, REJECTION, WIRE END, MILL SCALE & END CUT', vals: v });
        else rows.push({ sec: 'stock', label: blk.label, vals: blk.kind === 'wire' ? v : [v[0], v[1], '', v[2], v[3], v[4]] });
        blk = null; region = 'tail'; continue;
      }
      if (region === 'raw' || region === 'charge') {
        const l = toks.filter(k => k.x < 150 && !isNum(k.s));
        if (nums.length >= 4 && l.length) rows.push({ sec: region, label: lab(l), vals: assignCols(nums, region === 'raw' ? [172, 225, 293, 373, 443, 503, 562] : [166, 222, 289, 367, 503]) });
        else if (nums.length === 1) segs(toks).forEach(x => addSummary(x.label, x.val));
        continue;
      }
      segs(toks).forEach(x => { if (region === 'bottom' && x.x < 300) rows.push({ sec: 'production', label: x.label, vals: [x.val] }); else addSummary(x.label, x.val); });
    }
    return rows;
  }

  function parseBillet(lines) {
    const rows = []; let region = 'raw', group = '', awaiting = false, lastBottom = '';
    const seen = new Set();
    const addSummary = (label, v) => {
      const key = label.toUpperCase(); if (seen.has(key)) return; seen.add(key);
      rows.push({ sec: 'summary', label, vals: [v] });
    };
    for (const L of lines) {
      const T = L.text.toUpperCase(), toks = L.toks;
      if (/HINDUSTAN/.test(T) && /REPORT/.test(T)) continue;
      if (/RAW MATERIAL CONSUMPTION/.test(T)) { region = 'raw'; continue; }
      if (/CHARGE MIX MATERIAL/.test(T)) { region = 'charge'; continue; }
      if (/OPENING/.test(T) && /PRODUCTION/.test(T) && /TRANSFER/.test(T)) { region = 'billets'; continue; }
      if (region === 'billets' && /^TOTAL CONSUMPTION/.test(T)) region = 'tail';
      if (region === 'tail' && /\bSMS\b/.test(T) && /PRODUCTION/.test(T) && !toks.some(k => isNum(k.s))) { region = 'bottom'; continue; }

      if (region === 'raw' || region === 'charge') {
        const l = toks.filter(k => k.x < 95 && !isNum(k.s)), nums = toks.filter(k => k.x >= 95 && isNum(k.s));
        if (nums.length >= 4 && l.length) {
          const centers = region === 'raw' ? [108, 153, 201, 253, 310, 356, 411, 467, 513, 566] : [107, 153, 201, 254, 330, 433, 548];
          rows.push({ sec: region, label: lab(l), vals: assignCols(nums, centers) });
        } else if (nums.length === 1) {
          const ll = toks.filter(k => !isNum(k.s)); if (ll.length) addSummary(lab(ll), nums[0].s);
        }
        continue;
      }
      if (region === 'billets') {
        const l = toks.filter(k => k.x < 185), nums = toks.filter(k => k.x >= 185 && k.x < 495 && isNum(k.s)), rem = toks.filter(k => k.x >= 495);
        if (!l.length || !nums.length) continue;
        let name = lab(l);
        const gm = name.match(/BILLETS\s+(\d+)\s*X\s*(\d+)/i);
        if (gm) group = gm[1] + ' X ' + gm[2] + ' mm'; else if (group) name = group + ' – ' + name;
        const v = assignCols(nums, [200, 255, 313, 357, 436]); v.push(lab(rem));
        rows.push({ sec: 'billets', label: name, vals: v });
        continue;
      }
      if (region === 'tail') {
        const nums = toks.filter(k => isNum(k.s)), ll = toks.filter(k => !isNum(k.s));
        if (nums.length && ll.length) addSummary(lab(ll), nums[nums.length - 1].s);
        continue;
      }
      if (region === 'bottom') {
        const nums = toks.filter(k => k.x >= 150 && isNum(k.s)).map(k => k.s), ll = toks.filter(k => !(k.x >= 150 && isNum(k.s)));
        if (/\(LIQUID\)/.test(T) && nums.length >= 2) { addSummary('TOTAL PRODUCTION (LIQUID)', nums[0]); addSummary('SMS PRODUCTION – TOTAL PRODUCTION (LIQUID)', nums[1]); }
        else if (/NORMAL BILLET/.test(T) && nums.length) { addSummary('TOTAL NORMAL BILLET', nums[0]); if (nums[1]) addSummary('STANDARD LOSS + LAUNDER LOSS', nums[1]); }
        else if (/TESTED BILLET/.test(T) && nums.length) { addSummary('TOTAL TESTED BILLET', nums[0]); lastBottom = 'tested'; if (nums[1]) { addSummary('TOTAL FINISH MATERIAL (SOLID)', nums[1]); lastBottom = ''; } }
        else if (/REPORTS/.test(T) && /DIFFERENCE/.test(T) && nums.length) addSummary('REPORTS & SMS REPORT DIFFERENCE QTY', nums[nums.length - 1]);
        else if (!ll.length && nums.length) {
          if (awaiting) { addSummary('TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT', nums[0]); awaiting = false; }
          else if (lastBottom === 'tested') { addSummary('TOTAL FINISH MATERIAL (SOLID)', nums[0]); lastBottom = ''; }
        } else if (/METER/.test(T) && !nums.length) awaiting = true;
      }
    }
    return rows;
  }

  function findDate(lines) {
    for (const L of lines.slice(0, 8)) {
      const m = L.text.match(/(\d{2})[-\/.](\d{2})[-\/.](\d{4})/);
      if (m) return m[3] + '-' + m[2] + '-' + m[1];
    }
    return '';
  }

  function parse(items, pageH) {
    // items: [{pageItems, pageH}] or single page
    const pages = Array.isArray(items[0]) ? items : [items];
    let toks = [];
    pages.forEach((p, i) => { toks = toks.concat(tokenize(p, pageH, i * 100000)); });
    const lines = toLines(toks);
    const all = lines.map(l => l.text).join(' ').toUpperCase();
    let report = '';
    if (/NANDAN/.test(all)) report = 'nandan'; else if (/HINDUSTAN\s+IRON\s*&\s*SPONGE\s+REPORT\s*\(SPONGE\)/.test(all)) report = 'sponge'; else if (/DHAATU\s+REPORT\s*\(WIRE\s+ROD\)/.test(all)) report = 'wire'; else if (/DHAATU\s+REPORT\s*\(BILLET\)/.test(all)) report = 'dbillet'; else if (/DHAATU/.test(all)) report = 'dhaatu'; else if (/HINDUSTAN/.test(all) || /BILLET/.test(all)) report = 'billet';
    if (!report) return { report: '', date: findDate(lines), rows: [], lines };
    const rows = report === 'nandan' ? parseNandan(lines) : report === 'sponge' ? parseNandan(lines, { sponge: true }) : report === 'wire' ? parseWire(lines) : report === 'dbillet' ? parseDBillet(lines) : report === 'dhaatu' ? parseDhaatu(lines) : parseBillet(lines);
    return { report, date: findDate(lines), rows, lines };
  }
  return { parse, isNum };
})();
if (typeof module !== 'undefined') module.exports = Parser;


/* ===== CONFIG ===== */
const REPORTS = {
  nandan: { name: 'Nandan Smelters', secs: {
    stock: { t: 'Stock', cols: [['Qty (MT)', 'n']] },
    incoming: { t: 'Yesterday Incoming Materials', cols: [['Qty', 'n']] },
    outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
    production: { t: 'Total Production in 24 Hr', cols: [['Kiln 1', 'n'], ['Kiln 2', 'n'], ['Total', 'n']] },
    pending_sale: { t: 'Balance Pending Outgoing (Sauda Sale)', cols: [['Qty Out', 'n']] },
    pending_purchase: { t: 'Balance Pending Incoming (Sauda Purchase)', cols: [['Qty In', 'n']] }
  }},
  sponge: { name: 'Hindustan Iron Sponge', secs: {
    stock: { t: 'Stock', cols: [['Qty (MT)', 'n']] },
    incoming: { t: 'Yesterday Incoming Materials', cols: [['Qty', 'n']] },
    outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
    production: { t: 'Total Production in 24 Hr', cols: [['Kiln 1', 'n'], ['Kiln 2', 'n'], ['Total', 'n']] },
    pending_sale: { t: 'Balance Pending Outgoing (Sauda Sale)', cols: [['Qty Out', 'n']] },
    pending_purchase: { t: 'Balance Pending Incoming (Sauda Purchase)', cols: [['Qty In', 'n']] }
  }},
  dhaatu: { name: 'Hindustan Dhaatu Sponge', secs: {
    stock: { t: 'Stock', cols: [['Qty (MT)', 'n']] },
    incoming: { t: 'Yesterday Incoming Materials', cols: [['Qty', 'n']] },
    outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
    production: { t: 'Total Production in 24 Hr', cols: [['Qty', 'n']] },
    pending_sale: { t: 'Balance Pending Outgoing (Sauda Sale)', cols: [['Qty Out', 'n']] },
    pending_purchase: { t: 'Balance Pending Incoming (Sauda Purchase)', cols: [['Qty In', 'n']] }
  }},
  wire: { name: 'Hindustan Dhaatu Wire Rod', secs: {
    raw: { t: 'Raw Material Consumption', cols: [['Opening','n'],['Received','n'],['Transfer','n'],['Consumption','n'],['Closing','n'],['Kg/T','n'],['Kg/H','n']] },
    charge: { t: 'Charge Mix Material', cols: [['Opening','n'],['Received','n'],['Consumption','n'],['Closing','n'],['Metal %','n']] },
    stock: { t: 'Billets & Wire Rod Stock', cols: [['Opening','n'],['Production','n'],['Repair Received','n'],['Transfer','n'],['Dispatch','n'],['Closing','n']] },
    scrap: { t: 'Repair, Rejection, Wire End, Mill Scale & End Cut', cols: [['Repair','n'],['Rejection','n'],['Wire End','n'],['Mill Scale','n'],['End Cut','n']] },
    production: { t: 'Production (Total Qty)', cols: [['Qty','n']] },
    summary: { t: 'Consumption & Production Summary', cols: [['Qty','n']] }
  }},
  dbillet: { name: 'Hindustan Dhaatu Billet', secs: {
    stock: { t: 'Billets Stock', cols: [['Qty', 'n']] },
    incoming: { t: 'Billets Incoming', cols: [['Qty', 'n']] },
    summary: { t: 'Stock & Metal Summary', cols: [['Qty', 'n']] },
    yincoming: { t: 'Yesterday Incoming \u2013 Billets', cols: [['Qty', 'n']] },
    outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
    production: { t: 'Total Structure Production in 24 Hr', cols: [['Qty', 'n']] },
    pending: { t: 'Balance Pending Outgoing', cols: [['Qty', 'n']] }
  }},
  billet: { name: 'Hindustan Billet', secs: {
    raw: { t: 'Raw Material Consumption', cols: [['Opening','n'],['Received Out Side','n'],['Received In House','n'],['Received Total','n'],['Material Issue','n'],['Trans.','n'],['Consumption','n'],['Closing','n'],['Kg/Tons','n'],['Kg/Heat','n']] },
    charge: { t: 'Charge Mix Material', cols: [['Opening','n'],['Out Side','n'],['In House','n'],['Received Total','n'],['Consumption','n'],['Closing','n'],['Metal %','n']] },
    billets: { t: 'Billets Stock', cols: [['Opening','n'],['Production','n'],['Transfer','n'],['Dispatch','n'],['Closing','n'],['Remark','t']] },
    summary: { t: 'Production Summary', cols: [['Qty','n']] }
  }}
};
const KEY = 'plantReports.v1';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ===== STATE ===== */
const pad = n => String(n).padStart(2, '0');
const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : '—'; };
const shift = (s, n) => { const [y, m, d] = s.split('-').map(Number); return isoOf(new Date(y, m - 1, d + n)); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let db = { rows: [] };
try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (r && Array.isArray(r.rows)) db = r; } catch (e) {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ rows: db.rows })); } catch (e) { toast('Browser storage is blocked. Data will be lost on refresh.', true); } };
const UIKEY = 'plantReports.ui.v1';
const TODAY = isoOf(new Date());
/* every page remembers its own date, so switching pages never hides another page's saved data */
const ui = { page: 'nandan', dates: {}, all: false, entry: false, ent: null,
  get date() { return this.dates[this.page] || TODAY; },
  set date(v) { this.dates[this.page] = v; } };
const dateFor = rep => ui.dates[rep] || TODAY;
try { const s = JSON.parse(localStorage.getItem(UIKEY) || 'null'); if (s) { if (REPORTS[s.page] || s.page === 'mis' || s.page === 'rpt' || s.page === 'hst') ui.page = s.page; if (s.dates && typeof s.dates === 'object') for (const k in s.dates) if (REPORTS[k] && /^\d{4}-\d{2}-\d{2}$/.test(s.dates[k] || '')) ui.dates[k] = s.dates[k]; ui.all = !!s.all; } } catch (e) {}
const saveUI = () => { try { localStorage.setItem(UIKEY, JSON.stringify({ page: ui.page, dates: ui.dates, all: ui.all })); } catch (e) {} };

const $ = id => document.getElementById(id);
let tt;
function toast(msg, err) { const t = $('toast'); t.textContent = msg; t.className = 'toast on' + (err ? ' err' : ''); clearTimeout(tt); tt = setTimeout(() => t.className = 'toast', 3800); }
const live = () => { const dk = new Set(db.rows.filter(r => r.draft).map(r => r.rep + '|' + r.date)); return db.rows.filter(r => r.draft || !dk.has(r.rep + '|' + r.date)); };
const drafts = rep => db.rows.filter(r => r.draft && r.rep === rep);
const visible = (rep, sec) => live().filter(r => (!rep || r.rep === rep) && (!sec || r.sec === sec) && (ui.all || r.date === (rep ? dateFor(rep) : ui.date)));

/* ===== SHELL ===== */
const ICON = {
  nandan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l6 4V10l6 4V6h6v15z"/></svg>',
  sponge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>',
  billet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-4 9 4-9 4zM3 8v8l9 4 9-4V8M12 12v8"/></svg>',
  dhaatu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c1 3.2 5 5 5 10a5 5 0 01-10 0c0-2 1-3.3 2-4.2 0 1.8.8 2.7 1.8 3C10.5 8 10.8 5.5 12 3z"/></svg>',
  dbillet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5"/></svg>',
  wire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></svg>',
  manual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>'
};
ICON.hst = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5M12 7v5l3 2"/></svg>';
ICON.rpt = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M9 13h6M9 17h6"/></svg>';
ICON.mis = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>';
const TITLES = { mis: 'MIS Dashboard', rpt: 'Combined Reports (All Plants)', hst: 'History (All Plants)', nandan: 'Nandan Smelters Pvt Ltd Reports', sponge: 'Hindustan Iron & Sponge Reports (Sponge)', billet: 'Hindustan Iron & Sponge Reports (Billet)', dhaatu: 'Hindustan Dhaatu Reports (Sponge)', dbillet: 'Hindustan Dhaatu Reports (Billet)', wire: 'Hindustan Dhaatu Reports (Wire Rod)' };
function renderShell() {
  const items = [['mis', TITLES.mis], ['nandan', TITLES.nandan], ['sponge', TITLES.sponge], ['billet', TITLES.billet], ['dhaatu', TITLES.dhaatu], ['dbillet', TITLES.dbillet], ['wire', TITLES.wire], ['rpt', TITLES.rpt], ['hst', TITLES.hst]];
  $('nav').innerHTML = items.map(i =>
    `<button data-p="${i[0]}" class="${ui.page === i[0] ? 'on' : ''}"${ui.page === i[0] ? ' aria-current="page"' : ''}>${ICON[i[0]]}<span>${esc(i[1])}</span>${i[0] === 'mis' || i[0] === 'rpt' || i[0] === 'hst' ? '' : '<span class="n">' + visible(i[0]).length + '</span>'}</button>`).join('');
  $('nav').querySelectorAll('button').forEach(b => b.onclick = () => { ui.page = b.dataset.p; ui.tab = 'data'; ui.entry = false; ui.ent = null; setMenu(false); render(); });
  $('ttl').textContent = TITLES[ui.page];
  $('dtxt').textContent = fmtDate(ui.date);
  $('dinp').value = ui.date;
  $('datebar').classList.toggle('off', ui.all);
  $('datebar').style.display = ui.page === 'mis' ? 'none' : '';
}
/* ===== MIS DASHBOARD (saved records only, nothing hardcoded) ===== */
const MET = {
  nandan: { p: ['production', 2], i: ['incoming', 0], o: ['outgoing', 0], d: [['pending_sale', 0], ['pending_purchase', 0]] },
  sponge: { p: ['production', 2], i: ['incoming', 0], o: ['outgoing', 0], d: [['pending_sale', 0], ['pending_purchase', 0]] },
  dhaatu: { p: ['production', 0], i: ['incoming', 0], o: ['outgoing', 0], d: [['pending_sale', 0], ['pending_purchase', 0]] },
  dbillet: { p: ['production', 0], i: ['yincoming', 0], o: ['outgoing', 0], d: [['pending', 0]] },
  wire: { p: ['stock', 1], o: ['stock', 4] },
  billet: { p: ['billets', 1], o: ['billets', 3] }
};
const MK = [['p', 'Production', '#1f6fd1'], ['i', 'Incoming (Purchase)', '#e8871e'], ['o', 'Outgoing (Sales)', '#16794a'], ['d', 'Pending (latest balance)', '#b42318']];
const PCOL = ['#1f6fd1', '#16a085', '#e8871e', '#8e44ad', '#c0392b', '#5d6d7e'];
const mis = { plant: 'all', preset: 'monthly', from: '', to: '', ctx: null };
let charts = [];
const fnum = n => (Math.round(n * 100) / 100).toLocaleString('en-IN');
const dayN = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5) + 1;
const daysOf = (a, b) => { const o = []; for (let d = a; d <= b; d = shift(d, 1)) o.push(d); return o; };
const numv = v => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
const secSum = (rs, sec, ci) => { const a = rs.filter(r => r.sec === sec), b = a.filter(r => !/^\s*total/i.test(r.label)); return (b.length ? b : a).reduce((s, r) => s + numv(r.vals[ci]), 0); };
function misData() {
  const by = {}, out = {};
  db.rows.forEach(r => { if (r.draft || !MET[r.rep]) return; by[r.rep] = by[r.rep] || {}; (by[r.rep][r.date] = by[r.rep][r.date] || []).push(r); });
  for (const rep in by) { out[rep] = {}; for (const d in by[rep]) { const rs = by[rep][d], m = MET[rep], g = x => x ? secSum(rs, x[0], x[1]) : 0; out[rep][d] = { p: g(m.p), i: g(m.i), o: g(m.o), d: (m.d || []).reduce((s, x) => s + g(x), 0) }; } }
  return out;
}
function misTot(D, reps, a, b) {
  const o = {};
  reps.forEach(r => { const t = { p: 0, i: 0, o: 0, d: 0, n: 0 }; let ld = ''; for (const d in (D[r] || {})) if (d >= a && d <= b) { const x = D[r][d]; t.p += x.p; t.i += x.i; t.o += x.o; t.n++; if (d >= ld) { ld = d; t.d = x.d; } } o[r] = t; });
  return o;
}
const sumT = T => Object.values(T).reduce((s, t) => ({ p: s.p + t.p, i: s.i + t.i, o: s.o + t.o, d: s.d + t.d, n: s.n + t.n }), { p: 0, i: 0, o: 0, d: 0, n: 0 });
const gpct = (c, p) => p ? (c - p) / p * 100 : null;
const gtxt = (g, bad) => { const cls = g == null ? 'na' : ((g >= 0) !== !!bad ? 'up' : 'dn'); return '<i class="gr ' + cls + '">' + (g == null ? 'vs previous: no data' : (g >= 0 ? '▲ ' : '▼ ') + Math.abs(g).toFixed(1) + '% vs previous') + '</i>'; };
const tbl = (h, b, k) => '<div class="ovf"><table class="mt' + (k ? ' k' : '') + '"><thead><tr>' + h.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' + b.map(r => '<tr' + (r.attr ? ' ' + r.attr : '') + '>' + r.c.map(x => '<td>' + x + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
function misModal(t, html) { $('mtitle').textContent = t; $('mform').innerHTML = html + '<div class="actions" style="margin-top:14px"><button class="btn" id="mclose">Close</button></div>'; $('mclose').onclick = closeModal; $('modal').classList.add('on'); }
function renderMIS() {
  charts.forEach(c => c.destroy()); charts = [];
  const D = misData(), all = [...new Set(Object.values(D).flatMap(x => Object.keys(x)))].sort();
  if (!all.length) { $('view').innerHTML = '<div class="gap"><b>No saved data yet.</b> Upload a PDF or add a manual entry on any plant page and click Save. This dashboard reads only saved records.</div>'; return; }
  const N = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }, anchor = all[all.length - 1];
  let from, to = anchor;
  if (mis.preset === 'custom' && mis.from && mis.to) { from = mis.from; to = mis.to; if (from > to) [from, to] = [to, from]; }
  else if (mis.preset === 'fy') { const y = +anchor.slice(0, 4), m = +anchor.slice(5, 7); from = (m >= 4 ? y : y - 1) + '-04-01'; }
  else from = shift(to, -((N[mis.preset] || 30) - 1));
  const span = dayN(from, to), pto = shift(from, -1), pfrom = shift(from, -span);
  const reps = mis.plant === 'all' ? Object.keys(REPORTS) : [mis.plant], names = reps.map(r => REPORTS[r].name);
  const C = misTot(D, reps, from, to), P = misTot(D, reps, pfrom, pto), tc = sumT(C), tp = sumT(P);
  const bk = d => span <= 31 ? d : span <= 92 ? shift(d, -((new Date(d).getUTCDay() + 6) % 7)) : d.slice(0, 7);
  const bl = l => l.length === 10 ? (+l.slice(8)) + ' ' + MONTHS[+l.slice(5, 7) - 1] : MONTHS[+l.slice(5, 7) - 1] + ' ' + l.slice(0, 4);
  const labs = [...new Set(daysOf(from, to).map(bk))];
  const ser = (rs, k) => labs.map(l => rs.reduce((s, r) => s + Object.entries(D[r] || {}).reduce((q, [d, x]) => q + (d >= from && d <= to && bk(d) === l ? x[k] : 0), 0), 0));
  const order = reps.slice().sort((a, b) => C[b].p - C[a].p), withP = order.filter(r => C[r].p > 0);
  const best = withP[0], worst = withP.length > 1 ? withP[withP.length - 1] : null;
  const opt = (v, t, c) => '<option value="' + v + '"' + (c === v ? ' selected' : '') + '>' + t + '</option>';
  const cust = mis.preset === 'custom';
  mis.ctx = {
    from, to,
    sumHead: ['Plant', 'Production (MT)', 'Share %', 'Incoming (MT)', 'Outgoing (MT)', 'Pending (MT)', 'Production vs previous %'],
    sumBody: order.map(r => [REPORTS[r].name, fnum(C[r].p), tc.p ? (C[r].p / tc.p * 100).toFixed(1) : '0.0', fnum(C[r].i), fnum(C[r].o), fnum(C[r].d), gpct(C[r].p, P[r].p) == null ? '-' : gpct(C[r].p, P[r].p).toFixed(1)]),
    dayHead: ['Date', 'Plant', 'Production (MT)', 'Incoming (MT)', 'Outgoing (MT)', 'Pending (MT)'],
    dayBody: reps.flatMap(r => Object.keys(D[r] || {}).filter(d => d >= from && d <= to).sort().map(d => [fmtDate(d), REPORTS[r].name, fnum(D[r][d].p), fnum(D[r][d].i), fnum(D[r][d].o), fnum(D[r][d].d)])),
    by: reps.map(r => ({ r, n: REPORTS[r].name, c: C[r], p: P[r] }))
  };
  let h = '<div class="mf"><label>Plant<select id="mplant">' + opt('all', 'All plants', mis.plant) + Object.keys(REPORTS).map(r => opt(r, REPORTS[r].name, mis.plant)).join('') + '</select></label>'
    + '<label>Period<select id="mrange">' + [['daily', 'Daily (latest day)'], ['weekly', 'Weekly (7 days)'], ['monthly', 'Monthly (30 days)'], ['quarterly', 'Quarterly (90 days)'], ['yearly', 'Yearly (365 days)'], ['fy', 'Financial year (Apr-Mar)'], ['custom', 'Custom range']].map(x => opt(x[0], x[1], mis.preset)).join('') + '</select></label>'
    + (cust ? '<label>From<input type="date" id="mfrom" value="' + from + '"></label><label>To<input type="date" id="mto" value="' + to + '"></label>' : '')
    + '<div class="sp"><button class="btn" id="mpdf">Export PDF</button><button class="btn primary" id="mxl">Export Excel</button></div></div>';
  h += '<div class="hero"><div class="hl">Plant-wise MIS performance</div><div class="ht">' + fmtDate(from) + ' to ' + fmtDate(to) + '</div><p>(' + span + ' days; compared with ' + fmtDate(pfrom) + ' to ' + fmtDate(pto) + '). ' + (best ? 'Highest production: <b>' + esc(REPORTS[best].name) + '</b> (' + fnum(C[best].p) + ' MT' + (tc.p ? ', ' + (C[best].p / tc.p * 100).toFixed(1) + '% share' : '') + ').' : 'No production recorded in this period.') + (worst ? ' Lowest: <b>' + esc(REPORTS[worst].name) + '</b> (' + fnum(C[worst].p) + ' MT).' : '') + ' Total outgoing ' + fnum(tc.o) + ' MT against incoming ' + fnum(tc.i) + ' MT.</p></div>';
  h += '<div class="kpis" style="--n:5;grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">' + MK.map(m => '<div class="kpi mk4" data-k="' + m[0] + '" style="--c:' + m[2] + '"><span>' + m[1] + '</span><b>' + fnum(tc[m[0]]) + '<small>MT</small></b>' + gtxt(gpct(tc[m[0]], tp[m[0]]), m[0] === 'd') + '</div>').join('') + '<div class="kpi"><span>Reports saved</span><b>' + tc.n + '</b><i class="gr na">plant-days in range</i></div></div>';
  h += '<div class="gap"><b>Financial metrics not available.</b> Revenue, Expenses, Net Profit / Loss and Profit Margin cannot be calculated: the saved records hold quantities (MT) only, with no rates, amounts or cost heads, so nothing is shown instead of guessing. To enable them, the data needed is: sale rate and purchase rate per material, and plant-wise cost entries (raw material, power, labour, other). Tell me which of these you can capture and I will add the entry fields and the calculations.</div>';
  h += '<div class="mc" style="margin-bottom:14px"><h3>Plant-wise ranking (click a plant for daily detail)</h3>' + tbl(['Plant', 'Production (MT)', 'Share', 'Incoming', 'Outgoing', 'Pending', 'vs previous', 'Status'], order.map((r, i) => ({ attr: 'data-r="' + r + '"', c: [(i + 1) + '. ' + esc(REPORTS[r].name), fnum(C[r].p), tc.p ? (C[r].p / tc.p * 100).toFixed(1) + '%' : '-', fnum(C[r].i), fnum(C[r].o), fnum(C[r].d), gtxt(gpct(C[r].p, P[r].p)), C[r].n ? (r === best ? '<span class="tag hi">Top</span>' : r === worst ? '<span class="tag lo">Lowest</span>' : '<span class="tag">Active</span>') : '<span class="tag">No data</span>'] })), true) + '</div>';
  h += '<div class="mg">' + [['c1', 'Production share by plant'], ['c2', 'Plant-wise production (MT)'], ['c3', 'Production, incoming and outgoing trend'], ['c4', 'Incoming vs outgoing by plant'], ['c5', 'Production trend by plant (area)'], ['c6', 'Current vs previous period production']].map(x => '<div class="mc"><h3>' + x[1] + '</h3><div class="cv"><canvas id="' + x[0] + '"></canvas></div></div>').join('') + '</div>';
  h += '<div class="msum" style="font-size:12.5px;color:var(--muted)">Basis per plant (from saved sections): Nandan and Hindustan Sponge: production total, incoming, outgoing, pending sauda sale and purchase. Dhaatu Sponge: same. Dhaatu Billet: production, yesterday incoming, outgoing, pending. Wire Rod: production and dispatch from Billets and Wire Rod Stock. Hindustan Billet: production and dispatch from Billets Stock. Rows labelled TOTAL are not double counted.</div>';
  $('view').innerHTML = h;
  $('mplant').onchange = e => { mis.plant = e.target.value; renderMIS(); };
  $('mrange').onchange = e => { mis.preset = e.target.value; if (mis.preset === 'custom') { mis.from = from; mis.to = to; } renderMIS(); };
  if (cust) { $('mfrom').onchange = e => { mis.from = e.target.value; renderMIS(); }; $('mto').onchange = e => { mis.to = e.target.value; renderMIS(); }; }
  $('mxl').onclick = misXlsx; $('mpdf').onclick = misPdf;
  $('view').querySelectorAll('[data-k]').forEach(el => el.onclick = () => drillK(el.dataset.k));
  $('view').querySelectorAll('tr[data-r]').forEach(el => el.onclick = () => drillP(el.dataset.r));
  if (typeof Chart === 'undefined') { ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].forEach(id => { $(id).parentNode.innerHTML = '<p style="color:var(--muted)">Chart library could not load. Check the internet connection.</p>'; }); return; }
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.color = '#5f6d7a'; Chart.defaults.plugins.legend.labels.usePointStyle = true; Chart.defaults.elements.bar.borderRadius = 6; Chart.defaults.datasets.bar.maxBarThickness = 46; Chart.defaults.plugins.tooltip.backgroundColor = '#14202b'; Chart.defaults.plugins.tooltip.padding = 10; Chart.overrides.doughnut.cutout = '62%';
  const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  const mk = (id, cfg) => charts.push(new Chart($(id), cfg));
  const click = { onClick: (e, els) => { if (els.length) drillP(reps[els[0].index]); } };
  const cols = reps.map(r => PCOL[Object.keys(REPORTS).indexOf(r) % 6]);
  mk('c1', { type: 'doughnut', data: { labels: names, datasets: [{ data: reps.map(r => C[r].p), backgroundColor: cols, borderColor: '#fff', borderWidth: 3 }] }, options: Object.assign({}, base, click) });
  mk('c2', { type: 'bar', data: { labels: names, datasets: [{ label: 'Production (MT)', data: reps.map(r => C[r].p), backgroundColor: cols }] }, options: Object.assign({}, base, click, { plugins: { legend: { display: false } } }) });
  mk('c3', { type: 'line', data: { labels: labs.map(bl), datasets: [['p', 'Production', '#1f6fd1'], ['i', 'Incoming', '#e8871e'], ['o', 'Outgoing', '#16794a']].map(m => ({ label: m[1], data: ser(reps, m[0]), borderColor: m[2], backgroundColor: m[2], tension: .3, pointRadius: 2 })) }, options: base });
  mk('c4', { type: 'bar', data: { labels: names, datasets: [{ label: 'Incoming', data: reps.map(r => C[r].i), backgroundColor: '#e8871e' }, { label: 'Outgoing', data: reps.map(r => C[r].o), backgroundColor: '#16794a' }] }, options: Object.assign({}, base, click, { scales: { x: { stacked: true }, y: { stacked: true } } }) });
  mk('c5', { type: 'line', data: { labels: labs.map(bl), datasets: reps.map((r, i) => ({ label: names[i], data: ser([r], 'p'), fill: true, borderColor: cols[i], backgroundColor: cols[i] + '88', tension: .3, pointRadius: 0 })) }, options: Object.assign({}, base, { scales: { y: { stacked: true } } }) });
  mk('c6', { type: 'bar', data: { labels: names, datasets: [{ label: 'Previous period', data: reps.map(r => P[r].p), backgroundColor: '#b6c2cd' }, { label: 'Current period', data: reps.map(r => C[r].p), backgroundColor: '#1f6fd1' }] }, options: Object.assign({}, base, click) });
}
function drillK(k) {
  const m = MK.find(x => x[0] === k), c = mis.ctx;
  misModal(m[1] + ' by plant', tbl(['Plant', 'Current (MT)', 'Previous (MT)', 'Change'], c.by.map(x => ({ c: [esc(x.n), fnum(x.c[k]), fnum(x.p[k]), gtxt(gpct(x.c[k], x.p[k]), k === 'd')] }))));
}
function drillP(r) {
  const c = mis.ctx, n = REPORTS[r].name, rows = c.dayBody.filter(x => x[1] === n);
  misModal(n + ' · daily detail', rows.length ? tbl(['Date', 'Production', 'Incoming', 'Outgoing', 'Pending'], rows.map(x => ({ c: [x[0], x[2], x[3], x[4], x[5]] }))) : '<p>No saved data for this plant in the selected period.</p>');
}
async function misXlsx() {
  const c = mis.ctx; if (!c) return;
  const wb = new ExcelJS.Workbook();
  [['Plant Summary', c.sumHead, c.sumBody], ['Daily Detail', c.dayHead, c.dayBody]].forEach(s => { const ws = wb.addWorksheet(s[0]); ws.addRow(s[1]).font = { bold: true }; s[2].forEach(r => ws.addRow(r)); ws.columns.forEach(col => col.width = 22); });
  saveBlob(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'MIS_' + c.from + '_to_' + c.to + '.xlsx'); toast('Downloading Excel');
}
function misPdf() {
  const c = mis.ctx; if (!c) return;
  const doc = new window.jspdf.jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14); doc.text('Plant-Wise MIS Report: ' + fmtDate(c.from) + ' to ' + fmtDate(c.to), 14, 14);
  doc.autoTable({ head: [c.sumHead], body: c.sumBody, startY: 20, headStyles: { fillColor: [31, 73, 125] } });
  doc.autoTable({ head: [c.dayHead], body: c.dayBody, startY: doc.lastAutoTable.finalY + 8, headStyles: { fillColor: [31, 73, 125] } });
  saveBlob(doc.output('blob'), 'MIS_' + c.from + '_to_' + c.to + '.pdf'); toast('Downloading PDF');
}
/* ===== HISTORY ===== */
const fmtHD = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d); return m ? m[3] + '-' + MONTHS[+m[2] - 1] + '-' + m[1] : d; };
function tabsHtml(rep) {
  const n = new Set(db.rows.filter(r => !r.draft && r.rep === rep).map(r => r.date)).size;
  return '<div class="tabs"><button data-tab="data" class="' + (ui.tab !== 'hist' ? 'on' : '') + '">Report</button><button data-tab="hist" class="' + (ui.tab === 'hist' ? 'on' : '') + '">History <span class="n">' + n + '</span></button></div>';
}
function wireTabs() { $('view').querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { ui.tab = b.dataset.tab; ui.entry = false; render(); }); }
const hf = { from: '', to: '', q: '', plant: '' };
const CALSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
function renderHist(rep) {
  const all = (rep ? [rep] : RORDER).flatMap(r => [...new Set(db.rows.filter(x => !x.draft && x.rep === r).map(x => x.date))].sort().reverse().map(d => ({ r, d })));
  let h = rep ? tabsHtml(rep) : '';
  h += '<div class="mc"><h3>History' + (rep ? '' : ' \u00b7 all plants') + '</h3>';
  h += '<div class="hfilter">'
    + '<label class="hf-s"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input type="search" id="hq" placeholder="Search plant or date (e.g. Nandan, 25-Nov)" value="' + esc(hf.q) + '" autocomplete="off"></label>'
    + (rep ? '' : '<label class="hf-pl" title="Filter by plant"><select id="hplant" aria-label="Plant"><option value="">All plants</option>' + RORDER.map(r => '<option value="' + r + '"' + (hf.plant === r ? ' selected' : '') + '>' + esc(TITLES[r]) + '</option>').join('') + '</select></label>')
    + '<label class="hf-p" title="From date">' + CALSVG + '<input type="date" id="hfrom" aria-label="From date" value="' + esc(hf.from) + '"></label>'
    + '<span class="hf-to">to</span>'
    + '<label class="hf-p" title="To date">' + CALSVG + '<input type="date" id="hto" aria-label="To date" value="' + esc(hf.to) + '"></label>'
    + '<button class="btn sm" id="hclr">Clear</button></div>';
  h += '<div id="hcnt" class="hcnt"></div><div id="hlist"></div></div>';
  $('view').innerHTML = h;
  wireTabs();
  const draw = () => {
    const q = hf.q.trim().toLowerCase();
    const list = all.filter(x => {
      if (hf.from && x.d < hf.from) return false;
      if (hf.to && x.d > hf.to) return false;
      if (!rep && hf.plant && x.r !== hf.plant) return false;
      if (q && !(TITLES[x.r].toLowerCase().includes(q) || fmtHD(x.d).toLowerCase().includes(q) || x.d.includes(q))) return false;
      return true;
    });
    $('hcnt').textContent = all.length ? 'Showing ' + list.length + ' of ' + all.length + ' reports' : '';
    $('hlist').innerHTML = !all.length
      ? '<p style="color:var(--muted);margin:0">No saved reports yet. Upload a PDF and click Save.</p>'
      : !list.length
        ? '<p style="color:var(--muted);margin:0">No reports match this filter.</p>'
        : tbl(['S.No', 'Plant', 'Date', 'Preview', 'Download'], list.map((x, i) => ({ c: [i + 1, esc(TITLES[x.r]), fmtHD(x.d), '<button class="btn sm" data-hp="' + x.r + '|' + x.d + '">Preview</button>', '<button class="btn sm primary" data-hd="' + x.r + '|' + x.d + '">Download</button>'] }))).replace('class="mt"', 'class="mt h"');
    $('hlist').querySelectorAll('[data-hp]').forEach(b => b.onclick = () => { const [r, d] = b.dataset.hp.split('|'); openPreview(r, d); });
    $('hlist').querySelectorAll('[data-hd]').forEach(b => b.onclick = () => { const [r, d] = b.dataset.hd.split('|'); dlPdf(r, d); });
  };
  const sync = () => {
    if (hf.from && hf.to && hf.from > hf.to) { const t = hf.from; hf.from = hf.to; hf.to = t; }
    $('hfrom').value = hf.from; $('hto').value = hf.to;
    draw();
  };
  ['hfrom', 'hto'].forEach(id => {
    const el = $(id);
    el.onclick = () => { try { el.showPicker(); } catch (e) {} };
    el.onchange = () => { hf[id === 'hfrom' ? 'from' : 'to'] = el.value; sync(); };
  });
  if (!rep) $('hplant').onchange = e => { hf.plant = e.target.value; draw(); };
  $('hq').oninput = e => { hf.q = e.target.value; draw(); };
  $('hclr').onclick = () => { hf.from = hf.to = hf.q = hf.plant = ''; if (!rep) $('hplant').value = ''; $('hq').value = ''; sync(); };
  draw();
}
/* ===== ORIGINAL PDF STORE (file in IndexedDB, details in localStorage) ===== */
const OFKEY = 'plantReports.pdfmeta.v1';
let ofMeta = {}; try { ofMeta = JSON.parse(localStorage.getItem(OFKEY) || '{}') || {}; } catch (e) {}
const ofSaveMeta = () => { try { localStorage.setItem(OFKEY, JSON.stringify(ofMeta)); } catch (e) {} };
const ofIdb = () => new Promise((res, rej) => { const q = indexedDB.open('plantReportsPdf', 1); q.onupgradeneeded = () => q.result.createObjectStore('pdfs'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
const ofTx = (mode, fn) => ofIdb().then(d => new Promise((res, rej) => { const t = d.transaction('pdfs', mode), r = fn(t.objectStore('pdfs')); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }));
const ofKey = (rep, date) => rep + '|' + date;
async function ofPut(rep, date, file) {
  const k = ofKey(rep, date); ofMeta[k] = { name: file.name, size: file.size, at: Date.now() }; ofSaveMeta();
  try { await ofTx('readwrite', s => s.put(file, k)); } catch (e) { delete ofMeta[k]; ofSaveMeta(); toast('Could not store the original PDF in this browser', true); }
}
const ofGet = k => ofTx('readonly', s => s.get(k));
async function ofDel(k) { delete ofMeta[k]; ofSaveMeta(); try { await ofTx('readwrite', s => s.delete(k)); } catch (e) {} }
function pdfCard(rep) {
  const ks = Object.keys(ofMeta).filter(k => k.startsWith(rep + '|') && (ui.all || k === ofKey(rep, ui.date))).sort();
  if (!ks.length) return '<div class="opdf none"><b>Original PDF:</b> none saved for ' + (ui.all ? 'any date' : fmtDate(ui.date)) + '. ' + (!ui.all && live().some(r => r.rep === rep && r.date === ui.date) ? 'This date\'s data was saved before PDFs were stored. Attach its PDF: <button class="btn sm" data-oa="' + ui.date + '" style="margin-left:6px">Attach original PDF</button>' : 'Upload the PDF above and it is stored automatically along with its data.') + '</div>';
  return '<div class="opdf"><div class="oh">Original uploaded PDF</div>' + ks.map(k => { const m = ofMeta[k];
    return '<div class="orow"><div class="oi"><b>' + esc(m.name) + '</b><small>' + fmtDate(k.split('|')[1]) + ' \u00b7 ' + Math.max(1, Math.round(m.size / 1024)) + ' KB</small></div><div class="oa"><button class="btn sm" data-ov="' + k + '">View</button><button class="btn sm" data-od="' + k + '">Download</button><button class="btn sm" data-oa="' + k.split('|')[1] + '">Replace</button><button class="btn sm danger" data-ox="' + k + '">Remove</button></div></div>'; }).join('') + '</div>';
}
function wirePdfCard() {
  const v = $('view');
  v.querySelectorAll('[data-ov]').forEach(b => b.onclick = () => viewOrig(b.dataset.ov));
  v.querySelectorAll('[data-oa]').forEach(b => b.onclick = () => {
    const rp = ui.page, dt = b.dataset.oa, i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf';
    i.onchange = async () => { const f = i.files[0]; if (!f) return; if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return toast('Please choose a PDF file', true); await ofPut(rp, dt, f); render(); toast('Original PDF attached \u00b7 ' + fmtDate(dt)); };
    i.click();
  });
  v.querySelectorAll('[data-od]').forEach(b => b.onclick = () => dlOrig(b.dataset.od));
  v.querySelectorAll('[data-ox]').forEach(b => b.onclick = async () => { const m = ofMeta[b.dataset.ox]; if (m && confirm('Remove the stored original PDF "' + m.name + '"? The extracted data is not affected.')) { await ofDel(b.dataset.ox); render(); toast('Original PDF removed'); } });
}
async function dlOrig(k) {
  const m = ofMeta[k]; if (!m) return;
  try { const f = await ofGet(k); if (!f) throw new Error('missing'); saveBlob(f, /\.pdf$/i.test(m.name) ? m.name : m.name + '.pdf'); toast('Downloading original PDF'); }
  catch (e) { toast('The stored PDF could not be read. Upload it again.', true); }
}
async function viewOrig(k) {
  const m = ofMeta[k]; if (!m) return;
  pvCombined = false; pvOrig = k; $('pvxl').style.display = 'none';
  $('pvt').textContent = 'Original PDF \u00b7 ' + m.name;
  $('pvb').innerHTML = '<p style="padding:24px;color:var(--muted)">Loading\u2026</p>'; $('pv').classList.add('on');
  try {
    const f = await ofGet(k); if (!f) throw new Error('missing');
    await initPdf();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    $('pvb').innerHTML = '';
    const w = Math.min($('pvb').clientWidth || 800, 900);
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i), v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: w / v0.width * (window.devicePixelRatio || 1) });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      cv.style.cssText = 'width:100%;max-width:' + w + 'px;display:block;margin:0 auto 14px;box-shadow:0 2px 10px rgba(0,0,0,.2);background:#fff';
      $('pvb').appendChild(cv); await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    }
  } catch (e) { console.error(e); $('pvb').innerHTML = '<p style="padding:24px">The stored PDF could not be opened. Upload it again.</p>'; }
}
/* ===== COMBINED REPORT: all plants in one PDF ===== */
const RORDER = ['nandan', 'sponge', 'billet', 'dhaatu', 'dbillet', 'wire'], rptSel = {};
function addSheetPage(doc, rep, d) {
  /* shrink each plant sheet until it fits on ONE A4 page (never below 55%) */
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 20, BM = 26;
  const sp = sheetSpec(rep, d), tw = sp.W.reduce((a, b) => a + b, 0), s = (PW - 2 * M) / tw;
  const draw = (t, k) => {
    const body = sp.rows.map(r => r.cells.map(c => ({
      content: clean(c.t), colSpan: c.cs, rowSpan: c.rs,
      styles: Object.assign({
        halign: c.al, valign: 'middle', fontStyle: c.b ? 'bold' : 'normal', fontSize: (c.fs || sp.F) * s * k,
        textColor: hexRGB(c.color || '#000000'), fillColor: hexRGB(c.bg || '#ffffff'),
        minCellHeight: c.rs > 1 ? 0 : (r.h || 19) * s * k
      }, c.nb ? { lineWidth: 0 } : {})
    })));
    const cs = {}; sp.W.forEach((w, i) => cs[i] = { cellWidth: w * s * k });
    const side = (PW - tw * s * k) / 2;
    t.autoTable({
      startY: M, body, theme: 'grid', margin: { left: side, right: side, bottom: BM }, tableWidth: tw * s * k, columnStyles: cs,
      styles: { font: 'helvetica', cellPadding: { top: 1 * k, bottom: 1 * k, left: 2.5, right: 2.5 }, lineColor: [0, 0, 0], lineWidth: 0.6, overflow: 'linebreak' },
      tableLineColor: [0, 0, 0], tableLineWidth: 1.4
    });
  };
  let k = 1;
  for (; k > 0.55; k -= 0.03) {
    const t = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    draw(t, k);
    if (t.getNumberOfPages() === 1 && t.lastAutoTable.finalY <= PH - BM) break;
  }
  draw(doc, Math.max(k, 0.55));
}
function renderRPT() {
  ui.all = false; $('datebar').classList.remove('off');
  if (!ui.dates.rpt) { const ds = db.rows.filter(r => !r.draft).map(r => r.date).sort(); if (ds.length) ui.dates.rpt = ds[ds.length - 1]; }
  $('dtxt').textContent = fmtDate(ui.date); $('dinp').value = ui.date;
  const d = ui.date, info = RORDER.map(r => ({ r, n: live().filter(x => x.rep === r && x.date === d).length }));
  const sel = info.filter(x => x.n && rptSel[x.r] !== false), miss = info.filter(x => !x.n);
  let h = '<div class="hero"><div class="hl">Combined report</div><div class="ht">All plants \u00b7 ' + fmtDate(d) + '</div><p>Select the plants and download their reports together as <b>one PDF</b>. Pick the date from the top bar. Each plant keeps the same sheet layout as its own PDF.</p></div>';
  h += '<div class="mc"><h3>Plants included in the PDF</h3>' + tbl(['', 'Plant', 'Status', ''], info.map(x => ({ c: [
    '<input type="checkbox" data-c="' + x.r + '"' + (x.n ? '' : ' disabled') + (x.n && rptSel[x.r] !== false ? ' checked' : '') + ' aria-label="Include ' + esc(REPORTS[x.r].name) + '">',
    esc(REPORTS[x.r].name),
    x.n ? '<span class="tag hi">' + x.n + ' rows ready</span>' : '<span class="tag lo">No data for this date</span>',
    x.n ? '<div class="ra"><button class="btn sm" data-pv="' + x.r + '">Preview</button><button class="btn sm" data-pd="' + x.r + '">PDF</button>' + (ofMeta[ofKey(x.r, d)] ? '<button class="btn sm" data-ov="' + ofKey(x.r, d) + '">Original PDF</button>' : '') + '</div>' : ''] })), false).replace('class="mt"', 'class="mt r"');
  h += '<div class="rbar"><button class="btn" id="rprev"' + (sel.length ? '' : ' disabled') + '>Preview combined PDF</button><button class="btn primary" id="rall"' + (sel.length ? '' : ' disabled') + '>Download combined PDF (' + sel.length + ' plant' + (sel.length === 1 ? '' : 's') + ')</button>' + (miss.length ? '<span>' + miss.length + ' plant' + (miss.length === 1 ? ' has' : 's have') + ' no saved data for this date and will be left out.</span>' : '') + '</div></div>';
  $('view').innerHTML = h;
  $('view').querySelectorAll('[data-c]').forEach(c => c.onchange = () => { rptSel[c.dataset.c] = c.checked; renderRPT(); });
  $('view').querySelectorAll('[data-pv]').forEach(b => b.onclick = () => openPreview(b.dataset.pv));
  $('view').querySelectorAll('[data-pd]').forEach(b => b.onclick = () => dlPdf(b.dataset.pd));
  $('rall').onclick = dlCombined; $('rprev').onclick = previewCombined; wirePdfCard();
}
function buildCombined() {
  if (!window.jspdf || !window.jspdf.jsPDF) { toast('The PDF library did not load. Check your internet connection and refresh.', true); return null; }
  const d = ui.date, reps = RORDER.filter(r => rptSel[r] !== false && live().some(x => x.rep === r && x.date === d));
  if (!reps.length) { toast('No data for the selected date', true); return null; }
  const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  reps.forEach((r, i) => { if (i) doc.addPage(); addSheetPage(doc, r, d); });
  const n = doc.getNumberOfPages(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(110); doc.text('All Plants Combined Report \u00b7 ' + fmtDate(d) + ' \u00b7 Page ' + i + ' of ' + n, W / 2, H - 10, { align: 'center' }); }
  return { doc, reps, d };
}
function dlCombined() {
  try {
    const b = buildCombined(); if (!b) return;
    saveBlob(b.doc.output('blob'), 'All_Plants_Combined_Report_' + b.d + '.pdf'); toast('Downloading combined PDF \u00b7 ' + b.reps.length + ' plants');
  } catch (e) { console.error(e); toast('Could not create PDF: ' + (e.message || e), true); }
}
async function previewCombined() {
  let b; try { b = buildCombined(); } catch (e) { console.error(e); return toast('Could not create PDF: ' + (e.message || e), true); }
  if (!b) return;
  pvCombined = true; pvOrig = null; $('pvxl').style.display = 'none';
  $('pvt').textContent = 'Combined Report \u00b7 ' + fmtDate(b.d) + ' \u00b7 ' + b.reps.length + ' plants';
  $('pvb').innerHTML = '<p style="padding:24px;color:var(--muted)">Preparing preview\u2026</p>'; $('pv').classList.add('on');
  try {
    await initPdf();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(b.doc.output('arraybuffer')) }).promise;
    $('pvb').innerHTML = '';
    const w = Math.min($('pvb').clientWidth || 800, 900);
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i), v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: w / v0.width * (window.devicePixelRatio || 1) });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      cv.style.cssText = 'width:100%;max-width:' + w + 'px;display:block;margin:0 auto 14px;box-shadow:0 2px 10px rgba(0,0,0,.2);background:#fff';
      $('pvb').appendChild(cv); await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    }
  } catch (e) {
    console.error(e);
    $('pvb').innerHTML = b.reps.map(r => '<div class="tw" style="margin-bottom:18px;overflow:auto">' + sheetHTML(sheetSpec(r, b.d)) + '</div>').join('');
  }
}
function render() { renderShell(); renderReport(ui.page); saveUI(); }

const setMenu = on => { document.querySelector('.side').classList.toggle('open', on); $('scrim').classList.toggle('on', on); };
$('burger').onclick = () => setMenu(!document.querySelector('.side').classList.contains('open'));
$('scrim').onclick = () => setMenu(false);
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
window.addEventListener('resize', () => { if (innerWidth > 980) setMenu(false); });
$('prev').onclick = () => { ui.all = false; ui.date = shift(ui.date, -1); render(); };
$('next').onclick = () => { ui.all = false; ui.date = shift(ui.date, 1); render(); };
$('today').onclick = () => { ui.all = false; ui.date = isoOf(new Date()); render(); };
$('dinp').onchange = e => { if (e.target.value) { ui.all = false; ui.date = e.target.value; render(); } };
$('dinp').onclick = e => { try { e.target.showPicker && e.target.showPicker(); } catch (x) {} };

/* ===== CALCULATION CARDS ===== */
const cNum = v => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(x) ? 0 : x; };
const cFmt = n => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const cSum = (rows, i) => rows.reduce((a, r) => a + cNum(r.vals[i]), 0);
// uses the report's own TOTAL row when it has one, otherwise adds up the rows
const cTot = (rows, i) => { if (!rows.length) return null; const t = rows.filter(r => /^TOTAL\b/i.test(r.label)); return cSum(t.length ? t : rows, i); };
function calcCards(rep) {
  if (ui.all) return '';
  const g = sec => visible(rep, sec);
  const sub = (a, b) => a == null || b == null ? null : a - b;
  let K;
  if (rep === 'nandan') {
    const inc = cTot(g('incoming'), 0), out = cTot(g('outgoing'), 0), pr = g('production');
    const pt = pr.filter(r => /^TOTAL$/i.test(r.label.trim())), pn = pr.filter(r => !/\bTOTAL\b/i.test(r.label));
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
    const inc = cTot(g('incoming'), 0), out = cTot(g('outgoing'), 0), pr = g('production');
    const pt = pr.filter(r => /^TOTAL$/i.test(r.label.trim())), pn = pr.filter(r => !/\bTOTAL\b/i.test(r.label));
    const prod = pr.length ? (pt.length ? cSum(pt, 2) : cSum(pn, 2)) : null;
    const ga = pn.filter(r => /^A\s*GRADE/i.test(r.label)), gb = pn.filter(r => /^B\s*GRADE/i.test(r.label));
    const stk = re => { const r = g('stock').find(x => re.test(x.label)); return r ? cNum(r.vals[0]) : null; };
    const net = sub(inc, out);
    K = [
      { t: 'Sponge Stock', v: stk(/^TOTAL SPONGE/i), u: 'MT' },
      { t: 'Lloyd Iron Stock', v: stk(/^TOTAL LLOYD/i), u: 'MT' },
      { t: 'Iron Ore Pellet Stock', v: stk(/^TOTAL IRON ORE PELLET/i), u: 'MT' },
      { t: 'Incoming', v: inc, u: 'MT', c: 'in' },
      { t: 'Outgoing', v: out, u: 'MT', c: 'out' },
      { t: 'Net Movement', v: net, u: 'MT', s: 'Incoming \u2212 Outgoing', c: net == null ? '' : net >= 0 ? 'in' : 'out' },
      { t: 'Production (24 hr)', v: prod, u: 'MT', s: pr.length ? 'A Grade: ' + cFmt(cSum(ga, 2)) + ' \u00b7 B Grade: ' + cFmt(cSum(gb, 2)) : '' },
      { t: 'Pending Sale', v: cTot(g('pending_sale'), 0), u: 'MT' },
      { t: 'Pending Purchase', v: cTot(g('pending_purchase'), 0), u: 'MT' }
    ];
  } else if (rep === 'dhaatu') {
    const inc = cTot(g('incoming'), 0), out = cTot(g('outgoing'), 0), pr = g('production'), st = g('stock');
    const pt = pr.filter(r => /^TOTAL$/i.test(r.label.trim())), pn = pr.filter(r => !/\bTOTAL\b/i.test(r.label));
    const prod = pr.length ? (pt.length ? cSum(pt, 0) : cSum(pn, 0)) : null;
    const ga = pn.filter(r => /^A\s*GRADE/i.test(r.label)), gb = pn.filter(r => /^B\s*GRADE/i.test(r.label));
    const net = sub(inc, out);
    K = [
      { t: 'Sponge Iron Stock', v: st.length ? cSum(st.filter(r => /SPONGE IRON/i.test(r.label)), 0) : null, u: 'MT' },
      { t: 'Incoming', v: inc, u: 'MT', c: 'in' },
      { t: 'Outgoing', v: out, u: 'MT', c: 'out' },
      { t: 'Net Movement', v: net, u: 'MT', s: 'Incoming \u2212 Outgoing', c: net == null ? '' : net >= 0 ? 'in' : 'out' },
      { t: 'Production (24 hr)', v: prod, u: 'MT', s: pr.length ? 'A Grade: ' + cFmt(cSum(ga, 0)) + ' \u00b7 B Grade: ' + cFmt(cSum(gb, 0)) : '' },
      { t: 'Pending Sale', v: cTot(g('pending_sale'), 0), u: 'MT' },
      { t: 'Pending Purchase', v: cTot(g('pending_purchase'), 0), u: 'MT' }
    ];
  } else if (rep === 'wire') {
    const sm = re => { const r = g('summary').find(x => re.test(x.label)); return r ? cNum(r.vals[0]) : null; };
    const pd = re => { const r = g('production').find(x => re.test(x.label)); return r ? cNum(r.vals[0]) : null; };
    const cl = re => { const r = g('stock').find(x => re.test(x.label)); return r ? cNum(r.vals[5]) : null; };
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
    const sm = re => { const r = g('summary').find(x => re.test(x.label)); return r ? cNum(r.vals[0]) : null; };
    const pr = g('production'), gp = re => { const r = pr.find(x => re.test(x.label)); return r ? cNum(r.vals[0]) : 0; };
    K = [
      { t: 'Billets Stock', v: cTot(g('stock'), 0), u: 'MT' },
      { t: 'Billets Incoming', v: cTot(g('incoming'), 0), u: 'MT', c: 'in' },
      { t: 'Total Metal', v: sm(/^TOTAL METAL/i), u: 'MT' },
      { t: 'Structure Stock', v: sm(/^TOTAL STRUCTURE STOCK/i), u: 'MT', s: 'Light + Heavy' },
      { t: 'Total Sales', v: sm(/^TOTAL SALES/i), u: 'MT', c: 'out' },
      { t: 'Yest. Billet Incoming', v: cTot(g('yincoming'), 0), u: 'MT', c: 'in' },
      { t: 'Yest. Outgoing', v: cTot(g('outgoing'), 0), u: 'MT', c: 'out' },
      { t: 'Structure Prod. (24 hr)', v: cTot(pr, 0), u: 'MT', s: pr.length ? 'Light: ' + cFmt(gp(/GOOD QUALITY \(LIGHT/i)) + ' \u00b7 Heavy: ' + cFmt(gp(/GOOD QUALITY \(HEAVY/i)) : '' }
    ];
  } else {
    const sm = re => { const r = g('summary').find(x => re.test(x.label)); return r ? cNum(r.vals[0]) : null; };
    const bp = cTot(g('billets'), 1), cm = cTot(g('charge'), 4);
    K = [
      { t: 'Raw Material Consumed', v: cTot(g('raw'), 6) },
      { t: 'Charge Mix Consumed', v: cm },
      { t: 'Liquid Production', v: sm(/^TOTAL PRODUCTION \(LIQUID\)/i) },
      { t: 'Billet Production', v: bp },
      { t: 'Billet Dispatch', v: cTot(g('billets'), 3) },
      { t: 'Billet Closing Stock', v: cTot(g('billets'), 4) },
      { t: 'Finish Material (Solid)', v: sm(/FINISH MATERIAL/i) },
      { t: 'Yield %', v: bp != null && cm ? bp / cm * 100 : null, u: '%', s: 'Billet production ÷ Charge mix consumed' }
    ];
  }
  return `<div class="kpis" style="--n:${K.length}">` + K.map(c => `<div class="kpi ${c.c || ''}"><span>${esc(c.t)}</span><b>${c.v == null ? '—' : cFmt(c.v)}${c.u && c.v != null ? `<small>${c.u}</small>` : ''}</b>${c.s ? `<em>${esc(c.s)}</em>` : ''}</div>`).join('') + '</div>';
}

/* ===== REPORT PAGE ===== */
function renderReport(rep) {
  if (rep === 'mis') return renderMIS();
  if (rep === 'rpt') return renderRPT();
  if (rep === 'hst') return renderHist(null);
  if (ui.entry) return renderEntry(rep);
  const R = REPORTS[rep];
  if (ui.tab === 'hist') return renderHist(rep);
  let html = tabsHtml(rep) + `<div class="drop" id="drop">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M12 17v-6M9.5 13.5L12 11l2.5 2.5"/></svg>
    <div><p class="t" id="dt">Drop the ${esc(R.name)} PDF here</p><p class="s">The data is extracted automatically and shown in the tables below. The date is read from the PDF.</p></div>
    <div class="dact"><button class="btn primary" id="pick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3"/></svg>Choose PDF</button><button class="btn" id="mbtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>Manual entry</button></div>
    <input type="file" id="file" accept="application/pdf,.pdf" multiple hidden>
  </div>`;
  const total = visible(rep).length, nd = drafts(rep).length;
  html += pdfCard(rep);
  html += calcCards(rep);
  if (nd) html += `<div class="draft"><span><b>Not saved yet</b> · ${nd} rows were extracted. Review or edit them, then click Save.</span><div class="bact"><button class="btn primary sm" id="dsave">Save</button><button class="btn sm" id="dcancel">Cancel</button></div></div>`;
  if (!total) {
    html += `<div class="bar"><span>0 rows${ui.all ? '' : ' · ' + fmtDate(ui.date)}</span><div class="bact"><button class="btn sm primary" id="xsave">Save</button></div></div>`;
    html += `<div class="card empty"><b>${ui.all ? 'No data yet' : fmtDate(ui.date) + ' has no data'}</b>Upload a PDF or add a row from Manual Entry${ui.all ? '' : ', or pick another date above'}.</div>`;
  } else {
    html += `<div class="bar"><span>${total} rows${ui.all ? ' (all dates)' : ' · ' + fmtDate(ui.date)}</span><div class="bact"><button class="btn sm primary" id="xsave">Save</button><button class="btn sm" id="xpv">Preview</button><button class="btn sm" id="xpdf">PDF download</button><button class="btn sm" id="xxl">Excel download</button>${ui.all ? '' : '<button class="btn danger sm" id="delday">Delete all data for this date</button>'}</div></div>`;
    for (const [sk, S] of Object.entries(R.secs)) {
      const rows = visible(rep, sk);
      if (!rows.length) continue;
      html += `<section class="sec"><h2>${esc(S.t)} <small>${rows.length}</small></h2><div class="card tw"><table><thead><tr>${ui.all ? '<th>Date</th>' : ''}<th>Material</th>${S.cols.map(c => `<th class="${c[1] === 'n' ? 'num' : ''}">${esc(c[0])}</th>`).join('')}<th class="act">Action</th></tr></thead><tbody>` +
        rows.map(r => `<tr class="${/^TOTAL\b/i.test(r.label) ? 'tot' : ''}${S.cols.length === 1 ? ' one' : ''}">${ui.all ? `<td>${fmtDate(r.date)}</td>` : ''}<td class="lbl">${esc(r.label)}</td>${S.cols.map((c, i) => `<td class="${c[1] === 'n' ? 'num' : 'lbl'}"${S.cols.length > 1 ? ` data-l="${esc(c[0])}"` : ''}>${esc(r.vals[i])}</td>`).join('')}<td class="act"><button class="btn sm" data-e="${r.id}">Edit</button><button class="btn sm danger" data-d="${r.id}">Delete</button></td></tr>`).join('') +
        `</tbody></table></div></section>`;
    }
  }
  $('view').innerHTML = html;
  wireUpload(); wirePdfCard(); wireTabs();
  if ($('mbtn')) $('mbtn').onclick = () => { ui.entry = true; ui.ent = null; if (ui.all) { ui.all = false; ui.date = isoOf(new Date()); } render(); };
  $('view').querySelectorAll('[data-e]').forEach(b => b.onclick = () => openEdit(b.dataset.e));
  $('view').querySelectorAll('[data-d]').forEach(b => b.onclick = () => delRow(b.dataset.d));
  if ($('xsave')) $('xsave').onclick = () => saveReport(rep);
  if ($('dsave')) $('dsave').onclick = () => saveReport(rep);
  if ($('dcancel')) $('dcancel').onclick = () => { if (confirm('Discard the ' + drafts(rep).length + ' extracted rows? They have not been saved.')) { const ds = [...new Set(drafts(rep).map(r => r.date))]; db.rows = db.rows.filter(r => !(r.draft && r.rep === rep)); ds.forEach(d => { if (!db.rows.some(r => r.rep === rep && r.date === d)) ofDel(ofKey(rep, d)); }); persist(); render(); toast('Discarded'); } };
  if ($('xpv')) { $('xpv').onclick = () => openPreview(rep); $('xpdf').onclick = () => dlPdf(rep); $('xxl').onclick = () => dlXlsx(rep); }
  const dd = $('delday');
  if (dd) dd.onclick = () => {
    const n = visible(rep).length;
    if (confirm('Delete the ' + n + ' ' + R.name + ' rows for ' + fmtDate(ui.date) + '?')) { db.rows = db.rows.filter(r => !(r.rep === rep && r.date === ui.date)); ofDel(ofKey(rep, ui.date)); persist(); render(); toast('Deleted'); }
  };
}
function saveReport(rep) {
  const d = drafts(rep), n = visible(rep).length;
  if (d.length) {
    const keys = new Set(d.map(r => r.date));
    db.rows = db.rows.filter(r => r.draft || r.rep !== rep || !keys.has(r.date));
    d.forEach(r => delete r.draft);
  }
  persist(); render(); toast('Saved · ' + REPORTS[rep].name + ' · ' + n + ' rows');
}
window.addEventListener('pagehide', () => { persist(); saveUI(); });
function delRow(id) {
  const r = db.rows.find(x => x.id === id); if (!r) return;
  if (!confirm('Delete the row "' + r.label + '"?')) return;
  db.rows = db.rows.filter(x => x.id !== id); persist(); render(); toast('Row deleted');
}

/* ===== EXPORT: ORIGINAL-STYLE SHEET -> PREVIEW / PDF / EXCEL ===== */
const DARK = '#1f497d', LB = '#b8cce4', LB2 = '#dce6f1', LB3 = '#c5d9f1', GREEN = '#99ff66', ORANGE = '#ffcc66';
const clean = s => String(s == null ? '' : s).replace(/[–—]/g, '-');
const fmtDMY = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };
const nz = v => Parser.isNum(String(v == null ? '' : v)) && parseFloat(v) !== 0;
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
// cell: t text, cs/rs span, bg, color, b bold, al align, fs font px, nb no border, n numeric
const C = (t, o) => Object.assign({ t: t == null ? '' : String(t), cs: 1, rs: 1, b: 0, al: 'left' }, o || {});
const rowsOf = (rep, date, sec) => live().filter(r => r.rep === rep && r.date === date && r.sec === sec);
const hasRows = (rep, date) => live().some(r => r.rep === rep && r.date === date);

function specNandan(date) {
  const R = [], F = 12.5, spacer = () => R.push({ h: 6, cells: [C('', { cs: 5, fs: 2 })] });
  const head = t => R.push({ cells: [C(t, { cs: 5, bg: LB, b: 1, al: 'center' })] });
  R.push({ h: 34, cells: [C('NANDAN SMELTERS REPORT', { cs: 4, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 20 }), C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 17 })] });
  getRows('stock').forEach((r, i) => R.push({ cells: [C(i === 0 ? 'STOCK' : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
  spacer(); head('YESTERDAY INCOMING MATERIALS');
  getRows('incoming').forEach(r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
  spacer(); head('YESTERDAY OUTGOING MATERIALS');
  getRows('outgoing').forEach(r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
  spacer(); head('TOTAL PRODUCTION IN 24HR');
  R.push({ cells: ['GRADE', 'SPONGE', 'KILN 1', 'KILN 2', 'TOTAL'].map(t => C(t, { b: 1, al: 'center' })) });
  const prod = getRows('production').map(r => { const m = /^(.*?)\s+[–-]\s+(.*)$/.exec(r.label); return { g: m ? m[1] : '', name: m ? m[2] : r.label, v: r.vals }; });
  for (let i = 0; i < prod.length; i++) {
    const p = prod[i];
    if (/^TOTAL$/i.test(p.name)) { R.push({ cells: [C('TOTAL', { cs: 4, b: 1, al: 'center' }), C(p.v[2], { bg: LB, b: 1, al: 'center', n: 1 })] }); continue; }
    const cells = [];
    const first = i === 0 || prod[i - 1].g !== p.g || !p.g;
    if (first) { let k = 1; while (p.g && i + k < prod.length && prod[i + k].g === p.g) k++; cells.push(C(p.g, { rs: k, b: 1, al: 'center' })); }
    cells.push(C(p.name, { b: 1, al: 'center' }));
    [0, 1, 2].forEach(j => cells.push(C(p.v[j], { al: 'center', b: nz(p.v[j]), n: 1 })));
    R.push({ cells });
  }
  spacer();
  [['pending_sale', 'BALANCE PENDING OUTGOING (SAUDA SALE)', 'QTY OUT', 'SALE'], ['pending_purchase', 'BALANCE PENDING INCOMING (SAUDA PURCHASE)', 'QTY IN', 'PURCHASE']].forEach(([sec, t, q, side], si) => {
    R.push({ cells: [C(t, { cs: 4, bg: LB, b: 1, al: 'center' }), C(q, { bg: LB, b: 1, al: 'center' })] });
    getRows(sec).forEach((r, i) => R.push({ cells: [C(i === 0 ? side : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
    if (si === 0) spacer();
  });
  function getRows(sec) { return rowsOf('nandan', date, sec); }
  return { W: [173, 157, 196, 164, 150], F, rows: R };
}

function specSponge(date) {
  const R = [], F = 12.5, get = sec => rowsOf('sponge', date, sec), spacer = () => R.push({ h: 6, cells: [C('', { cs: 5, fs: 2 })] });
  const head = t => R.push({ cells: [C(t, { cs: 5, bg: LB, b: 1, al: 'center' })] });
  const line = r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] });
  R.push({ h: 34, cells: [C('HINDUSTAN IRON & SPONGE REPORT (SPONGE)', { cs: 4, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 20 }), C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 17 })] });
  get('stock').forEach((r, i) => {
    const first = C(i === 0 ? 'STOCK' : '', { b: 1 });
    if (/^TOTAL\b/i.test(r.label)) R.push({ cells: [first, C(r.label, { cs: 3, bg: LB2, b: 1, al: 'center' }), C(r.vals[0], { bg: LB2, b: 1, al: 'right', n: 1 })] });
    else R.push({ cells: [first, C(r.label, { cs: 2, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 }), C('')] });
  });
  spacer(); head('YESTERDAY INCOMING MATERIALS'); get('incoming').forEach(line);
  spacer(); head('YESTERDAY OUTGOING MATERIALS'); get('outgoing').forEach(line);
  spacer(); head('TOTAL PRODUCTION IN 24HR');
  R.push({ cells: ['GRADE', 'SPONGE', 'KILN 1', 'KILN 2', 'TOTAL'].map(t => C(t, { b: 1, al: 'center' })) });
  const prod = get('production').map(r => { const m = /^(.*?)\s+[\u2013-]\s+(.*)$/.exec(r.label); return { g: m ? m[1] : '', name: m ? m[2] : r.label, v: r.vals }; });
  for (let i = 0; i < prod.length; i++) {
    const p = prod[i];
    if (/^TOTAL$/i.test(p.name)) { R.push({ cells: [C('TOTAL', { cs: 4, b: 1, al: 'center' }), C(p.v[2], { bg: LB, b: 1, al: 'center', n: 1 })] }); continue; }
    const cells = [];
    const first = i === 0 || prod[i - 1].g !== p.g || !p.g;
    if (first) { let k = 1; while (p.g && i + k < prod.length && prod[i + k].g === p.g) k++; cells.push(C(p.g, { rs: k, b: 1, al: 'center' })); }
    cells.push(C(p.name, { b: 1, al: 'center' }));
    [0, 1, 2].forEach(j => cells.push(C(p.v[j], { al: 'center', b: nz(p.v[j]), n: 1 })));
    R.push({ cells });
  }
  spacer();
  [['pending_sale', 'BALANCE PENDING OUTGOING (SAUDA SALE)', 'QTY OUT', 'SALE'], ['pending_purchase', 'BALANCE PENDING INCOMING (SAUDA PURCHASE)', 'QTY IN', 'PURCHASE']].forEach(([sec, t, q, side], si) => {
    R.push({ cells: [C(t, { cs: 4, bg: LB, b: 1, al: 'center' }), C(q, { bg: LB, b: 1, al: 'center' })] });
    get(sec).forEach((r, i) => R.push({ cells: [C(i === 0 ? side : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
    if (si === 0) spacer();
  });
  return { W: [175, 205, 213, 210, 149], F, rows: R };
}
function specBillet(date) {
  const R = [], F = 11.5, NC = 11, spacer = () => R.push({ h: 7, cells: [C('', { cs: NC, fs: 2 })] });
  const get = sec => rowsOf('billet', date, sec);
  const num = (v, o) => C(v, Object.assign({ al: 'center', b: nz(v), n: 1 }, o || {}));
  const H = (t, o) => C(t, Object.assign({ b: 1, al: 'center' }, o || {}));
  R.push({ h: 32, cells: [C('HINDUSTAN IRON & SPONGE REPORT (BILLET)', { cs: 10, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 18 }), C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 13 })] });
  // raw material
  R.push({ cells: [C('RAW MATERIAL CONSUMPTION', { cs: NC, bg: LB2, b: 1, al: 'center' })] });
  R.push({ h: 20, cells: [H('MATERIAL', { rs: 2 }), H('OPENING', { rs: 2 }), H('RECEIVED', { cs: 2 }), H('TOTAL RECEIVED', { rs: 2 }), H('ISSUE', { rs: 2 }), H('TRANS.', { rs: 2 }), H('CONSUMPTION', { rs: 2 }), H('CLOSING', { rs: 2 }), H('KG/TONS', { rs: 2 }), H('KG/HEAT', { rs: 2 })] });
  R.push({ h: 20, cells: [H('OUT SIDE'), H('IN HOUSE')] });
  get('raw').forEach(r => {
    const tot = /^TOTAL$/i.test(r.label), bg = tot ? LB3 : undefined;
    R.push({ cells: [C(r.label, { b: 1, bg, al: tot ? 'center' : 'left' }), ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => num(r.vals[i], { bg, b: tot || nz(r.vals[i]) }))] });
  });
  // charge mix
  R.push({ cells: [C('CHARGE MIX MATERIAL', { cs: NC, bg: LB2, b: 1, al: 'center' })] });
  R.push({ h: 20, cells: [H('MATERIAL', { rs: 2 }), H('OPENING', { rs: 2 }), H('RECEIVED', { cs: 2 }), H('TOTAL RECEIVED', { rs: 2 }), H('CONSUMPTION', { rs: 2, cs: 2 }), H('CLOSING', { rs: 2, cs: 2 }), H('METAL %', { rs: 2, cs: 2 })] });
  R.push({ h: 20, cells: [H('OUT SIDE'), H('IN HOUSE')] });
  get('charge').forEach(r => {
    const tot = /^TOTAL$/i.test(r.label), bg = tot ? LB3 : undefined, o = i => num(r.vals[i], { bg, b: tot || nz(r.vals[i]) });
    R.push({ cells: [C(r.label, { b: 1, bg, al: tot ? 'center' : 'left' }), o(0), o(1), o(2), o(3), { ...o(4), cs: 2 }, { ...o(5), cs: 2 }, { ...o(6), cs: 2 }] });
  });
  // summary lookups
  const sm = {};
  get('summary').forEach(r => { sm[clean(r.label).toUpperCase()] = r; });
  const sv = label => { const r = sm[label]; return r ? r.vals[0] : ''; };
  const big = label => R.push({ cells: [C(label, { cs: 6, b: 1, al: 'center' }), num(sv(label), { cs: 5, b: 1 })] });
  big('TOTAL PRODUCTION (LIQUID)'); big('TOTAL CONSUMPTION');
  spacer();
  // billets blocks
  const bl = get('billets'); let gk = null;
  bl.forEach(r => {
    const g = /^BILLETS\s+(\d+)\s*X\s*(\d+)/i.exec(r.label), p = /^(\d+ X \d+ mm)\s+[–-]\s+(.*)$/.exec(r.label);
    const key = g ? g[1] + 'x' + g[2] : p ? p[1].replace(/\s*mm$/, '').replace(/\s*X\s*/, 'x') : '';
    if (key !== gk) {
      if (gk !== null) spacer();
      R.push({ cells: [C('', { cs: 3, nb: 1 }), H('OPENING'), H('PRODUCTION'), H('TRANSFER'), H('DISPATCH'), H('CLOSING', { cs: 2 }), H('REMARK', { cs: 2 })] });
      gk = key;
    }
    const name = p ? p[2] : r.label;
    const bg = /\(NORMAL\)/i.test(name) ? GREEN : /\(TESTED\)/i.test(name) ? ORANGE : /meter/i.test(name) ? LB : undefined;
    R.push({ cells: [C(name, { cs: 3, b: 1, al: 'center', bg }), num(r.vals[0]), num(r.vals[1]), num(r.vals[2]), num(r.vals[3]), num(r.vals[4], { cs: 2 }), C(r.vals[5], { cs: 2, b: 1, al: 'center' })] });
  });
  if (bl.length) spacer();
  big('TOTAL CONSUMPTION'); big('BURNING LOSS + SLAG'); big('TOTAL FINISH MATERIAL');
  spacer();
  // bottom block
  R.push({ cells: [H('TOTAL', { cs: 3 }), H('QTY'), H('SMS PRODUCTION', { cs: 7, bg: LB3 })] });
  const two = (l1, k1, l2, k2) => R.push({ cells: [C(l1, { cs: 3, b: 1, al: 'center' }), num(sv(k1), { b: 1 }), k2 ? C(l2, { cs: 4, b: 1, al: 'center' }) : C('', { cs: 7 }), ...(k2 ? [num(sv(k2), { cs: 3, b: 1 })] : [])] });
  two('PRODUCTION (LIQUID)', 'TOTAL PRODUCTION (LIQUID)', 'TOTAL PRODUCTION (LIQUID)', 'SMS PRODUCTION - TOTAL PRODUCTION (LIQUID)');
  two('TOTAL NORMAL BILLET', 'TOTAL NORMAL BILLET', 'STANDARD LOSS + LAUNDER LOSS', 'STANDARD LOSS + LAUNDER LOSS');
  two('TOTAL TESTED BILLET', 'TOTAL TESTED BILLET', 'TOTAL FINISH MATERIAL (SOLID)', 'TOTAL FINISH MATERIAL (SOLID)');
  two('TOTAL 4.3 meter, 5/4 meter, 2/3 Meter, Scraps/End Cut', 'TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT');
  R.push({ cells: [C('REPORTS & SMS REPORT DIFFERENCE QTY', { cs: 5, bg: LB, b: 1, al: 'center' }), num(sv('REPORTS & SMS REPORT DIFFERENCE QTY'), { cs: 6, b: 1 })] });
  const KNOWN = ['TOTAL PRODUCTION (LIQUID)', 'TOTAL CONSUMPTION', 'BURNING LOSS + SLAG', 'TOTAL FINISH MATERIAL', 'SMS PRODUCTION - TOTAL PRODUCTION (LIQUID)', 'TOTAL NORMAL BILLET', 'STANDARD LOSS + LAUNDER LOSS', 'TOTAL TESTED BILLET', 'TOTAL FINISH MATERIAL (SOLID)', 'TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT', 'REPORTS & SMS REPORT DIFFERENCE QTY'];
  get('summary').filter(r => !KNOWN.includes(clean(r.label).toUpperCase())).forEach(r => R.push({ cells: [C(r.label, { cs: 5, b: 1, al: 'center' }), num(r.vals[0], { cs: 6, b: 1 })] }));
  return { W: [145, 70, 69, 71, 89, 71, 75, 102, 76, 62, 97], F, rows: R };
}
function specDhaatu(date) {
  const R = [], F = 12.5, get = sec => rowsOf('dhaatu', date, sec), spacer = () => R.push({ h: 6, cells: [C('', { cs: 5, fs: 2 })] });
  const head = t => R.push({ cells: [C(t, { cs: 5, bg: LB, b: 1, al: 'center' })] });
  const line = r => R.push({ cells: [C(r.label, { cs: 4, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] });
  R.push({ h: 34, cells: [C('HINDUSTAN DHAATU REPORT (SPONGE)', { cs: 4, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 20 }), C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 17 })] });
  get('stock').forEach((r, i) => R.push({ cells: [C(i === 0 ? 'STOCK' : '', { b: 1 }), C(r.label, { cs: 3, b: 1 }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] }));
  spacer(); head('YESTERDAY INCOMING MATERIALS'); get('incoming').forEach(line);
  spacer(); head('YESTERDAY OUTGOING MATERIALS'); get('outgoing').forEach(line);
  spacer(); head('TOTAL PRODUCTION IN 24HR');
  get('production').forEach(r => {
    if (/^TOTAL$/i.test(r.label.trim())) return R.push({ cells: [C('TOTAL', { cs: 4, b: 1, al: 'center' }), C(r.vals[0], { bg: LB, b: 1, al: 'right', n: 1 })] });
    const m = /^([AB])\s*GRADE\s*(.*)$/i.exec(r.label);
    R.push({ cells: [C(m ? m[1].toUpperCase() + ' Grade' : '', { cs: 2, b: 1, al: 'center' }), C(m ? m[2] : r.label, { cs: 2, b: 1, al: 'center' }), C(r.vals[0], { al: 'right', b: nz(r.vals[0]), n: 1 })] });
  });
  spacer();
  [['pending_sale', 'BALANCE PENDING OUTGOING (SAUDA SALE)', 'QTY OUT'], ['pending_purchase', 'BALANCE PENDING INCOMING (SAUDA PURCHASE)', 'QTY IN']].forEach(([sec, t, q], si) => {
    R.push({ cells: [C(t, { cs: 4, bg: LB, b: 1, al: 'center' }), C(q, { bg: LB, b: 1, al: 'center' })] });
    get(sec).forEach(line); if (!si) spacer();
  });
  return { W: [173, 157, 196, 164, 150], F, rows: R };
}
function specWire(date) {
  const R = [], F = 11.5, NC = 8, get = sec => rowsOf('wire', date, sec), spacer = () => R.push({ h: 6, cells: [C('', { cs: NC, fs: 2 })] });
  const num = (v, o) => C(v, Object.assign({ al: 'center', b: nz(v), n: 1 }, o || {}));
  const H = (t, o) => C(t, Object.assign({ b: 1, al: 'center' }, o || {}));
  const isT = r => /^TOTAL$/i.test(r.label.trim());
  const MAIN = /^(TOTAL CONSUMPTION|TOTAL PRODUCTION \(LIQUID\))/i, MID = /^(STANDERD|TOTAL FINISH)/i, END = /^(BURNING|REPORTS)/i;
  const sum = re => get('summary').filter(r => re.test(r.label));
  const sline = rows => rows.forEach(r => R.push({ cells: [C(r.label, { cs: 5, b: 1, al: 'center' }), num(r.vals[0], { cs: 3, b: 1 })] }));
  const sect = t => R.push({ cells: [C(t, { cs: NC, bg: LB2, b: 1, al: 'center' })] });
  R.push({ h: 32, cells: [C('HINDUSTAN DHAATU REPORT (WIRE ROD)', { cs: 7, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 18 }), C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 13 })] });
  sect('RAW MATERIAL CONSUMPTION');
  R.push({ cells: ['MATERIAL', 'OPENING', 'RECEIVED', 'TRANSFER', 'CONSUMPTION', 'CLOSING', 'KG/T', 'KG/H'].map(t => H(t)) });
  get('raw').forEach(r => {
    const t = isT(r), cells = [C(r.label, { b: 1 })];
    for (let i = 0; i < 5; i++) cells.push(num(r.vals[i], t ? { bg: LB, b: 1 } : {}));
    if (t && !r.vals[5] && !r.vals[6]) cells.push(H('IN HOUSE MATERIAL', { cs: 2, fs: 9 })); else cells.push(num(r.vals[5]), num(r.vals[6]));
    R.push({ cells });
  });
  spacer(); sect('CHARGE MIX MATERIAL');
  R.push({ cells: [H('MATERIAL'), H('OPENING'), H('RECEIVED'), H('CONSUMPTION', { cs: 2 }), H('CLOSING'), H('METAL%', { cs: 2 })] });
  get('charge').forEach(r => { const o = isT(r) ? { bg: LB, b: 1 } : {}; R.push({ cells: [C(r.label, { b: 1 }), num(r.vals[0], o), num(r.vals[1], o), num(r.vals[2], Object.assign({ cs: 2 }, o)), num(r.vals[3], o), num(r.vals[4], Object.assign({ cs: 2 }, o))] }); });
  sline(sum(MAIN));
  spacer(); sect('BILLETS & WIRE ROD STOCK');
  R.push({ cells: [H('ITEM', { cs: 2 })].concat(['OPENING', 'PRODUCTION', 'REPAIR RECEIVED', 'TRANSFER', 'DISPATCH', 'CLOSING'].map(t => H(t, { fs: 10 }))) });
  get('stock').forEach(r => R.push({ cells: [C(r.label, { cs: 2, b: 1 })].concat([0, 1, 2, 3, 4, 5].map(i => num(r.vals[i]))) }));
  spacer();
  R.push({ cells: [H('', { cs: 3 })].concat(['REPAIR', 'REJECTION', 'WIRE END', 'MILL SCALE', 'END CUT'].map(t => H(t, { bg: LB }))) });
  get('scrap').forEach(r => R.push({ cells: [C(r.label, { cs: 3, b: 1 })].concat([0, 1, 2, 3, 4].map(i => num(r.vals[i]))) }));
  sline(sum(MID));
  spacer(); R.push({ cells: [C('TOTAL', { cs: 5, bg: LB, b: 1, al: 'center' }), C('QTY', { cs: 3, bg: LB, b: 1, al: 'center' })] });
  sline(get('production')); sline(sum(END));
  sline(get('summary').filter(r => ![MAIN, MID, END].some(re => re.test(r.label))));
  return { W: [128, 66, 66, 66, 80, 66, 64, 74], F, rows: R };
}
function specDBillet(date) {
  const R = [], F = 12, get = sec => rowsOf('dbillet', date, sec), spacer = () => R.push({ h: 6, cells: [C('', { cs: 3, fs: 2 })] });
  const isT = r => /^TOTAL$/i.test(r.label.trim());
  const val = (v, o) => C(v, Object.assign({ al: 'right', b: nz(v), n: 1 }, o || {}));
  const sizeHead = () => R.push({ cells: [C('SIZE', { cs: 2, bg: LB, b: 1, al: 'center' }), C('QTY', { bg: LB, b: 1, al: 'center' })] });
  const block = (title, rows) => {
    const body = rows.filter(r => !isT(r)), tot = rows.find(isT);
    body.forEach((r, i) => R.push({ cells: [i === 0 ? C(title, { rs: body.length, b: 1, al: 'center' }) : null, C(r.label, { b: 1, al: 'center' }), val(r.vals[0])].filter(Boolean) }));
    if (tot) R.push({ cells: [C('TOTAL', { cs: 2, b: 1, al: 'center' }), val(tot.vals[0], { bg: LB, b: 1 })] });
  };
  const list = (rows, hl) => rows.forEach(r => R.push({ cells: [C(r.label, { cs: 2, b: 1, al: 'center' }), val(r.vals[0], /^TOTAL\b/i.test(r.label) || hl ? { bg: LB, b: 1 } : {})] }));
  R.push({ h: 32, cells: [C('HINDUSTAN DHAATU REPORT (BILLET)', { cs: 2, bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 18 }), C(fmtDMY(date), { bg: DARK, color: '#ffffff', b: 1, al: 'center', fs: 15 })] });
  sizeHead(); block('BILLETS STOCK', get('stock')); block('BILLETS INCOMING', get('incoming')); list(get('summary'));
  spacer(); R.push({ cells: [C('YESTERDAY INCOMING & OUTGOING MATERIALS', { cs: 3, bg: LB, b: 1, al: 'center' })] });
  sizeHead(); block('BILLETS INCOMING', get('yincoming')); block('OUTGOING MATERIALS', get('outgoing'));
  spacer(); R.push({ cells: [C('TOTAL STRUCTURE PRODUCTION IN 24HR', { cs: 2, bg: LB, b: 1, al: 'center' }), C('QTY', { bg: LB, b: 1, al: 'center' })] });
  list(get('production'));
  spacer(); get('pending').forEach(r => R.push({ cells: [C(r.label, { cs: 2, b: 1 }), val(r.vals[0])] }));
  return { W: [150, 300, 120], F, rows: R };
}
const sheetSpec = (rep, date) => rep === 'nandan' ? specNandan(date) : rep === 'sponge' ? specSponge(date) : rep === 'dhaatu' ? specDhaatu(date) : rep === 'dbillet' ? specDBillet(date) : rep === 'wire' ? specWire(date) : specBillet(date);

function layoutCells(sp) {
  const occ = [], out = [];
  sp.rows.forEach((r, ri) => {
    let c = 0;
    r.cells.forEach(k => {
      while (occ[ri] && occ[ri][c]) c++;
      for (let y = 0; y < k.rs; y++) for (let x = 0; x < k.cs; x++) (occ[ri + y] = occ[ri + y] || [])[c + x] = 1;
      out.push({ r: ri, c, k }); c += k.cs;
    });
  });
  return out;
}
function sheetHTML(sp) {
  const tw = sp.W.reduce((a, b) => a + b, 0);
  let h = `<table class="sheet" style="width:${tw}px;min-width:${tw}px;table-layout:fixed;border-collapse:collapse;border:2px solid #000;background:#fff"><colgroup>${sp.W.map(w => `<col style="width:${w}px">`).join('')}</colgroup><tbody>`;
  sp.rows.forEach(r => {
    h += `<tr style="height:${r.h || 19}px">`;
    r.cells.forEach(k => {
      h += `<td${k.cs > 1 ? ' colspan="' + k.cs + '"' : ''}${k.rs > 1 ? ' rowspan="' + k.rs + '"' : ''} style="border:${k.nb ? 'none' : '1px solid #000'};padding:0 4px;white-space:normal;overflow:hidden;line-height:1.15;vertical-align:middle;font-size:${k.fs || sp.F}px;font-weight:${k.b ? 700 : 400};text-align:${k.al};color:${k.color || '#000'};background:${k.bg || '#fff'};font-family:Calibri,'Segoe UI',Arial,sans-serif">${esc(k.t)}</td>`;
    });
    h += '</tr>';
  });
  return h + '</tbody></table>';
}

function exportDates(rep) {
  if (!ui.all) return hasRows(rep, ui.date) ? [ui.date] : [];
  return [...new Set(live().filter(r => r.rep === rep).map(r => r.date))].sort();
}
const fname = (rep, ext, d) => REPORTS[rep].name.replace(/\s+/g, '_') + '_' + (d || (ui.all ? 'All_dates' : ui.date)) + '.' + ext;
let dlCap = null;
try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { dlCap = d; }).catch(() => {}); } catch (e) {}
function saveBlob(blob, name) {
  if (dlCap) { dlCap.save({ filename: name, data: blob }).catch(e => { if (!e || e.code !== 'declined') toast('Could not save the file: ' + ((e && (e.message || e.code)) || 'unknown error'), true); }); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

let pvRep = 'nandan', pvDate = null, pvCombined = false, pvOrig = null;
function openPreview(rep, only) {
  const dates = only ? [only] : exportDates(rep); if (!dates.length) return toast('No data to preview', true);
  pvCombined = false; pvOrig = null; $('pvxl').style.display = ''; pvRep = rep; pvDate = only || null; $('pvt').textContent = REPORTS[rep].name + ' Report - ' + (only ? fmtDate(only) : ui.all ? 'All dates' : fmtDate(ui.date));
  $('pvb').innerHTML = dates.map(d => `<div class="tw" style="margin-bottom:18px">${sheetHTML(sheetSpec(rep, d))}</div>`).join('');
  $('pv').classList.add('on');
  requestAnimationFrame(() => $('pvb').querySelectorAll('.tw').forEach(w => {
    const t = w.querySelector('table'); if (!t) return;
    t.style.transform = ''; w.style.height = ''; w.style.overflow = '';
    const k = w.clientWidth / t.offsetWidth;
    if (k < 1) {
      t.style.transformOrigin = '0 0'; t.style.transform = 'scale(' + k.toFixed(4) + ')';
      w.style.height = Math.ceil(t.offsetHeight * k) + 'px'; w.style.overflow = 'hidden';
    }
  }));
}
$('pvpdf').onclick = () => pvOrig ? dlOrig(pvOrig) : pvCombined ? dlCombined() : dlPdf(pvRep, pvDate);
$('pvxl').onclick = () => dlXlsx(pvRep, pvDate);
$('pvx').onclick = closeModal;

function dlPdf(rep, only) {
  if (!window.jspdf || !window.jspdf.jsPDF) return toast('The PDF library did not load. Check your internet connection and refresh.', true);
  const dates = only ? [only] : exportDates(rep); if (!dates.length) return toast('No data to export', true);
  try {
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth(), M = 20;
    dates.forEach((d, di) => { if (di) doc.addPage(); addSheetPage(doc, rep, d); });
    saveBlob(doc.output('blob'), fname(rep, 'pdf', only)); toast('Downloading PDF');
  } catch (e) { console.error(e); toast('Could not create PDF: ' + (e.message || e), true); }
}

async function dlXlsx(rep, only) {
  if (!window.ExcelJS) return toast('The Excel library did not load. Check your internet connection and refresh.', true);
  const dates = only ? [only] : exportDates(rep); if (!dates.length) return toast('No data to export', true);
  try {
    const wb = new ExcelJS.Workbook();
    const thin = { style: 'thin', color: { argb: 'FF000000' } }, box = { top: thin, left: thin, bottom: thin, right: thin };
    dates.forEach(d => {
      const sp = sheetSpec(rep, d), ws = wb.addWorksheet(fmtDMY(d));
      ws.columns = sp.W.map(w => ({ width: w / 6.4 }));
      sp.rows.forEach((r, i) => ws.getRow(i + 1).height = (r.h || 19) * 0.78);
      layoutCells(sp).forEach(({ r, c, k }) => {
        const r1 = r + 1, c1 = c + 1, r2 = r + k.rs, c2 = c + k.cs;
        if (k.rs > 1 || k.cs > 1) ws.mergeCells(r1, c1, r2, c2);
        for (let y = r1; y <= r2; y++) for (let x = c1; x <= c2; x++) if (!k.nb) ws.getCell(y, x).border = box;
        const cell = ws.getCell(r1, c1);
        if (k.n && Parser.isNum(k.t)) { cell.value = Number(k.t); const dec = (k.t.split('.')[1] || '').length; cell.numFmt = dec ? '0.' + '0'.repeat(dec) : '0'; }
        else cell.value = clean(k.t);
        cell.font = { name: 'Calibri', size: Math.round((k.fs || sp.F) * 0.75 * 10) / 10 + 1, bold: !!k.b, color: { argb: 'FF' + (k.color || '#000000').slice(1).toUpperCase() } };
        cell.alignment = { horizontal: k.al, vertical: 'middle', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (k.bg || '#ffffff').slice(1).toUpperCase() } };
      });
      ws.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
      ws.views = [{ showGridLines: false }];
    });
    const buf = await wb.xlsx.writeBuffer();
    saveBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fname(rep, 'xlsx', only));
    toast('Downloading Excel file');
  } catch (e) { console.error(e); toast('Could not create Excel file: ' + (e.message || e), true); }
}

/* ===== PDF UPLOAD ===== */
const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let pdfReady = false;
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('PDF worker failed to load')); document.head.appendChild(s); });
}
async function initPdf() {
  if (pdfReady) return;
  if (!window.pdfjsLib) throw new Error('pdf.js did not load. Check your internet connection and refresh the page.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
  // load the worker script through a normal <script> tag (works even when blob/Worker is blocked)
  if (!window.pdfjsWorker) { try { await loadScript(WORKER); } catch (e) { console.warn(e); } }
  pdfReady = true;
}
async function extractPdf(file) {
  await initPdf();
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = []; let h = 792;
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i); h = p.getViewport({ scale: 1 }).height;
    pages.push((await p.getTextContent()).items);
  }
  return Parser.parse(pages, h);
}
function wireUpload() {
  const drop = $('drop'), file = $('file');
  $('pick').onclick = () => file.click();
  file.onchange = () => { handleFiles([...file.files]); file.value = ''; };
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => handleFiles([...e.dataTransfer.files]));
}
async function handleFiles(files) {
  files = files.filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
  if (!files.length) return toast('Please choose a PDF file', true);
  const dt = $('dt'); if (dt) dt.innerHTML = '<span class="spin"></span>Reading PDF…';
  let last = null;
  for (const f of files) {
    try {
      const res = await extractPdf(f);
      if (!res.report) { toast(f.name + ': this does not look like one of the 6 supported reports', true); continue; }
      if (!res.rows.length) { toast(f.name + ': no data found (it may be a scanned PDF)', true); continue; }
      const date = res.date || ui.date;
      const old = db.rows.filter(r => !r.draft && r.rep === res.report && r.date === date);
      if (old.length && !confirm(REPORTS[res.report].name + ' already has data for ' + fmtDate(date) + ' (' + old.length + ' rows). OK = replace the data with this PDF. Cancel = keep the old data and only store this PDF as its original.')) { await ofPut(res.report, date, f); ui.page = res.report; ui.dates[res.report] = date; toast('Original PDF stored. Existing data was kept.'); continue; }
      db.rows = db.rows.filter(r => !(r.draft && r.rep === res.report && r.date === date));
      res.rows.forEach(r => db.rows.push({ id: uid(), date, rep: res.report, sec: r.sec, label: r.label, vals: r.vals, draft: true }));
      ui.dates[res.report] = date;
      await ofPut(res.report, date, f);
      last = { rep: res.report, date, n: res.rows.length };
      persist();
    } catch (e) { console.error(e); toast(f.name + ': ' + (e.message || 'Could not read the PDF'), true); }
  }
  if (last) { ui.page = last.rep; ui.date = last.date; ui.all = false; render(); toast(last.n + ' rows extracted · ' + fmtDate(last.date) + ' · review and click Save'); }
  else render();
}

/* ===== FORM (manual entry + edit) ===== */
function buildForm(root, o) {
  const st = { rep: o.rep, sec: o.sec, date: o.date, label: o.label || '', vals: (o.vals || []).slice() };
  function grab() {
    const q = s => root.querySelector(s);
    if (q('#f-date')) st.date = q('#f-date').value;
    if (q('#f-label')) st.label = q('#f-label').value;
    st.vals = [...root.querySelectorAll('[data-i]')].map(i => i.value);
  }
  function draw() {
    const S = REPORTS[st.rep].secs[st.sec];
    const labels = [...new Set(db.rows.filter(r => r.rep === st.rep && r.sec === st.sec).map(r => r.label))];
    root.innerHTML = `<div class="form"><div class="grid">
      ${o.lock ? '' : `<label>Report<select id="f-rep">${Object.entries(REPORTS).map(([k, v]) => `<option value="${k}" ${k === st.rep ? 'selected' : ''}>${v.name}</option>`).join('')}</select></label>
      <label>Section<select id="f-sec">${Object.entries(REPORTS[st.rep].secs).map(([k, v]) => `<option value="${k}" ${k === st.sec ? 'selected' : ''}>${esc(v.t)}</option>`).join('')}</select></label>`}
      <label>Date<input type="date" id="f-date" value="${esc(st.date)}"></label>
      <label class="wide">Material / Name<input id="f-label" list="f-dl" autocomplete="off" value="${esc(st.label)}" placeholder="e.g. SPONGE IRON"><datalist id="f-dl">${labels.map(l => `<option value="${esc(l)}">`).join('')}</datalist></label>
      ${S.cols.map((c, i) => `<label>${esc(c[0])}<input data-i="${i}" ${c[1] === 'n' ? 'inputmode="decimal"' : ''} value="${esc(st.vals[i] || '')}"></label>`).join('')}
    </div><div class="actions"><button class="btn primary" id="f-save">${o.saveText || 'Save'}</button>${o.onCancel ? '<button class="btn" id="f-cancel">Cancel</button>' : ''}</div></div>`;
    const rs = root.querySelector('#f-rep'), ss = root.querySelector('#f-sec');
    if (rs) rs.onchange = () => { grab(); st.rep = rs.value; st.sec = Object.keys(REPORTS[st.rep].secs)[0]; st.vals = []; draw(); };
    if (ss) ss.onchange = () => { grab(); st.sec = ss.value; st.vals = []; draw(); };
    const c = root.querySelector('#f-cancel'); if (c) c.onclick = o.onCancel;
    root.querySelector('#f-save').onclick = () => {
      grab();
      if (!st.date) return toast('Choose a date', true);
      if (!st.label.trim()) return toast('Enter the material name', true);
      const S2 = REPORTS[st.rep].secs[st.sec];
      const vals = S2.cols.map((c, i) => { let v = (st.vals[i] || '').trim(); if (c[1] === 'n') v = v.replace(/,/g, '.'); return v; });
      for (let i = 0; i < vals.length; i++) if (S2.cols[i][1] === 'n' && vals[i] !== '' && !Parser.isNum(vals[i])) return toast(S2.cols[i][0] + ' must be a number', true);
      if (vals.every(v => v === '')) return toast('Enter at least one value', true);
      o.onSave({ rep: st.rep, sec: st.sec, date: st.date, label: st.label.trim(), vals });
      if (o.reset) { st.label = ''; st.vals = []; draw(); const l = root.querySelector('#f-label'); if (l) l.focus(); }
    };
  }
  draw();
}

/* ===== MANUAL ENTRY (per report, follows the report format) ===== */
const DEF = {
  nandan: { production: ['TOTAL'] },
  sponge: {
    stock: ['IRON PELLET', 'BACK FLOW PELLET', 'TOTAL IRON ORE PELLET (GREEN PELLET)', 'LLOYD IRON (10-40 mm)', 'LLOYD (10-40 mm)', 'TOTAL LLOYD IRON', 'SPONGE PELLET', 'SPONGE IRON (0-20)', 'MIX (PELLET + IRON)', 'LOW MAG', 'TOTAL SPONGE', 'IRON FINES', 'DOLOMITE', 'COAL', 'CHAR', 'DOLACHAR'],
    incoming: ['DOLOCHAR', 'SPONGE IRON', 'IRON ORE', 'CHAR COAL', 'COAL/COAL FINES', 'SCRAP', 'DOLOMITE', 'SODIUM SILICATE', 'SILICO MANGANESE', 'IRON ORE PELLET'],
    outgoing: ['SPONGE IRON', 'SPONGE PELLET', 'BILLET 110 x 110 (TESTED)', 'BILLET 160 x 160 (TESTED)', 'BILLET 125 x 125 (TESTED)', 'SLAG', 'BED MATERIAL', 'FLYASH', 'ESP DUST', 'LOW MAG', 'CHAR'],
    production: ['A Grade \u2013 SPONGE IRON (0-20)', 'A Grade \u2013 SPONGE PELLET', 'B Grade \u2013 SPONGE IRON (0-20)', 'B Grade \u2013 SPONGE PELLET', 'TOTAL'],
    pending_sale: ['SPONGE IRON (0-20)', 'SPONGE PELLET', 'BILLET 110 x 110 (TESTED)', 'BILLET 125 x 125 (NORMAL)', 'BILLET 125 x 125 (TESTED)', 'BILLET 125 x 125 (RANDOM)', 'BILLET 160 x 160 (NORMAL)', 'BILLET 160 x 160 (TESTED)', 'BILLET 160 x 160 (RANDOM)', 'BILLET 160 (TESTED/ NORMAL)', 'CHAR', 'SLAG'],
    pending_purchase: ['IRON ORE', 'COAL/COAL FINES', 'IRON ORE PELLET', 'DOLOMITE', 'DOLOCHAR', 'SILICO MANGANESE', 'SPONGE IRON (0-20)', 'SPONGE PELLET', 'SCRAP']
  },
  wire: {
    raw: ['SILICO MN', 'LC FE.MN', 'H.C FE.MN', 'MN. POWDER', 'CALCIUM SILICATE', 'S POWER', 'COAL(ANTHRA)', 'COAL(CAL.PETRO)', 'CARBON BLOCK', 'LDS POWER', 'TOTAL'],
    charge: ['SPONGE 0-20', 'PELLET (NOR)', 'PELLET (LSP)', 'SCRAP', 'BEAT WIRE', 'C. IRON', 'DANA', 'DRI CARBON', 'TOTAL'],
    stock: ['BILLETS (COOLING BED)', 'MISS ROLL (COIL)', 'WIRE ROD (COIL)', 'MSTM PRODUCTION (CCM)'],
    scrap: ['REPAIR, REJECTION, WIRE END, MILL SCALE & END CUT'],
    production: ['PRODUCTION (LIQUID)', 'WIRE ROD', 'MSTM PROD.', 'BILLET', 'MISS ROLL + REPAIR + REJECTION'],
    summary: ['TOTAL CONSUMPTION', 'TOTAL PRODUCTION (LIQUID)', 'STANDERD + LAUNDER LOSS', 'TOTAL FINISH MATERIA (SOLID)', 'BURNING LOSS + SLAG', 'REPORTS & SMS REPORT DIFFERENCE QTY']
  },
  dbillet: {
    stock: ['125X125 (NORMAL)', '125X125 (TESTED)', '125X125 (LOW MAGNESIUM)', '160X160 (NORMAL)', '160X160 (WRM TO STM)', '160X160 (TESTED)', '160X200 (NORMAL)', '160X200 (TESTED)', '200X160 (HIGH MN%)', '200X160 (HIGH C%)', '200X200 (NORMAL)', '200X200 (TESTED) (MS & HI)', '200X250 (NORMAL)', 'TOTAL'],
    incoming: ['125X125 (NORMAL)', '160X160 (NORMAL)', '200X160 (NORMAL)', '125X125 (TESTED)', '160X160 (TESTED)', '200X160 (TESTED)', '200X200 (TESTED)', '125X125 (HIGH GRADE TESTED)', '200X200 (HIGH GRADE TESTED)', 'TOTAL'],
    summary: ['TOTAL BILLETS STOCK AND INCOMING', 'BURNING & END CUTTING (@6%)', 'LESS AFTER BURNING LOSS', 'STRUCTURE STOCK (LIGHT)', 'STRUCTURE STOCK (HEAVY)', 'TOTAL STRUCTURE STOCK (LIGHT + HEAVY)', 'ORDER OUT (LIGHT SALE)', 'ORDER OUT (HEAVY SALE)', 'TOTAL SALES (LIGHT + HEAVY)', 'TOTAL METAL'],
    yincoming: ['125X125 (NORMAL)', '125X125 (TESTED)', '160X200 (NORMAL)', '160X200 (TESTED)', '160X160 (NORMAL)', '200X200 (NORMAL)', '200X200 (TESTED)', 'TOTAL'],
    outgoing: ['MS BEAM / MS CHANNEL/ANGLE/FLAT', 'WIRE ROD', 'MS SLAG (SMS)', 'MILL SCALE (MSM)', 'SPONGE IRON (TRADING)', 'MISS ROLL (WRM)', 'MS SCRAP (TRADING)', 'BILLET (RANDOM)', 'BILLET', 'TOTAL'],
    production: ['GOOD QUALITY (LIGHT)', 'GOOD QUALITY (HEAVY)', 'REJECT LAHAR MATERIAL', 'BEND MATERIAL', 'REJECTED RET CUTTING', 'DAGI/REPAIR', 'REJECTED DIMENSIONAL VARIATION', 'LOW DIMENSION & LOW THKNISS', 'REJECTED LENGTH', 'MISS ROLL (REUSE MATERIAL)', 'COLD PCS (REUSE MATERIAL)', 'TOTAL'],
    pending: ['BALANCE PENDING OUTGOING (160 X 160 TESTED BILLET )', 'BALANCE PENDING OUTGOING (RANDOM SIZE BILLET)', 'BALANCE PENDING OUTGOING (MILL SCALE)']
  },
  dhaatu: {
    stock: ['RAW IRON ORE (10-40)', 'RAW PELLET ORE (IRON ORE PELLET)', 'PROCESSED IRON ORE (3-18)', 'IRON FINES (0-3)', 'COAL', 'SPONGE PELLET', 'DOLOMITE', 'NON MAG (CHAR + DOLOCHAR)', 'SPONGE IRON'],
    incoming: ['IRON ORE (10-20)', 'IRON ORE (10-40)', 'STONE CHIPS S.A.', 'COAL', 'SAND', 'DOLOMITE', 'SPONGE IRON (RETUN)', 'DOLOCHAR', 'IRON ORE LLOYDS METALS'],
    outgoing: ['SPONGE IRON (INTERNAL SMS)', 'IRON ORE FINES', 'IRON ORE PELLET (GREEN PELLET)', 'GASIFIRE ASH', 'BED MATERAL', 'SPONGE IRON', 'COAL'],
    production: ['A Grade SPONGE IRON', 'B Grade SPONGE IRON', 'TOTAL'],
    pending_sale: ['GASIFIRE ASH', 'CHAR', 'IRON ORE FINES', 'SPONGE IRON'],
    pending_purchase: ['IRON ORE', 'COAL/SID', 'STEAM COAL/GASIFIRE', 'DOLOCHAR/COAL (POWER PLANT)', 'DOLOMITE']
  },
  billet: { summary: ['TOTAL PRODUCTION (LIQUID)', 'SMS PRODUCTION – TOTAL PRODUCTION (LIQUID)', 'TOTAL NORMAL BILLET', 'STANDARD LOSS + LAUNDER LOSS', 'TOTAL TESTED BILLET', 'TOTAL FINISH MATERIAL (SOLID)', 'REPORTS & SMS REPORT DIFFERENCE QTY', 'TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT'] }
};
function entryRows(rep, sk) {
  const L = live().filter(r => r.rep === rep);
  const own = L.filter(r => r.sec === sk && r.date === ui.date);
  if (own.length) return own.map(r => ({ label: r.label, vals: r.vals.slice() }));
  const prev = L.filter(r => r.date < ui.date).map(r => r.date).sort().pop();
  const tpl = prev ? L.filter(r => r.sec === sk && r.date === prev).map(r => ({ label: r.label, vals: [] })) : [];
  return tpl.length ? tpl : ((DEF[rep] || {})[sk] || []).map(l => ({ label: l, vals: [] }));
}
function renderEntry(rep) {
  const R = REPORTS[rep];
  if (!ui.ent || ui.ent.rep !== rep || ui.ent.date !== ui.date) { ui.ent = { rep, date: ui.date, secs: {} }; for (const sk in R.secs) ui.ent.secs[sk] = entryRows(rep, sk); }
  const E = ui.ent;
  let html = `<div class="ehead"><b>${esc(R.name)}</b><span>Manual entry for ${fmtDate(ui.date)} · change the date from the top bar</span></div>`;
  for (const [sk, S] of Object.entries(R.secs)) {
    const rows = E.secs[sk], one = S.cols.length === 1;
    html += `<section class="esec"><div class="esh"><h2>${esc(S.t)}</h2><span class="ecnt">${rows.length}</span><button class="btn sm" data-a="${sk}">+ Add row</button></div>`;
    html += rows.length ? rows.map((r, i) => `<div class="er${one ? ' one' : ''}" data-s="${sk}" data-i="${i}"><input class="el" placeholder="Material / name" value="${esc(r.label)}"><button class="ex" title="Remove row" data-x="${sk}|${i}">✕</button><div class="efs">${S.cols.map((c, j) => `<label class="ef"><span>${esc(c[0])}</span><input class="ev" ${c[1] === 'n' ? 'inputmode="decimal"' : ''} placeholder="${one ? esc(c[0]) : (c[1] === 'n' ? '0' : '')}" value="${esc(r.vals[j] || '')}"></label>`).join('')}</div></div>`).join('') : `<div class="eempty">No rows yet. Click “+ Add row”.</div>`;
    html += `</section>`;
  }
  html += `<div class="efoot"><span id="ecount"></span><div><button class="btn" id="ecancel">Cancel</button><button class="btn primary" id="esave">Save</button></div></div>`;
  $('view').innerHTML = html;
  const grab = () => $('view').querySelectorAll('.er[data-s]').forEach(tr => { E.secs[tr.dataset.s][+tr.dataset.i] = { label: tr.querySelector('.el').value, vals: [...tr.querySelectorAll('.ev')].map(i => i.value) }; });
  const count = () => { grab(); let n = 0; for (const sk in E.secs) E.secs[sk].forEach(r => { if (r.label.trim() && r.vals.some(v => v.trim() !== '')) n++; }); $('ecount').textContent = n + ' rows filled'; };
  count();
  $('view').oninput = count;
  $('view').onkeydown = e => {
    if (e.key !== 'Enter' || !e.target.closest || !e.target.closest('.er')) return;
    e.preventDefault();
    const all = [...$('view').querySelectorAll('.er input')], n = all[all.indexOf(e.target) + 1];
    if (n) n.focus();
  };
  $('view').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { grab(); const sk = b.dataset.a; E.secs[sk].push({ label: '', vals: [] }); renderEntry(rep); const ls = $('view').querySelectorAll(`.er[data-s="${sk}"] .el`); if (ls.length) ls[ls.length - 1].focus(); });
  $('view').querySelectorAll('[data-x]').forEach(b => b.onclick = () => { grab(); const [s, i] = b.dataset.x.split('|'); E.secs[s].splice(+i, 1); renderEntry(rep); });
  $('ecancel').onclick = () => { ui.entry = false; ui.ent = null; render(); };
  $('esave').onclick = () => {
    grab();
    const out = [];
    for (const [sk, S] of Object.entries(R.secs)) {
      for (const r of E.secs[sk]) {
        const label = r.label.trim();
        const vals = S.cols.map((c, j) => { let v = (r.vals[j] || '').trim(); if (c[1] === 'n') v = v.replace(/,/g, '.'); return v; });
        if (!label || vals.every(v => v === '')) continue;
        for (let j = 0; j < vals.length; j++) if (S.cols[j][1] === 'n' && vals[j] !== '' && !Parser.isNum(vals[j])) return toast(label + ' · ' + S.cols[j][0] + ' must be a number', true);
        out.push({ id: uid(), rep, sec: sk, date: ui.date, label, vals });
      }
    }
    if (!out.length) return toast('Enter at least one value', true);
    db.rows = db.rows.filter(r => !(r.rep === rep && r.date === ui.date)).concat(out);
    persist(); ui.entry = false; ui.ent = null; render(); toast('Saved · ' + R.name + ' · ' + out.length + ' rows');
  };
}
function openEdit(id) {
  const r = db.rows.find(x => x.id === id); if (!r) return;
  $('mtitle').textContent = 'Edit row · ' + REPORTS[r.rep].secs[r.sec].t;
  $('modal').classList.add('on');
  buildForm($('mform'), {
    rep: r.rep, sec: r.sec, date: r.date, label: r.label, vals: r.vals, lock: true, saveText: 'Update',
    onCancel: closeModal,
    onSave: d => { Object.assign(r, d); persist(); closeModal(); render(); toast('Row updated'); }
  });
}
function closeModal() { $('modal').classList.remove('on'); $('mform').innerHTML = ''; $('pv').classList.remove('on'); }
$('pv').addEventListener('mousedown', e => { if (e.target === $('pv')) closeModal(); });
$('modal').addEventListener('mousedown', e => { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// stop the browser from opening a PDF dropped outside the drop zone
['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => { if (!e.target.closest || !e.target.closest('#drop')) e.preventDefault(); }));

render();