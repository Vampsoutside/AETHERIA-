import { audio } from '@/lib/audio/engine';
import { QUEST_MAP } from '@/lib/quests';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { useUIStore } from '@/lib/store/useUIStore';

/**
 * Quest engine — the single entry point for awarding progression.
 *
 * Centralising this means a 3D raycast hit, a DOM click, or a terminal command
 * all resolve through identical side effects: store write → audio stinger →
 * celebration overlay → particle burst (the WebGL layer watches `corePulse`).
 */

export function completeQuest(id: string): boolean {
  const store = useQuestStore.getState();
  const quest = store.quests.find((q) => q.id === id);
  if (!quest || quest.isCompleted) return false;

  store.complete(id);

  const after = useQuestStore.getState();
  const done = after.quests.find((q) => q.id === id) ?? QUEST_MAP[id];
  const ui = useUIStore.getState();

  if (done.reward === 'Palette' && after.unlockedPalettes.includes('cyberpunk')) {
    // Immediately reskin the realm as the quest promises.
    after.setPalette('cyberpunk');
  }
  if (done.reward === 'Audio Log') after.unlockAudioLog();
  if (done.reward === 'Source Assets') after.unlockSourceAssets();

  audio.duck(0.08, 400);
  audio.play(done.grantsCore ? 'core' : 'quest');

  ui.celebrate({
    questId: done.id,
    title: done.title,
    reward: done.reward,
    rewardDetail: done.rewardDetail,
  });
  ui.pushToast({
    title: `${done.codename} · ${done.title}`,
    body: done.rewardDetail,
    tone: done.grantsCore ? 'core' : 'success',
    ttl: 5200,
  });

  return true;
}

/** Non-completion notification (hints, telemetry, unlocks). */
export function notify(title: string, body?: string, tone: 'info' | 'success' | 'warn' = 'info', ttl = 3600): void {
  useUIStore.getState().pushToast({ title, body, tone, ttl });
}

/** Register that the Explorer has entered a region. */
export function visitRegion(path: string): void {
  useQuestStore.getState().markVisited(path);
}

export function isQuestDone(id: string): boolean {
  return !!useQuestStore.getState().quests.find((q) => q.id === id)?.isCompleted;
}

/**
 * Q-03 tracks accumulated drag rotation across the whole session, so the
 * Inspector can call this on every pointer-move delta.
 */
let lastRotationMilestone = -1;

export function registerInspectorRotation(deltaDegrees: number): void {
  const store = useQuestStore.getState();
  if (store.quests.find((q) => q.id === 'artifact-inspector')?.isCompleted) return;
  store.addRotation(deltaDegrees);
  const pct = Math.round(useQuestStore.getState().rotationAccum);
  if (pct > 0 && pct % 90 === 0 && pct !== lastRotationMilestone) {
    lastRotationMilestone = pct;
    audio.blip(660 + pct * 2, 90, 'sine', 0.05);
  }
}
