import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wrench } from 'lucide-react';


interface WorkspaceToolNudgeProps {
  toolName: string;
  reason: string;
}

const toolInfo: Record<string, { title: string; description: string; action: string }> = {
  envEditor: {
    title: "Secrets Tool",
    description: "Manage environment variables and API keys securely",
    action: "Open Secrets"
  },
  publishing: {
    title: "Publishing",
    description: "Deploy your changes to the web",
    action: "Open Publishing"
  },
  deployments: {
    title: "Deployments",
    description: "Configure and manage your deployments",
    action: "Open Deployments"
  }
};

export function WorkspaceToolNudge({ toolName, reason }: WorkspaceToolNudgeProps) {
  const handleOpenTool = () => {
    // In a real Replit environment, this would open the specific tool
    console.log(`Opening ${toolName} tool...`);
  };

  const tool = toolInfo[toolName];

  if (!tool) return null;

  return (
    <Card 
      className="p-3 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
      onClick={handleOpenTool}
    >
      <div className="flex items-start gap-2">
        <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {tool.title} Recommended
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {reason}
          </p>
        </div>
        <ExternalLink className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      </div>
    </Card>
  );
}