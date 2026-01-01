
export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  fileId: string;
  line: number;
  column: number;
}

export interface EditOperation {
  userId: string;
  fileId: string;
  timestamp: number;
  type: 'insert' | 'delete' | 'replace';
  position: { line: number; column: number };
  content?: string;
  length?: number;
}

export interface CollaborationSession {
  id: string;
  conversationId: string;
  users: User[];
  activeEdits: EditOperation[];
  createdAt: number;
}
