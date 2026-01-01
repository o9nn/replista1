
import { db } from '../../db';
import { conversations, messages } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface ExportData {
  version: string;
  exportedAt: string;
  conversations: any[];
  messages: any[];
}

export async function exportConversations(): Promise<ExportData> {
  const allConversations = await db.select().from(conversations);
  const allMessages = await db.select().from(messages);

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    conversations: allConversations,
    messages: allMessages,
  };
}

export async function importConversations(data: ExportData): Promise<void> {
  if (!data.version || !data.conversations || !data.messages) {
    throw new Error('Invalid import data format');
  }

  // Import conversations
  for (const conv of data.conversations) {
    await db.insert(conversations).values(conv).onConflictDoNothing();
  }

  // Import messages
  for (const msg of data.messages) {
    await db.insert(messages).values(msg).onConflictDoNothing();
  }
}

import { registerExportImportRoutes } from './routes';

export { registerExportImportRoutes };
export default registerExportImportRoutes;
