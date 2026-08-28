import { Topic, Passage } from '@/types/topic';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useStudyList } from '@/hooks/use-study-list';
import { Copy, Printer, BookmarkPlus, BookmarkCheck, FileText, Link2, BookOpen, Quote } from 'lucide-react';
import { toast } from 'sonner';
import topicsData from '@/data/topics.json';

const availableTopicIds = new Set((topicsData as Topic[]).map((item) => item.id));

interface TopicDetailProps {
  topic: Topic | null;
  onSelectTopic: (id: string) => void;
}

export function TopicDetail({ topic, onSelectTopic }: TopicDetailProps) {
  const { isSaved, toggleTopic } = useStudyList();

  if (!topic) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 bg-card/30">
        <div className="bg-background p-4 rounded-full shadow-sm mb-4 border border-border/50">
          <BookOpen className="h-8 w-8 text-primary/40" />
        </div>
        <h2 className="font-display text-xl text-foreground font-medium">Select a Topic</h2>
        <p className="max-w-sm text-center mt-2 text-sm leading-relaxed">
          Choose a topic from the list to view its definition and explore related scriptural passages.
        </p>
      </div>
    );
  }

  const saved = isSaved(topic.id);

  const handleCopyPassage = (passage: Passage) => {
    const text = `${passage.reference}\n${passage.text}`;
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${passage.reference}`);
  };

  const handleCopyTopic = () => {
    let text = `${topic.title.toUpperCase()}\n${topic.definition}\n\n`;
    topic.primaryPassages.forEach(p => {
      text += `${p.reference}\n${p.text}\n\n`;
    });
    navigator.clipboard.writeText(text);
    toast.success(`Copied topic to clipboard`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Action Bar - Fixed Top */}
      <div className="flex items-center justify-between p-3 border-b bg-card/80 backdrop-blur-sm z-10 shrink-0 no-print shadow-sm">
        <div className="flex gap-2">
          <Button 
            variant={saved ? "secondary" : "default"} 
            size="sm"
            onClick={() => toggleTopic(topic.id)}
            data-testid={`button-toggle-save-${topic.id}`}
            className="gap-2"
          >
            {saved ? (
              <>
                <BookmarkCheck className="h-4 w-4 text-primary" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="h-4 w-4" />
                <span>Save to List</span>
              </>
            )}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handleCopyTopic}
            data-testid="button-copy-topic"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={handlePrint}
            data-testid="button-print-topic"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 print:overflow-visible print:h-auto">
        <div className="max-w-3xl mx-auto p-6 sm:p-10 lg:p-16 pb-24">
          
          {/* Header Section */}
          <div className="mb-10 text-center sm:text-left print-break-inside-avoid">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              {topic.title}
            </h1>
            <div className="relative">
              <Quote className="absolute -left-2 -top-2 h-8 w-8 text-primary/10 rotate-180" />
              <p className="text-lg sm:text-xl font-serif italic text-foreground/80 leading-relaxed pl-6 border-l-2 border-primary/20">
                {topic.definition}
              </p>
            </div>
            
            {topic.sampleStatus === 'partial' && (
              <div className="mt-6 flex items-center justify-center sm:justify-start">
                <Badge variant="secondary" className="text-xs border-primary/20 bg-primary/5 text-primary">
                  Partial Record (Sample)
                </Badge>
              </div>
            )}
            {topic.sampleStatus === 'cross-reference' && (
              <div className="mt-6 flex items-center justify-center sm:justify-start">
                <Badge variant="secondary" className="text-xs border-primary/20 bg-primary/5 text-primary">
                  Cross-reference Record
                </Badge>
              </div>
            )}
          </div>

          <Separator className="my-10 bg-primary/10" />

          {/* Primary Passages */}
          <div className="space-y-8">
            <h3 className="font-display text-xl font-semibold flex items-center gap-2 text-foreground/90 border-b border-border/50 pb-2 mb-6">
              <FileText className="h-5 w-5 text-primary" />
              Primary Passages
            </h3>
            
            <div className="space-y-8">
              {topic.primaryPassages.length === 0 && (
                <p className="font-serif text-muted-foreground italic">
                  This source entry directs readers to the related topics below.
                </p>
              )}
              {topic.primaryPassages.map((passage, idx) => (
                <div 
                  key={idx} 
                  className="group relative pl-4 sm:pl-6 border-l border-muted-foreground/20 hover:border-primary/40 transition-colors print-break-inside-avoid"
                  data-testid={`passage-${idx}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-primary font-sans text-sm tracking-wide uppercase">
                      {passage.reference}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity no-print hover:bg-primary/5 hover:text-primary"
                      onClick={() => handleCopyPassage(passage)}
                      title="Copy passage"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      <span className="text-[10px] uppercase tracking-wider">Copy</span>
                    </Button>
                  </div>
                  <p className="font-serif text-[1.05rem] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {passage.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {(topic.supplementalReferences?.length > 0 || topic.relatedTopics?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12 pt-8 border-t border-border/50 print-break-inside-avoid bg-card/30 p-6 rounded-xl border border-primary/5">
              
              {/* Supplemental References */}
              {topic.supplementalReferences && topic.supplementalReferences.length > 0 && (
                <div>
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4 text-foreground/80">
                    <Link2 className="h-4 w-4 text-primary" />
                    Supplemental References
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {topic.supplementalReferences.map((ref, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center rounded-md bg-background border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Topics */}
              {topic.relatedTopics && topic.relatedTopics.length > 0 && (
                <div>
                  <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4 text-foreground/80">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Related Topics
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {topic.relatedTopics.map((related, idx) => {
                      const relatedId = related.toLowerCase().replace(/ /g, '-');
                      const isAvailable = availableTopicIds.has(relatedId);
                      if (!isAvailable) {
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-md bg-background border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground"
                            title="This related topic is outside the current sample"
                          >
                            {related}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={idx}
                          onClick={() => onSelectTopic(relatedId)}
                          data-testid={`button-related-topic-${relatedId}`}
                          className="inline-flex items-center rounded-md bg-primary/5 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer shadow-sm no-print"
                        >
                          {related}
                        </button>
                      );
                    })}
                    <div className="print-only hidden">
                      {topic.relatedTopics.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Source Provenance */}
          {topic.sourcePages && topic.sourcePages.length > 0 && (
            <div className="mt-12 pt-6 text-center text-xs text-muted-foreground font-medium tracking-wide uppercase border-t border-border/50">
              Source Pages: {topic.sourcePages.join(', ')}
            </div>
          )}
          
        </div>
      </ScrollArea>
    </div>
  );
}
