/* ===== CONFIG & CONSTANTS ===== */
export const REPORTS = {
  nandan: {
    name: 'Nandan Smelters',
    title: 'Nandan Smelters Pvt Ltd Reports',
    secs: {
      stock: { t: 'Stock', cols: [['Qty (MT)', 'n']] },
      incoming: { t: 'Yesterday Incoming Materials', cols: [['Qty', 'n']] },
      outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
      production: { t: 'Total Production in 24 Hr', cols: [['Kiln 1', 'n'], ['Kiln 2', 'n'], ['Total', 'n']] },
      pending_sale: { t: 'Balance Pending Outgoing (Sauda Sale)', cols: [['Qty Out', 'n']] },
      pending_purchase: { t: 'Balance Pending Incoming (Sauda Purchase)', cols: [['Qty In', 'n']] }
    }
  },
  sponge: {
    name: 'Hindustan Iron Sponge',
    title: 'Hindustan Iron & Sponge Reports (Sponge)',
    secs: {
      stock: { t: 'Stock', cols: [['Qty (MT)', 'n']] },
      incoming: { t: 'Yesterday Incoming Materials', cols: [['Qty', 'n']] },
      outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
      production: { t: 'Total Production in 24 Hr', cols: [['Kiln 1', 'n'], ['Kiln 2', 'n'], ['Total', 'n']] },
      pending_sale: { t: 'Balance Pending Outgoing (Sauda Sale)', cols: [['Qty Out', 'n']] },
      pending_purchase: { t: 'Balance Pending Incoming (Sauda Purchase)', cols: [['Qty In', 'n']] }
    }
  },
  dhaatu: {
    name: 'Hindustan Dhaatu Sponge',
    title: 'Hindustan Dhaatu Reports (Sponge)',
    secs: {
      stock: { t: 'Stock', cols: [['Qty (MT)', 'n']] },
      incoming: { t: 'Yesterday Incoming Materials', cols: [['Qty', 'n']] },
      outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
      production: { t: 'Total Production in 24 Hr', cols: [['Qty', 'n']] },
      pending_sale: { t: 'Balance Pending Outgoing (Sauda Sale)', cols: [['Qty Out', 'n']] },
      pending_purchase: { t: 'Balance Pending Incoming (Sauda Purchase)', cols: [['Qty In', 'n']] }
    }
  },
  wire: {
    name: 'Hindustan Dhaatu Wire Rod',
    title: 'Hindustan Dhaatu Reports (Wire Rod)',
    secs: {
      raw: { t: 'Raw Material Consumption', cols: [['Opening','n'],['Received','n'],['Transfer','n'],['Consumption','n'],['Closing','n'],['Kg/T','n'],['Kg/H','n']] },
      charge: { t: 'Charge Mix Material', cols: [['Opening','n'],['Received','n'],['Consumption','n'],['Closing','n'],['Metal %','n']] },
      stock: { t: 'Billets & Wire Rod Stock', cols: [['Opening','n'],['Production','n'],['Repair Received','n'],['Transfer','n'],['Dispatch','n'],['Closing','n']] },
      scrap: { t: 'Repair, Rejection, Wire End, Mill Scale & End Cut', cols: [['Repair','n'],['Rejection','n'],['Wire End','n'],['Mill Scale','n'],['End Cut','n']] },
      production: { t: 'Production (Total Qty)', cols: [['Qty','n']] },
      summary: { t: 'Consumption & Production Summary', cols: [['Qty','n']] }
    }
  },
  dbillet: {
    name: 'Hindustan Dhaatu Billet',
    title: 'Hindustan Dhaatu Reports (Billet)',
    secs: {
      stock: { t: 'Billets Stock', cols: [['Qty', 'n']] },
      incoming: { t: 'Billets Incoming', cols: [['Qty', 'n']] },
      summary: { t: 'Stock & Metal Summary', cols: [['Qty', 'n']] },
      yincoming: { t: 'Yesterday Incoming – Billets', cols: [['Qty', 'n']] },
      outgoing: { t: 'Yesterday Outgoing Materials', cols: [['Qty', 'n']] },
      production: { t: 'Total Structure Production in 24 Hr', cols: [['Qty', 'n']] },
      pending: { t: 'Balance Pending Outgoing', cols: [['Qty', 'n']] }
    }
  },
  billet: {
    name: 'Hindustan Billet',
    title: 'Hindustan Iron & Sponge Reports (Billet)',
    secs: {
      raw: { t: 'Raw Material Consumption', cols: [['Opening','n'],['Received Out Side','n'],['Received In House','n'],['Received Total','n'],['Material Issue','n'],['Trans.','n'],['Consumption','n'],['Closing','n'],['Kg/Tons','n'],['Kg/Heat','n']] },
      charge: { t: 'Charge Mix Material', cols: [['Opening','n'],['Out Side','n'],['In House','n'],['Received Total','n'],['Consumption','n'],['Closing','n'],['Metal %','n']] },
      billets: { t: 'Billets Stock', cols: [['Opening','n'],['Production','n'],['Transfer','n'],['Dispatch','n'],['Closing','n'],['Remark','t']] },
      summary: { t: 'Production Summary', cols: [['Qty','n']] }
    }
  }
};

