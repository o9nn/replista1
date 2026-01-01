import type { Express, Request, Response } from "express";
import { db } from "../../db";
import { conversations, messages } from "../../../shared/schema";
import multer from "multer";
import { Router } from 'express';
import { ragStorage } from '../rag/storage';
import fs from 'fs/promises';
import path from 'path';

const upload = multer({ storage: multer.memoryStorage() });

export function registerExportImportRoutes(app: Express) {
  const router = Router();

  // Export all data as JSON
  router.post("/export", async (req: Request, res: Response) => {
    try {
      const allConversations = await db.select().from(conversations);
      const allMessages = await db.select().from(messages);

      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        conversations: allConversations,
        messages: allMessages,
      };

      res.json(exportData);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Export as Markdown
  router.get("/export/markdown", async (req: Request, res: Response) => {
    try {
      const allConversations = await db.select().from(conversations);
      const allMessages = await db.select().from(messages);

      let markdown = `# Assistant Export\n\nExported: ${new Date().toISOString()}\n\n`;

      for (const conversation of allConversations) {
        markdown += `## ${conversation.title}\n\n`;
        markdown += `Created: ${conversation.createdAt}\n\n`;

        const conversationMessages = allMessages.filter(
          m => m.conversationId === conversation.id
        );

        for (const message of conversationMessages) {
          markdown += `### ${message.role === 'user' ? 'User' : 'Assistant'}\n\n`;
          markdown += `${message.content}\n\n`;
          markdown += `---\n\n`;
        }
      }

      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="assistant-export-${Date.now()}.md"`);
      res.send(markdown);
    } catch (error) {
      console.error("Error exporting markdown:", error);
      res.status(500).json({ error: "Failed to export markdown" });
    }
  });

  // Import from JSON data
  router.post("/import", async (req: Request, res: Response) => {
    try {
      const { data: importData } = req.body;

      if (!importData || !importData.version || !importData.conversations || !importData.messages) {
        return res.status(400).json({ error: "Invalid import file format" });
      }

      let conversationsImported = 0;
      let messagesImported = 0;

      // Import conversations
      for (const conv of importData.conversations) {
        try {
          await db.insert(conversations).values({
            title: conv.title,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          }).onConflictDoNothing();
          conversationsImported++;
        } catch (error) {
          console.error("Error importing conversation:", error);
        }
      }

      // Import messages
      for (const msg of importData.messages) {
        try {
          await db.insert(messages).values({
            conversationId: msg.conversationId,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(msg.createdAt),
          }).onConflictDoNothing();
          messagesImported++;
        } catch (error) {
          console.error("Error importing message:", error);
        }
      }

      res.json({
        success: true,
        conversations: conversationsImported,
        messages: messagesImported,
      });
    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ error: "Failed to import data" });
    }
  });

  // Export RAG sources to JSON
  router.post('/export-import/export/rag-sources', async (req: Request, res: Response) => {
    try {
      const sources = await ragStorage.getAllSources();
      res.json({ sources });
    } catch (error) {
      console.error('Error exporting RAG sources:', error);
      res.status(500).json({ error: 'Failed to export RAG sources' });
    }
  });

  // Import from uploaded file (RAG sources JSON)
  router.post("/export-import/import/rag-sources", async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: 'File path required' });
      }

      // Read the JSON file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const importData = JSON.parse(fileContent);

      if (!importData.sources || !Array.isArray(importData.sources)) {
        return res.status(400).json({ error: 'Invalid import file format' });
      }

      let importedCount = 0;

      // Import each source
      for (const source of importData.sources) {
        try {
          await ragStorage.addSource({
            type: source.sourceType || 'manual',
            content: source.content,
            metadata: source.metadata || {},
          });
          importedCount++;
        } catch (error) {
          console.error('Error importing source:', error);
        }
      }

      // Clean up the temporary file
      await fs.unlink(filePath).catch(err => {
        console.error('Error cleaning up temp file:', err);
      });

      res.json({ success: true, imported: importedCount });
    } catch (error) {
      console.error('Error importing RAG sources:', error);
      res.status(500).json({ error: 'Failed to import RAG sources' });
    }
  });

  app.use('/api', router);
  return router;
}

export default registerExportImportRoutes;