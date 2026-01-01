
import { Lightbulb, Wand2, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CodeActionSuggestion {
  id: string;
  type: 'fix' | 'refactor' | 'extract';
  title: string;
  description: string;
  code: string;
}

interface CodeActionSuggestionsProps {
  suggestions: CodeActionSuggestion[];
  onApply: (suggestion: CodeActionSuggestion) => void;
}

export function CodeActionSuggestions({ suggestions, onApply }: CodeActionSuggestionsProps) {
  if (suggestions.length === 0) return null;

  const getIcon = (type: CodeActionSuggestion['type']) => {
    switch (type) {
      case 'fix':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'refactor':
        return <Wand2 className="h-4 w-4 text-blue-500" />;
      case 'extract':
        return <Code2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getBadgeVariant = (type: CodeActionSuggestion['type']) => {
    switch (type) {
      case 'fix':
        return 'warning';
      case 'refactor':
        return 'default';
      case 'extract':
        return 'success';
    }
  };

  return (
    <div className="space-y-2 p-2 border rounded-md bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="h-4 w-4" />
        <span>Code Actions Available</span>
      </div>

      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1">
              {getIcon(suggestion.type)}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{suggestion.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onApply(suggestion)}
            >
              Apply
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
