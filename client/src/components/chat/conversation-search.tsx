import { useState, useMemo, useEffect } from "react";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Add global styles for search highlight
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes highlight-pulse {
      0%, 100% { background-color: rgba(251, 191, 36, 0.3); }
      50% { background-color: rgba(251, 191, 36, 0.6); }
    }
    .highlight-search-match {
      animation: highlight-pulse 1.5s ease-in-out;
      border-left: 3px solid rgb(251, 191, 36);
      padding-left: 8px;
    }
  `;
  document.head.appendChild(style);
}

export function ConversationSearch() {
  const { messages } = useAssistantStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return messages
      .map((msg, index) => ({
        ...msg,
        index,
        snippet: msg.content.toLowerCase().includes(query)
          ? msg.content.substring(
              Math.max(0, msg.content.toLowerCase().indexOf(query) - 50),
              Math.min(msg.content.length, msg.content.toLowerCase().indexOf(query) + 100)
            )
          : '',
      }))
      .filter((msg) => msg.content.toLowerCase().includes(query));
  }, [messages, searchQuery]);

  useEffect(() => {
    setCurrentMatchIndex(0); // Reset to the first match when search query changes
  }, [searchQuery]);

  const handleClear = () => {
    setSearchQuery("");
    setCurrentMatchIndex(0);
  };

  const handleNext = () => {
    if (searchResults.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % searchResults.length);
    }
  };

  const handlePrevious = () => {
    if (searchResults.length > 0) {
      setCurrentMatchIndex((prev) => 
        prev === 0 ? searchResults.length - 1 : prev - 1
      );
    }
  };

  const scrollToMatch = (index: number) => {
    const messageId = searchResults[index]?.id;
    if (messageId) {
      const element = document.querySelector(`[data-message-id="${messageId}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });

      // Temporarily highlight the matched message
      element?.classList.add('highlight-search-match');
      setTimeout(() => {
        element?.classList.remove('highlight-search-match');
      }, 1500); // Highlight for 1.5 seconds
    }
  };

  // Trigger scroll to the current match when currentMatchIndex changes
  useEffect(() => {
    if (searchQuery && searchResults.length > 0) {
      scrollToMatch(currentMatchIndex);
    }
  }, [currentMatchIndex, searchQuery, searchResults]);


  return (
    <div className="flex flex-col gap-2 p-2 border-b">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="pl-8 pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="flex items-center gap-1">
            <Badge variant="secondary">
              {currentMatchIndex + 1} / {searchResults.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handlePrevious} title="Previous match">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNext} title="Next match">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {searchQuery && searchResults.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-2">
          No messages found
        </div>
      )}
    </div>
  );
}