import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFileOperations } from '@/hooks/use-file-operations';
import { useToast } from '@/hooks/use-toast';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  onFileSelect?: (path: string) => void;
  selectedPath?: string;
}

export function FileTree({ files, onFileSelect, selectedPath }: FileTreeProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {files.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            onFileSelect={onFileSelect}
            selectedPath={selectedPath}
            level={0}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface TreeNodeProps {
  node: FileNode;
  onFileSelect?: (path: string) => void;
  selectedPath?: string;
  level: number;
}

function TreeNode({ node, onFileSelect, selectedPath, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const { renameFile, deleteFile } = useFileOperations();
  const { toast } = useToast();
  
  const isDirectory = node.type === 'directory';
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect?.(node.path);
    }
  };

  const handleRename = async () => {
    if (newName === node.name) {
      setIsRenaming(false);
      return;
    }

    const newPath = node.path.replace(/[^/]+$/, newName);
    
    try {
      await renameFile.mutateAsync({ oldPath: node.path, newPath });
      toast({
        title: 'File renamed',
        description: `Renamed to ${newName}`,
      });
      setIsRenaming(false);
    } catch (error) {
      toast({
        title: 'Rename failed',
        description: 'Could not rename file',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${node.name}?`)) return;
    
    try {
      await deleteFile.mutateAsync({ filePath: node.path });
      toast({
        title: 'File deleted',
        description: `${node.name} has been deleted`,
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Could not delete file',
        variant: 'destructive',
      });
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1 group">
        <Button
          variant="ghost"
          className={cn(
            'flex-1 justify-start gap-1 h-8 px-2 font-normal',
            isSelected && 'bg-accent'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={handleClick}
        >
          {isDirectory && (
            <span className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="truncate text-sm">{node.name}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              level={level + 1}
            />
          ))}
        </div>
      )}

      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {node.type}</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}