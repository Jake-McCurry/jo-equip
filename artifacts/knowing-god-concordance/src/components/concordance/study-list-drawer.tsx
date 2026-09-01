import { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import { useStudyList } from '@/hooks/use-study-list';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Library, Trash2, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface StudyListDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudyListDrawer({ open, onOpenChange }: StudyListDrawerProps) {
  const { savedTopics, removeTopic, clearList } = useStudyList();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b pb-4">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            <SheetTitle className="font-display">My Study List</SheetTitle>
          </div>
          <SheetDescription>
            Topics you have saved for further reflection and study.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6">
          {savedTopics.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-3">
              <Library className="h-10 w-10 opacity-20" />
              <div>
                <p className="font-medium text-foreground">Your list is empty</p>
                <p className="text-sm mt-1">Browse topics and save them here.</p>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {savedTopics.map((topic) => (
                <div key={topic.id} className="group relative flex flex-col gap-1.5 rounded-lg border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors" data-testid={`card-saved-topic-${topic.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display font-semibold text-lg leading-none">
                      {topic.title}
                    </h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1"
                      onClick={() => removeTopic(topic.id)}
                      data-testid={`button-remove-topic-${topic.id}`}
                      title="Remove from list"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 italic">
                    {topic.definition}
                  </p>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-2 flex items-center justify-between">
                    <span>{topic.primaryPassages.length} Passages</span>
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-[10px] uppercase text-primary gap-1"
                      onClick={() => {
                        onOpenChange(false);
                        // In a real app we might navigate to the topic, 
                        // but here we are a SPA where active topic is managed by context.
                        // We will dispatch a custom event to select this topic.
                        window.dispatchEvent(new CustomEvent('select-topic', { detail: topic.id }));
                      }}
                      data-testid={`link-view-topic-${topic.id}`}
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {savedTopics.length > 0 && (
          <div className="p-4 border-t bg-muted/30">
            <Button 
              variant="outline" 
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
              onClick={clearList}
              data-testid="button-clear-list"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Study List
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
