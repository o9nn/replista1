import type { Express, Request, Response } from "express";
import { spawn } from "child_process";
import { readFile, access } from "fs/promises";
import { join, dirname } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { LSPClient } from "./lsp-client";

const execAsync = promisify(exec);

// LSP client cache
const lspClients = new Map<string, LSPClient>();

async function getOrCreateLSPClient(language: string, rootPath: string): Promise<LSPClient | null> {
  const cacheKey = `${language}:${rootPath}`;
  
  if (lspClients.has(cacheKey)) {
    return lspClients.get(cacheKey)!;
  }

  let command: string;
  let args: string[];

  switch (language) {
    case 'typescript':
    case 'javascript':
      command = 'npx';
      args = ['typescript-language-server', '--stdio'];
      break;
    case 'python':
      command = 'pylsp';
      args = [];
      break;
    default:
      return null;
  }

  try {
    const client = new LSPClient(command, args);
    await client.start(rootPath);
    lspClients.set(cacheKey, client);
    return client;
  } catch (error) {
    console.error(`Failed to start LSP for ${language}:`, error);
    return null;
  }
}

function getLanguageFromFile(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    default:
      return 'unknown';
  }
}

interface HoverInfo {
  content: string;
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

interface DefinitionLocation {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export function registerCodeIntelligenceRoutes(app: Express): void {
  // Get hover information for a position in a file
  app.post("/api/code-intelligence/hover", async (req: Request, res: Response) => {
    try {
      const { filePath, line, character } = req.body;

      if (!filePath || line === undefined || character === undefined) {
        return res.status(400).json({ error: "filePath, line, and character are required" });
      }

      const language = getLanguageFromFile(filePath);
      const rootPath = process.cwd();
      const lspClient = await getOrCreateLSPClient(language, rootPath);

      if (lspClient) {
        // Use LSP for hover
        const content = await readFile(filePath, "utf-8");
        const uri = `file://${join(rootPath, filePath)}`;
        
        await lspClient.openDocument(uri, language, content);
        const hoverResult = await lspClient.hover(uri, line, character);

        if (hoverResult?.contents) {
          return res.json({
            content: typeof hoverResult.contents === 'string' 
              ? hoverResult.contents 
              : hoverResult.contents.value || JSON.stringify(hoverResult.contents),
            range: hoverResult.range,
          });
        }
      }

      // Fallback to simple hover
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const word = extractWordAtPosition(lines[line], character);

      res.json({
        content: `Symbol: ${word}`,
      });
    } catch (error) {
      console.error("Error getting hover info:", error);
      res.status(500).json({ error: "Failed to get hover information" });
    }
  });

  // Get definition location for a symbol
  app.post("/api/code-intelligence/definition", async (req: Request, res: Response) => {
    try {
      const { filePath, line, character } = req.body;

      if (!filePath || line === undefined || character === undefined) {
        return res.status(400).json({ error: "filePath, line, and character are required" });
      }

      const language = getLanguageFromFile(filePath);
      const rootPath = process.cwd();
      const lspClient = await getOrCreateLSPClient(language, rootPath);

      if (lspClient) {
        const content = await readFile(filePath, "utf-8");
        const uri = `file://${join(rootPath, filePath)}`;
        
        await lspClient.openDocument(uri, language, content);
        const defResult = await lspClient.definition(uri, line, character);

        if (defResult) {
          const definitions = Array.isArray(defResult) ? defResult : [defResult];
          return res.json(definitions.map((def: any) => ({
            uri: def.uri.replace('file://', ''),
            range: def.range,
          })));
        }
      }

      // Fallback to regex-based search
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const word = extractWordAtPosition(lines[line], character);
      const ext = filePath.split(".").pop()?.toLowerCase();
      let definitions: DefinitionLocation[] = [];

      if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx") {
        definitions = await getJavaScriptDefinition(filePath, line, character, word);
      } else if (ext === "py") {
        definitions = await getPythonDefinition(filePath, line, character, word);
      }

      res.json(definitions);
    } catch (error) {
      console.error("Error getting definition:", error);
      res.status(500).json({ error: "Failed to get definition" });
    }
  });

  // Get code completions
  app.post("/api/code-intelligence/completions", async (req: Request, res: Response) => {
    try {
      const { filePath, line, character } = req.body;

      if (!filePath || line === undefined || character === undefined) {
        return res.status(400).json({ error: "filePath, line, and character are required" });
      }

      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const prefix = lines[line].substring(0, character);

      const ext = filePath.split(".").pop()?.toLowerCase();
      let completions: string[] = [];

      if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx") {
        completions = getJavaScriptCompletions(content, prefix);
      } else if (ext === "py") {
        completions = getPythonCompletions(content, prefix);
      }

      res.json({ completions });
    } catch (error) {
      console.error("Error getting completions:", error);
      res.status(500).json({ error: "Failed to get completions" });
    }
  });

