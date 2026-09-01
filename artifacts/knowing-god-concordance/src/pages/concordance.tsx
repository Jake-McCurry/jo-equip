import { Header } from '@/components/layout/header';
import { TopicList } from '@/components/concordance/topic-list';
import { TopicDetail } from '@/components/concordance/topic-detail';
import { useSearch } from '@/hooks/use-search';
import { useHead } from '@/hooks/use-head';
import { Toaster } from 'sonner';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function ConcordancePage() {
  const { 
    filters, 
    setFilters, 
    results, 
    activeTopicId, 
    setActiveTopicId, 
    activeTopic,
    totalCount
  } = useSearch();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useHead({
    title: activeTopic ? `${activeTopic.title} - Knowing God Concordance` : 'Knowing God Concordance',
    description: 'A focused study tool for readers who want to move quickly between topical definitions and Scripture.'
  });

  // Close mobile menu when a topic is selected
  useEffect(() => {
    if (activeTopicId) {
      setMobileMenuOpen(false);
    }
  }, [activeTopicId]);

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-80 lg:w-96 flex-col border-r bg-card z-10 shadow-sm">
          <TopicList 
            filters={filters}
            setFilters={setFilters}
            results={results}
            activeTopicId={activeTopicId}
            onSelectTopic={setActiveTopicId}
            totalCount={totalCount}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
          {/* Mobile Topic Selection Trigger */}
          <div className="md:hidden flex items-center p-3 border-b bg-card/50 backdrop-blur z-20 no-print">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-between shadow-sm border-primary/20">
                  <span className="font-medium truncate">
                    {activeTopic ? activeTopic.title : 'Browse Topics'}
                  </span>
                  <Menu className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-[400px] p-0 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-card">
                  <h2 className="font-display font-semibold text-lg">Topics</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TopicList 
                    filters={filters}
                    setFilters={setFilters}
                    results={results}
                    activeTopicId={activeTopicId}
                    onSelectTopic={setActiveTopicId}
                    totalCount={totalCount}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Topic Detail */}
          <div className="flex-1 overflow-hidden relative">
            <TopicDetail 
              topic={activeTopic} 
              onSelectTopic={setActiveTopicId}
            />
          </div>
        </main>
      </div>

      <Toaster 
        position="bottom-center"
        toastOptions={{
          className: 'bg-card border-border text-foreground font-sans shadow-lg rounded-lg',
        }}
      />
    </div>
  );
}
