
import { db } from "../db";
import { 
  assistantPrompts, 
  messages, 
  creditUsage,
  orgPersona,
  ragSources 
} from "../../shared/schema";
import { checkpointStorage } from "../replit_integrations/checkpoints/storage";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

export interface ExportData {
  version: string;
  exportDate: string;
  prompts: any[];
  messages: any[];
  checkpoints: any[];
  creditUsage: any[];
  orgPersona: any[];
  ragSources: any[];
}

export async function exportDatabase(): Promise<ExportData> {
  // Get all conversations to fetch their messages
  const conversations = await db.select().from(messages);
  
  const [
    promptsData,
    messagesData,
    creditsData,
    personaData,
    ragData,
  ] = await Promise.all([
    db.select().from(assistantPrompts),
    db.select().from(messages),
    db.select().from(creditUsage),
    db.select().from(orgPersona),
    db.select().from(ragSources),
  ]);
  
  // Get all checkpoints from storage
  const allCheckpoints: any[] = [];
  const uniqueSessionIds = new Set(messagesData.map((m: any) => m.conversationId));
  
  for (const sessionId of uniqueSessionIds) {
    const sessionCheckpoints = await checkpointStorage.getCheckpointsBySession(sessionId.toString());
    allCheckpoints.push(...sessionCheckpoints);
  }
  const checkpointsData = allCheckpoints;

  return {
    version: "1.0.0",
    exportDate: new Date().toISOString(),
    prompts: promptsData,
    messages: messagesData,
    checkpoints: checkpointsData,
    creditUsage: creditsData,
    orgPersona: personaData,
    ragSources: ragData,
  };
}

export async function exportToFile(filePath: string): Promise<void> {
  const data = await exportDatabase();
  const json = JSON.stringify(data, null, 2);
  await writeFile(filePath, json, "utf-8");
}

export async function importFromFile(filePath: string): Promise<{
  success: boolean;
  imported: {
    prompts: number;
    messages: number;
    checkpoints: number;
    creditUsage: number;
    orgPersona: number;
    ragSources: number;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  const imported = {
    prompts: 0,
    messages: 0,
    checkpoints: 0,
    creditUsage: 0,
    orgPersona: 0,
    ragSources: 0,
  };

  try {
    const content = await readFile(filePath, "utf-8");
    const data: ExportData = JSON.parse(content);

    // Validate version
    if (!data.version || data.version !== "1.0.0") {
      errors.push("Unsupported export version");
      return { success: false, imported, errors };
    }

    // Import prompts
    if (data.prompts && Array.isArray(data.prompts)) {
      for (const prompt of data.prompts) {
        try {
          await db.insert(assistantPrompts).values(prompt);
          imported.prompts++;
        } catch (error) {
          errors.push(`Failed to import prompt: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    // Import messages
    if (data.messages && Array.isArray(data.messages)) {
      for (const message of data.messages) {
        try {
          await db.insert(messages).values(message);
          imported.messages++;
        } catch (error) {
          errors.push(`Failed to import message: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    // Import checkpoints
    if (data.checkpoints && Array.isArray(data.checkpoints)) {
      for (const checkpoint of data.checkpoints) {
        try {
          await checkpointStorage.createCheckpoint({
            sessionId: checkpoint.sessionId,
            messageId: checkpoint.messageId,
            description: checkpoint.description,
            files: checkpoint.files,
          });
          imported.checkpoints++;
        } catch (error) {
          errors.push(`Failed to import checkpoint: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    // Import credit usage
    if (data.creditUsage && Array.isArray(data.creditUsage)) {
      for (const credit of data.creditUsage) {
        try {
          await db.insert(creditUsage).values(credit);
          imported.creditUsage++;
        } catch (error) {
          errors.push(`Failed to import credit usage: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    // Import org persona
    if (data.orgPersona && Array.isArray(data.orgPersona)) {
      for (const persona of data.orgPersona) {
        try {
          await db.insert(orgPersona).values(persona);
          imported.orgPersona++;
        } catch (error) {
          errors.push(`Failed to import org persona: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    // Import RAG sources
    if (data.ragSources && Array.isArray(data.ragSources)) {
      for (const source of data.ragSources) {
        try {
          await db.insert(ragSources).values(source);
          imported.ragSources++;
        } catch (error) {
          errors.push(`Failed to import RAG source: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
    };
  } catch (error) {
    errors.push(`Failed to read or parse file: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { success: false, imported, errors };
  }
}
