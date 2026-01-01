import { useState } from "react";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useRAGSearch } from "@/hooks/use-rag-search";
import { Label } from "@/components/ui/label";

// Added imports for Alert, AlertCircle, AlertDescription, FileText, Link2
import { Alert, AlertCircle, AlertDescription } from "@/components/ui/alert";
import { FileText, Link2 } from 'lucide-react';


export function RAGSourcesViewer() {
  const [query, setQuery] = useState("");
  const { searchResults, isSearching, searchSources, error } = useRAGSearch();

  const handleSearch = () => {
    if (!query.trim()) return;
    searchSources(query);
  };

  return (
    <Card className="p-4 mt-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">Search Knowledge Base</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="rag-search">Search Query</Label>
            <Input
              id="rag-search"
              placeholder="Search for relevant content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSearching) {
                  handleSearch();
                }
              }}
            />
             <p className="text-xs text-muted-foreground mt-1">
              Search across all indexed sources
            </p>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !query.trim()}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {searchResults && searchResults.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="text-sm font-medium">
              Search Results ({searchResults.length})
            </h4>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {searchResults.map((result, idx) => (
                  <Card key={idx} className="p-3 hover:bg-accent/50 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {result.sourceType || "unknown"}
                        </Badge>
                        {result.similarity !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {(result.similarity * 100).toFixed(1)}% match
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {result.content}
                      </p>
                      {result.sourcePath && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="h-3 w-3" />
                          {result.sourcePath}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {searchResults && searchResults.length === 0 && query && !isSearching && !error && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No results found for "{query}"
             <p className="text-xs text-muted-foreground mt-1">
              Try different keywords or add more sources
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}