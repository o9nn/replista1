
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { collaborationStorage } from './storage';
import type { User, EditOperation, CursorPosition } from './types';

export function setupCollaborationWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    path: '/collaboration'
  });

  io.on('connection', (socket) => {
    console.log(`[Collaboration] User connected: ${socket.id}`);
    
    let currentSessionId: string | null = null;
    let currentUser: User | null = null;

    // Join a collaboration session
    socket.on('join-session', ({ sessionId, user }: { sessionId: string; user: User }) => {
      currentSessionId = sessionId;
      currentUser = user;
      
      socket.join(sessionId);
      collaborationStorage.addUser(sessionId, { ...user, id: socket.id });
      
      // Broadcast user joined to others
      socket.to(sessionId).emit('user-joined', { ...user, id: socket.id });
      
      // Send current session state
      const session = collaborationStorage.getSession(sessionId);
      socket.emit('session-state', session);
      
      console.log(`[Collaboration] User ${user.name} joined session ${sessionId}`);
    });

    // Handle cursor position updates
    socket.on('cursor-move', (position: CursorPosition) => {
      if (!currentSessionId) return;
      
      socket.to(currentSessionId).emit('cursor-update', {
        userId: socket.id,
        position
      });
    });

    // Handle edit operations
    socket.on('edit-operation', (edit: Omit<EditOperation, 'userId' | 'timestamp'>) => {
      if (!currentSessionId) return;
      
      const fullEdit: EditOperation = {
        ...edit,
        userId: socket.id,
        timestamp: Date.now()
      };
      
      collaborationStorage.addEdit(currentSessionId, fullEdit);
      
      // Broadcast edit to others
      socket.to(currentSessionId).emit('edit-applied', fullEdit);
    });

    // Handle file lock requests
    socket.on('lock-file', ({ fileId }: { fileId: string }) => {
      if (!currentSessionId) return;
      
      const edits = collaborationStorage.getActiveEdits(currentSessionId, fileId);
      const isLocked = edits.some(e => e.type === 'lock' && e.userId !== socket.id);
      
      if (!isLocked) {
        const lockEdit: EditOperation = {
          userId: socket.id,
          fileId,
          type: 'lock',
          timestamp: Date.now()
        };
        
        collaborationStorage.addEdit(currentSessionId, lockEdit);
        socket.to(currentSessionId).emit('file-locked', { fileId, userId: socket.id });
        socket.emit('lock-acquired', { fileId });
      } else {
        socket.emit('lock-denied', { fileId });
      }
    });

    // Handle file unlock
    socket.on('unlock-file', ({ fileId }: { fileId: string }) => {
      if (!currentSessionId) return;
      
      const unlockEdit: EditOperation = {
        userId: socket.id,
        fileId,
        type: 'unlock',
        timestamp: Date.now()
      };
      
      collaborationStorage.addEdit(currentSessionId, unlockEdit);
      socket.to(currentSessionId).emit('file-unlocked', { fileId, userId: socket.id });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (currentSessionId && currentUser) {
        collaborationStorage.removeUser(currentSessionId, socket.id);
        socket.to(currentSessionId).emit('user-left', { id: socket.id, name: currentUser.name });
        console.log(`[Collaboration] User ${currentUser.name} left session ${currentSessionId}`);
      }
      console.log(`[Collaboration] User disconnected: ${socket.id}`);
    });
  });

  return io;
}
