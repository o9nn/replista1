
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Settings, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export function PluginManager() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    try {
      const response = await fetch('/api/plugins');
      if (!response.ok) throw new Error('Failed to load plugins');
      const data = await response.json();
      setPlugins(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load plugins',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (id: string) => {
    try {
      const response = await fetch(`/api/plugins/${id}/toggle`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to toggle plugin');
      await loadPlugins();
      toast({
        title: 'Success',
        description: 'Plugin status updated',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to toggle plugin',
        variant: 'destructive',
      });
    }
  };

  const deletePlugin = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plugin?')) return;

    try {
      const response = await fetch(`/api/plugins/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete plugin');
      await loadPlugins();
      toast({
        title: 'Success',
        description: 'Plugin deleted',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete plugin',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plugins</h2>
        <Button size="sm">
          <Package className="h-4 w-4 mr-2" />
          Install Plugin
        </Button>
      </div>

      {plugins.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No plugins installed
        </Card>
      ) : (
        <div className="space-y-2">
          {plugins.map((plugin) => (
            <Card key={plugin.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{plugin.name}</h3>
                    <Badge variant="outline">{plugin.version}</Badge>
                    {plugin.enabled && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plugin.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {plugin.author}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Plugin Settings</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <pre className="text-xs bg-muted p-2 rounded">
                          {JSON.stringify(plugin.config, null, 2)}
                        </pre>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Switch
                    checked={plugin.enabled}
                    onCheckedChange={() => togglePlugin(plugin.id)}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePlugin(plugin.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
