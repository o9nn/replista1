
import { Router } from 'express';
import { collaborationStorage } from './storage';
import type { User, EditOperation } from './types';

const router = Router();

router.post('/collaboration/session', (req, res) => {
  const { conversationId } = req.body;
  
  if (!conversationId) {
    return res.status(400).json({ error: 'Conversation ID required' });
  }

  const session = collaborationStorage.createSession(conversationId);
  res.status(201).json(session);
});

router.get('/collaboration/session/:sessionId', (req, res) => {
  const session = collaborationStorage.getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json(session);
});

router.post('/collaboration/session/:sessionId/users', (req, res) => {
  const user: User = req.body;
  
  if (!user.id || !user.name) {
    return res.status(400).json({ error: 'User ID and name required' });
  }

  collaborationStorage.addUser(req.params.sessionId, user);
  res.status(201).json({ success: true });
});

router.delete('/collaboration/session/:sessionId/users/:userId', (req, res) => {
  collaborationStorage.removeUser(req.params.sessionId, req.params.userId);
  res.status(204).send();
});

router.post('/collaboration/session/:sessionId/edits', (req, res) => {
  const edit: EditOperation = req.body;
  
  if (!edit.userId || !edit.fileId || !edit.type) {
    return res.status(400).json({ error: 'Invalid edit operation' });
  }

  collaborationStorage.addEdit(req.params.sessionId, edit);
  res.status(201).json({ success: true });
});

router.get('/collaboration/session/:sessionId/edits/:fileId', (req, res) => {
  const edits = collaborationStorage.getActiveEdits(
    req.params.sessionId,
    req.params.fileId
  );
  res.json(edits);
});

export function registerCollaborationRoutes() {
  return router;
}
