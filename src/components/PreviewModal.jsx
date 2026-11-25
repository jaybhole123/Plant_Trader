import React, { useEffect, useRef, useState } from 'react';
import { getSheetSpec } from '../utils/sheetExport';
import { pdfjsLib } from '../utils/pdfReader';

export function PreviewModal({ isOpen, title, onClose, onPdfDownload, onExcelDownload, showExcel, pdfBytes, sheetSpecs }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (isOpen && pdfBytes && containerRef.current) {
      setLoading(true);
      containerRef.current.innerHTML = '<p style="padding:24px;color:var(--muted)">Loading…</p>';
      pdfjsLib
        .getDocument({ data: new Uint8Array(pdfBytes) })
        .promise.then(async pdf => {
          if (!active || !containerRef.current) return;
          containerRef.current.innerHTML = '';
          const w = Math.min(containerRef.current.clientWidth || 800, 900);
          for (let i = 1; i <= pdf.numPages; i++) {
            const pg = await pdf.getPage(i);
            const v0 = pg.getViewport({ scale: 1 });
            const vp = pg.getViewport({ scale: (w / v0.width) * (window.devicePixelRatio || 1) });
            const cv = document.createElement('canvas');
            cv.width = vp.width;
            cv.height = vp.height;
            cv.style.cssText =
              'width:100%;max-width:' +
              w +
              'px;display:block;margin:0 auto 14px;box-shadow:0 2px 10px rgba(0,0,0,.2);background:#fff';
            containerRef.current.appendChild(cv);
            await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
          }
          setLoading(false);
        })
        .catch(err => {
          if (active && containerRef.current) {
            containerRef.current.innerHTML = '<p style="padding:24px">The PDF could not be opened.</p>';
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [isOpen, pdfBytes]);

  if (!isOpen) return null;

  return (
    <div className="modal on" onMouseDown={e => e.target.classList.contains('modal') && onClose()}>
      <div className="box wide">
        <h3>{title}</h3>
        <div className="pvb" ref={containerRef}>
          {!pdfBytes &&
            sheetSpecs &&
            sheetSpecs.map((sp, idx) => {
              const tw = sp.W.reduce((a, b) => a + b, 0);
              return (
                <div key={idx} className="tw" style={{ marginBottom: '18px', overflow: 'auto' }}>
                  <table
                    className="sheet"
                    style={{
                      width: `${tw}px`,
                      minWidth: `${tw}px`,
                      tableLayout: 'fixed',
                      borderCollapse: 'collapse',
                      border: '2px solid #000',
                      background: '#fff'
                    }}
                  >
                    <colgroup>
                      {sp.W.map((w, i) => (
                        <col key={i} style={{ width: `${w}px` }} />
                      ))}
                    </colgroup>
                    <tbody>
                      {sp.rows.map((r, ri) => (
                        <tr key={ri} style={{ height: `${r.h || 19}px` }}>
                          {r.cells.map((k, ci) => (
                            <td
                              key={ci}
                              colSpan={k.cs > 1 ? k.cs : undefined}
                              rowSpan={k.rs > 1 ? k.rs : undefined}
                              style={{
                                border: k.nb ? 'none' : '1px solid #000',
                                padding: '0 4px',
                                whiteSpace: 'normal',
                                overflow: 'hidden',
                                lineHeight: '1.15',
                                verticalAlign: 'middle',
                                fontSize: `${k.fs || sp.F}px`,
                                fontWeight: k.b ? 700 : 400,
                                textAlign: k.al,
                                color: k.color || '#000',
                                background: k.bg || '#fff',
                                fontFamily: "Calibri,'Segoe UI',Arial,sans-serif"
                              }}
                            >
                              {k.t}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
        </div>
        <div className="actions pvact">
          <button className="btn primary" onClick={onPdfDownload}>
            PDF download
          </button>
          {showExcel && (
            <button className="btn" onClick={onExcelDownload}>
              Excel download
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
