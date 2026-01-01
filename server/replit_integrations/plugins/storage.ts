
import { db } from '../../db';
import { plugins } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import type { Plugin } from './types';

export async function getAllPlugins(): Promise<Plugin[]> {
  return await db.select().from(plugins);
}

export async function getPlugin(id: string): Promise<Plugin | undefined> {
  const result = await db.select().from(plugins).where(eq(plugins.id, id));
  return result[0];
}

export async function createPlugin(plugin: Omit<Plugin, 'id'>): Promise<Plugin> {
  const newPlugin = {
    id: crypto.randomUUID(),
    ...plugin,
  };
  await db.insert(plugins).values(newPlugin);
  return newPlugin;
}

export async function updatePlugin(id: string, updates: Partial<Plugin>): Promise<void> {
  await db.update(plugins).set(updates).where(eq(plugins.id, id));
}

export async function deletePlugin(id: string): Promise<void> {
  await db.delete(plugins).where(eq(plugins.id, id));
}

export async function togglePlugin(id: string, enabled: boolean): Promise<void> {
  await db.update(plugins).set({ enabled }).where(eq(plugins.id, id));
}
