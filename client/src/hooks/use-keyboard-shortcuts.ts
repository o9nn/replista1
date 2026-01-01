
import { useEffect } from 'react';

type ModifierKey = 'ctrl' | 'shift' | 'alt' | 'meta' | 'mod';

interface KeyboardShortcutMap {
  [shortcut: string]: (e: KeyboardEvent) => void;
}

function parseShortcut(shortcut: string): {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
} {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  
  const modifiers = parts.slice(0, -1);
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return {
    key,
    ctrl: modifiers.includes('ctrl') || (modifiers.includes('mod') && !isMac),
    shift: modifiers.includes('shift'),
    alt: modifiers.includes('alt'),
    meta: modifiers.includes('meta') || (modifiers.includes('mod') && isMac),
  };
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcutMap = {}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const [shortcut, handler] of Object.entries(shortcuts)) {
        const parsed = parseShortcut(shortcut);
        
        const ctrlMatch = parsed.ctrl === (e.ctrlKey || (!parsed.meta && e.metaKey));
        const shiftMatch = parsed.shift === e.shiftKey;
        const altMatch = parsed.alt === e.altKey;
        const metaMatch = parsed.meta === e.metaKey;
        const keyMatch = parsed.key === e.key.toLowerCase() || parsed.key === e.code.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          handler(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return { shortcuts };
}

// Legacy interface support
export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  category?: string;
}
