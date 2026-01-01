
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from './use-toast';

interface ToolNudge {
  toolName: string;
  reason: string;
}

export function useWorkspaceTools() {
  const { toast } = useToast();

  const nudgeMutation = useMutation({
    mutationFn: async ({ toolName, reason }: ToolNudge) => {
      const response = await fetch('/api/workspace-tools/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, reason })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to record tool nudge');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Use ${variables.toolName} tool`,
        description: variables.reason,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      console.error('Failed to record tool nudge:', error);
    }
  });

  const nudgesQuery = useQuery({
    queryKey: ['workspace-tools', 'nudges'],
    queryFn: async () => {
      const response = await fetch('/api/workspace-tools/nudges');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get nudges');
      }

      return data;
    },
    refetchInterval: false,
  });

  const nudgeTool = async (toolName: string, reason: string) => {
    await nudgeMutation.mutateAsync({ toolName, reason });
  };

  const openTool = (toolName: string) => {
    // In a real Replit environment, this would open the actual tool
    console.log(`Opening tool: ${toolName}`);
    
    toast({
      title: 'Tool opened',
      description: `Opened ${toolName} tool`,
    });
  };

  return {
    nudgeTool,
    nudges: nudgesQuery.data || [],
    isNudging: nudgeMutation.isPending,
    openTool,
  };
}
