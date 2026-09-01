import { BookOpen, Info, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudyListDrawer } from '../concordance/study-list-drawer';
import { useStudyList } from '@/hooks/use-study-list';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export function Header() {
  const { savedIds } = useStudyList();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm no-print">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg tracking-tight text-foreground leading-tight">
              Knowing God
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Concordance</span>
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="h-4 text-[9px] px-1.5 cursor-help hover:bg-secondary/80">
                      Sample Prototype
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-xs text-xs">
                    <p className="flex items-start gap-2">
                      <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>This is a focused study tool prototype. It contains a curated selection of topics to demonstrate search, cross-referencing, and study list capabilities.</span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
            onClick={() => setDrawerOpen(true)}
            data-testid="button-open-study-list"
          >
            <Library className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">Study List</span>
            {savedIds.length > 0 && (
              <Badge variant="default" className="ml-1 h-5 min-w-5 px-1 justify-center rounded-full text-[10px]">
                {savedIds.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <StudyListDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </header>
  );
}
