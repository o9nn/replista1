import { useRef, useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import { TypingIndicator } from "./typing-indicator";
import { PromptSelector } from "../assistant-prompts/prompt-selector";
import { PromptManager } from "../assistant-prompts/prompt-manager";
import { AssistantSettings } from "../assistant-prompts/assistant-settings";
import { AgentSelector } from "./agent-selector";
import { useToast } from "@/hooks/use-toast";
import { parseCodeChangesFromMessage } from "@/lib/code-change-applier";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useAutoApply } from "@/hooks/use-auto-apply";
import { useFileOperations } from "@/hooks/use-file-operations";
import type { AssistantPrompt } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WorkflowStatus } from "./workflow-status";
import { CreditUsageIndicator } from './credit-usage-indicator';
import { AssistantModeToggle } from "./assistant-mode-toggle";
import { MessageParser } from "./message-parser";
import { useCodeActions } from "@/hooks/use-code-actions";
import { usePackageOperations } from "@/hooks/use-package-operations";
import { useWorkspaceTools } from "@/hooks/use-workspace-tools";
import { ActionQueuePanel } from "./action-queue-panel";
import { ActionStatusPanel } from "./action-status-panel";
import { useBatchActions } from "@/hooks/use-batch-actions";
import { useEditRequestTracking } from "@/hooks/use-edit-request-tracking";
import { RAGSourcesPanel } from "./rag-sources-panel";
import { BatchOperationsPanel } from "./batch-operations-panel";
import { useRAGSources } from "@/hooks/use-rag-sources";
import { useBatchOperations } from "@/hooks/use-batch-operations";
import { ConversationSearch } from "./conversation-search";
import { CommandPalette } from "./command-palette";
import { SessionSwitcher } from './session-switcher';
import { StreamingControls } from './streaming-controls';
import { MultiFileRefactorPreview } from './multi-file-refactor-preview';
import { Button } from '@/components/ui/button';
import { Sliders } from 'lucide-react';
import { ContextPruningControls } from './context-pruning-controls';


interface ChatContainerProps {
  onFileUpload: () => void;
  onFileClick?: (fileId: string) => void;
}

