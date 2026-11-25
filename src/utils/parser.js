/* ===== PDF PARSER (position based) ===== */
const TOL = 3.6;
export const isNum = s => /^-?\d+(?:\.\d+)?$/.test(String(s == null ? '' : s).trim());

export function tokenize(items, pageH, offset) {
  const out = [];
  for (const it of items) {
    const str = it.str;
    if (!str || !str.trim()) continue;
    const w = it.width || 0;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(str))) {
      out.push({
        s: m[0],
        x: it.transform[4] + (str.length ? (w * m.index) / str.length : 0),
        t: offset + pageH - it.transform[5]
      });
    }
  }
  return out;
}

export function toLines(toks) {
  toks.sort((a, b) => a.t - b.t || a.x - b.x);
  const lines = [];
  let cur = null,
    last = -1e9;
  for (const k of toks) {
    if (!cur || k.t - last > TOL) {
      cur = { t: k.t, toks: [] };
      lines.push(cur);
    }
    cur.toks.push(k);
    last = k.t;
  }
  lines.forEach(l => {
    l.toks.sort((a, b) => a.x - b.x);
    l.text = l.toks.map(k => k.s).join(' ');
  });
  return lines;
}

export function assignCols(nums, centers) {
  const out = centers.map(() => '');
  if (nums.length === centers.length) {
    nums.forEach((n, i) => (out[i] = n.s));
    return out;
  }
  nums.forEach(n => {
    let bi = 0,
      bd = 1e9;
    centers.forEach((c, i) => {
      const d = Math.abs(c - n.x);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    if (out[bi] === '') out[bi] = n.s;
  });
  return out;
}

export const lab = toks => toks.map(k => k.s).join(' ');

export function parseNandan(lines, opts) {
  const rows = [];
  let sec = 'stock';
  const grades = [];
  const prod = [];
  for (const L of lines) {
    const T = L.text.toUpperCase(),
      toks = L.toks;
    if ((/NANDAN|SMELTERS/.test(T) || (opts && opts.sponge && /HINDUSTAN/.test(T))) && /REPORT/.test(T)) continue;
    if (/YESTERDAY INCOMING/.test(T)) {
      sec = 'incoming';
      continue;
    }
    if (/YESTERDAY OUTGOING/.test(T)) {
      sec = 'outgoing';
      continue;
    }
    if (/TOTAL PRODUCTION IN/.test(T)) {
      sec = 'production';
      continue;
    }
    if (/BALANCE PENDING OUTGOING/.test(T)) {
      sec = 'pending_sale';
      continue;
    }
    if (/BALANCE PENDING INCOMING/.test(T)) {
      sec = 'pending_purchase';
      continue;
    }
    if (sec === 'production') {
      if (/KILN/.test(T)) continue;
      const left = toks.filter(k => k.x < 100),
        main = toks.filter(k => k.x >= 100);
      const nums = main.filter(k => isNum(k.s));
      const name = lab(main.filter(k => !isNum(k.s)));
      const gm = lab(left)
        .toUpperCase()
        .match(/^([AB])\s*GRADE$/);
      if (!nums.length || !name) {
        if (gm) grades.push({ t: L.t, g: gm[1] });
        continue;
      }
      const vals = nums.length === 1 ? ['', '', nums[0].s] : assignCols(nums, [308, 417, 520]);
      prod.push({ t: L.t, label: name, vals, g: gm ? gm[1] : null });
      continue;
    }
    if (opts && opts.sponge) {
      const vt = toks.filter(k => k.x >= 400 && isNum(k.s));
      if (!vt.length) continue;
      const sv = vt[vt.length - 1];
      const lo = sec === 'incoming' || sec === 'outgoing' ? 0 : 100;
      const sl = toks.filter(k => k.x >= lo && k.x < sv.x - 1);
      if (!sl.length) continue;
      rows.push({ sec, label: lab(sl), vals: [sv.s] });
      continue;
    }
    const nums = toks.filter(k => isNum(k.s));
    if (!nums.length) continue;
    const val = nums[nums.length - 1];
    let l = toks.filter(k => k.x < val.x - 1 && !isNum(k.s));
    if (!(opts && opts.dhaatu && (sec === 'incoming' || sec === 'outgoing')) && l.some(k => k.x >= 140)) {
      l = l.filter(k => k.x >= 140);
    }
    if (!l.length) continue;
    rows.push({ sec, label: lab(l), vals: [val.s] });
  }
  prod.forEach(p => {
    let g = p.g;
    if (!g && grades.length) {
      const n = grades.reduce((a, b) => (Math.abs(b.t - p.t) < Math.abs(a.t - p.t) ? b : a));
      if (Math.abs(n.t - p.t) < 14) g = n.g;
    }
    rows.push({ sec: 'production', label: g ? g + ' Grade – ' + p.label : p.label, vals: p.vals });
  });
  return rows;
}

export function parseDhaatu(lines) {
  const rows = parseNandan(lines.filter(L => !/DHAATU/.test(L.text.toUpperCase())), { dhaatu: true });
  rows.forEach(r => {
    if (r.sec === 'production') r.vals = [r.vals.filter(v => v !== '').pop() || ''];
  });
  return rows;
}

export function parseDBillet(lines) {
  const rows = [];
  let sec = 'stock',
    yest = false;
  for (const L of lines) {
    const T = L.text.toUpperCase().replace(/\s+/g, ' ').trim(),
      toks = L.toks;
    if (/DHAATU REPORT/.test(T) || /^SIZE QTY$/.test(T)) continue;
    if (/^NOTE/.test(T)) break;
    if (/YESTERDAY INCOMING/.test(T)) {
      yest = true;
      continue;
    }
    if (/^TOTAL STRUCTURE PRODUCTION/.test(T)) {
      sec = 'production';
      continue;
    }
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

export function parseWire(lines) {
  const rows = [],
    seen = new Set();
  let region = 'raw',
    blk = null;
  const addSummary = (label, v) => {
    const key = label.toUpperCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    rows.push({ sec: 'summary', label, vals: [v] });
  };
  const segs = toks => {
    const out = [];
    let prev = -1;
    toks
      .filter(k => k.x >= 150 && isNum(k.s))
      .forEach(n => {
        out.push({ label: lab(toks.filter(k => k.x > prev && k.x < n.x)), val: n.s, x: n.x });
        prev = n.x;
      });
    return out;
  };
  const CEN = {
    wire: [217, 287, 373, 441, 498, 555],
    stk5: [217, 287, 367, 444, 527],
    scrap: [225, 293, 373, 443, 535]
  };
  for (const L of lines) {
    const T = L.text.toUpperCase().replace(/\s+/g, ' ').trim(),
      toks = L.toks;
    if (/DHAATU REPORT/.test(T)) continue;
    if (/RAW MATERIAL CONSUMPTION/.test(T)) {
      region = 'raw';
      continue;
    }
    if (/CHARGE MIX MATERIAL/.test(T)) {
      region = 'charge';
      continue;
    }
    if (/^TOTAL QTY\b/.test(T)) {
      region = 'bottom';
      blk = null;
      continue;
    }
    const nums = toks.filter(k => k.x >= 150 && isNum(k.s));
    if (!nums.length) {
      if (/OPENING.*PRODUCTION.*REPAIR.*RECEIVED/.test(T)) {
        blk = { kind: 'wire', label: '' };
        region = 'blk';
      } else if (/OPENING.*PRODUCTION.*TRANSFER.*DISPATCH.*CLOSING/.test(T)) {
        blk = { kind: 'stk5', label: '' };
        region = 'blk';
      } else if (/REPAIR.*REJECTION.*WIRE.*MILL.*SCALE.*END.*CUT/.test(T)) {
        blk = { kind: 'scrap', label: '' };
        region = 'blk';
      } else if (region === 'blk' && blk) {
        const l = toks.filter(k => k.x < 200);
        if (l.length) blk.label = (blk.label + ' ' + lab(l)).trim();
      }
      continue;
    }
    if (region === 'blk' && blk) {
      if (nums.length < 4) continue;
      const cen = CEN[blk.kind],
        v = nums.length === cen.length ? nums.map(n => n.s) : assignCols(nums, cen);
      if (blk.kind === 'scrap')
        rows.push({ sec: 'scrap', label: 'REPAIR, REJECTION, WIRE END, MILL SCALE & END CUT', vals: v });
      else rows.push({ sec: 'stock', label: blk.label, vals: blk.kind === 'wire' ? v : [v[0], v[1], '', v[2], v[3], v[4]] });
      blk = null;
      region = 'tail';
      continue;
    }
    if (region === 'raw' || region === 'charge') {
      const l = toks.filter(k => k.x < 150 && !isNum(k.s));
      if (nums.length >= 4 && l.length)
        rows.push({
          sec: region,
          label: lab(l),
          vals: assignCols(nums, region === 'raw' ? [172, 225, 293, 373, 443, 503, 562] : [166, 222, 289, 367, 503])
        });
      else if (nums.length === 1) segs(toks).forEach(x => addSummary(x.label, x.val));
      continue;
    }
    segs(toks).forEach(x => {
      if (region === 'bottom' && x.x < 300) rows.push({ sec: 'production', label: x.label, vals: [x.val] });
      else addSummary(x.label, x.val);
    });
  }
  return rows;
}

export function parseBillet(lines) {
  const rows = [];
  let region = 'raw',
    group = '',
    awaiting = false,
    lastBottom = '';
  const seen = new Set();
  const addSummary = (label, v) => {
    const key = label.toUpperCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ sec: 'summary', label, vals: [v] });
  };
  for (const L of lines) {
    const T = L.text.toUpperCase(),
      toks = L.toks;
    if (/HINDUSTAN/.test(T) && /REPORT/.test(T)) continue;
    if (/RAW MATERIAL CONSUMPTION/.test(T)) {
      region = 'raw';
      continue;
    }
    if (/CHARGE MIX MATERIAL/.test(T)) {
      region = 'charge';
      continue;
    }
    if (/OPENING/.test(T) && /PRODUCTION/.test(T) && /TRANSFER/.test(T)) {
      region = 'billets';
      continue;
    }
    if (region === 'billets' && /^TOTAL CONSUMPTION/.test(T)) region = 'tail';
    if (region === 'tail' && /\bSMS\b/.test(T) && /PRODUCTION/.test(T) && !toks.some(k => isNum(k.s))) {
      region = 'bottom';
      continue;
    }

    if (region === 'raw' || region === 'charge') {
      const l = toks.filter(k => k.x < 95 && !isNum(k.s)),
        nums = toks.filter(k => k.x >= 95 && isNum(k.s));
      if (nums.length >= 4 && l.length) {
        const centers =
          region === 'raw'
            ? [108, 153, 201, 253, 310, 356, 411, 467, 513, 566]
            : [107, 153, 201, 254, 330, 433, 548];
        rows.push({ sec: region, label: lab(l), vals: assignCols(nums, centers) });
      } else if (nums.length === 1) {
        const ll = toks.filter(k => !isNum(k.s));
        if (ll.length) addSummary(lab(ll), nums[0].s);
      }
      continue;
    }
    if (region === 'billets') {
      const l = toks.filter(k => k.x < 185),
        nums = toks.filter(k => k.x >= 185 && k.x < 495 && isNum(k.s)),
        rem = toks.filter(k => k.x >= 495);
      if (!l.length || !nums.length) continue;
      let name = lab(l);
      const gm = name.match(/BILLETS\s+(\d+)\s*X\s*(\d+)/i);
      if (gm) group = gm[1] + ' X ' + gm[2] + ' mm';
      else if (group) name = group + ' – ' + name;
      const v = assignCols(nums, [200, 255, 313, 357, 436]);
      v.push(lab(rem));
      rows.push({ sec: 'billets', label: name, vals: v });
      continue;
    }
    if (region === 'tail') {
      const nums = toks.filter(k => isNum(k.s)),
        ll = toks.filter(k => !isNum(k.s));
      if (nums.length && ll.length) addSummary(lab(ll), nums[nums.length - 1].s);
      continue;
    }
    if (region === 'bottom') {
      const nums = toks.filter(k => k.x >= 150 && isNum(k.s)).map(k => k.s),
        ll = toks.filter(k => !(k.x >= 150 && isNum(k.s)));
      if (/\(LIQUID\)/.test(T) && nums.length >= 2) {
        addSummary('TOTAL PRODUCTION (LIQUID)', nums[0]);
        addSummary('SMS PRODUCTION – TOTAL PRODUCTION (LIQUID)', nums[1]);
      } else if (/NORMAL BILLET/.test(T) && nums.length) {
        addSummary('TOTAL NORMAL BILLET', nums[0]);
        if (nums[1]) addSummary('STANDARD LOSS + LAUNDER LOSS', nums[1]);
      } else if (/TESTED BILLET/.test(T) && nums.length) {
        addSummary('TOTAL TESTED BILLET', nums[0]);
        lastBottom = 'tested';
        if (nums[1]) {
          addSummary('TOTAL FINISH MATERIAL (SOLID)', nums[1]);
          lastBottom = '';
        }
      } else if (/REPORTS/.test(T) && /DIFFERENCE/.test(T) && nums.length) {
        addSummary('REPORTS & SMS REPORT DIFFERENCE QTY', nums[nums.length - 1]);
      } else if (!ll.length && nums.length) {
        if (awaiting) {
          addSummary('TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT', nums[0]);
          awaiting = false;
        } else if (lastBottom === 'tested') {
          addSummary('TOTAL FINISH MATERIAL (SOLID)', nums[0]);
          lastBottom = '';
        }
      } else if (/METER/.test(T) && !nums.length) awaiting = true;
    }
  }
  return rows;
}

export function findDate(lines) {
  for (const L of lines.slice(0, 8)) {
    const m = L.text.match(/(\d{2})[-\/.](\d{2})[-\/.](\d{4})/);
    if (m) return m[3] + '-' + m[2] + '-' + m[1];
  }
  return '';
}

export function parse(items, pageH) {
  const pages = Array.isArray(items[0]) ? items : [items];
  let toks = [];
  pages.forEach((p, i) => {
    toks = toks.concat(tokenize(p, pageH, i * 100000));
  });
  const lines = toLines(toks);
  const all = lines
    .map(l => l.text)
    .join(' ')
    .toUpperCase();
  let report = '';
  if (/NANDAN/.test(all)) report = 'nandan';
  else if (/HINDUSTAN\s+IRON\s*&\s*SPONGE\s+REPORT\s*\(SPONGE\)/.test(all)) report = 'sponge';
  else if (/DHAATU\s+REPORT\s*\(WIRE\s+ROD\)/.test(all)) report = 'wire';
  else if (/DHAATU\s+REPORT\s*\(BILLET\)/.test(all)) report = 'dbillet';
  else if (/DHAATU/.test(all)) report = 'dhaatu';
  else if (/HINDUSTAN/.test(all) || /BILLET/.test(all)) report = 'billet';

  if (!report) return { report: '', date: findDate(lines), rows: [], lines };
  const rows =
    report === 'nandan'
      ? parseNandan(lines)
      : report === 'sponge'
      ? parseNandan(lines, { sponge: true })
      : report === 'wire'
      ? parseWire(lines)
      : report === 'dbillet'
      ? parseDBillet(lines)
      : report === 'dhaatu'
      ? parseDhaatu(lines)
      : parseBillet(lines);
  return { report, date: findDate(lines), rows, lines };
}

export const Parser = { parse, isNum };
export default Parser;
