import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../utils/constants';

export function usePlantData(showToast) {
  const [rows, setRows] = useState(() => {
    try {
      const r = JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA) || 'null');
      if (r && Array.isArray(r.rows)) return r.rows;
    } catch (e) {}
    return [];
  });

  const persist = useCallback(newRows => {
    try {
      localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify({ rows: newRows }));
    } catch (e) {
      if (showToast) showToast('Browser storage is blocked. Data will be lost on refresh.', true);
    }
  }, [showToast]);

  const updateRows = useCallback(updater => {
    setRows(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      persist(updated);
      return updated;
    });
  }, [persist]);

  const live = useCallback(() => {
    const dk = new Set(rows.filter(r => r.draft).map(r => r.rep + '|' + r.date));
    return rows.filter(r => r.draft || !dk.has(r.rep + '|' + r.date));
  }, [rows]);

  const drafts = useCallback(rep => {
    return rows.filter(r => r.draft && r.rep === rep);
  }, [rows]);

  const rowsOf = useCallback((rep, date, sec) => {
    return live().filter(r => r.rep === rep && r.date === date && (!sec || r.sec === sec));
  }, [live]);

  const hasRows = useCallback((rep, date) => {
    return live().some(r => r.rep === rep && r.date === date);
  }, [live]);

  const deleteRow = useCallback(id => {
    const r = rows.find(x => x.id === id);
    if (!r) return;
    if (!window.confirm('Delete the row "' + r.label + '"?')) return;
    updateRows(prev => prev.filter(x => x.id !== id));
    if (showToast) showToast('Row deleted');
  }, [rows, updateRows, showToast]);

  const saveReport = useCallback(rep => {
    const d = drafts(rep);
    updateRows(prev => {
      let next = [...prev];
      if (d.length) {
        const keys = new Set(d.map(r => r.date));
        next = next.filter(r => r.draft || r.rep !== rep || !keys.has(r.date));
        next = next.map(r => {
          if (r.draft && r.rep === rep) {
            const copy = { ...r };
            delete copy.draft;
            return copy;
          }
          return r;
        });
      }
      return next;
    });
  }, [drafts, updateRows]);

  const discardDrafts = useCallback((rep, onDiscardPdfs) => {
    const d = drafts(rep);
    if (window.confirm('Discard the ' + d.length + ' extracted rows? They have not been saved.')) {
      const ds = [...new Set(d.map(r => r.date))];
      updateRows(prev => {
        const next = prev.filter(r => !(r.draft && r.rep === rep));
        if (onDiscardPdfs) {
          ds.forEach(date => {
            if (!next.some(r => r.rep === rep && r.date === date)) {
              onDiscardPdfs(rep, date);
            }
          });
        }
        return next;
      });
      if (showToast) showToast('Discarded');
    }
  }, [drafts, updateRows, showToast]);

  const deleteDayData = useCallback((rep, date, onDeletePdf) => {
    updateRows(prev => prev.filter(r => !(r.rep === rep && r.date === date)));
    if (onDeletePdf) onDeletePdf(rep, date);
    if (showToast) showToast('Deleted');
  }, [updateRows, showToast]);

  return {
    rows,
    setRows: updateRows,
    live,
    drafts,
    rowsOf,
    hasRows,
    deleteRow,
    saveReport,
    discardDrafts,
    deleteDayData
  };
}
