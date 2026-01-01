
import type { Plugin, PluginHook, PluginContext, PluginManifest } from './types';
import * as storage from './storage';

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private hooks: Map<string, PluginHook[]> = new Map();
  private loadedModules: Map<string, any> = new Map();

  async initialize() {
    const plugins = await storage.getAllPlugins();
    for (const plugin of plugins) {
      if (plugin.enabled) {
        await this.loadPlugin(plugin);
      }
    }
  }

  async loadPlugin(plugin: Plugin) {
    try {
      // In a real implementation, this would dynamically import the plugin module
      // For now, we'll just register the plugin
      this.plugins.set(plugin.id, plugin);
      console.log(`Plugin loaded: ${plugin.name} v${plugin.version}`);
    } catch (error) {
      console.error(`Failed to load plugin ${plugin.id}:`, error);
    }
  }

  async unloadPlugin(pluginId: string) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Remove all hooks registered by this plugin
    for (const [hookName, hooks] of this.hooks.entries()) {
      this.hooks.set(
        hookName,
        hooks.filter(h => !h.name.startsWith(`${pluginId}:`))
      );
    }

    this.plugins.delete(pluginId);
    this.loadedModules.delete(pluginId);
  }

  registerHook(pluginId: string, hookName: string, handler: (...args: any[]) => any) {
    const hooks = this.hooks.get(hookName) || [];
    hooks.push({
      name: `${pluginId}:${hookName}`,
      handler,
    });
    this.hooks.set(hookName, hooks);
  }

  async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    const hooks = this.hooks.get(hookName) || [];
    const results = [];

    for (const hook of hooks) {
      try {
        const result = await hook.handler(...args);
        results.push(result);
      } catch (error) {
        console.error(`Error executing hook ${hook.name}:`, error);
      }
    }

    return results;
  }

  createPluginContext(plugin: Plugin): PluginContext {
    return {
      registerHook: (hookName, handler) => {
        this.registerHook(plugin.id, hookName, handler);
      },
      getConfig: () => plugin.config || {},
      setConfig: async (config) => {
        await storage.updatePlugin(plugin.id, { config });
        plugin.config = config;
      },
      log: {
        info: (message) => console.log(`[${plugin.name}] ${message}`),
        error: (message) => console.error(`[${plugin.name}] ${message}`),
        warn: (message) => console.warn(`[${plugin.name}] ${message}`),
      },
    };
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginRegistry = new PluginRegistry();