export const TITLES = {
  mis: 'MIS Dashboard',
  rpt: 'Combined Reports (All Plants)',
  hst: 'History (All Plants)',
  nandan: 'Nandan Smelters Pvt Ltd Reports',
  sponge: 'Hindustan Iron & Sponge Reports (Sponge)',
  billet: 'Hindustan Iron & Sponge Reports (Billet)',
  dhaatu: 'Hindustan Dhaatu Reports (Sponge)',
  dbillet: 'Hindustan Dhaatu Reports (Billet)',
  wire: 'Hindustan Dhaatu Reports (Wire Rod)'
};

export const RORDER = ['nandan', 'sponge', 'billet', 'dhaatu', 'dbillet', 'wire'];

export const STORAGE_KEYS = {
  DATA: 'plantReports.v1',
  UI: 'plantReports.ui.v1',
  PDF_META: 'plantReports.pdfmeta.v1',
  NOTES: 'plantReports.notes.v1',
  IDB_NAME: 'plantReportsPdf',
  IDB_STORE: 'pdfs'
};

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const MET = {
  nandan: { p: ['production', 2], i: ['incoming', 0], o: ['outgoing', 0], d: [['pending_sale', 0], ['pending_purchase', 0]] },
  sponge: { p: ['production', 2], i: ['incoming', 0], o: ['outgoing', 0], d: [['pending_sale', 0], ['pending_purchase', 0]] },
  dhaatu: { p: ['production', 0], i: ['incoming', 0], o: ['outgoing', 0], d: [['pending_sale', 0], ['pending_purchase', 0]] },
  dbillet: { p: ['production', 0], i: ['yincoming', 0], o: ['outgoing', 0], d: [['pending', 0]] },
  wire: { p: ['stock', 1], o: ['stock', 4] },
  billet: { p: ['billets', 1], o: ['billets', 3] }
};

export const MK = [
  ['p', 'Production', '#1f6fd1'],
  ['i', 'Incoming (Purchase)', '#e8871e'],
  ['o', 'Outgoing (Sales)', '#16794a'],
  ['d', 'Pending (latest balance)', '#b42318']
];

export const PCOL = ['#1f6fd1', '#16a085', '#e8871e', '#8e44ad', '#c0392b', '#5d6d7e'];

export const DEF = {
  nandan: { production: ['TOTAL'] },
  sponge: {
    stock: ['IRON PELLET', 'BACK FLOW PELLET', 'TOTAL IRON ORE PELLET (GREEN PELLET)', 'LLOYD IRON (10-40 mm)', 'LLOYD (10-40 mm)', 'TOTAL LLOYD IRON', 'SPONGE PELLET', 'SPONGE IRON (0-20)', 'MIX (PELLET + IRON)', 'LOW MAG', 'TOTAL SPONGE', 'IRON FINES', 'DOLOMITE', 'COAL', 'CHAR', 'DOLACHAR'],
    incoming: ['DOLOCHAR', 'SPONGE IRON', 'IRON ORE', 'CHAR COAL', 'COAL/COAL FINES', 'SCRAP', 'DOLOMITE', 'SODIUM SILICATE', 'SILICO MANGANESE', 'IRON ORE PELLET'],
    outgoing: ['SPONGE IRON', 'SPONGE PELLET', 'BILLET 110 x 110 (TESTED)', 'BILLET 160 x 160 (TESTED)', 'BILLET 125 x 125 (TESTED)', 'SLAG', 'BED MATERIAL', 'FLYASH', 'ESP DUST', 'LOW MAG', 'CHAR'],
    production: ['A Grade – SPONGE IRON (0-20)', 'A Grade – SPONGE PELLET', 'B Grade – SPONGE IRON (0-20)', 'B Grade – SPONGE PELLET', 'TOTAL'],
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
  billet: {
    summary: ['TOTAL PRODUCTION (LIQUID)', 'SMS PRODUCTION – TOTAL PRODUCTION (LIQUID)', 'TOTAL NORMAL BILLET', 'STANDARD LOSS + LAUNDER LOSS', 'TOTAL TESTED BILLET', 'TOTAL FINISH MATERIAL (SOLID)', 'REPORTS & SMS REPORT DIFFERENCE QTY', 'TOTAL 4.3 METER, 5/4 METER, 2/3 METER, SCRAPS/END CUT']
  }
};
