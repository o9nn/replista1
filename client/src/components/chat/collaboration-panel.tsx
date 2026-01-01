
import { useCollaboration } from '@/hooks/use-collaboration';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Circle } from 'lucide-react';

interface CollaborationPanelProps {
  sessionId: string;
  currentUser: {
    id: string;
    name: string;
    color?: string;
  };
  enabled?: boolean;
}

export function CollaborationPanel({ sessionId, currentUser, enabled = true }: CollaborationPanelProps) {
  const { connected, users } = useCollaboration({
    sessionId,
    user: currentUser,
    enabled
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <Users className="h-5 w-5" />
        <h3 className="font-semibold">Active Users</h3>
        <Badge variant={connected ? "default" : "secondary"} className="ml-auto">
          <Circle className={`h-2 w-2 mr-1 ${connected ? 'fill-green-500' : 'fill-gray-500'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No other users in this session
            </p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8" style={{ backgroundColor: user.color || '#888' }}>
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  {user.cursor && (
                    <p className="text-xs text-muted-foreground">
                      Line {user.cursor.line}, Col {user.cursor.column}
                    </p>
                  )}
                </div>
                {user.id === currentUser.id && (
                  <Badge variant="outline" className="text-xs">You</Badge>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