  // Search for symbols across project
  app.post("/api/code-intelligence/symbols", async (req: Request, res: Response) => {
    try {
      const { query, fileTypes } = req.body;

      if (!query) {
        return res.status(400).json({ error: "query is required" });
      }

      const symbols = await searchSymbols(query, fileTypes);
      res.json({ symbols });
    } catch (error) {
      console.error("Error searching symbols:", error);
      res.status(500).json({ error: "Failed to search symbols" });
    }
  });

  // Get references to a symbol
  app.post("/api/code-intelligence/references", async (req: Request, res: Response) => {
    try {
      const { filePath, line, character } = req.body;

      if (!filePath || line === undefined || character === undefined) {
        return res.status(400).json({ error: "filePath, line, and character are required" });
      }

      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const word = extractWordAtPosition(lines[line], character);

      const references = await findReferences(word, filePath);
      res.json({ references });
    } catch (error) {
      console.error("Error finding references:", error);
      res.status(500).json({ error: "Failed to find references" });
    }
  });

  // Get diagnostics for a file
  app.post("/api/code-intelligence/diagnostics", async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: "filePath is required" });
      }

      const language = getLanguageFromFile(filePath);
      const rootPath = process.cwd();
      const lspClient = await getOrCreateLSPClient(language, rootPath);

      if (lspClient) {
        const content = await readFile(filePath, "utf-8");
        const uri = `file://${join(rootPath, filePath)}`;
        
        await lspClient.openDocument(uri, language, content);
        
        // Listen for diagnostics
        const diagnostics = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve([]), 2000);
          
          lspClient.once('notification', (method: string, params: any) => {
            if (method === 'textDocument/publishDiagnostics') {
              clearTimeout(timeout);
              resolve(params.diagnostics || []);
            }
          });
        });

        return res.json({ diagnostics });
      }

      res.json({ diagnostics: [] });
    } catch (error) {
      console.error("Error getting diagnostics:", error);
      res.status(500).json({ error: "Failed to get diagnostics" });
    }
  });
}

function extractWordAtPosition(line: string, character: number): string {
  const before = line.substring(0, character);
  const after = line.substring(character);
  
  const wordBefore = before.match(/[\w$]+$/)?.[0] || "";
  const wordAfter = after.match(/^[\w$]+/)?.[0] || "";
  
  return wordBefore + wordAfter;
}

async function getJavaScriptHover(
  filePath: string,
  line: number,
  character: number,
  word: string
): Promise<HoverInfo> {
  // Basic type inference based on context
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  
  // Check if it's a function
  const functionPattern = new RegExp(`function\\s+${word}\\s*\\(`);
  const arrowFunctionPattern = new RegExp(`const\\s+${word}\\s*=\\s*\\(`);
  
  if (functionPattern.test(content) || arrowFunctionPattern.test(content)) {
    return {
      content: `function ${word}`,
    };
  }
  
  // Check if it's an import
  const importPattern = new RegExp(`import.*${word}.*from`);
  if (importPattern.test(content)) {
    return {
      content: `(imported) ${word}`,
    };
  }
  
  return {
    content: `${word}`,
  };
}

async function getPythonHover(
  filePath: string,
  line: number,
  character: number,
  word: string
): Promise<HoverInfo> {
  const content = await readFile(filePath, "utf-8");
  
  // Check if it's a function
  const functionPattern = new RegExp(`def\\s+${word}\\s*\\(`);
  if (functionPattern.test(content)) {
    return {
      content: `def ${word}`,
    };
  }
  
  // Check if it's a class
  const classPattern = new RegExp(`class\\s+${word}`);
  if (classPattern.test(content)) {
    return {
      content: `class ${word}`,
    };
  }
  
  return {
    content: `${word}`,
  };
}

async function getJavaScriptDefinition(
  filePath: string,
  line: number,
  character: number,
  word: string
): Promise<DefinitionLocation[]> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  
  const definitions: DefinitionLocation[] = [];
  
  // Search for function definitions
  const functionPattern = new RegExp(`function\\s+${word}\\s*\\(`, "g");
  const arrowFunctionPattern = new RegExp(`const\\s+${word}\\s*=\\s*\\(`, "g");
  
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length - 1;
    definitions.push({
      uri: filePath,
      range: {
        start: { line: lineNum, character: 0 },
        end: { line: lineNum, character: lines[lineNum].length },
      },
    });
  }
  
  while ((match = arrowFunctionPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length - 1;
    definitions.push({
      uri: filePath,
      range: {
        start: { line: lineNum, character: 0 },
        end: { line: lineNum, character: lines[lineNum].length },
      },
    });
  }
  
  return definitions;
}

