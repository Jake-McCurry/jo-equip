import { SearchFilters } from '@/hooks/use-search';
import { Topic } from '@/types/topic';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, BookText, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface TopicListProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters | ((prev: SearchFilters) => SearchFilters)) => void;
  results: Topic[];
  activeTopicId: string | null;
  onSelectTopic: (id: string) => void;
  totalCount: number;
}

export function TopicList({
  filters,
  setFilters,
  results,
  activeTopicId,
  onSelectTopic,
  totalCount
}: TopicListProps) {
  
  // Listen for the custom event from the Study List to select a topic
  useEffect(() => {
    const handleSelectTopic = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      onSelectTopic(customEvent.detail);
    };
    window.addEventListener('select-topic', handleSelectTopic);
    return () => window.removeEventListener('select-topic', handleSelectTopic);
  }, [onSelectTopic]);

  return (
    <div className="flex flex-col h-full bg-card border-r shadow-sm">
      <div className="p-4 border-b bg-background/50 space-y-4 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search topics, definitions, or scriptures..."
            className="pl-9 pr-4 py-5 bg-background shadow-sm border-primary/20 focus-visible:ring-primary/30 rounded-lg text-sm"
            value={filters.query}
            onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
            data-testid="input-search-topics"
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" />
            Filters
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
              <Checkbox 
                checked={filters.showIncomplete}
                onCheckedChange={(c) => setFilters(f => ({ ...f, showIncomplete: c as boolean }))}
                data-testid="checkbox-filter-incomplete"
                className="group-hover:border-primary/50 transition-colors"
              />
               <span className="text-muted-foreground group-hover:text-foreground transition-colors">Include partial & cross-reference records</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
              <Checkbox 
                checked={filters.hasSupplemental}
                onCheckedChange={(c) => setFilters(f => ({ ...f, hasSupplemental: c as boolean }))}
                data-testid="checkbox-filter-supplemental"
                className="group-hover:border-primary/50 transition-colors"
              />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">Has supplemental references</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
              <Checkbox 
                checked={filters.hasRelated}
                onCheckedChange={(c) => setFilters(f => ({ ...f, hasRelated: c as boolean }))}
                data-testid="checkbox-filter-related"
                className="group-hover:border-primary/50 transition-colors"
              />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">Has related topics</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 border-b bg-muted/20 text-xs font-medium text-muted-foreground flex justify-between items-center shrink-0">
        <span>Showing {results.length} of {totalCount} topics</span>
      </div>

      <ScrollArea className="flex-1">
        {results.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
            <BookText className="h-8 w-8 mb-3 opacity-20" />
            <p>No topics match your search.</p>
            <p className="text-xs mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            {results.map((topic) => {
              const isActive = topic.id === activeTopicId;
              return (
                <button
                  key={topic.id}
                  onClick={() => onSelectTopic(topic.id)}
                  data-testid={`button-select-topic-${topic.id}`}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 text-left border-b border-transparent transition-all",
                    isActive 
                      ? "bg-primary/[0.08] border-b-primary/10" 
                      : "hover:bg-accent/40 border-b-border/50"
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <h3 className={cn(
                      "font-display font-medium text-[1.1rem] leading-tight",
                      isActive ? "text-primary font-semibold" : "text-foreground"
                    )}>
                      {topic.title}
                    </h3>
                    {topic.sampleStatus === 'partial' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground shrink-0 uppercase tracking-wider bg-background/50">
                        Partial
                      </Badge>
                    )}
                    {topic.sampleStatus === 'cross-reference' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary shrink-0 uppercase tracking-wider bg-primary/5">
                        See
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pr-4 italic leading-relaxed mt-1">
                    {topic.definition}
                  </p>
                  
                  <div className="flex gap-2 mt-2">
                    <span className="flex items-center text-[10px] text-muted-foreground font-medium bg-background/60 px-1.5 py-0.5 rounded uppercase tracking-wider border border-border/50">
                      <FileText className="w-3 h-3 mr-1" />
                      {topic.primaryPassages.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
