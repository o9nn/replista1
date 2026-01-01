
import type { CollaborationSession, User, EditOperation } from './types';

class CollaborationStorage {
  private sessions = new Map<string, CollaborationSession>();
  private userSessions = new Map<string, Set<string>>();

  createSession(conversationId: string): CollaborationSession {
    const session: CollaborationSession = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      users: [],
      activeEdits: [],
      createdAt: Date.now(),
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  addUser(sessionId: string, user: User): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (!session.users.find(u => u.id === user.id)) {
      session.users.push(user);
    }

    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);
  }

  removeUser(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.users = session.users.filter(u => u.id !== userId);
    
    const userSessions = this.userSessions.get(userId);
    if (userSessions) {
      userSessions.delete(sessionId);
    }
  }

  addEdit(sessionId: string, edit: EditOperation): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.activeEdits.push(edit);
  }

  getActiveEdits(sessionId: string, fileId: string): EditOperation[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.activeEdits.filter(e => e.fileId === fileId);
  }

  clearEdits(sessionId: string, fileId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.activeEdits = session.activeEdits.filter(e => e.fileId !== fileId);
  }
}

export const collaborationStorage = new CollaborationStorage();
