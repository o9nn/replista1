import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, AtSign, Loader2, Link, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import { cn } from "@/lib/utils";
import { parseFileMentions } from "@/lib/mention-parser";
import { useToast } from "@/hooks/use-toast";
import { VoiceControls } from "./voice-controls";

interface ChatInputProps {
  onSendMessage: (message: string, mentionedFiles: string[], systemPrompt?: string) => void;
  onFileUpload: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onFileUpload, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [mentionedFiles, setMentionedFiles] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { files, isStreaming } = useAssistantStore();

  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);

  useEffect(() => {
    const urlPattern = /(https?:\/\/[^\s]+)/;
    const match = message.match(urlPattern);
    setDetectedUrl(match ? match[0] : null);
  }, [message]);


  const handleSend = useCallback(() => {
    if (!message.trim() || disabled || isStreaming) return;

    // Parse @ mentions from message
    const { mentionedFileIds } = parseFileMentions(message, files);
    const allMentionedFiles = Array.from(new Set([...mentionedFiles, ...mentionedFileIds]));

    onSendMessage(message.trim(), allMentionedFiles);
    setMessage("");
    setMentionedFiles([]);
    setDetectedUrl(null);
  }, [message, mentionedFiles, disabled, isStreaming, onSendMessage, files]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (fileId: string, fileName: string) => {
    if (!mentionedFiles.includes(fileId)) {
      setMentionedFiles([...mentionedFiles, fileId]);
      setMessage((prev) => prev + `@${fileName} `);
    }
    setShowFilePicker(false);
    textareaRef.current?.focus();
  };

  const removeFileMention = (fileId: string) => {
    setMentionedFiles(mentionedFiles.filter((id) => id !== fileId));
  };

  const handleCaptureScreenshot = async () => {
    if (!urlInput) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to capture",
        variant: "destructive",
      });
      return;
    }

    setIsCapturingScreenshot(true);
    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput, fullPage: true }),
      });

      if (!response.ok) throw new Error('Screenshot failed');

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      setMessage(prev => `${prev}\n\n[Screenshot of ${urlInput}](${imageUrl})`);
      setUrlInput("");
      setShowUrlInput(false);

      toast({
        title: "Screenshot captured",
        description: "Added to your message",
      });
    } catch (error) {
      toast({
        title: "Screenshot failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleScrapeUrl = async () => {
    if (!urlInput) return;

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      if (!response.ok) throw new Error('Scraping failed');

      const data = await response.json();
      setMessage(prev => `${prev}\n\nContent from ${urlInput}:\n${data.content.substring(0, 1000)}...`);
      setUrlInput("");
      setShowUrlInput(false);

      toast({
        title: "Content scraped",
        description: "Added to your message",
      });
    } catch (error) {
      toast({
        title: "Scraping failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [message]);

  const isDisabled = disabled || isStreaming;

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="flex items-start gap-2 max-w-4xl mx-auto">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Assistant, use @ to include specific files..."
            className="min-h-[42px] max-h-40 resize-none pr-24 text-sm border-border"
            disabled={isDisabled}
            data-testid="input-chat-message"
          />

          <div className="absolute right-1 bottom-1 flex items-center gap-0.5">
            <Popover open={showFilePicker} onOpenChange={setShowFilePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isDisabled || files.length === 0}
                  data-testid="button-mention-file"
                  type="button"
                >
                  <AtSign className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-1" align="end" side="top">
                <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                  Add file context
                </div>
                {files.length > 0 ? (
                  <div className="max-h-64 overflow-auto">
                    {files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleFileSelect(file.id, file.name)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors",
                          mentionedFiles.includes(file.id) && "bg-accent"
                        )}
                        data-testid={`button-select-file-${file.id}`}
                        type="button"
                      >
                        <span className="font-mono">{file.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No files uploaded
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onFileUpload}
              disabled={isDisabled}
              data-testid="button-upload-file"
              type="button"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={!message.trim() || isDisabled}
          size="sm"
          className="h-[42px] px-4"
          data-testid="button-send-message"
          type="button"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex justify-end mt-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowUrlInput(!showUrlInput)}
            disabled={isDisabled}
            title="Add URL or screenshot"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showUrlInput && (
        <div className="border-t pt-2 flex gap-2 items-center">
          <input
            type="url"
            placeholder="Enter URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            disabled={isDisabled || isCapturingScreenshot}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleScrapeUrl}
            disabled={!urlInput || isDisabled}
          >
            Scrape
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCaptureScreenshot}
            disabled={!urlInput || isDisabled || isCapturingScreenshot}
          >
            <Camera className="h-4 w-4 mr-1" />
            Screenshot
          </Button>
        </div>
      )}
    </div>
  );
}