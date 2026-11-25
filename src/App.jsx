import React, { useState, useCallback, useMemo, useEffect } from 'react';
import './App.css';
import { REPORTS, TITLES, RORDER, STORAGE_KEYS } from './utils/constants';
import { usePlantData } from './hooks/usePlantData';
import { useUIState } from './hooks/useUIState';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ReportView } from './components/ReportView';
import { ManualEntryView } from './components/ManualEntryView';
import { HistoryView } from './components/HistoryView';
import { CombinedReportView } from './components/CombinedReportView';
import { MISView } from './components/MISView';
import { EditRowModal } from './components/EditRowModal';
import { PreviewModal } from './components/PreviewModal';
import { extractPdf } from './utils/pdfReader';
import { ofMeta, ofPut, ofGet, ofDel, ofKey } from './utils/storage';
import { getSheetSpec, exportPdf, exportXlsx, addSheetPage } from './utils/sheetExport';
import { fmtDate, fname, saveBlob } from './utils/formatters';

export function App() {
  const [toastInfo, setToastInfo] = useState({ msg: '', isErr: false, on: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '{}') || {};
    } catch (e) {
      return {};
    }
  });

  const getNote = useCallback(
    (rep, d) => {
      const k = rep + '|' + d;
      return notes[k] || '';
    },
    [notes]
  );

  const setNoteFor = useCallback((rep, d, val) => {
    setNotes(prev => {
      const k = rep + '|' + d;
      const next = { ...prev, [k]: val };
      try {
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const [previewState, setPreviewState] = useState({
    isOpen: false,
    title: '',
    pdfBytes: null,
    sheetSpecs: null,
    showExcel: false,
    rep: null,
    date: null,
    isCombined: false,
    origKey: null
  });

  const showToast = useCallback((msg, isErr = false) => {
    setToastInfo({ msg, isErr, on: true });
    setTimeout(() => {
      setToastInfo(prev => ({ ...prev, on: false }));
    }, 3800);
  }, []);

  const {
    rows,
    setRows,
    live,
    drafts,
    rowsOf,
    hasRows,
    deleteRow,
    saveReport,
    discardDrafts,
    deleteDayData
  } = usePlantData(showToast);

  const {
    page,
    setPage,
    dates,
    setReportDate,
    currentDate,
    all,
    setAll,
    tab,
    setTab,
    entry,
    setEntry
  } = useUIState();

  const handleDateChange = useCallback(
    newDate => {
      setReportDate(page, newDate);
    },
    [page, setReportDate]
  );

  const rowCounts = useMemo(() => {
    const counts = {};
    const liveList = live();
    RORDER.forEach(r => {
      counts[r] = liveList.filter(
        x => x.rep === r && (all || x.date === (dates[r] || currentDate))
      ).length;
    });
    return counts;
  }, [live, all, dates, currentDate]);

  const historyCounts = useMemo(() => {
    const counts = {};
    RORDER.forEach(r => {
      counts[r] = new Set(rows.filter(x => !x.draft && x.rep === r).map(x => x.date)).size;
    });
    return counts;
  }, [rows]);

  // Handle PDF Uploads
  const handlePdfUpload = async files => {
    const valid = files.filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    if (!valid.length) {
      showToast('Please choose a PDF file', true);
      return;
    }

    let lastResult = null;
    for (const f of valid) {
      try {
        const res = await extractPdf(f);
        if (!res.report) {
          showToast(f.name + ': this does not look like one of the 6 supported reports', true);
          continue;
        }
        if (!res.rows.length) {
          showToast(f.name + ': no data found (it may be a scanned PDF)', true);
          continue;
        }

        const date = res.date || currentDate;
        const old = rows.filter(r => !r.draft && r.rep === res.report && r.date === date);

        if (
          old.length &&
          !window.confirm(
            REPORTS[res.report].name +
              ' already has data for ' +
              fmtDate(date) +
              ' (' +
              old.length +
              ' rows). OK = replace the data with this PDF. Cancel = keep the old data and only store this PDF as its original.'
          )
        ) {
          await ofPut(res.report, date, f);
          setPage(res.report);
          setReportDate(res.report, date);
          showToast('Original PDF stored. Existing data was kept.');
          continue;
        }

        setRows(prev => {
          const filtered = prev.filter(r => !(r.draft && r.rep === res.report && r.date === date));
          const newRows = res.rows.map(r => ({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            date,
            rep: res.report,
            sec: r.sec,
            label: r.label,
            vals: r.vals,
            draft: true
          }));
          return [...filtered, ...newRows];
        });

        await ofPut(res.report, date, f);
        lastResult = { rep: res.report, date, n: res.rows.length };
      } catch (e) {
        console.error(e);
        showToast(f.name + ': ' + (e.message || 'Could not read the PDF'), true);
      }
    }

    if (lastResult) {
      setPage(lastResult.rep);
      setReportDate(lastResult.rep, lastResult.date);
      setAll(false);
      showToast(
        lastResult.n + ' rows extracted · ' + fmtDate(lastResult.date) + ' · review and click Save'
      );
    }
  };

  // Previews & Downloads
  const getExportDates = (rep, only) => {
    if (only) return [only];
    if (!all) return hasRows(rep, currentDate) ? [currentDate] : [];
    return [...new Set(live().filter(r => r.rep === rep).map(r => r.date))].sort();
  };

  const handleOpenPreview = (rep, only) => {
    const targetDates = getExportDates(rep, only);
    if (!targetDates.length) {
      showToast('No data to preview', true);
      return;
    }
    const specs = targetDates.map(d => getSheetSpec(rep, d, rowsOf, getNote));
    setPreviewState({
      isOpen: true,
      title:
        REPORTS[rep].name +
        ' Report - ' +
        (only ? fmtDate(only) : all ? 'All dates' : fmtDate(currentDate)),
      pdfBytes: null,
      sheetSpecs: specs,
      showExcel: true,
      rep,
      date: only || null,
      isCombined: false,
      origKey: null
    });
  };

  const handleOpenCombinedPreview = (title, arrayBuffer, pdfBlob, reps, d) => {
    setPreviewState({
      isOpen: true,
      title,
      pdfBytes: arrayBuffer,
      pdfBlob: pdfBlob,
      sheetSpecs: null,
      showExcel: false,
      rep: null,
      date: d,
      isCombined: true,
      origKey: null
    });
  };

  const handleViewOriginalPdf = async k => {
    const m = ofMeta[k];
    if (!m) return;
    try {
      const f = await ofGet(k);
      if (!f) throw new Error('missing');
      const arrayBuffer = await f.arrayBuffer();
      setPreviewState({
        isOpen: true,
        title: 'Original PDF · ' + m.name,
        pdfBytes: arrayBuffer,
        sheetSpecs: null,
        showExcel: false,
        rep: null,
        date: null,
        isCombined: false,
        origKey: k
      });
    } catch (e) {
      showToast('The stored PDF could not be opened. Upload it again.', true);
    }
  };

  const handleDownloadOriginalPdf = async k => {
    const m = ofMeta[k];
    if (!m) return;
    try {
      const f = await ofGet(k);
      if (!f) throw new Error('missing');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(f);
      a.download = /\.pdf$/i.test(m.name) ? m.name : m.name + '.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1500);
      showToast('Downloading original PDF');
    } catch (e) {
      showToast('The stored PDF could not be read. Upload it again.', true);
    }
  };

  const handleRemoveOriginalPdf = async k => {
    const m = ofMeta[k];
    if (
      m &&
      window.confirm(
        'Remove the stored original PDF "' + m.name + '"? The extracted data is not affected.'
      )
    ) {
      await ofDel(k);
      showToast('Original PDF removed');
    }
  };

  const handleAttachOriginalPdf = async (rep, date, file) => {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      showToast('Please choose a PDF file', true);
      return;
    }
    await ofPut(rep, date, file);
    showToast('Original PDF attached · ' + fmtDate(date));
  };

  const handleDownloadPdf = (rep, only) => {
    const targetDates = getExportDates(rep, only);
    if (!targetDates.length) {
      showToast('No data to export', true);
      return;
    }
    try {
      const fileName = fname(rep, 'pdf', only || (all ? 'All_dates' : currentDate));
      exportPdf(rep, targetDates, rowsOf, fileName, getNote);
      showToast('Downloading PDF');
    } catch (e) {
      showToast('Could not create PDF: ' + (e.message || e), true);
    }
  };

  const handleDownloadExcel = async (rep, only) => {
    const targetDates = getExportDates(rep, only);
    if (!targetDates.length) {
      showToast('No data to export', true);
      return;
    }
    try {
      const fileName = fname(rep, 'xlsx', only || (all ? 'All_dates' : currentDate));
      await exportXlsx(rep, targetDates, rowsOf, fileName, getNote);
      showToast('Downloading Excel file');
    } catch (e) {
      showToast('Could not create Excel file: ' + (e.message || e), true);
    }
  };

  // Close modals on Escape
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setEditingRow(null);
        setPreviewState(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <div
        className={`scrim ${sidebarOpen ? 'on' : ''}`}
        id="scrim"
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        page={page}
        onSelectPage={setPage}
        rowCounts={rowCounts}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main">
        <Header
          title={TITLES[page]}
          date={currentDate}
          onDateChange={handleDateChange}
          all={all}
          onBurgerClick={() => setSidebarOpen(!sidebarOpen)}
          showDatebar={page !== 'mis'}
        />

        <main className="content" id="view">
          {page === 'mis' && <MISView rows={rows} showToast={showToast} />}

          {page === 'rpt' && (
            <CombinedReportView
              date={currentDate}
              liveRows={live()}
              rowsOf={rowsOf}
              ofMeta={ofMeta}
              onOpenPreview={handleOpenPreview}
              onDownloadSinglePdf={handleDownloadPdf}
              onViewOrigPdf={handleViewOriginalPdf}
              onOpenCombinedPreview={handleOpenCombinedPreview}
              showToast={showToast}
              getNote={getNote}
            />
          )}

          {page === 'hst' && (
            <HistoryView
              rep={null}
              rows={rows}
              onPreview={handleOpenPreview}
              onDownload={handleDownloadPdf}
              tab={tab}
              setTab={setTab}
            />
          )}

          {REPORTS[page] && entry && (
            <ManualEntryView
              rep={page}
              date={currentDate}
              liveRows={live()}
              initialNote={getNote(page, currentDate)}
              onSave={(out, noteText) => {
                setRows(prev => {
                  const filtered = prev.filter(r => !(r.rep === page && r.date === currentDate));
                  return [...filtered, ...out];
                });
                if (typeof noteText === 'string') {
                  setNoteFor(page, currentDate, noteText);
                }
                setEntry(false);
                showToast('Saved · ' + REPORTS[page].name + ' · ' + out.length + ' rows');
              }}
              onCancel={() => setEntry(false)}
              showToast={showToast}
            />
          )}

          {REPORTS[page] && !entry && tab === 'hist' && (
            <HistoryView
              rep={page}
              rows={rows}
              onPreview={handleOpenPreview}
              onDownload={handleDownloadPdf}
              tab={tab}
              setTab={setTab}
              historyCount={historyCounts[page] || 0}
            />
          )}

          {REPORTS[page] && !entry && tab !== 'hist' && (
            <ReportView
              rep={page}
              date={currentDate}
              all={all}
              tab={tab}
              setTab={setTab}
              onOpenManualEntry={() => {
                setEntry(true);
                if (all) setAll(false);
              }}
              rows={rows}
              live={live}
              drafts={drafts}
              deleteRow={deleteRow}
              onEditRow={setEditingRow}
              onSaveReport={rep => {
                saveReport(rep);
                showToast('Saved · ' + REPORTS[rep].name + ' · ' + rowCounts[rep] + ' rows');
              }}
              onDiscardDrafts={rep =>
                discardDrafts(rep, (r, d) => ofDel(ofKey(r, d)))
              }
              onDeleteDay={(rep, d) =>
                deleteDayData(rep, d, (r, dt) => ofDel(ofKey(r, dt)))
              }
              onPreview={handleOpenPreview}
              onPdfDownload={handleDownloadPdf}
              onExcelDownload={handleDownloadExcel}
              onPdfUpload={handlePdfUpload}
              ofMeta={ofMeta}
              onAttachPdf={handleAttachOriginalPdf}
              onViewPdf={handleViewOriginalPdf}
              onDownloadPdf={handleDownloadOriginalPdf}
              onRemovePdf={handleRemoveOriginalPdf}
              historyCount={historyCounts[page] || 0}
              note={getNote(page, currentDate)}
              onNoteChange={text => setNoteFor(page, currentDate, text)}
            />
          )}
        </main>
      </div>

      <EditRowModal
        isOpen={!!editingRow}
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onSave={updated => {
          setRows(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
          setEditingRow(null);
          showToast('Row updated');
        }}
        showToast={showToast}
      />

      <PreviewModal
        isOpen={previewState.isOpen}
        title={previewState.title}
        pdfBytes={previewState.pdfBytes}
        sheetSpecs={previewState.sheetSpecs}
        showExcel={previewState.showExcel}
        onClose={() => setPreviewState(prev => ({ ...prev, isOpen: false }))}
        onPdfDownload={() => {
          if (previewState.origKey) {
            handleDownloadOriginalPdf(previewState.origKey);
          } else if (previewState.isCombined) {
            // Build fresh combined doc and save natively to guarantee 100% valid PDF stream
            try {
              const d = previewState.date || currentDate;
              const reps = RORDER.filter(r => live().some(x => x.rep === r && x.date === d));
              const jsPDFModule = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
              import('jspdf').then(({ default: jsPDFClass }) => {
                const JClass = jsPDFClass || jsPDFModule;
                const doc = new JClass({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                reps.forEach((r, i) => {
                  if (i) doc.addPage();
                  addSheetPage(doc, r, d, rowsOf, getNote);
                });
                const n = doc.getNumberOfPages(),
                  W = doc.internal.pageSize.getWidth(),
                  H = doc.internal.pageSize.getHeight();
                for (let i = 1; i <= n; i++) {
                  doc.setPage(i);
                  doc.setFontSize(8);
                  doc.setTextColor(110);
                  doc.text(
                    'All Plants Combined Report · ' + fmtDate(d) + ' · Page ' + i + ' of ' + n,
                    W / 2,
                    H - 10,
                    { align: 'center' }
                  );
                }
                doc.save('All_Plants_Combined_Report_' + d + '.pdf');
                showToast('Downloading combined PDF · ' + reps.length + ' plants');
              });
            } catch (err) {
              console.error(err);
              showToast('Could not download combined PDF', true);
            }
          } else if (previewState.rep) {
            handleDownloadPdf(previewState.rep, previewState.date);
          }
        }}
        onExcelDownload={() => {
          if (previewState.rep) {
            handleDownloadExcel(previewState.rep, previewState.date);
          }
        }}
      />

      <div className={`toast ${toastInfo.on ? 'on' : ''} ${toastInfo.isErr ? 'err' : ''}`} id="toast">
        {toastInfo.msg}
      </div>
    </div>
  );
}

export default App;
