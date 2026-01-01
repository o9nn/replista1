import { Bot, User, FileCode2, ChevronRight, Terminal, FileEdit, Play, Check, Code2, Sparkles, Camera, FileText, Package, Rocket, ExternalLink, Edit, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import { useCodeActions } from "@/hooks/use-code-actions";
import type { Message } from "@shared/schema";
import { CodeBlock } from "./code-block";
import { WorkspaceToolNudge } from "./workspace-tool-nudge";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { useMessageParser } from "./message-parser";
import { ActionSummaryBadge } from "./action-summary-badge";
import { FileContextLoader } from "./file-context-loader";
import { MessageActions } from './message-actions';
import { useMessageFeedback } from '@/hooks/use-message-feedback';
import { RAGSourcesViewer } from './rag-sources-viewer';
import { useRAGSources } from '@/hooks/use-rag-sources';
import { useChatStream } from '@/hooks/use-chat-stream';
import { MessageEditDialog } from './message-edit-dialog';
import { SessionBranchDialog } from './session-branch-dialog';
import { InlineCodeSuggestion } from './inline-code-suggestion';
import { useInlineSuggestions } from '@/hooks/use-inline-suggestions';
import { VoiceControls } from "./voice-controls";


// Add hashCode method to String prototype for command tracking
declare global {
  interface String {
    hashCode(): number;
  }
}

String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const char = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

interface ChatMessageProps {
  message: Message;
  onFileClick?: (fileId: string) => void;
  onCodeChangeProposed?: (change: any) => void;
  isLast?: boolean;
  index?: number;
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function ChatMessage({ message, onFileClick, onCodeChangeProposed, isLast, index }: ChatMessageProps) {
  const { files, settings, sessionMessages, currentSessionId } = useAssistantStore();
  const isUser = message.role === "user";
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const {
    handleShellCommand,
    handleScreenshot,
    handleScrape,
    configureWorkflow,
    configureDeployment
  } = useCodeActions();
  const { toast } = useToast();
  const parsed = useMessageParser(message.content);
  const { handleFeedback } = useMessageFeedback();
  const { updateMessage: storeUpdateMessage, sessionMessages: allSessionMessages, currentSessionId: currentSessionIdForBranch, addMessage, branchSession } = useAssistantStore();
  const { sendMessage } = useChatStream();

  const handleConfigureWorkflow = async (workflow: any) => {
    try {
      await configureWorkflow(
        workflow.name || workflow.workflowName,
        workflow.name || workflow.workflowName,
        Array.isArray(workflow.commands) ? workflow.commands.join('\n') : workflow.commands,
        workflow.mode || 'sequential'
      );
      toast({
        title: "Workflow configured",
        description: `Workflow "${workflow.name || workflow.workflowName}" has been set up`,
      });
    } catch (error) {
      toast({
        title: "Configuration failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleConfigureDeployment = async (deployment: any) => {
    try {
      await configureDeployment({
        buildCommand: deployment.buildCommand,
        runCommand: deployment.runCommand
      });
      toast({
        title: "Deployment configured",
        description: "Deployment settings have been updated",
      });
    } catch (error) {
      toast({
        title: "Configuration failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleInstallPackages = async (language: string, packages: string[]) => {
    try {
      let command = '';
      switch (language.toLowerCase()) {
        case 'nodejs':
        case 'javascript':
        case 'typescript':
          command = `npm install ${packages.join(' ')}`;
          break;
        case 'python':
          command = `pip install ${packages.join(' ')}`;
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      await handleShellCommand(command);
      toast({
        title: "Packages installed",
        description: `Installed ${packages.join(', ')}`,
      });
    } catch (error) {
      toast({
        title: "Installation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };
  const [appliedEdits, setAppliedEdits] = useState<Set<string>>(new Set());
  const [copiedCommands, setCopiedCommands] = useState<Set<number>>(new Set());
  const [executedCommands, setExecutedCommands] = useState<Set<number>>(new Set());
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const { suggestions, applySuggestion, dismissSuggestion } = useInlineSuggestions();


  // Detect URLs in message content
  const urls = message.content.match(URL_PATTERN) || [];

  const handleUrlAction = async (url: string, action: 'screenshot' | 'scrape') => {
    setLoadingUrl(url);
    try {
      if (action === 'screenshot') {
        await handleScreenshot(url);
        toast({
          title: "Screenshot captured",
          description: "Screenshot has been added to the conversation",
        });
      } else {
        await handleScrape(url);
        toast({
          title: "Content scraped",
          description: "Page content has been added to the conversation",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process URL",
        variant: "destructive",
      });
    } finally {
      setLoadingUrl(null);
    }
  };


  const handleExecuteCommand = async (cmd: string, idx: number) => {
    if (executedCommands.has(idx)) return;

    try {
      const result = await handleShellCommand(cmd);
      setExecutedCommands(new Set([...executedCommands, idx]));

      // Show command output if available
      if (result?.output) {
        toast({
          title: "Command executed",
          description: result.output.substring(0, 200) + (result.output.length > 200 ? '...' : ''),
        });
      }
    } catch (error) {
      console.error("Failed to execute command:", error);
      toast({
        title: "Command failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Parse shell commands, file edits, package installs, and workspace tool nudges from message metadata
  const metadata = (message as any).metadata || {};
  const packageInstalls = metadata.packageInstalls || [];
  const workspaceToolNudges = metadata.workspaceToolNudges || [];
  const workflowConfigurations = metadata.workflowConfigurations || [];
  const deploymentConfigurations = metadata.deploymentConfigurations || [];

  const renderContent = (content: string) => {
    if (!content) return null;

    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.slice(lastIndex, match.index)}
          </span>
        );
      }

      const language = match[1] || "plaintext";
      const code = match[2].trim();
      parts.push(
        <CodeBlock key={`code-${match.index}`} code={code} language={language} />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>;
  };

  const getFileName = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    return file?.name || fileId;
  };

  const handleApplyEdit = async (edit: any, index: number) => {
    const editKey = `${edit.file}-${index}`;
    if (appliedEdits.has(editKey)) return;

    try {
      // Import and use the applyFileEdit function
      const { applyFileEdit } = await import('@/lib/code-change-applier');

      await applyFileEdit({
        file: edit.file,
        added: edit.added || 0,
        removed: edit.removed || 0,
        newContent: edit.newContent,
        oldContent: edit.oldContent,
        changeType: edit.oldContent ? 'edit' : 'create',
      });

      // Notify parent component about the code change
      if (onCodeChangeProposed) {
        onCodeChangeProposed(edit);
      }

      // Mark as applied
      setAppliedEdits(new Set([...appliedEdits, editKey]));

      toast({
        title: "Edit applied",
        description: `Updated ${edit.file}`,
      });
    } catch (error) {
      console.error("Failed to apply edit:", error);
      toast({
        title: "Failed to apply edit",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Handle package installation
  const handleInstallPackage = async (pkg: string) => {
    try {
      await handleShellCommand(`npm install ${pkg}`); // Assuming Node.js environment
      toast({
        title: "Package installed",
        description: `"${pkg}" has been successfully installed.`,
      });
    } catch (error) {
      console.error("Failed to install package:", error);
      toast({
        title: "Installation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBranchSession = () => {
    branchSession(message.id);
    toast({
      title: "Conversation branched",
      description: "Created a new session from this point",
    });
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentSessionId) return;

    const messages = sessionMessages[currentSessionId] || [];
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex === -1) return;

    // Update the user message
    storeUpdateMessage(messageId, { content: newContent } as any);

    // If there's an assistant response after this, regenerate it
    if (messageIndex + 1 < messages.length && messages[messageIndex + 1].role === 'assistant') {
      const assistantMessageId = messages[messageIndex + 1].id;
      storeUpdateMessage(assistantMessageId, { content: '' } as any);

      toast({
        title: "Regenerating response",
        description: "Please wait...",
      });

      // Resend with new content
      await sendMessage(
        newContent,
        messages[messageIndex].mentionedFiles || []
      );
    } else {
      toast({
        title: "Message updated",
        description: "Your message has been edited",
      });
    }
  };

  const handleRegenerateMessage = async (messageId: string) => {
    if (!currentSessionIdForBranch) return;

    const messages = allSessionMessages[currentSessionIdForBranch] || [];
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex === -1) return;

    // Find the user message that prompted this response
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
      userMessageIndex--;
    }

    if (userMessageIndex >= 0) {
      const userMessage = messages[userMessageIndex];

      toast({
        title: "Regenerating response",
        description: "Please wait...",
      });

      // Clear current response
      storeUpdateMessage(messageId, { content: '' } as any);

      // Resend the user message
      await sendMessage(
        userMessage.content,
        userMessage.mentionedFiles || []
      );
    }
  };

  // Render actions from metadata
  const renderActions = (actions: any[]) => {
    return actions.map((action, i) => {
      if (action.type === 'package_install') {
        return (
          <Card key={i} className="p-2 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <Package className="h-3 w-3 text-purple-600 dark:text-purple-400" />
              <code className="text-xs font-mono flex-1">{action.package}</code>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={() => handleInstallPackage(action.package)}
              >
                Install
              </Button>
            </div>
          </Card>
        );
      }
      if (action.type === 'tool_nudge') {
        return (
          <WorkspaceToolNudge
            key={i}
            toolName={action.toolName}
            reason={action.reason}
          />
        );
      }
      if (action.type === 'deployment_config') {
        return (
          <Card key={i} className="p-3 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Deployment Configuration
                </span>
              </div>
              {action.buildCommand && (
                <div className="text-xs">
                  <span className="text-green-700 dark:text-green-300">Build: </span>
                  <code className="font-mono bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">
                    {action.buildCommand}
                  </code>
                </div>
              )}
              <div className="text-xs">
                <span className="text-green-700 dark:text-green-300">Run: </span>
                <code className="font-mono bg-green-100 dark:bg-green-900 px-1 py-0.5 rounded">
                  {action.runCommand}
                </code>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 w-full"
                onClick={() => {
                  // This would configure deployment in real environment
                  console.log('Configure deployment:', action);
                  handleConfigureDeployment(action); // Assuming handleConfigureDeployment can take the whole action object
                }}
              >
                Apply Configuration
              </Button>
            </div>
          </Card>
        );
      }
      return null;
    });
  };

  const messages = sessionMessages[currentSessionId || ''] || [];

  return (
    <>
      <MessageEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        message={message}
        onSave={handleEditMessage}
      />

      <SessionBranchDialog
        open={isBranchDialogOpen}
        onOpenChange={setIsBranchDialogOpen}
        fromMessageId={message.id}
        messages={messages}
      />

      <div
        data-message-id={message.id}
        className={cn(
          "group flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
          isUser ? "" : ""
        )}
        data-testid={`message-${message.id}`}
      >
      <div
        className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.role === "user" ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {message.role === "user" ? "You" : "Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {timestamp}
          </span>
          {parsed.actionSummary && (
            <ActionSummaryBadge summary={parsed.actionSummary} />
          )}
        </div>


        {/* Package Installations */}
        {parsed.packageInstalls.map((pkg: any, idx: number) => {
          const pkgKey = `${pkg.language}-${pkg.packages.join('-')}-${idx}`;
          const isInstalled = executedCommands.has(pkgKey.hashCode());

          return (
            <Card key={`pkg-${idx}`} className="p-3 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    Install {pkg.language} packages
                  </div>
                  <code className="text-xs font-mono text-purple-700 dark:text-purple-300">
                    {pkg.packages.join(', ')}
                  </code>
                </div>
                {!isInstalled ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await handleInstallPackages(pkg.language, pkg.packages);
                        setExecutedCommands(new Set([...executedCommands, pkgKey.hashCode()]));
                      } catch (error) {
                        console.error('Failed to install packages:', error);
                      }
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Install
                  </Button>
                ) : (
                  <div className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-xs">Installed</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {/* Shell Commands */}
        {metadata.shellCommands?.map((cmd: string, idx: number) => {
          const isCopied = copiedCommands.has(idx);
          const isExecuted = executedCommands.has(idx);

          return (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted border border-border">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <code className="flex-1 text-xs font-mono overflow-hidden text-ellipsis">{cmd}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(cmd);
                  setCopiedCommands(new Set([...copiedCommands, idx]));
                  setTimeout(() => {
                    setCopiedCommands(prev => {
                      const next = new Set(prev);
                      next.delete(idx);
                      return next;
                    });
                  }, 2000);
                }}
                title="Copy command"
              >
                {isCopied ? <Check className="h-3 w-3" /> : "Copy"}
              </Button>
              {!isExecuted && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleExecuteCommand(cmd, idx)}
                  title="Execute command"
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
              {isExecuted && <Check className="h-4 w-4 text-green-600" />}
            </div>
          );
        })}

        {/* File Edits */}
        {metadata.fileEdits?.map((edit: any, idx: number) => {
          const editKey = `${edit.file}-${index}`;
          const isApplied = appliedEdits.has(editKey);

          return (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted border border-border">
              <FileEdit className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-xs font-mono overflow-hidden text-ellipsis">{edit.file}</span>
              <span className="text-xs text-green-600">+{edit.added}</span>
              <span className="text-xs text-red-600">-{edit.removed}</span>
              {!isApplied ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleApplyEdit(edit, idx)}
                  disabled={!settings.autoApplyChanges}
                >
                  Apply
                </Button>
              ) : (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </div>
          );
        })}


        {message.mentionedFiles && message.mentionedFiles.length > 0 && (
          <>
            <FileContextLoader fileIds={message.mentionedFiles} />
            <div className="flex flex-wrap gap-1 py-1">
              {message.mentionedFiles.map((fileId) => {
                const fileName = getFileName(fileId);
                return (
                  <FileChangeCard
                    key={fileId}
                    fileName={fileName}
                    onClick={() => onFileClick?.(fileId)}
                  />
                );
              })}
            </div>
          </>
        )}

        <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <CodeBlock
                  language={match[1]}
                  value={String(children).replace(/\n$/, "")}
                />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      {parsed.ragSources.length > 0 && (
          <div className="mt-3">
            <RAGSourcesViewer />
          </div>
        )}

        <MessageActions
          messageId={message.id}
          content={message.content}
          role={message.role as 'user' | 'assistant'}
          onFeedback={handleFeedback}
          onEdit={() => {
            setEditingMessageId(message.id);
            setIsEditDialogOpen(true);
          }}
          onRegenerate={() => handleRegenerateMessage(message.id)}
          onBranch={() => setIsBranchDialogOpen(true)}
        />

        {suggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Code Suggestions:
            </div>
            {suggestions.slice(0, 3).map((suggestion) => (
              <InlineCodeSuggestion
                key={suggestion.id}
                suggestion={suggestion}
                onApply={applySuggestion}
                onDismiss={dismissSuggestion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function FileChangeCard({ fileName, onClick }: { fileName: string; onClick: () => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-md bg-card text-xs">
        <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1.5 w-full hover:bg-accent/50 transition-colors">
          <ChevronRight className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")} />
          <FileCode2 className="h-3 w-3 text-blue-500" />
          <span className="font-mono flex-1 text-left">{fileName}</span>
          <div className="flex items-center gap-1">
            <span className="text-green-600">+0</span>
            <span className="text-red-600">-0</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-2 py-1.5 border-t border-border bg-muted/30">
            <button
              onClick={onClick}
              className="text-xs text-blue-500 hover:underline"
            >
              View file
            </button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}