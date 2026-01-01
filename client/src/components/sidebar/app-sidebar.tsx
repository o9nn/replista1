import { useState, useMemo } from "react";
import { Plus, MessageSquare, Trash2, FolderOpen, History, Search, FileText, Settings, MessagesSquare, Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { FileCard } from "@/components/files/file-card";
import { FileUpload } from "@/components/files/file-upload";
import { FileTree } from "@/components/files/file-tree";
import { CheckpointList } from "@/components/checkpoints/checkpoint-list";
import { BinaryFilePreview } from "@/components/files/binary-file-preview";
import { CollaborationPanel } from "@/components/chat/collaboration-panel";
import { PluginManager } from '@/components/plugins/plugin-manager';
import { RAGSourcesPanel } from "@/components/chat/rag-sources-panel";
import { RAGSourcesViewer } from "@/components/chat/rag-sources-viewer";
import { URLScrapingPanel } from "@/components/chat/url-scraping-panel";
import { ImageGenerationPanel } from "@/components/chat/image-generation-panel";
import { ExportImportPanel } from "@/components/chat/export-import-panel";
import { ScreenshotPanel } from "@/components/chat/screenshot-panel";
import { useAssistantStore } from "@/hooks/use-assistant-store";
import { useFileOperations } from "@/hooks/use-file-operations";
import { cn } from "@/lib/utils";
import { ConversationSearch } from "@/components/chat/conversation-search";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AppSidebarProps {
  onNewSession: () => void;
  onSelectFile: (fileId: string) => void;
  selectedFileId?: string;
}

export function AppSidebar({ onNewSession, onSelectFile, selectedFileId }: AppSidebarProps) {
  const [activeTab, setActiveTab] = useState<"files" | "history" | "tree" | "collab" | "plugins" | "search" | "rag" | "export" | "tools">("files");
  const {
    sessions,
    currentSessionId,
    setCurrentSession,
    deleteSession,
    files,
    addFile,
    removeFile,
    checkpoints,
    restoreCheckpoint,
  } = useAssistantStore();
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const { getFileTree } = useFileOperations();
  const [selectedFile, setSelectedFile] = useState<string>();
  const [previewFile, setPreviewFile] = useState<any>(null);

  const filteredFiles = useMemo(() => {
    if (!fileSearchQuery.trim()) return files;
    const query = fileSearchQuery.toLowerCase();
    return files.filter(file =>
      file.name.toLowerCase().includes(query) ||
      file.language?.toLowerCase().includes(query)
    );
  }, [files, fileSearchQuery]);

  const handleSessionClick = (sessionId: string) => {
    setCurrentSession(sessionId);
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    const file = files.find(f => f.name === path);
    if (file && file.mimeType && !file.mimeType.startsWith('text/')) {
      setPreviewFile(file);
    } else {
      setPreviewFile(null); // Close preview if it's a text file
    }
    if (file) {
      onSelectFile(file.id);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Assistant</h1>
            <p className="text-xs text-muted-foreground">Memorial Edition</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-2 py-2">
            <Button
              onClick={onNewSession}
              className="w-full justify-start"
              variant="outline"
              data-testid="button-new-session"
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-32">
              <SidebarMenu>
                {sessions.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No chat history yet
                  </div>
                ) : (
                  sessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton
                        onClick={() => handleSessionClick(session.id)}
                        className={cn(
                          currentSessionId === session.id && "bg-sidebar-accent"
                        )}
                        data-testid={`button-session-${session.id}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="flex-1 truncate text-xs">{session.name}</span>
                      </SidebarMenuButton>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        data-testid={`button-delete-session-${session.id}`}
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="flex-1">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "files" | "history" | "tree" | "collab" | "plugins" | "search" | "rag" | "export" | "tools")}>
            <TabsList className="w-full grid grid-cols-5 px-2" style={{ width: "calc(100% - 16px)" }}>
              <TabsTrigger value="files" className="text-xs" data-testid="tab-files">
                <FolderOpen className="h-3 w-3 mr-1" />
                Files
              </TabsTrigger>
              <TabsTrigger value="tree" className="text-xs" data-testid="tab-tree">
                <FolderOpen className="h-3 w-3 mr-1" />
                Tree
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs" data-testid="tab-history">
                <History className="h-3 w-3 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="collab" className="text-xs" data-testid="tab-collab">
                <MessageSquare className="h-3 w-3 mr-1" />
                Collab
              </TabsTrigger>
              <TabsTrigger value="plugins" className="text-xs" data-testid="tab-plugins">
                <MessageSquare className="h-3 w-3 mr-1" />
                Plugins
              </TabsTrigger>
              <TabsTrigger value="search" className="text-xs" data-testid="tab-search">
                <Search className="h-3 w-3 mr-1" />
                Search
              </TabsTrigger>
              <TabsTrigger value="rag" className="flex-1">
                <Database className="w-4 h-4 mr-2" />
                RAG
              </TabsTrigger>
              <TabsTrigger value="export" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="flex-1 m-0">
              <SidebarGroup>
                <SidebarGroupLabel>
                  <div className="flex items-center justify-between w-full">
                    <span>Files ({files.length})</span>
                    <FileUpload onUpload={addFile} />
                  </div>
                </SidebarGroupLabel>
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-input bg-background"
                    />
                  </div>
                </div>
                <SidebarGroupContent>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-1 pr-2">
                      {filteredFiles.length === 0 && files.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                          No files yet
                          <p className="text-xs text-muted-foreground">
                            Drag and drop files here or click the button above
                          </p>
                        </div>
                      ) : filteredFiles.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No files match your search
                        </div>
                      ) : (
                        filteredFiles.map((file) => (
                          <FileCard
                            key={file.id}
                            file={file}
                            isActive={file.id === selectedFileId}
                            onRemove={removeFile}
                            onClick={onSelectFile}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </SidebarGroupContent>
              </SidebarGroup>
            </TabsContent>

            <TabsContent value="tree" className="flex-1 m-0">
              <SidebarGroup>
                <SidebarGroupLabel>File Tree</SidebarGroupLabel>
                <SidebarGroupContent>
                  <ScrollArea className="h-[calc(100vh-16rem)]">
                    <div className="space-y-1 pr-2">
                      {getFileTree.data?.tree && (
                        <FileTree
                          files={getFileTree.data.tree}
                          onFileSelect={handleFileSelect}
                          selectedPath={selectedFile}
                        />
                      )}
                    </div>
                  </ScrollArea>
                </SidebarGroupContent>
              </SidebarGroup>
            </TabsContent>

            <TabsContent value="history" className="mt-2">
              <CheckpointList
                checkpoints={checkpoints.filter((c) => c.sessionId === currentSessionId)}
                onRestore={restoreCheckpoint}
              />
            </TabsContent>
            <TabsContent value="collab" className="flex-1 overflow-hidden">
              <CollaborationPanel
                sessionId={currentSessionId || ''}
                currentUser={{
                  id: 'current-user',
                  name: 'You',
                  color: '#4CAF50'
                }}
              />
            </TabsContent>
            <TabsContent value="plugins" className="flex-1 overflow-hidden">
              <PluginManager
                sessionId={currentSessionId || ''}
              />
            </TabsContent>
            <TabsContent value="search" className="flex-1 m-0">
              <SidebarGroup>
                <SidebarGroupLabel>Search Messages</SidebarGroupLabel>
                <SidebarGroupContent>
                  <ConversationSearch />
                </SidebarGroupContent>
              </SidebarGroup>
            </TabsContent>
            <TabsContent value="rag" className="space-y-4">
                <RAGSourcesPanel />
                <RAGSourcesViewer />

              <div className="mt-4 space-y-4">
                <ImageGenerationPanel />
                <URLScrapingPanel />
                <ExportImportPanel />
              </div>
            </TabsContent>
            <TabsContent value="export" className="space-y-4">
                <ExportImportPanel />
              </TabsContent>
            <TabsContent value="tools" className="space-y-4">
                <ImageGenerationPanel />
                <URLScrapingPanel />
                <ScreenshotPanel />
              </TabsContent>
          </Tabs>
        </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Collapsible className="w-full">
          <CollapsibleTrigger className="w-full text-left text-sm font-semibold py-2 px-2 hover:bg-sidebar-accent rounded-md">
            Advanced Features
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <RAGSourcesPanel />
            <ImageGenerationPanel />
            <URLScrapingPanel />
            <ScreenshotPanel />
            <ExportImportPanel />
          </CollapsibleContent>
        </Collapsible>
        <div className="text-xs text-muted-foreground text-center mt-4">
          In loving memory of Replit Assistant
          <br />
          Dec 2024 - Dec 2025
        </div>
      </SidebarFooter>

      {previewFile && (
        <BinaryFilePreview
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={{
            name: previewFile.name,
            type: previewFile.mimeType,
            content: previewFile.content,
            size: previewFile.content.length,
          }}
        />
      )}
    </Sidebar>
  );
}