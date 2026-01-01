
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, Bug, Sparkles, Package } from 'lucide-react';

interface Template {
  icon: React.ReactNode;
  title: string;
  prompt: string;
  category: 'code' | 'debug' | 'refactor' | 'package';
}

const templates: Template[] = [
  {
    icon: <FileCode className="h-4 w-4" />,
    title: 'Create a new feature',
    prompt: 'Create a new feature that...',
    category: 'code',
  },
  {
    icon: <Bug className="h-4 w-4" />,
    title: 'Fix a bug',
    prompt: 'I have a bug in my code where...',
    category: 'debug',
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: 'Refactor code',
    prompt: 'Refactor this code to make it...',
    category: 'refactor',
  },
  {
    icon: <Package className="h-4 w-4" />,
    title: 'Add dependencies',
    prompt: 'Add and configure these packages:',
    category: 'package',
  },
];

interface MessageTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
}

export function MessageTemplates({ onSelectTemplate }: MessageTemplatesProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-4">
      {templates.map((template, index) => (
        <Card
          key={index}
          className="p-3 cursor-pointer hover:bg-accent transition-colors"
          onClick={() => onSelectTemplate(template.prompt)}
        >
          <div className="flex items-start gap-2">
            <div className="text-muted-foreground">{template.icon}</div>
            <div>
              <div className="font-medium text-sm">{template.title}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {template.prompt}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
