
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineCodeSuggestion {
  id: string;
  type: 'fix' | 'refactor' | 'extract' | 'optimize';
  title: string;
  description: string;
  filePath: string;
  lineNumber: number;
  oldCode: string;
  newCode: string;
  confidence: number;
}

interface InlineCodeSuggestionProps {
  suggestion: InlineCodeSuggestion;
  onApply: (suggestionId: string) => void;
  onDismiss: (suggestionId: string) => void;
}

export function InlineCodeSuggestion({
  suggestion,
  onApply,
  onDismiss,
}: InlineCodeSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeColors = {
    fix: 'bg-red-500/10 text-red-600 border-red-500/20',
    refactor: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    extract: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    optimize: 'bg-green-500/10 text-green-600 border-green-500/20',
  };

  const typeIcons = {
    fix: AlertCircle,
    refactor: '🔧',
    extract: '📦',
    optimize: '⚡',
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium border',
                typeColors[suggestion.type]
              )}
            >
              {suggestion.type}
            </span>
            <span className="text-sm text-muted-foreground">
              {suggestion.filePath}:{suggestion.lineNumber}
            </span>
            <span className="text-xs text-muted-foreground">
              {(suggestion.confidence * 100).toFixed(0)}% confident
            </span>
          </div>
          <h4 className="font-medium text-sm">{suggestion.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {suggestion.description}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onApply(suggestion.id)}
            title="Apply suggestion"
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(suggestion.id)}
            title="Dismiss suggestion"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2 pt-2 border-t">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Current:
            </div>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
              <code>{suggestion.oldCode}</code>
            </pre>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Suggested:
            </div>
            <pre className="bg-green-500/10 p-2 rounded text-xs overflow-x-auto">
              <code>{suggestion.newCode}</code>
            </pre>
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? 'Hide' : 'Show'} code diff
      </Button>
    </div>
  );
}
