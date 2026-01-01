
import { Router } from 'express';
import * as storage from './storage';
import { pluginRegistry } from './registry';

const router = Router();

router.get('/plugins', async (req, res) => {
  try {
    const plugins = await storage.getAllPlugins();
    res.json(plugins);
  } catch (error: any) {
    console.error('Failed to get plugins:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/plugins/:id', async (req, res) => {
  try {
    const plugin = await storage.getPlugin(req.params.id);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    res.json(plugin);
  } catch (error: any) {
    console.error('Failed to get plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/plugins', async (req, res) => {
  try {
    const plugin = await storage.createPlugin(req.body);
    if (req.body.enabled) {
      await pluginRegistry.loadPlugin(plugin);
    }
    res.json(plugin);
  } catch (error: any) {
    console.error('Failed to create plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/plugins/:id', async (req, res) => {
  try {
    const plugin = await storage.getPlugin(req.params.id);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    await storage.updatePlugin(req.params.id, req.body);
    
    // Reload plugin if it's enabled
    if (req.body.enabled !== undefined) {
      if (req.body.enabled) {
        const updatedPlugin = await storage.getPlugin(req.params.id);
        if (updatedPlugin) {
          await pluginRegistry.loadPlugin(updatedPlugin);
        }
      } else {
        await pluginRegistry.unloadPlugin(req.params.id);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/plugins/:id', async (req, res) => {
  try {
    await pluginRegistry.unloadPlugin(req.params.id);
    await storage.deletePlugin(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/plugins/:id/toggle', async (req, res) => {
  try {
    const plugin = await storage.getPlugin(req.params.id);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    const enabled = !plugin.enabled;
    await storage.togglePlugin(req.params.id, enabled);

    if (enabled) {
      const updatedPlugin = await storage.getPlugin(req.params.id);
      if (updatedPlugin) {
        await pluginRegistry.loadPlugin(updatedPlugin);
      }
    } else {
      await pluginRegistry.unloadPlugin(req.params.id);
    }

    res.json({ enabled });
  } catch (error: any) {
    console.error('Failed to toggle plugin:', error);
    res.status(500).json({ error: error.message });
  }
});

export function registerPluginRoutes() {
  return router;
}
