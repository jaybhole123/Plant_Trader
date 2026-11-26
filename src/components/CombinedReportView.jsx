import React, { useState } from 'react';
import { RORDER, REPORTS } from '../utils/constants';
import { fmtDate, saveBlob } from '../utils/formatters';
import { ofKey } from '../utils/storage';
import { addSheetPage } from '../utils/sheetExport';
import jsPDF from 'jspdf';

export function CombinedReportView({
  date,
  liveRows,
  rowsOf,
  ofMeta,
  onOpenPreview,
  onDownloadSinglePdf,
  onViewOrigPdf,
  onOpenCombinedPreview,
  showToast,
  getNote
}) {
  const [selected, setSelected] = useState({});

  const info = RORDER.map(r => ({
    r,
    n: liveRows.filter(x => x.rep === r && x.date === date).length
  }));

  const sel = info.filter(x => x.n && selected[x.r] !== false);
  const miss = info.filter(x => !x.n);

  const togglePlant = (r, checked) => {
    setSelected(prev => ({ ...prev, [r]: checked }));
  };

  const buildCombined = () => {
    const reps = RORDER.filter(r => selected[r] !== false && liveRows.some(x => x.rep === r && x.date === date));
    if (!reps.length) {
      if (showToast) showToast('No data for the selected date', true);
      return null;
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    reps.forEach((r, i) => {
      if (i) doc.addPage();
      addSheetPage(doc, r, date, rowsOf, getNote);
    });
    const n = doc.getNumberOfPages(),
      W = doc.internal.pageSize.getWidth(),
      H = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(
        'All Plants Combined Report · ' + fmtDate(date) + ' · Page ' + i + ' of ' + n,
        W / 2,
        H - 10,
        { align: 'center' }
      );
    }
    return { doc, reps, d: date };
  };

  const handleDownloadCombined = () => {
    try {
      const b = buildCombined();
      if (!b) return;
      b.doc.save('All_Plants_Combined_Report_' + b.d + '.pdf');
      if (showToast) showToast('Downloading combined PDF · ' + b.reps.length + ' plants');
    } catch (e) {
      if (showToast) showToast('Could not create PDF: ' + (e.message || e), true);
    }
  };

  const handlePreviewCombined = () => {
    try {
      const b = buildCombined();
      if (!b) return;
      const pdfBytes = b.doc.output('arraybuffer');
      onOpenCombinedPreview(
        'Combined Report · ' + fmtDate(b.d) + ' · ' + b.reps.length + ' plants',
        pdfBytes,
        b.reps,
        b.d
      );
    } catch (e) {
      if (showToast) showToast('Could not create PDF: ' + (e.message || e), true);
    }
  };

  return (
    <div>
      <div className="hero">
        <div className="hl">Combined report</div>
        <div className="ht">All plants · {fmtDate(date)}</div>
        <p>
          Select the plants and download their reports together as <b>one PDF</b>. Pick the date from the top bar.
          Each plant keeps the same sheet layout as its own PDF.
        </p>
      </div>

      <div className="mc">
        <h3>Plants included in the PDF</h3>
        <div className="ovf">
          <table className="mt r">
            <thead>
              <tr>
                <th style={{ width: '44px', textAlign: 'center' }} />
                <th style={{ width: '130px' }}>Date</th>
                <th>Plant</th>
                <th style={{ width: '180px' }}>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {info.map(x => {
                const k = ofKey(x.r, date);
                const hasOrig = !!(ofMeta && ofMeta[k]);
                return (
                  <tr key={x.r}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={!x.n}
                        checked={x.n && selected[x.r] !== false}
                        onChange={e => togglePlant(x.r, e.target.checked)}
                        aria-label={'Include ' + REPORTS[x.r].name}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--muted, #64748b)' }}>
                      {fmtDate(date)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{REPORTS[x.r].name}</td>
                    <td>
                      {x.n ? (
                        <span className="tag hi">{x.n} rows ready</span>
                      ) : (
                        <span className="tag lo">No data for this date</span>
                      )}
                    </td>
                    <td>
                      {x.n ? (
                        <div className="ra">
                          <button className="btn sm" onClick={() => onOpenPreview(x.r, date)}>
                            Preview
                          </button>
                          <button className="btn sm" onClick={() => onDownloadSinglePdf(x.r, date)}>
                            PDF
                          </button>
                          {hasOrig && (
                            <button className="btn sm" onClick={() => onViewOrigPdf(k)}>
                              Original PDF
                            </button>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rbar">
          <button className="btn" disabled={!sel.length} onClick={handlePreviewCombined}>
            Preview combined PDF
          </button>
          <button className="btn primary" disabled={!sel.length} onClick={handleDownloadCombined}>
            Download combined PDF ({sel.length} plant{sel.length === 1 ? '' : 's'})
          </button>
          {miss.length > 0 && (
            <span>
              {miss.length} plant{miss.length === 1 ? ' has' : 's have'} no saved data for this date and will be left
              out.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
