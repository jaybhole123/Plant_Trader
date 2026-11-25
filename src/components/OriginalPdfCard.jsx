import React, { useRef } from 'react';
import { fmtDate } from '../utils/formatters';
import { ofKey } from '../utils/storage';

export function OriginalPdfCard({ rep, date, all, ofMeta, onAttach, onView, onDownload, onRemove, hasData }) {
  const fileInputRef = useRef(null);
  const targetDateRef = useRef(date);

  const ks = Object.keys(ofMeta || {})
    .filter(k => k.startsWith(rep + '|') && (all || k === ofKey(rep, date)))
    .sort();

  const handleAttachClick = d => {
    targetDateRef.current = d;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    onAttach(rep, targetDateRef.current, f);
  };

  if (!ks.length) {
    return (
      <div className="opdf none">
        <b>Original PDF:</b> none saved for {all ? 'any date' : fmtDate(date)}.{' '}
        {!all && hasData ? (
          <>
            This date&apos;s data was saved before PDFs were stored. Attach its PDF:
            <button className="btn sm" onClick={() => handleAttachClick(date)} style={{ marginLeft: '6px' }}>
              Attach original PDF
            </button>
          </>
        ) : (
          'Upload the PDF above and it is stored automatically along with its data.'
        )}
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="opdf">
      <div className="oh">Original uploaded PDF</div>
      {ks.map(k => {
        const m = ofMeta[k];
        const rowDate = k.split('|')[1];
        return (
          <div key={k} className="orow">
            <div className="oi">
              <b>{m.name}</b>
              <small>
                {fmtDate(rowDate)} · {Math.max(1, Math.round(m.size / 1024))} KB
              </small>
            </div>
            <div className="oa">
              <button className="btn sm" onClick={() => onView(k)}>
                View
              </button>
              <button className="btn sm" onClick={() => onDownload(k)}>
                Download
              </button>
              <button className="btn sm" onClick={() => handleAttachClick(rowDate)}>
                Replace
              </button>
              <button className="btn sm danger" onClick={() => onRemove(k)}>
                Remove
              </button>
            </div>
          </div>
        );
      })}
      <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
    </div>
  );
}
