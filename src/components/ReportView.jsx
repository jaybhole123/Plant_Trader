import React, { useRef } from 'react';
import { REPORTS } from '../utils/constants';
import { fmtDate, isoOf } from '../utils/formatters';
import { CalcCards } from './CalcCards';
import { OriginalPdfCard } from './OriginalPdfCard';

export function ReportView({
  rep,
  date,
  all,
  tab,
  setTab,
  onOpenManualEntry,
  rows,
  live,
  drafts,
  deleteRow,
  onEditRow,
  onSaveReport,
  onDiscardDrafts,
  onDeleteDay,
  onPreview,
  onPdfDownload,
  onExcelDownload,
  onPdfUpload,
  ofMeta,
  onAttachPdf,
  onViewPdf,
  onDownloadPdf,
  onRemovePdf,
  historyCount,
  note,
  onNoteChange
}) {
  const fileInputRef = useRef(null);
  const R = REPORTS[rep];
  const repDrafts = drafts(rep);
  const nd = repDrafts.length;

  const visibleRows = sec =>
    live().filter(r => r.rep === rep && (!sec || r.sec === sec) && (all || r.date === date));

  const total = visibleRows().length;

  const handleDrop = e => {
    e.preventDefault();
    e.currentTarget.classList.remove('over');
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      onPdfUpload([...e.dataTransfer.files]);
    }
  };

  const handleDragOver = e => {
    e.preventDefault();
    e.currentTarget.classList.add('over');
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.currentTarget.classList.remove('over');
  };

  return (
    <div>
      <div className="tabs">
        <button className={tab !== 'hist' ? 'on' : ''} onClick={() => setTab('data')}>
          Report
        </button>
        <button className={tab === 'hist' ? 'on' : ''} onClick={() => setTab('hist')}>
          History <span className="n">{historyCount}</span>
        </button>
      </div>

      <div className="drop" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5M12 17v-6M9.5 13.5L12 11l2.5 2.5" />
        </svg>
        <div>
          <p className="t">Drop the {R.name} PDF here</p>
          <p className="s">The data is extracted automatically and shown in the tables below. The date is read from the PDF.</p>
        </div>
        <div className="dact">
          <button className="btn primary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
            </svg>
            Choose PDF
          </button>
          <button className="btn" onClick={onOpenManualEntry}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
            </svg>
            Manual entry
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={e => {
            if (e.target.files && e.target.files.length) {
              onPdfUpload([...e.target.files]);
              e.target.value = '';
            }
          }}
        />
      </div>

      <OriginalPdfCard
        rep={rep}
        date={date}
        all={all}
        ofMeta={ofMeta}
        onAttach={onAttachPdf}
        onView={onViewPdf}
        onDownload={onDownloadPdf}
        onRemove={onRemovePdf}
        hasData={live().some(r => r.rep === rep && r.date === date)}
      />

      <CalcCards rep={rep} visible={visibleRows} all={all} />

      {nd > 0 && (
        <div className="draft">
          <span>
            <b>Not saved yet</b> · {nd} rows were extracted. Review or edit them, then click Save.
          </span>
          <div className="bact">
            <button className="btn primary sm" onClick={() => onSaveReport(rep)}>
              Save
            </button>
            <button className="btn sm" onClick={() => onDiscardDrafts(rep)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {!total ? (
        <>
          <div className="bar">
            <span>0 rows{all ? '' : ' · ' + fmtDate(date)}</span>
            <div className="bact">
              <button className="btn sm primary" onClick={() => onSaveReport(rep)}>
                Save
              </button>
            </div>
          </div>
          <div className="card empty">
            <b>{all ? 'No data yet' : fmtDate(date) + ' has no data'}</b>
            Upload a PDF or add a row from Manual Entry{all ? '' : ', or pick another date above'}.
          </div>
        </>
      ) : (
        <>
          <div className="bar">
            <span>
              {total} rows{all ? ' (all dates)' : ' · ' + fmtDate(date)}
            </span>
            <div className="bact">
              <button className="btn sm primary" onClick={() => onSaveReport(rep)}>
                Save
              </button>
              <button className="btn sm" onClick={() => onPreview(rep)}>
                Preview
              </button>
              <button className="btn sm" onClick={() => onPdfDownload(rep)}>
                PDF download
              </button>
              <button className="btn sm" onClick={() => onExcelDownload(rep)}>
                Excel download
              </button>
              {!all && (
                <button
                  className="btn danger sm"
                  onClick={() => {
                    if (window.confirm('Delete the ' + total + ' ' + R.name + ' rows for ' + fmtDate(date) + '?')) {
                      onDeleteDay(rep, date);
                    }
                  }}
                >
                  Delete all data for this date
                </button>
              )}
            </div>
          </div>

          {Object.entries(R.secs).map(([sk, S]) => {
            const secRows = visibleRows(sk);
            if (!secRows.length) return null;
            return (
              <section key={sk} className="sec">
                <h2>
                  {S.t} <small>{secRows.length}</small>
                </h2>
                <div className="card tw">
                  <table>
                    <thead>
                      <tr>
                        {all && <th>Date</th>}
                        <th>Material</th>
                        {S.cols.map((c, i) => (
                          <th key={i} className={c[1] === 'n' ? 'num' : ''}>
                            {c[0]}
                          </th>
                        ))}
                        <th className="act">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {secRows.map(r => (
                        <tr
                          key={r.id}
                          className={`${/^TOTAL\b/i.test(r.label) ? 'tot' : ''}${S.cols.length === 1 ? ' one' : ''}`}
                        >
                          {all && <td>{fmtDate(r.date)}</td>}
                          <td className="lbl">{r.label}</td>
                          {S.cols.map((c, i) => (
                            <td
                              key={i}
                              className={c[1] === 'n' ? 'num' : 'lbl'}
                              data-l={S.cols.length > 1 ? c[0] : undefined}
                            >
                              {r.vals[i]}
                            </td>
                          ))}
                          <td className="act">
                            <button className="btn sm" onClick={() => onEditRow(r)}>
                              Edit
                            </button>
                            <button className="btn sm danger" onClick={() => deleteRow(r.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          <section className="sec" style={{ marginTop: '20px' }}>
            <h2>Note / Remarks</h2>
            <div className="card" style={{ padding: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--muted)' }}>
                Yahan likha hua Note is plant ke report preview, PDF aur Excel export me include hoga.
              </p>
              <textarea
                style={{
                  width: '100%',
                  minHeight: '75px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  fontFamily: 'inherit',
                  fontSize: '13.5px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter note or remark for this date (e.g. Kiln 2 maintenance for 3 hrs, power cutoff, etc.)"
                value={note || ''}
                onChange={e => onNoteChange && onNoteChange(e.target.value)}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
