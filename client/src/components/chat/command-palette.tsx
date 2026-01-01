import { useEffect, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import {
  FileText,
  MessageSquare,
  Settings,
  History,
  Plus,
  Search,
  Lightbulb,
  Zap,
  Archive,
  GitBranch,
  Upload,
  Save,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { KeyboardShortcutsHelp } from "./keyboard-shortcuts-help";

interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: string;
  shortcut?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { sessions, addSession, setCurrentSession, files, clearMessages, createCheckpoint } = useAssistantStore();
  const { toast } = useToast();

  const commands: Command[] = [
    {
      id: 'new-session',
      label: 'New Chat Session',
      icon: MessageSquare,
      action: () => {
        handleNewSession();
      },
      category: 'Session',
      shortcut: '⌘N',
    },
    {
      id: 'create-checkpoint',
      label: 'Create Checkpoint',
      icon: Save,
      action: () => {
        createCheckpoint();
        toast({
          title: "Checkpoint created",
          description: "A new checkpoint has been saved.",
        });
        setOpen(false);
      },
      category: 'Checkpoints',
      shortcut: '⌘S',
    },
    {
      id: 'upload-file',
      label: 'Upload File',
      icon: Upload,
      action: () => {
        document.getElementById('file-upload-input')?.click();
        setOpen(false);
      },
      category: 'Files',
      shortcut: '⌘U',
    },
    {
      id: 'focus-input',
      label: 'Focus Chat Input',
      icon: Zap,
      action: () => {
        document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="Ask"]')?.focus();
        setOpen(false);
      },
      category: 'Navigation',
      shortcut: '⌘K',
    },
    {
      id: 'clear-history',
      label: 'Clear History',
      icon: Archive,
      action: () => {
        handleClearHistory();
      },
      category: 'Actions',
      shortcut: '⌘D',
    },
    {
      id: 'keyboard-help',
      label: 'Keyboard Shortcuts Help',
      icon: HelpCircle,
      action: () => {
        setHelpOpen(true);
        setOpen(false);
      },
      category: 'Help',
      shortcut: '⌘/',
    },
  ];

  // Register keyboard shortcuts
  useKeyboardShortcuts({
    'mod+k': (e) => {
      e.preventDefault();
      setOpen(true);
    },
    'mod+n': (e) => {
      e.preventDefault();
      handleNewSession();
    },
    'mod+s': (e) => {
      e.preventDefault();
      createCheckpoint();
      toast({
        title: "Checkpoint created",
        description: "A new checkpoint has been saved.",
      });
      setOpen(false);
    },
    'mod+u': (e) => {
      e.preventDefault();
      document.getElementById('file-upload-input')?.click();
      setOpen(false);
    },
    'mod+d': (e) => {
      e.preventDefault();
      handleClearHistory();
    },
    'mod+/': (e) => {
      e.preventDefault();
      setHelpOpen(true);
    },
    'escape': (e) => {
      e.preventDefault();
      setOpen(false);
    }
  });

  const handleNewSession = () => {
    const newSession = {
      id: `session-${Date.now()}`,
      name: `Session ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addSession(newSession);
    toast({
      title: "New session created",
      description: newSession.name,
    });
    setOpen(false);
  };

  const handleSwitchSession = (sessionId: string) => {
    setCurrentSession(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    toast({
      title: "Switched session",
      description: session?.name,
    });
    setOpen(false);
  };

  const handleClearHistory = () => {
    clearMessages();
    toast({
      title: "History cleared",
      description: "All messages in the current session have been removed",
    });
    setOpen(false);
  };

  const groupedCommands = commands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedCommands).map(([category, cmds], idx) => (
            <div key={category}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={category}>
                {cmds.map((cmd) => (
                  <CommandItem key={cmd.id} onSelect={cmd.action}>
                    <cmd.icon className="mr-2 h-4 w-4" />
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {cmd.shortcut}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}

          <CommandGroup heading="Sessions">
            {sessions.slice(0, 5).map((session) => (
              <CommandItem
                key={session.id}
                onSelect={() => handleSwitchSession(session.id)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>{session.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Files">
            {files.slice(0, 5).map((file) => (
              <CommandItem key={file.id}>
                <FileText className="mr-2 h-4 w-4" />
                <span>{file.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}