export function ChatContainer({ onFileUpload, onFileClick }: ChatContainerProps) {
  const { sessionMessages, currentSessionId, isStreaming, isLoading, updateMessage, setPendingChanges, settings, files, deleteMessage, removeFile } = useAssistantStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { sendMessage, isStreaming: isChatStreaming, isPaused, pauseStreaming, resumeStreaming, cancelStreaming } = useChatStream();
  const { availableFiles } = useFileOperations();
  const { isApplying, pendingCount } = useAutoApply();
  const { sources: ragSources, loadSource, addSources: addRAGSources } = useRAGSources();
  const { addOperation: addBatchOperation } = useBatchOperations();

  // Auto-apply code changes when enabled
  const { progress } = useAutoApply();

  const [prompts, setPrompts] = useState<AssistantPrompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState("assistantAgent");
  const [showWorkflowStatus, setShowWorkflowStatus] = useState(true);
  const [showCommandHistory, setShowCommandHistory] = useState(false);
  const [showPackageManager, setShowPackageManager] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ total: 0, completed: 0, failed: 0, currentFile: undefined as string | undefined });
  const [multiFileChanges, setMultiFileChanges] = useState<any[]>([]);
  const [showMultiFilePreview, setShowMultiFilePreview] = useState(false);
  const [showPruning, setShowPruning] = useState(false);

  const messages = useMemo(() => {
    if (!currentSessionId) return [];
    return sessionMessages[currentSessionId] || [];
  }, [sessionMessages, currentSessionId]);

  const handleCodeChangeProposed = (change: any) => {
    if (settings.autoApplyChanges) {
      setPendingChanges([change]);
    } else {
      const store = useAssistantStore.getState();
      const currentChanges = store.pendingChanges || [];
      setPendingChanges([...currentChanges, change]);
      toast({
        title: "Code change proposed",
        description: "Review the changes in the diff viewer below",
      });
    }
  };

  const handlePrune = (messageIds: string[], fileIds: string[]) => {
    messageIds.forEach(id => deleteMessage(id));
    fileIds.forEach(id => removeFile(id));
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch("/api/assistant-prompts");
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
        const defaultPrompt = data.find((p: any) => p.isDefault);
        if (defaultPrompt) {
          setSelectedPromptId(defaultPrompt.id);
        }
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
    }
  };

  const handleCreatePrompt = async (name: string, instructions: string) => {
    const response = await fetch("/api/assistant-prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, instructions }),
    });
    if (response.ok) {
      await fetchPrompts();
    } else {
      throw new Error("Failed to create prompt");
    }
  };

  const handleUpdatePrompt = async (id: number, name: string, instructions: string) => {
    const response = await fetch(`/api/assistant-prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, instructions }),
    });
    if (response.ok) {
      await fetchPrompts();
    } else {
      throw new Error("Failed to update prompt");
    }
  };

  const handleDeletePrompt = async (id: number) => {
    const response = await fetch(`/api/assistant-prompts/${id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      await fetchPrompts();
      if (selectedPromptId === id) {
        setSelectedPromptId(null);
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to delete prompt",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: number) => {
    const response = await fetch(`/api/assistant-prompts/${id}/set-default`, {
      method: "POST",
    });
    if (response.ok) {
      await fetchPrompts();
      setSelectedPromptId(id);
      toast({
        title: "Success",
        description: "Default prompt updated",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to set default prompt",
        variant: "destructive",
      });
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Auto-execute actions from assistant messages
  const { configureWorkflow, configureDeployment, executeShellCommand } = useCodeActions();
  const { installPackages } = usePackageOperations();
  const { nudgeTool } = useWorkspaceTools();
  const { trackEditRequest } = useEditRequestTracking();

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    const parsed = MessageParser(lastMessage.content);

    // Track edit request if in Advanced mode and code was generated
    if (settings.mode === 'advanced' &&
      (parsed.fileChanges.length > 0 || parsed.shellCommands.length > 0)) {
      trackEditRequest(lastMessage.id, settings.autoApplyChanges);
    }

    // Always record tool nudges (they're just notifications)
    parsed.toolNudges.forEach(async (nudge) => {
      try {
        await nudgeTool(nudge);
        toast({
          title: "Tool Recommendation",
          description: `Consider using ${nudge.toolName}: ${nudge.reason}`,
        });
      } catch (error) {
        console.error('Failed to record tool nudge:', error);
      }
    });

    // Auto-execute if enabled
    if (!settings.autoApplyChanges) return;

    // Auto-install packages
    parsed.packageInstalls.forEach(async (pkg) => {
      try {
        await installPackages({ language: pkg.language, packages: pkg.packages });
        toast({
          title: "Packages Installed",
          description: `Installed ${pkg.packages.join(', ')} for ${pkg.language}`,
        });
      } catch (error) {
        console.error('Failed to auto-install packages:', error);
        toast({
          title: "Installation Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      }
    });

    // Auto-configure workflows
    parsed.workflowConfigs.forEach(async (workflow) => {
      try {
        await configureWorkflow(
          workflow.name,
          workflow.name,
          workflow.commands.join('\n'),
          workflow.mode,
          workflow.setRunButton
        );
        toast({
          title: "Workflow Configured",
          description: `Set up workflow: ${workflow.name}`,
        });
      } catch (error) {
        console.error('Failed to auto-configure workflow:', error);
      }
    });

    // Auto-configure deployments
    parsed.deploymentConfigs.forEach(async (deployment) => {
      try {
        await configureDeployment(deployment.buildCommand, deployment.runCommand);
        toast({
          title: "Deployment Configured",
          description: "Updated deployment settings",
        });
      } catch (error) {
        console.error('Failed to auto-configure deployment:', error);
      }
    });

    // Auto-execute shell commands (non-dangerous only)
    parsed.shellCommands.forEach(async (cmd) => {
      if (!cmd.isDangerous && settings.autoApplyChanges) {
        try {
          await executeShellCommand(cmd.command, cmd.workingDirectory);
          toast({
            title: "Command Executed",
            description: cmd.command,
          });
        } catch (error) {
          console.error('Failed to auto-execute command:', error);
          toast({
            title: "Command Failed",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        }
      }
    });
  }, [messages, settings.autoApplyChanges, installPackages, configureWorkflow, configureDeployment, executeShellCommand, nudgeTool, toast]);


  // Parse code actions from messages and show multi-file preview
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    const { fileEdits, shellCommands, packageInstalls, ragSources } = parseCodeChangesFromMessage(lastMessage.content);

    // Update metadata
    const currentMetadata = (lastMessage as any).metadata || {};
    const hasNewChanges = fileEdits.length > 0 || shellCommands.length > 0;

    if (hasNewChanges && !currentMetadata.fileEdits) {
      updateMessage(lastMessage.id, {
        ...lastMessage,
        metadata: {
          ...currentMetadata,
          fileEdits,
          shellCommands,
          packageInstalls,
          ragSources,
        }
      } as any);

      // Show multi-file preview if there are multiple file edits and auto-apply is off
      if (fileEdits.length > 1 && !settings.autoApplyChanges) {
        const changes = fileEdits.map(edit => ({
          file: edit.file,
          oldContent: edit.oldContent || '',
          newContent: edit.newContent || '',
          added: edit.added || 0,
          removed: edit.removed || 0,
        }));
        setMultiFileChanges(changes);
        setShowMultiFilePreview(true);
      }
    }
  }, [messages, updateMessage, settings.autoApplyChanges]);

  const handleSendMessage = async (content: string, mentionedFiles: string[], systemPrompt?: string) => {
    await sendMessage(content, mentionedFiles, systemPrompt, selectedAgent);
  };

  const handleApplyMultiFileChanges = async (selectedFiles: string[]) => {
    const { applyFileEdit } = await import('@/lib/code-change-applier');

    for (const change of multiFileChanges.filter(c => selectedFiles.includes(c.file))) {
      try {
        await applyFileEdit({
          file: change.file,
          added: change.added,
          removed: change.removed,
          newContent: change.newContent,
          oldContent: change.oldContent,
          changeType: change.oldContent ? 'edit' : 'create',
        });
      } catch (error) {
        console.error(`Failed to apply changes to ${change.file}:`, error);
        toast({
          title: "Failed to apply changes",
          description: `Error applying changes to ${change.file}`,
          variant: "destructive",
        });
      }
    }

    toast({
      title: "Changes applied",
      description: `Applied changes to ${selectedFiles.length} file(s)`,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <MultiFileRefactorPreview
        open={showMultiFilePreview}
        onClose={() => setShowMultiFilePreview(false)}
        changes={multiFileChanges}
        onApplyAll={() => handleApplyMultiFileChanges(multiFileChanges.map(c => c.file))}
        onApplySelected={handleApplyMultiFileChanges}
      />
      <CommandPalette />
      <div className="border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SessionSwitcher />
          <ConversationSearch />
          <AgentSelector
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />
          <AssistantModeToggle />
          <PromptSelector
            prompts={prompts}
            selectedPromptId={selectedPromptId}
            onSelectPrompt={setSelectedPromptId}
          />
          <PromptManager
            prompts={prompts}
            onCreatePrompt={handleCreatePrompt}
            onUpdatePrompt={handleUpdatePrompt}
            onDeletePrompt={handleDeletePrompt}
            onSetDefault={handleSetDefault}
          />
        </div>
        <div className="flex items-center gap-2">
          <AssistantSettings />
          <CreditUsageIndicator />
        </div>
      </div>
      <StreamingControls
        isStreaming={isChatStreaming}
        isPaused={isPaused}
        onPause={pauseStreaming}
        onResume={resumeStreaming}
        onCancel={cancelStreaming}
      />
      {showWorkflowStatus && (
        <div className="border-b p-2">
          <WorkflowStatus />
        </div>
      )}

      <div className="border-b p-2 space-y-2">
        <RAGSourcesPanel
          sources={ragSources}
          onSourceClick={onFileClick}
          onLoadSource={loadSource}
        />
        <BatchOperationsPanel />
        <ActionQueuePanel />
      </div>

      <ActionStatusPanel />

      {progress && (
        <div className="border-b p-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="text-muted-foreground">
              Applying changes: {progress.completed}/{progress.total}
            </span>
            {progress.failed > 0 && (
              <span className="text-red-500">
                ({progress.failed} failed)
              </span>
            )}
          </div>
          <Progress
            value={(progress.completed / progress.total) * 100}
            className="h-2"
          />
          <div className="text-xs text-muted-foreground mt-1">
            Current: {progress.current}
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 px-4">
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-base font-medium mb-1">Welcome to Assistant</h2>
              <p className="text-xs text-muted-foreground text-center max-w-md">
                Upload files, mention them with @, and get AI-powered code suggestions
              </p>
            </div>
          ) : (
            <div className="py-2">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onFileClick={onFileClick}
                  onCodeChangeProposed={handleCodeChangeProposed}
                />
              ))}
              {isChatStreaming && messages[messages.length - 1]?.role === "assistant" &&
                messages[messages.length - 1]?.content === "" && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInput
        onSendMessage={handleSendMessage}
        onFileUpload={onFileUpload}
        disabled={isLoading || isChatStreaming}
      />

      <ContextPruningControls
        open={showPruning}
        onClose={() => setShowPruning(false)}
        messages={messages}
        files={files.map(f => ({ id: f.id, name: f.name, size: f.content.length }))}
        onPrune={handlePrune}
      />
    </div>
  );
}

function QuickAction({
  title,
  description,
  onClick
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded-md border border-border hover-elevate active-elevate-2 transition-colors"
      data-testid={`button-quick-action-${title.toLowerCase().replace(/\s/g, "-")}`}
      type="button"
    >
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </button>
  );
}