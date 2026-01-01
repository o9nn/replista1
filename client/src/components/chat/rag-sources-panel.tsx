
import { useState } from "react";
import { Database, Plus, Loader2, Trash2, FileText, Globe, Type } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRAGSources } from "@/hooks/use-rag-sources";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function RAGSourcesPanel() {
  const [sourceType, setSourceType] = useState<"file" | "url" | "manual">("manual");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const { sources, loadingSources, addSource, removeSource, indexSources } = useRAGSources();

  const handleAddSource = async () => {
    if (!content.trim() && !url.trim()) {
      toast({
        title: "Content required",
        description: "Please enter content or URL",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const sourceContent = sourceType === "url" ? url : content;
      await addSource.mutateAsync({
        type: sourceType,
        content: sourceContent,
        metadata: sourceType === "url" ? { url } : {},
      });

      setContent("");
      setUrl("");
      toast({
        title: "Source added",
        description: "RAG source added successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to add source",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSource = async (id: number) => {
    try {
      await removeSource.mutateAsync(id);
      toast({
        title: "Source removed",
        description: "RAG source removed successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to remove source",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleIndexSources = async () => {
    try {
      await indexSources.mutateAsync();
      toast({
        title: "Indexing complete",
        description: "All sources have been indexed",
      });
    } catch (error) {
      toast({
        title: "Failed to index sources",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">RAG Sources</h3>
          </div>
          <Badge variant="outline">
            {sources?.length || 0} sources
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="source-type">Source Type</Label>
            <Select
              value={sourceType}
              onValueChange={(v: any) => setSourceType(v)}
            >
              <SelectTrigger id="source-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Manual Text
                  </div>
                </SelectItem>
                <SelectItem value="url">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    URL
                  </div>
                </SelectItem>
                <SelectItem value="file">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    File
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sourceType === "url" ? (
            <div>
              <Label htmlFor="source-url">URL</Label>
              <Input
                id="source-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="source-content">Content</Label>
              <Textarea
                id="source-content"
                placeholder="Enter content to add to knowledge base..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleAddSource}
              disabled={isAdding}
              className="flex-1"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </>
              )}
            </Button>
            <Button
              onClick={handleIndexSources}
              variant="outline"
              disabled={indexSources.isPending}
            >
              {indexSources.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Index All"
              )}
            </Button>
          </div>
        </div>

        {loadingSources ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sources && sources.length > 0 ? (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {sources.map((source) => (
                <Card key={source.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {source.sourceType}
                        </Badge>
                        {source.embedding && (
                          <Badge variant="outline" className="text-xs">
                            Indexed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {source.content.substring(0, 100)}
                        {source.content.length > 100 && "..."}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSource(source.id)}
                      className="h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No RAG sources yet. Add your first source above.
          </div>
        )}
      </div>
    </Card>
  );
}
