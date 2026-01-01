import { Badge } from "@/components/ui/badge";
import { Sparkles, FileEdit, Terminal, Package, Settings, Rocket } from "lucide-react";

interface ActionSummaryBadgeProps {
  summary: string;
}

export function ActionSummaryBadge({ summary }: ActionSummaryBadgeProps) {
  // Determine icon based on summary content
  const getIcon = () => {
    const lower = summary.toLowerCase();
    if (lower.includes('file') || lower.includes('edit') || lower.includes('create')) {
      return <FileEdit className="h-3 w-3 mr-1" />;
    }
    if (lower.includes('command') || lower.includes('run') || lower.includes('execute')) {
      return <Terminal className="h-3 w-3 mr-1" />;
    }
    if (lower.includes('package') || lower.includes('install')) {
      return <Package className="h-3 w-3 mr-1" />;
    }
    if (lower.includes('workflow') || lower.includes('configure')) {
      return <Settings className="h-3 w-3 mr-1" />;
    }
    if (lower.includes('deploy')) {
      return <Rocket className="h-3 w-3 mr-1" />;
    }
    return <Sparkles className="h-3 w-3 mr-1" />;
  };

  return (
    <Badge variant="secondary" className="text-xs flex items-center gap-1">
      {getIcon()}
      {summary}
    </Badge>
  );
}