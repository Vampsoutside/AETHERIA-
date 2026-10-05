import { create } from 'zustand';

/**
 * Ephemeral UI state: cursor physics, toasts, celebration overlays, the
 * inline terminal, and the Vault inspector. Nothing here is persisted.
 */

export type CursorVariant = 'default' | 'drag' | 'inspect' | 'enter' | 'text' | 'hidden';

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: 'info' | 'success' | 'core' | 'warn';
  ttl: number;
}

export interface Celebration {
  questId: string;
  title: string;
  reward: string;
  rewardDetail: string;
  nonce: number;
}

export interface UIState {
  mounted: boolean;
  booted: boolean;
  cursor: { variant: CursorVariant; label: string; active: boolean; down: boolean };
  toasts: Toast[];
  celebration: Celebration | null;
  questLogOpen: boolean;
  settingsOpen: boolean;
  audioEnabled: boolean;
  audioReady: boolean;
  /** Route-transition dissolve state, read by the WebGL layer */
  transition: { active: boolean; progress: number; nonce: number };
  activeArtifactId: string | null;
  terminalOpen: boolean;
  hoveredNode: string | null;
  fps: number;

  setMounted: (v: boolean) => void;
  setBooted: (v: boolean) => void;
  setCursor: (patch: Partial<UIState['cursor']>) => void;
  pushToast: (t: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => void;
  dismissToast: (id: string) => void;
  celebrate: (c: Omit<Celebration, 'nonce'>) => void;
  clearCelebration: () => void;
  setQuestLogOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setAudioEnabled: (v: boolean) => void;
  setAudioReady: (v: boolean) => void;
  setTransition: (patch: Partial<UIState['transition']>) => void;
  setActiveArtifact: (id: string | null) => void;
  setTerminalOpen: (v: boolean) => void;
  setHoveredNode: (id: string | null) => void;
  setFps: (v: number) => void;
}

let toastSeq = 0;
let celebSeq = 0;

export const useUIStore = create<UIState>()((set, get) => ({
  mounted: false,
  booted: false,
  cursor: { variant: 'default', label: '', active: false, down: false },
  toasts: [],
  celebration: null,
  questLogOpen: false,
  settingsOpen: false,
  audioEnabled: false,
  audioReady: false,
  transition: { active: false, progress: 0, nonce: 0 },
  activeArtifactId: null,
  terminalOpen: false,
  hoveredNode: null,
  fps: 60,

  setMounted: (v) => set({ mounted: v }),
  setBooted: (v) => set({ booted: v }),

  setCursor: (patch) => set({ cursor: { ...get().cursor, ...patch } }),

  pushToast: (t) => {
    const id = `t${++toastSeq}`;
    const toast: Toast = { id, ttl: 4200, ...t };
    set({ toasts: [...get().toasts.slice(-3), toast] });
    if (toast.ttl > 0) setTimeout(() => get().dismissToast(id), toast.ttl);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  celebrate: (c) => set({ celebration: { ...c, nonce: ++celebSeq } }),
  clearCelebration: () => set({ celebration: null }),

  setQuestLogOpen: (v) => set({ questLogOpen: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setAudioEnabled: (v) => set({ audioEnabled: v }),
  setAudioReady: (v) => set({ audioReady: v }),
  setTransition: (patch) => set({ transition: { ...get().transition, ...patch } }),
  setActiveArtifact: (id) => set({ activeArtifactId: id }),
  setTerminalOpen: (v) => set({ terminalOpen: v }),
  setHoveredNode: (id) => set({ hoveredNode: id }),
  setFps: (v) => set({ fps: v }),
}));

export const selectCursor = (s: UIState) => s.cursor;
