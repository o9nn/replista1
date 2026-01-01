
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { User, EditOperation, CursorPosition } from '@/types/collaboration';

interface CollaborationUser extends User {
  cursor?: CursorPosition;
}

interface UseCollaborationOptions {
  sessionId: string;
  user: User;
  enabled?: boolean;
}

export function useCollaboration({ sessionId, user, enabled = true }: UseCollaborationOptions) {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [edits, setEdits] = useState<EditOperation[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    // Connect to collaboration WebSocket
    const socket = io({
      path: '/collaboration',
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Collaboration] Connected');
      setConnected(true);
      socket.emit('join-session', { sessionId, user });
    });

    socket.on('disconnect', () => {
      console.log('[Collaboration] Disconnected');
      setConnected(false);
    });

    socket.on('session-state', (session) => {
      setUsers(session.users || []);
      setEdits(session.edits || []);
    });

    socket.on('user-joined', (newUser: User) => {
      setUsers(prev => [...prev, newUser]);
    });

    socket.on('user-left', (leftUser: User) => {
      setUsers(prev => prev.filter(u => u.id !== leftUser.id));
    });

    socket.on('cursor-update', ({ userId, position }: { userId: string; position: CursorPosition }) => {
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, cursor: position } : u
      ));
    });

    socket.on('edit-applied', (edit: EditOperation) => {
      setEdits(prev => [...prev, edit]);
    });

    socket.on('file-locked', ({ fileId, userId }: { fileId: string; userId: string }) => {
      console.log(`[Collaboration] File ${fileId} locked by ${userId}`);
    });

    socket.on('file-unlocked', ({ fileId, userId }: { fileId: string; userId: string }) => {
      console.log(`[Collaboration] File ${fileId} unlocked by ${userId}`);
    });

    socket.on('lock-acquired', ({ fileId }: { fileId: string }) => {
      console.log(`[Collaboration] Lock acquired for ${fileId}`);
    });

    socket.on('lock-denied', ({ fileId }: { fileId: string }) => {
      console.log(`[Collaboration] Lock denied for ${fileId}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, user, enabled]);

  const sendCursorPosition = (position: CursorPosition) => {
    socketRef.current?.emit('cursor-move', position);
  };

  const sendEdit = (edit: Omit<EditOperation, 'userId' | 'timestamp'>) => {
    socketRef.current?.emit('edit-operation', edit);
  };

  const lockFile = (fileId: string) => {
    socketRef.current?.emit('lock-file', { fileId });
  };

  const unlockFile = (fileId: string) => {
    socketRef.current?.emit('unlock-file', { fileId });
  };

  return {
    connected,
    users,
    edits,
    sendCursorPosition,
    sendEdit,
    lockFile,
    unlockFile
  };
}
