import { useState, useEffect, useCallback } from 'react';
import { Topic } from '../types/topic';
import topicsData from '../data/topics.json';

const STORAGE_KEY = 'knowing_god_study_list';
const STUDY_LIST_EVENT = 'knowing-god-study-list-change';

function readSavedIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load study list', error);
    return [];
  }
}

export function useStudyList() {
  const [savedIds, setSavedIds] = useState<string[]>(readSavedIds);

  useEffect(() => {
    const syncFromStorage = () => setSavedIds(readSavedIds());
    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(STUDY_LIST_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(STUDY_LIST_EVENT, syncFromStorage);
    };
  }, []);

  const saveToStorage = useCallback((ids: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      window.dispatchEvent(new Event(STUDY_LIST_EVENT));
    } catch (error) {
      console.error('Failed to save study list', error);
    }
  }, []);

  const addTopic = useCallback((id: string) => {
    setSavedIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  const removeTopic = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = prev.filter(tId => tId !== id);
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  const toggleTopic = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id];
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  const clearList = useCallback(() => {
    setSavedIds([]);
    saveToStorage([]);
  }, [saveToStorage]);

  const savedTopics = savedIds
    .map(id => (topicsData as Topic[]).find(t => t.id === id))
    .filter((t): t is Topic => !!t);

  return {
    savedIds,
    savedTopics,
    addTopic,
    removeTopic,
    toggleTopic,
    clearList,
    isSaved: (id: string) => savedIds.includes(id)
  };
}
