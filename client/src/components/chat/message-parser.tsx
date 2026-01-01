import { useMemo } from 'react';

interface FileEdit {
  file: string;
  added: number;
  removed: number;
}

interface ShellCommand {
  command: string;
  workingDirectory?: string;
  isDangerous: boolean;
}

interface PackageInstall {
  language: string;
  packages: string[];
}

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

interface ToolNudge {
  toolName: string;
  reason: string;
}

export interface RAGSource {
  id: string;
  path: string;
  content?: string;
}

export interface ParsedMessage {
  text: string;
  fileEdits: FileEdit[];
  shellCommands: ShellCommand[];
  packageInstalls: PackageInstall[];
  workflowConfigs: WorkflowConfig[];
  deploymentConfigs: DeploymentConfig[];
  toolNudges: ToolNudge[];
  actionSummary?: string;
  ragSources: RAGSource[];
}

function parseFileEdits(content: string): FileEdit[] {
  const fileEdits: FileEdit[] = [];
  const fileEditRegex = /<proposed_file_(?:replace_substring|replace|insert)[^>]*file_path="([^"]+)"[^>]*>/g;
  let match;
  while ((match = fileEditRegex.exec(content)) !== null) {
    fileEdits.push({
      file: match[1],
      added: 0,
      removed: 0,
    });
  }
  return fileEdits;
}

function parseShellCommands(content: string): ShellCommand[] {
  const shellCommands: ShellCommand[] = [];
  const shellCommandRegex = /<proposed_shell_command[^>]*is_dangerous="(true|false)"[^>]*>([\s\S]*?)<\/proposed_shell_command>/g;
  let match;
  while ((match = shellCommandRegex.exec(content)) !== null) {
    const command = match[2].trim();
    if (command) {
      shellCommands.push({
        command,
        isDangerous: match[1] === 'true',
      });
    }
  }
  return shellCommands;
}

function parsePackageInstalls(content: string): PackageInstall[] {
  const packageInstalls: PackageInstall[] = [];
  const packageInstallRegex = /<proposed_package_install[^>]*language="([^"]+)"[^>]*package_list="([^"]+)"[^>]*>/g;
  let match;
  while ((match = packageInstallRegex.exec(content)) !== null) {
    packageInstalls.push({
      language: match[1],
      packages: match[2].split(',').map(p => p.trim()).filter(Boolean),
    });
  }
  return packageInstalls;
}

function parseWorkflowConfigs(content: string): WorkflowConfig[] {
  const workflowConfigs: WorkflowConfig[] = [];
  const workflowRegex = /<proposed_workflow_configuration[^>]*workflow_name="([^"]+)"[^>]*set_run_button="(true|false)"[^>]*mode="(sequential|parallel)"[^>]*>([\s\S]*?)<\/proposed_workflow_configuration>/g;
  let match;
  while ((match = workflowRegex.exec(content)) !== null) {
    const commands = match[4].trim().split('\n').filter(cmd => cmd.trim());
    workflowConfigs.push({
      name: match[1],
      commands,
      mode: match[3] as 'sequential' | 'parallel',
      setRunButton: match[2] === 'true',
    });
  }
  return workflowConfigs;
}

function parseDeploymentConfigs(content: string): DeploymentConfig[] {
  const deploymentConfigs: DeploymentConfig[] = [];
  const deploymentRegex = /<proposed_deployment_configuration[^>]*(?:build_command="([^"]*)")?[^>]*run_command="([^"]+)"[^>]*>/g;
  let match;
  while ((match = deploymentRegex.exec(content)) !== null) {
    deploymentConfigs.push({
      buildCommand: match[1] || undefined,
      runCommand: match[2],
    });
  }
  return deploymentConfigs;
}

function parseToolNudges(content: string): ToolNudge[] {
  const toolNudges: ToolNudge[] = [];
  const toolNudgeRegex = /<proposed_workspace_tool_nudge[^>]*tool_name="([^"]+)"[^>]*reason="([^"]+)"[^>]*>/g;
  let match;
  while ((match = toolNudgeRegex.exec(content)) !== null) {
    toolNudges.push({
      toolName: match[1],
      reason: match[2],
    });
  }
  return toolNudges;
}

function parseRAGSources(content: string): RAGSource[] {
  const sources: RAGSource[] = [];
  const ragPattern = /\[([^\]]+)\]\(rag:\/\/([^)]+)\)/g;

  let match;
  while ((match = ragPattern.exec(content)) !== null) {
    sources.push({
      id: match[2],
      path: match[1],
    });
  }

  return sources;
}

export function useMessageParser(content: string): ParsedMessage {
  const fileEdits = useMemo(() => parseFileEdits(content), [content]);
  const shellCommands = useMemo(() => parseShellCommands(content), [content]);
  const packageInstalls = useMemo(() => parsePackageInstalls(content), [content]);
  const workflowConfigs = useMemo(() => parseWorkflowConfigs(content), [content]);
  const deploymentConfigs = useMemo(() => parseDeploymentConfigs(content), [content]);
  const toolNudges = useMemo(() => parseToolNudges(content), [content]);
  const ragSources = useMemo(() => parseRAGSources(content), [content]);

  // Parse action summary
  const summaryMatch = content.match(/<proposed_actions[^>]*summary="([^"]+)"[^>]*>/);
  const actionSummary = summaryMatch ? summaryMatch[1] : undefined;


  return {
    text: content,
    fileEdits,
    shellCommands,
    packageInstalls,
    workflowConfigs,
    deploymentConfigs,
    toolNudges,
    actionSummary,
    ragSources,
  };
}