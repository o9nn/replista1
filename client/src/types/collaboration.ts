
export interface User {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
}

export interface CursorPosition {
  fileId: string;
  line: number;
  column: number;
}

export interface EditOperation {
  userId: string;
  fileId: string;
  type: 'insert' | 'delete' | 'replace' | 'lock' | 'unlock';
  position?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  content?: string;
  timestamp: number;
}
