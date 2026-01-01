
import { useState } from "react";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Check, Trash2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function SessionSwitcher() {
  const { sessions, currentSessionId, setCurrentSession, addSession, deleteSession } = useAssistantStore();
  const [isCreating, setIsCreating] = useState(false);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const handleCreateSession = () => {
    setIsCreating(true);
    const newSession = {
      id: `session-${Date.now()}`,
      title: `New Chat ${sessions.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addSession(newSession);
    setIsCreating(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this session? This cannot be undone.")) {
      deleteSession(sessionId);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2 truncate">
            <MessageSquare className="h-4 w-4" />
            {currentSession?.title || "Select Session"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Sessions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {sessions.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No sessions yet
          </div>
        ) : (
          sessions.map((session) => (
            <DropdownMenuItem
              key={session.id}
              onClick={() => setCurrentSession(session.id)}
              className="flex items-center justify-between group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {session.id === currentSessionId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  <span className="truncate">{session.title}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => handleDeleteSession(session.id, e)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DropdownMenuItem>
          ))
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCreateSession} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
