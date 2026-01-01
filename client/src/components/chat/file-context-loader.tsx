
import { useState, useEffect } from 'react';
import { FileCode2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAssistantStore } from '@/hooks/use-assistant-store';

interface FileContextLoaderProps {
  fileIds: string[];
  onLoaded?: (files: Array<{ id: string; name: string; content: string }>) => void;
}

export function FileContextLoader({ fileIds, onLoaded }: FileContextLoaderProps) {
  const { files } = useAssistantStore();
  const [loading, setLoading] = useState(true);
  const [loadedFiles, setLoadedFiles] = useState<Array<{ id: string; name: string; content: string }>>([]);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      const contextFiles = fileIds
        .map(id => files.find(f => f.id === id))
        .filter(Boolean)
        .map(f => ({
          id: f!.id,
          name: f!.name,
          content: f!.content,
        }));
      
      setLoadedFiles(contextFiles);
      setLoading(false);
      onLoaded?.(contextFiles);
    };

    if (fileIds.length > 0) {
      loadFiles();
    } else {
      setLoading(false);
    }
  }, [fileIds, files, onLoaded]);

  if (fileIds.length === 0) return null;

  return (
    <Card className="p-2 border-muted mb-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading context files...</span>
          </>
        ) : (
          <>
            <FileCode2 className="h-3 w-3" />
            <span>{loadedFiles.length} file{loadedFiles.length !== 1 ? 's' : ''} in context</span>
          </>
        )}
      </div>
      {!loading && (
        <div className="flex flex-wrap gap-1 mt-1">
          {loadedFiles.map(file => (
            <span key={file.id} className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
              {file.name}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
