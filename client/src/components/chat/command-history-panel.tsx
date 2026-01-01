
import { useState } from "react";
import { Terminal, Play, Trash2, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCommandHistory } from "@/hooks/use-command-history";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function CommandHistoryPanel() {
  const { history, executeCommand, clearHistory, isLoading } = useCommandHistory();
  const { toast } = useToast();
  const [executing, setExecuting] = useState<string | null>(null);

  const handleRerun = async (command: string) => {
    setExecuting(command);
    try {
      await executeCommand.mutateAsync({ command });
      toast({
        title: "Command executed",
        description: `Ran: ${command}`,
      });
    } catch (error) {
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setExecuting(null);
    }
  };

  const handleCopy = (command: string) => {
    navigator.clipboard.writeText(command);
    toast({
      title: "Copied to clipboard",
      description: command,
    });
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory.mutateAsync();
      toast({
        title: "History cleared",
        description: "Command history has been cleared",
      });
    } catch (error) {
      toast({
        title: "Failed to clear history",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Loading history...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Command History</span>
          <Badge variant="secondary" className="text-xs">
            {history.length}
          </Badge>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            disabled={clearHistory.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        {history.length === 0 ? (
          <Card className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              No command history yet
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <Card key={item.id} className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <code className="text-xs font-mono flex-1 break-all">
                      {item.command}
                    </code>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleCopy(item.command)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => handleRerun(item.command)}
                        disabled={executing === item.command}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {item.exitCode !== undefined && (
                    <Badge
                      variant={item.exitCode === 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      Exit code: {item.exitCode}
                    </Badge>
                  )}

                  {item.output && (
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
                      {item.output}
                    </pre>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