async function getPythonDefinition(
  filePath: string,
  line: number,
  character: number,
  word: string
): Promise<DefinitionLocation[]> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  
  const definitions: DefinitionLocation[] = [];
  
  // Search for function/class definitions
  const defPattern = new RegExp(`def\\s+${word}\\s*\\(`, "g");
  const classPattern = new RegExp(`class\\s+${word}`, "g");
  
  let match;
  while ((match = defPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length - 1;
    definitions.push({
      uri: filePath,
      range: {
        start: { line: lineNum, character: 0 },
        end: { line: lineNum, character: lines[lineNum].length },
      },
    });
  }
  
  while ((match = classPattern.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length - 1;
    definitions.push({
      uri: filePath,
      range: {
        start: { line: lineNum, character: 0 },
        end: { line: lineNum, character: lines[lineNum].length },
      },
    });
  }
  
  return definitions;
}

function getJavaScriptCompletions(content: string, prefix: string): string[] {
  const completions = new Set<string>();
  
  // Extract identifiers from content
  const identifierPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
  let match;
  
  while ((match = identifierPattern.exec(content)) !== null) {
    const identifier = match[0];
    if (identifier.startsWith(prefix.trim().split(/\s+/).pop() || "")) {
      completions.add(identifier);
    }
  }
  
  // Add common keywords
  const keywords = ["const", "let", "var", "function", "class", "if", "else", "for", "while", "return"];
  keywords.forEach(kw => {
    if (kw.startsWith(prefix.trim().split(/\s+/).pop() || "")) {
      completions.add(kw);
    }
  });
  
  return Array.from(completions).slice(0, 20);
}

function getPythonCompletions(content: string, prefix: string): string[] {
  const completions = new Set<string>();
  
  // Extract identifiers from content
  const identifierPattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
  let match;
  
  while ((match = identifierPattern.exec(content)) !== null) {
    const identifier = match[0];
    if (identifier.startsWith(prefix.trim().split(/\s+/).pop() || "")) {
      completions.add(identifier);
    }
  }
  
  // Add common keywords
  const keywords = ["def", "class", "if", "else", "elif", "for", "while", "return", "import", "from"];
  keywords.forEach(kw => {
    if (kw.startsWith(prefix.trim().split(/\s+/).pop() || "")) {
      completions.add(kw);
    }
  });
  
  return Array.from(completions).slice(0, 20);
}

async function searchSymbols(query: string, fileTypes?: string[]): Promise<any[]> {
  const symbols: any[] = [];
  const extensions = fileTypes || ["ts", "tsx", "js", "jsx", "py"];
  
  try {
    // Use ripgrep or grep to search for symbols
    const grepPattern = `\\b${query}\\w*\\b`;
    const filePattern = extensions.map(ext => `--include=*.${ext}`).join(" ");
    
    const { stdout } = await execAsync(`grep -rn ${filePattern} -E "${grepPattern}" . 2>/dev/null || true`);
    
    const lines = stdout.split("\n").filter(Boolean);
    for (const line of lines.slice(0, 50)) {
      const [filePath, lineNum, content] = line.split(":", 3);
      if (filePath && lineNum && content) {
        symbols.push({
          name: query,
          filePath: filePath.replace("./", ""),
          line: parseInt(lineNum) - 1,
          preview: content.trim(),
        });
      }
    }
  } catch (error) {
    console.error("Symbol search error:", error);
  }
  
  return symbols;
}

async function findReferences(symbol: string, currentFile: string): Promise<any[]> {
  const references: any[] = [];
  
  try {
    const { stdout } = await execAsync(`grep -rn "\\b${symbol}\\b" . 2>/dev/null || true`);
    
    const lines = stdout.split("\n").filter(Boolean);
    for (const line of lines.slice(0, 100)) {
      const [filePath, lineNum, content] = line.split(":", 3);
      if (filePath && lineNum && content) {
        references.push({
          uri: filePath.replace("./", ""),
          range: {
            start: { line: parseInt(lineNum) - 1, character: 0 },
            end: { line: parseInt(lineNum) - 1, character: content.length },
          },
          preview: content.trim(),
        });
      }
    }
  } catch (error) {
    console.error("Reference search error:", error);
  }
  
  return references;
}