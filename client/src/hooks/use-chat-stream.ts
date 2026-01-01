import { useState, useCallback, useRef } from 'react';
import { useAssistantStore } from './use-assistant-store';
import { parseCodeChangesFromMessage } from '@/lib/code-change-applier';

export function useChatStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const { addMessage, updateMessage, settings, setPendingChanges, files, get } = useAssistantStore();
  const [isPaused, setIsPaused] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    mentionedFiles: string[] = [],
    systemPrompt?: string,
    agentName?: string
  ) => {
    setIsStreaming(true);
    setIsPaused(false); // Ensure not paused when sending a new message
    abortControllerRef.current = new AbortController(); // Create a new controller for each message

    const userMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user' as const,
      content,
      createdAt: new Date().toISOString(),
      mentionedFiles: mentionedFiles.length > 0 ? mentionedFiles : undefined,
    };
    addMessage(userMessage);

    const assistantMessageId = `msg-${Date.now()}-assistant`;
    addMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    });

    try {
      const fileContext = mentionedFiles
        .map(fileId => {
          const file = files.find(f => f.id === fileId);
          return file ? {
            name: file.name,
            content: file.content,
            language: file.language,
          } : null;
        })
        .filter(Boolean);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          files: fileContext,
          systemPrompt,
          agentName,
        }),
        signal: abortControllerRef.current.signal, // Pass the signal to fetch
      });

      if (!response.ok) {
        if (response.status === 400 && response.body) { // Handle specific case for cancellation
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let chunk = '';
          while(true) {
            const {done, value} = await reader.read();
            if (done) break;
            chunk += decoder.decode(value);
          }
          if (chunk.includes('aborted')) return; // Ignore if it's a cancellation signal
        }
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let metadata: any = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.content) {
                // Wait if paused
                while (isPaused) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                buffer += data.content;
                updateMessage(assistantMessageId, { content: buffer });
              }

              if (data.metadata) {
                metadata = { ...metadata, ...data.metadata };
              }

              if (data.codeChanges) {
                metadata.codeChanges = data.codeChanges;
                if (!settings.autoApplyChanges) {
                  setPendingChanges(data.codeChanges);
                }
              }

              if (data.done) {
                const { 
                  fileEdits, 
                  shellCommands, 
                  packageInstalls,
                  ragSources,
                } = parseCodeChangesFromMessage(buffer);

                updateMessage(assistantMessageId, {
                  content: buffer,
                  metadata: { 
                    ...metadata, 
                    fileEdits, 
                    shellCommands, 
                    packageInstalls,
                    ragSources,
                  },
                } as any);

                if (settings.autoApplyChanges && fileEdits.length > 0) {
                  const changes = fileEdits.map(edit => ({
                    fileId: edit.file,
                    fileName: edit.file,
                    oldContent: edit.oldContent || '',
                    newContent: edit.newContent || '',
                    description: `${edit.added} additions, ${edit.removed} deletions`
                  }));
                  setPendingChanges(changes);
                }
              }
            } catch (parseError) {
              continue;
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        // If it was a cancellation, do nothing, otherwise it's an actual error
        if (!isPaused) { // Only update message if not paused, otherwise it might be an expected stop
          updateMessage(assistantMessageId, {
            content: 'Request cancelled.',
            metadata: { error: 'Request cancelled' } as any,
          });
        }
      } else {
        console.error('Chat error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        updateMessage(assistantMessageId, {
          content: `Sorry, I encountered an error: ${errorMessage}`,
          metadata: { error: errorMessage } as any,
        });
      }
    } finally {
      setIsStreaming(false);
      setIsPaused(false); // Reset pause state
      if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
         // If cancelled, clean up the ref
         abortControllerRef.current = null;
      }
    }
  }, [addMessage, updateMessage, files, settings, setPendingChanges, isStreaming, isPaused, setIsStreaming]); // Include dependencies

  const pauseStreaming = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeStreaming = useCallback(() => {
    setIsPaused(false);
  }, []);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      // The fetch will throw an AbortError, which is caught in the catch block
      // and handles the cleanup.
    }
    // Local state is reset in the finally block of sendMessage
  }, []);

  return {
    sendMessage,
    isStreaming: isStreaming || (get().isStreaming ?? false),
    isPaused,
    pauseStreaming,
    resumeStreaming,
    cancelStreaming,
  };
}