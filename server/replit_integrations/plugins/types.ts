
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PluginHook {
  name: string;
  handler: (...args: any[]) => any;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  hooks?: string[];
  dependencies?: Record<string, string>;
  config?: {
    schema: Record<string, any>;
    defaults: Record<string, any>;
  };
}

export interface PluginContext {
  registerHook: (hookName: string, handler: (...args: any[]) => any) => void;
  getConfig: () => Record<string, any>;
  setConfig: (config: Record<string, any>) => void;
  log: {
    info: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
  };
}
