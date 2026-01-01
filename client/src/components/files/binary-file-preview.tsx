
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BinaryFilePreviewProps {
  open: boolean;
  onClose: () => void;
  file: {
    name: string;
    type: string;
    content: string; // base64 encoded
    size: number;
  };
}

export function BinaryFilePreview({ open, onClose, file }: BinaryFilePreviewProps) {
  const [error, setError] = useState(false);

  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';
  
  const dataUrl = `data:${file.type};base64,${file.content}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = file.name;
    link.click();
  };

  const handleOpenInNewTab = () => {
    window.open(dataUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{file.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{file.type}</Badge>
              <Badge variant="outline">{(file.size / 1024).toFixed(1)} KB</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isImage && !error && (
            <div className="flex items-center justify-center bg-muted rounded-lg p-4">
              <img
                src={dataUrl}
                alt={file.name}
                className="max-w-full max-h-[60vh] object-contain"
                onError={() => setError(true)}
              />
            </div>
          )}

          {isPDF && (
            <iframe
              src={dataUrl}
              className="w-full h-[60vh] rounded-lg border"
              title={file.name}
            />
          )}

          {error && (
            <div className="text-center py-8 text-muted-foreground">
              Unable to preview this file
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
