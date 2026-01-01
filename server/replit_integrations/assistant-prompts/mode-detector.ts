import type { AssistantPrompt } from "@shared/schema";

export interface ModeContext {
  messageContent: string;
  hasMultipleFiles: boolean;
  fileCount: number;
  hasErrorMessage: boolean;
  hasTypeError: boolean;
  requestsFeature: boolean;
  requestsRefactor: boolean;
}

export function detectSuggestedPrompt(
  context: ModeContext,
  availablePrompts: AssistantPrompt[]
): AssistantPrompt | null {
  // Fast Mode triggers
  const isFastMode =
    !context.hasMultipleFiles &&
    (context.hasErrorMessage || context.hasTypeError) &&
    !context.requestsFeature;

  if (isFastMode) {
    if (context.hasTypeError) {
      return availablePrompts.find(p => p.name === "Fast Mode - Type Safety") || null;
    }
    if (context.hasErrorMessage) {
      return availablePrompts.find(p => p.name === "Fast Mode - Bug Fixer") || null;
    }
    return availablePrompts.find(p => p.name === "Fast Mode - Quick Edits") || null;
  }

  // Agent Mode triggers
  const isAgentMode =
    context.hasMultipleFiles ||
    context.requestsFeature ||
    context.requestsRefactor ||
    context.fileCount > 3;

  if (isAgentMode) {
    if (context.requestsFeature) {
      return availablePrompts.find(p => p.name === "Agent Mode - Feature Builder") || null;
    }
    if (context.requestsRefactor) {
      return availablePrompts.find(p => p.name === "Agent Mode - Refactoring") || null;
    }
    return availablePrompts.find(p => p.name === "Agent Mode - Deep Debugger") || null;
  }

  return null;
}

export function analyzeMessageContext(message: string, fileCount: number): ModeContext {
  const lower = message.toLowerCase();

  return {
    messageContent: message,
    hasMultipleFiles: /@\S+/.test(message) && (message.match(/@/g) || []).length > 1,
    fileCount,
    hasErrorMessage: /error|exception|fail|crash|bug/i.test(message),
    hasTypeError: /type\s+error|cannot\s+find|property.*does\s+not\s+exist/i.test(message),
    requestsFeature: /add|create|build|implement|feature|new/i.test(message),
    requestsRefactor: /refactor|improve|optimize|clean.*up|reorganize/i.test(message),
  };
}

export function detectMode(userMessage: string, conversationHistory: any[]): 'basic' | 'advanced' {
  const lowerMessage = userMessage.toLowerCase();

  // Keywords that indicate advanced mode (code changes needed)
  const advancedKeywords = [
    'fix', 'create', 'add', 'implement', 'build', 'generate',
    'update', 'modify', 'change', 'refactor', 'delete', 'remove',
    'write', 'code', 'function', 'component', 'feature'
  ];

  // Keywords that indicate basic mode (just information)
  const basicKeywords = [
    'what is', 'how does', 'why does', 'explain', 'describe', 'tell me about',
    'show me how', 'help me understand', 'clarify', 'define', 'what are',
    'can you explain', 'documentation'
  ];

  // File mentions often indicate code changes
  const hasFileMention = /@[\w\-\.\/]+/.test(userMessage);

  // Error messages usually need fixes (advanced)
  const hasError = /error|bug|broken|not working|issue|problem/i.test(userMessage);

  const hasAdvancedKeyword = advancedKeywords.some(kw => lowerMessage.includes(kw));
  const hasBasicKeyword = basicKeywords.some(kw => lowerMessage.includes(kw));

  // Scoring system
  let score = 0;
  if (hasAdvancedKeyword) score += 2;
  if (hasFileMention) score += 2;
  if (hasError) score += 1;
  if (hasBasicKeyword) score -= 2;

  // Check conversation context - if recently made changes, likely want more
  const recentAdvanced = conversationHistory
    .slice(-3)
    .some((msg: any) => msg.mode === 'advanced');

  if (recentAdvanced) score += 1;

  return score > 0 ? 'advanced' : 'basic';
}

export function willGenerateEditRequest(assistantResponse: string): boolean {
  // Detect if the response contains code changes or shell commands
  const hasCodeBlock = /```[\w]*\n[\s\S]*?```/.test(assistantResponse);
  const hasFileEdit = /<proposed_file_/.test(assistantResponse);
  const hasShellCommand = /<proposed_shell_command>/.test(assistantResponse);

  return hasCodeBlock || hasFileEdit || hasShellCommand;
}