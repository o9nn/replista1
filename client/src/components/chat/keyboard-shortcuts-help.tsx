
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Command } from "lucide-react";

interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Session
  { keys: "⌘N", description: "New chat session", category: "Session" },
  { keys: "⌘D", description: "Clear current session", category: "Session" },
  
  // Checkpoints
  { keys: "⌘S", description: "Create checkpoint", category: "Checkpoints" },
  
  // Files
  { keys: "⌘U", description: "Upload file", category: "Files" },
  
  // Navigation
  { keys: "⌘K", description: "Open command palette", category: "Navigation" },
  { keys: "⌘I", description: "Focus chat input", category: "Navigation" },
  { keys: "⌘F", description: "Search messages", category: "Navigation" },
  { keys: "⌘B", description: "Toggle sidebar", category: "Navigation" },
  { keys: "Esc", description: "Close dialogs", category: "Navigation" },
  
  // Chat
  { keys: "⌘Enter", description: "Send message", category: "Chat" },
  { keys: "↑/↓", description: "Navigate message history", category: "Chat" },
  
  // Editor
  { keys: "⌘C", description: "Copy code block", category: "Editor" },
  { keys: "⌘A", description: "Select all", category: "Editor" },
];

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keys.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="pl-8"
            />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {shortcut.keys.replace('⌘', modKey)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Press <Badge variant="outline" className="mx-1">{modKey}+/</Badge> to toggle this help
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
