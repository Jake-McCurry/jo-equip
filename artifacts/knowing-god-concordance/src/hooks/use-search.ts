import { useState, useEffect, useMemo, useCallback } from 'react';
import { Topic } from '../types/topic';
import topicsData from '../data/topics.json';

const ALL_TOPICS = topicsData as Topic[];

export interface SearchFilters {
  query: string;
  showIncomplete: boolean;
  hasSupplemental: boolean;
  hasRelated: boolean;
}

export function useSearch(initialFilters?: Partial<SearchFilters>) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    showIncomplete: true,
    hasSupplemental: false,
    hasRelated: false,
    ...initialFilters,
  });

  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  const results = useMemo(() => {
    let filtered = ALL_TOPICS;

    if (!filters.showIncomplete) {
      filtered = filtered.filter(t => t.sampleStatus === 'complete');
    }

    if (filters.hasSupplemental) {
      filtered = filtered.filter(t => t.supplementalReferences && t.supplementalReferences.length > 0);
    }

    if (filters.hasRelated) {
      filtered = filtered.filter(t => t.relatedTopics && t.relatedTopics.length > 0);
    }

    const q = filters.query.toLowerCase().trim();
    if (q) {
      filtered = filtered.filter(t => {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDef = t.definition.toLowerCase().includes(q);
        const matchesRef = t.primaryPassages.some(p => 
          p.reference.toLowerCase().includes(q) || p.text.toLowerCase().includes(q)
        );
        const matchesSupplemental = t.supplementalReferences.some(reference =>
          reference.toLowerCase().includes(q)
        );
        const matchesRelated = t.relatedTopics.some(related =>
          related.toLowerCase().includes(q)
        );
        return matchesTitle || matchesDef || matchesRef || matchesSupplemental || matchesRelated;
      });
    }

    // Sort alphabetically by title
    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  }, [filters]);

  const activeTopic = useMemo(() => {
    return ALL_TOPICS.find(t => t.id === activeTopicId) || null;
  }, [activeTopicId]);

  return {
    filters,
    setFilters,
    results,
    activeTopicId,
    setActiveTopicId,
    activeTopic,
    totalCount: ALL_TOPICS.length
  };
}
