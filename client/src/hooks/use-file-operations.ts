import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAssistantStore } from "./use-assistant-store";
import { useToast } from './use-toast';
import type { File } from "@shared/schema";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

// Interface for file upload, previously defined in the changes snippet and now merged
interface FileUpload {
  name: string;
  content: string;
  mimeType?: string;
}

// Interface for file rename operation, added in the changes snippet
interface FileRename {
  oldPath: string;
  newPath: string;
}

// Interface for file delete operation, added in the changes snippet
interface FileDelete {
  filePath: string;
}


export function useFileOperations() {
  const queryClient = useQueryClient();
  const { addFile, removeFile, updateFileContent } = useAssistantStore();
  const { toast } = useToast();

  const { data: availableFiles = [], isLoading } = useQuery({
    queryKey: ['workspace-files'],
    queryFn: async () => {
      const response = await fetch('/api/files/list');
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json() as Promise<File[]>;
    },
    staleTime: 30000,
  });

  const readFile = useMutation({
    mutationFn: async ({ filePath }: { filePath: string }) => {
      const response = await fetch('/api/file/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to read file');
      }
      return response.json();
    },
  });

  const writeFile = useMutation({
    mutationFn: async ({ filePath, content }: { filePath: string; content: string }) => {
      const response = await fetch('/api/file/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to write file');
      }
      return response.json();
    },
  });

  const listFilesMutation = useMutation({ // Renamed to avoid conflict with useQuery listFiles
    mutationFn: async ({ dirPath }: { dirPath?: string }) => {
      const response = await fetch('/api/file/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirPath }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to list files');
      }
      return response.json() as Promise<{ dirPath: string; files: FileEntry[] }>;
    },
  });

  // This deleteFile mutation is for direct file path deletion, kept for now
  const deleteFileAtPath = useMutation({
    mutationFn: async ({ filePath }: { filePath: string }) => {
      const response = await fetch('/api/file/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to delete file');
      }
      return response.json();
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', new Blob([file.content], { type: 'text/plain' }));
      formData.append('name', file.name);
      formData.append('language', file.language || 'plaintext');

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload file');
      return response.json() as Promise<File>;
    },
    onSuccess: (uploadedFile) => {
      addFile(uploadedFile);
      queryClient.invalidateQueries({ queryKey: ['workspace-files'] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete file');
    },
    onSuccess: (_, fileId) => {
      removeFile(fileId);
      queryClient.invalidateQueries({ queryKey: ['workspace-files'] });
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: string; content: string }) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to update file');
      return response.json() as Promise<File>;
    },
    onSuccess: (updatedFile) => {
      updateFileContent(updatedFile.id, updatedFile.content);
      queryClient.invalidateQueries({ queryKey: ['workspace-files'] });
    },
  });

  // New mutations from the changes snippet
  const renameFileMutation = useMutation({
    mutationFn: async ({ oldPath, newPath }: FileRename) => {
      const response = await fetch('/api/file-operations/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to rename file');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-files'] });
      // Also invalidate file tree if it's being used elsewhere
      queryClient.invalidateQueries({ queryKey: ['file-tree'] });
    },
  });

  const deleteFileOperation = useMutation({ // Renamed to distinguish from deleteFileMutation
    mutationFn: async ({ filePath }: FileDelete) => {
      const response = await fetch('/api/file-operations/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to delete file');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-files'] });
      // Also invalidate file tree if it's being used elsewhere
      queryClient.invalidateQueries({ queryKey: ['file-tree'] });
    },
  });

  // New query from the changes snippet
  const getFileTree = useQuery({
    queryKey: ['file-tree'],
    queryFn: async () => {
      const response = await fetch('/api/file-operations/tree');
      if (!response.ok) throw new Error('Failed to fetch file tree');
      return response.json() as Promise<FileEntry[]>; // Assuming FileEntry[] or a similar structure
    },
  });


  return {
    availableFiles,
    isLoading,
    readFile,
    writeFile,
    listFiles: listFilesMutation.mutate, // Expose the mutation version
    deleteFile: deleteFileMutation.mutate, // Keep the existing deleteFile mutation
    uploadFile: uploadFileMutation.mutate,
    updateFile: updateFileMutation.mutate,
    isUploading: uploadFileMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    isUpdating: updateFileMutation.isPending,
    toast,
    // New operations from the changes snippet
    renameFile: renameFileMutation.mutate,
    deleteFileOperation: deleteFileOperation.mutate, // Expose the new delete operation
    deleteFileAtPath: deleteFileAtPath.mutate, // Expose the direct path delete
    getFileTree: getFileTree.data,
    isGettingFileTree: getFileTree.isLoading,
  };
}