import { useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';
export type StartTab = 'all' | 'movie' | 'series' | 'favorites' | 'want' | 'lists';

export interface Settings {
  name: string;
  theme: Theme;
  showStats: boolean;
  rewatchDays: number; // how long before a favorite is suggested again
  sort: 'mine' | 'az' | 'genre'; // your drag order, A–Z with series grouped, or grouped by genre
  groupColors: boolean; // colour the A–Z groups
  sizeColors: string[]; // colour for a group of 1, 2, 3, 4, 5+ titles
  customColors: Record<string, string>; // colour picked for one group (by series key)
  accent: string; // main app colour; '' = theme default
  textSize: 'small' | 'medium' | 'large';
  compact: boolean; // hide descriptions in lists
  showPosters: boolean;
  startTab: StartTab; // tab shown when ARIA opens
  notifyReleases: boolean; // not wired up yet
  notifyRewatch: boolean; // not wired up yet
  allShareId?: string; // link code if the All list is shared
}

const KEY = 'aria.settings';
export const defaults: Settings = {
  name: '', theme: 'system', showStats: true, rewatchDays: 14, sort: 'mine',
  groupColors: true, sizeColors: ['#8a7cf0', '#3b82f6', '#ef4444', '#22c55e', '#f59e0b'], customColors: {},
  accent: '', textSize: 'medium', compact: false, showPosters: true, startTab: 'all',
  notifyReleases: false, notifyRewatch: false,
};

export const ACCENTS = ['#8a7cf0', '#3b82f6', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

export const SIZE_LABELS = ['Single', '2 titles', '3 titles', '4 titles', '5 or more'];

// A group's colour: the one picked for it, else the one for its size.
export function groupColor(settings: Settings, key: string, size: number): string {
  return settings.customColors[key] ?? settings.sizeColors[Math.min(size, 5) - 1] ?? defaults.sizeColors[0];
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {}
    const root = document.documentElement;
    if (settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = settings.theme;
    if (settings.accent) root.style.setProperty('--accent', settings.accent);
    else root.style.removeProperty('--accent');
    root.style.zoom = String({ small: 0.9, medium: 1, large: 1.12 }[settings.textSize]);
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  return { settings, update, replace: (s: Partial<Settings>) => setSettings({ ...defaults, ...s }) };
}
