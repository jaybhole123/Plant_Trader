import { useState, useCallback } from 'react';
import { STORAGE_KEYS, REPORTS } from '../utils/constants';
import { isoOf } from '../utils/formatters';

const TODAY = isoOf(new Date());

const getInitialUI = () => {
  let initPage = 'nandan';
  let initDates = {};
  let initAll = false;
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEYS.UI) || 'null');
    if (s) {
      if (REPORTS[s.page] || s.page === 'mis' || s.page === 'rpt' || s.page === 'hst') {
        initPage = s.page;
      }
      if (s.dates && typeof s.dates === 'object') {
        for (const k in s.dates) {
          if (REPORTS[k] && /^\d{4}-\d{2}-\d{2}$/.test(s.dates[k] || '')) {
            initDates[k] = s.dates[k];
          }
        }
      }
      initAll = !!s.all;
    }
  } catch (e) {}
  return { initPage, initDates, initAll };
};

export function useUIState() {
  const initial = getInitialUI();
  const [page, setPage] = useState(initial.initPage);
  const [dates, setDates] = useState(initial.initDates);
  const [all, setAll] = useState(initial.initAll);
  const [tab, setTab] = useState('data');
  const [entry, setEntry] = useState(false);

  const saveUI = useCallback((newPage, newDates, newAll) => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.UI,
        JSON.stringify({
          page: newPage,
          dates: newDates,
          all: newAll
        })
      );
    } catch (e) {}
  }, []);

  const changePage = useCallback(
    p => {
      setPage(p);
      setTab('data');
      setEntry(false);
      saveUI(p, dates, all);
    },
    [dates, all, saveUI]
  );

  const setReportDate = useCallback(
    (rep, d) => {
      setDates(prev => {
        const next = { ...prev, [rep]: d };
        saveUI(page, next, false);
        return next;
      });
      setAll(false);
    },
    [page, saveUI]
  );

  const currentDate = dates[page] || TODAY;

  const toggleAll = useCallback(
    val => {
      const v = typeof val === 'boolean' ? val : !all;
      setAll(v);
      saveUI(page, dates, v);
    },
    [page, dates, all, saveUI]
  );

  return {
    page,
    setPage: changePage,
    dates,
    setDates,
    setReportDate,
    currentDate,
    all,
    setAll: toggleAll,
    tab,
    setTab,
    entry,
    setEntry
  };
}
