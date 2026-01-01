import { useEffect } from 'react';
import { useAssistantStore } from './use-assistant-store';
import { parseCodeChangesFromMessage } from '@/lib/code-change-applier';
import { useToast } from './use-toast';
import { useFileOperations } from './use-file-operations';
import { usePackageManager } from './use-package-manager';
import { useCommandHistory } from './use-command-history';
import { useMutation } from '@tanstack/react-query';

interface WorkflowConfig {
  name: string;
  commands: string[];
  mode: 'sequential' | 'parallel';
  setRunButton: boolean;
}

interface DeploymentConfig {
  buildCommand?: string;
  runCommand: string;
}

export function useCodeActions() {
  const { messages, settings, setPendingChanges, applyPendingChanges, files, updateFileContent } = useAssistantStore();
  const { toast } = useToast();
  const fileOps = useFileOperations();
  const { installPackages } = usePackageManager();
  const { addExecution } = useCommandHistory();

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    const { fileEdits, shellCommands } = parseCodeChangesFromMessage(lastMessage.content);

    // Store metadata in the message if not already present
    if ((fileEdits.length > 0 || shellCommands.length > 0) && !(lastMessage as any).metadata) {
      (lastMessage as any).metadata = { fileEdits, shellCommands };
    }

    // Handle auto-apply if enabled
    if (settings.autoApplyChanges && fileEdits.length > 0) {
      const changes = fileEdits.map(edit => {
        const file = files.find(f => f.name === edit.file);
        return {
          fileId: file?.id || edit.file,
          fileName: edit.file,
          oldContent: file?.content || '',
          newContent: '', // Would need actual content from message
          description: `${edit.added} additions, ${edit.removed} deletions`
        };
      });
      setPendingChanges(changes);
      applyPendingChanges();
    }
  }, [messages, settings.autoApplyChanges, files, setPendingChanges, applyPendingChanges]);

  const applyChange = async (change: any) => {
    try {
      const { applyFileEdit } = await import('@/lib/code-change-applier');
      await applyFileEdit(change);

      toast({
        title: 'Change applied',
        description: `Updated ${change.file}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to apply change',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const configureWorkflow = async (
    currentName: string,
    newName: string,
    commands: string,
    mode: string
  ) => {
    try {
      const response = await fetch('/api/workflow/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentName, newName, commands, mode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to configure workflow');
      }

      toast({
        title: 'Workflow configured',
        description: `Workflow ${newName} has been configured`,
      });

      return response.json();
    } catch (error) {
      toast({
        title: 'Configuration failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const configureDeployment = useMutation({
    mutationFn: async (config: DeploymentConfig) => {
      const response = await fetch('/api/deployment/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to configure deployment');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Deployment configured',
        description: 'Your deployment settings have been updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Configuration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const executeShellCommand = useMutation({
    mutationFn: async (params: { command: string; workingDirectory?: string }) => {
      const response = await fetch('/api/shell/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Command execution failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Command executed',
        description: data.output ? data.output.substring(0, 100) : 'Success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Execution failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleShellCommand = async (command: string, workingDirectory?: string) => {
    // Use the mutateAsync from the configured mutation
    return executeShellCommand.mutateAsync({ command, workingDirectory });
  };

  const captureScreenshot = async (url: string) => {
    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, fullPage: false })
      });

      if (!response.ok) {
        throw new Error('Failed to capture screenshot');
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      toast({
        title: 'Screenshot captured',
        description: `Screenshot of ${url}`,
      });

      return imageUrl;
    } catch (error) {
      toast({
        title: 'Screenshot failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const scrapeUrl = async (url: string) => {
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Failed to scrape URL');
      }

      const data = await response.json();

      toast({
        title: 'Content scraped',
        description: `Scraped ${data.title || url}`,
      });

      return data;
    } catch (error) {
      toast({
        title: 'Scraping failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const readFileContent = async (filePath: string) => {
    try {
      const result = await fileOps.readFile.mutateAsync({ filePath });
      toast({
        title: 'File read successfully',
        description: `Read ${filePath}`,
      });
      return result.content;
    } catch (error) {
      toast({
        title: 'Failed to read file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const writeFileContent = async (filePath: string, content: string) => {
    try {
      await fileOps.writeFile.mutateAsync({ filePath, content });
      toast({
        title: 'File written successfully',
        description: `Updated ${filePath}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to write file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const listDirectory = async (dirPath?: string) => {
    try {
      const result = await fileOps.listFiles.mutateAsync({ dirPath });
      return result.files;
    } catch (error) {
      toast({
        title: 'Failed to list directory',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteFileOrDir = async (filePath: string) => {
    try {
      await fileOps.deleteFile.mutateAsync({ filePath });
      toast({
        title: 'Deleted successfully',
        description: `Deleted ${filePath}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to delete',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleScreenshot = async (url: string) => {
    try {
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, fullPage: false })
      });

      if (!response.ok) {
        throw new Error('Failed to capture screenshot');
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);

      toast({
        title: 'Screenshot captured',
        description: `Screenshot of ${url}`,
      });

      return imageUrl;
    } catch (error) {
      toast({
        title: 'Screenshot failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleScrape = async (url: string) => {
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Failed to scrape URL');
      }

      const data = await response.json();

      toast({
        title: 'Content scraped',
        description: `Scraped ${data.title || url}`,
      });

      return data;
    } catch (error) {
      toast({
        title: 'Scraping failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const installPackage = async (language: string, packages: string[]) => {
    try {
      await installPackages.mutateAsync({ language, packages });
    } catch (error) {
      // Error already handled by mutation
      throw error;
    }
  };

  const getWorkflowStatus = async () => {
    try {
      const response = await fetch('/api/workflow/status');
      if (!response.ok) throw new Error('Failed to get workflow status');
      return response.json();
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      throw error;
    }
  };

  const restartWorkflow = async (workflowName: string) => {
    try {
      const response = await fetch('/api/workflow/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowName })
      });

      if (!response.ok) {
        throw new Error('Failed to restart workflow');
      }

      toast({
        title: 'Workflow restarted',
        description: `${workflowName} has been restarted`,
      });

      return response.json();
    } catch (error) {
      toast({
        title: 'Restart failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const stopWorkflow = async (workflowName: string) => {
    try {
      const response = await fetch('/api/workflow/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowName })
      });

      if (!response.ok) throw new Error('Failed to stop workflow');

      toast({
        title: 'Workflow stopped',
        description: `${workflowName} has been stopped`,
      });

      return response.json();
    } catch (error) {
      toast({
        title: 'Failed to stop workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const executeWorkflow = async (workflowName: string) => {
    try {
      const response = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowName })
      });

      if (!response.ok) throw new Error('Failed to execute workflow');

      toast({
        title: 'Workflow started',
        description: `${workflowName} is now running`,
      });

      return response.json();
    } catch (error) {
      toast({
        title: 'Failed to start workflow',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    applyChange,
    executeShellCommand: executeShellCommand.mutateAsync,
    captureScreenshot,
    scrapeUrl,
    readFileContent,
    writeFileContent,
    listDirectory,
    deleteFileOrDir,
    handleScreenshot,
    handleScrape,
    handleShellCommand,
    installPackage,
    configureWorkflow,
    configureDeployment: configureDeployment.mutateAsync,
    executeWorkflow,
    getWorkflowStatus,
    restartWorkflow,
    stopWorkflow,
    isConfiguring: configureDeployment.isPending,
    isExecuting: executeShellCommand.isPending,
  };
}