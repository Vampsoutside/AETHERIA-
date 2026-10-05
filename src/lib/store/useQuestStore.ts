import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { QUESTS, TOTAL_CORES, type Quest } from '@/lib/quests';
import { DEFAULT_PALETTE, ROUTES, type PaletteId } from '@/lib/tokens';

/**
 * Quest / inventory / progression store (spec §5).
 * Persisted to localStorage so an Explorer's Aether Cores survive a reload.
 */

export interface QuestState {
  quests: Quest[];
  visited: Record<string, boolean>;
  /** Accumulated drag rotation in the Vault inspector (Q-03) */
  rotationAccum: number;
  unlockedPalettes: PaletteId[];
  activePalette: PaletteId;
  unlockedSourceAssets: boolean;
  unlockedAudioLog: boolean;
  badges: string[];
  /** Bumped every time a core is recovered so 3D layers can fire a burst */
  corePulse: number;
  hydrated: boolean;

  complete: (id: string) => void;
  addRotation: (degrees: number) => void;
  markVisited: (path: string) => void;
  unlockPalette: (id: PaletteId) => void;
  setPalette: (id: PaletteId) => void;
  unlockSourceAssets: () => void;
  unlockAudioLog: () => void;
  setHydrated: (v: boolean) => void;
  reset: () => void;
}

const initialQuests = () => QUESTS.map((q) => ({ ...q }));

const paths = ROUTES.map((r) => r.path);

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      quests: initialQuests(),
      visited: {},
      rotationAccum: 0,
      unlockedPalettes: [DEFAULT_PALETTE],
      activePalette: DEFAULT_PALETTE,
      unlockedSourceAssets: false,
      unlockedAudioLog: false,
      badges: [],
      corePulse: 0,
      hydrated: false,

      complete: (id) => {
        const { quests, visited, unlockedPalettes, unlockedSourceAssets, unlockedAudioLog } = get();
        const target = quests.find((q) => q.id === id);
        if (!target || target.isCompleted) return;

        let nextPalettes = unlockedPalettes;
        let nextSource = unlockedSourceAssets;
        let nextLog = unlockedAudioLog;
        const badges = [...get().badges];

        if (target.reward === 'Palette' && !nextPalettes.includes('cyberpunk')) {
          nextPalettes = [...nextPalettes, 'cyberpunk'];
        }
        if (target.reward === 'Source Assets') nextSource = true;
        if (target.reward === 'Audio Log') nextLog = true;
        if (target.reward === 'Badge' && !badges.includes('ARCHITECT')) badges.push('ARCHITECT');

        let next = quests.map((q) => (q.id === id ? { ...q, isCompleted: true } : q));

        // Q-05 auto-resolves once the Explorer has swept the whole archipelago.
        const allVisited = paths.every((p) => visited[p]);
        const primariesDone = next.filter((q) => q.id !== 'full-sweep' && q.isCompleted).length === next.length - 1;
        if (allVisited && primariesDone) {
          next = next.map((q) => (q.id === 'full-sweep' ? { ...q, isCompleted: true } : q));
          if (!badges.includes('ARCHITECT')) badges.push('ARCHITECT');
        }

        set({
          quests: next,
          unlockedPalettes: nextPalettes,
          unlockedSourceAssets: nextSource,
          unlockedAudioLog: nextLog,
          badges,
          corePulse: get().corePulse + 1,
        });
      },

      addRotation: (degrees) => {
        const { rotationAccum, quests } = get();
        const next = Math.min(360, rotationAccum + Math.abs(degrees));
        set({ rotationAccum: next });
        const inspector = quests.find((q) => q.id === 'artifact-inspector');
        if (next >= 360 && inspector && !inspector.isCompleted) get().complete('artifact-inspector');
      },

      markVisited: (path) => {
        const { visited, quests } = get();
        if (visited[path]) return;
        const nextVisited = { ...visited, [path]: true };
        set({ visited: nextVisited });

        const allVisited = paths.every((p) => nextVisited[p]);
        const primariesDone = quests.filter((q) => q.id !== 'full-sweep' && q.isCompleted).length === quests.length - 1;
        if (allVisited && primariesDone) {
          const sweep = quests.find((q) => q.id === 'full-sweep');
          if (sweep && !sweep.isCompleted) get().complete('full-sweep');
        }
      },

      unlockPalette: (id) => {
        if (get().unlockedPalettes.includes(id)) return;
        set({ unlockedPalettes: [...get().unlockedPalettes, id], activePalette: id });
      },

      setPalette: (id) => {
        if (!get().unlockedPalettes.includes(id)) return;
        set({ activePalette: id });
      },

      unlockSourceAssets: () => set({ unlockedSourceAssets: true }),
      unlockAudioLog: () => set({ unlockedAudioLog: true }),
      setHydrated: (v) => set({ hydrated: v }),

      reset: () =>
        set({
          quests: initialQuests(),
          visited: {},
          rotationAccum: 0,
          unlockedPalettes: [DEFAULT_PALETTE],
          activePalette: DEFAULT_PALETTE,
          unlockedSourceAssets: false,
          unlockedAudioLog: false,
          badges: [],
          corePulse: get().corePulse + 1,
        }),
    }),
    {
      name: 'aetheria.quest.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        quests: s.quests,
        visited: s.visited,
        rotationAccum: s.rotationAccum,
        unlockedPalettes: s.unlockedPalettes,
        activePalette: s.activePalette,
        unlockedSourceAssets: s.unlockedSourceAssets,
        unlockedAudioLog: s.unlockedAudioLog,
        badges: s.badges,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<QuestState>;
        // Reconcile stored quests against the shipped catalogue so new content
        // never gets lost to a stale localStorage snapshot.
        const stored = p.quests ?? [];
        const quests = QUESTS.map((def) => {
          const hit = stored.find((s) => s.id === def.id);
          return hit ? { ...def, isCompleted: !!hit.isCompleted } : { ...def };
        });
        return { ...current, ...p, quests } as QuestState;
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

/* ----------------------------- selectors ----------------------------- */

export const selectCoresFound = (s: QuestState) => s.quests.filter((q) => q.grantsCore && q.isCompleted).length;

export const selectCoreProgress = (s: QuestState) => selectCoresFound(s) / TOTAL_CORES;

export const selectCompletedCount = (s: QuestState) => s.quests.filter((q) => q.isCompleted).length;

export const selectQuestById = (id: string) => (s: QuestState) => s.quests.find((q) => q.id === id);

export const selectCyberpunkUnlocked = (s: QuestState) => s.unlockedPalettes.includes('cyberpunk');

export const TOTAL_CORES_CONST = TOTAL_CORES;
