/**
 * AETHERIA — Side Quest definitions (spec §5).
 *
 * Quest state lives in `useQuestStore` and is persisted to localStorage, so an
 * Explorer who closes the tab keeps every Aether Core they recovered.
 */

export type QuestReward = 'Aether Core' | 'Secret Shader' | 'Badge' | 'Palette' | 'Audio Log' | 'Source Assets';

export type QuestLocation = '/' | '/playground' | '/vault' | '/codex';

export interface Quest {
  id: string;
  title: string;
  codename: string;
  description: string;
  objective: string;
  hint: string;
  location: QuestLocation;
  reward: QuestReward;
  rewardDetail: string;
  /** 0..1 sub-progress for multi-step quests (e.g. rotating an artifact 360°) */
  steps?: number;
  /** Awards an Aether Core toward the Citadel power grid */
  grantsCore: boolean;
  isCompleted: boolean;
}

export const TOTAL_CORES = 5;

const q = (partial: Omit<Quest, 'isCompleted'>): Quest => ({ ...partial, isCompleted: false });

export const QUESTS: Quest[] = [
  q({
    id: 'hidden-frequency',
    codename: 'Q-01',
    title: 'The Hidden Frequency',
    description:
      'The monolith at the Gate of Origin is humming on a channel nobody has decoded. A single glyph on its surface still answers to touch.',
    objective: 'Find the hidden energy node on the floating monolith and click its secret symbol.',
    hint: 'Orbit the monolith. One facet pulses out of phase with the others — it is warm to the pointer.',
    location: '/',
    reward: 'Palette',
    rewardDetail: 'Unlocks Cyberpunk Neon colour mode across the entire website.',
    grantsCore: true,
  }),
  q({
    id: 'quantum-calibration',
    codename: 'Q-02',
    title: 'Quantum Calibration',
    description:
      'The Crucible shader lattice drifted out of resonance during the fracture. It wants to sing at the frequency of the old grid.',
    objective: 'Adjust the shader sandbox FREQUENCY slider until it locks to exactly 432 Hz.',
    hint: '432. Watch the emission ring — it flares when you cross the resonance window.',
    location: '/playground',
    reward: 'Aether Core',
    rewardDetail: 'Earns Aether Core #2 and plays an ambient harmonic melody.',
    grantsCore: true,
  }),
  q({
    id: 'artifact-inspector',
    codename: 'Q-03',
    title: 'Artifact Inspector',
    description:
      'Every artifact in the Archive carries a sealed developer commentary. The seal only breaks for an Explorer who truly looks at the object.',
    objective: 'Rotate any 3D artifact a full 360° inside the Inspector view.',
    hint: 'Open an artifact, then drag it all the way around. The seal tracks your accumulated rotation.',
    location: '/vault',
    reward: 'Audio Log',
    rewardDetail: 'Unlocks the hidden developer commentary audio log.',
    steps: 360,
    grantsCore: true,
  }),
  q({
    id: 'terminal-override',
    codename: 'Q-04',
    title: 'Terminal Override',
    description:
      'A code block inside the Citadel archive is glitching — it is executing something it was never meant to. The console beneath it is still live.',
    objective: 'Locate the corrupted code block and type `aetheria --unlock` into the mini-HUD terminal.',
    hint: 'Look for the article section where the syntax highlighting is bleeding. The terminal is inline, just below it.',
    location: '/codex',
    reward: 'Source Assets',
    rewardDetail: 'Unlocks downloadable source code assets.',
    grantsCore: true,
  }),
  q({
    id: 'full-sweep',
    codename: 'Q-05',
    title: 'Full Spectrum Sweep',
    description:
      'The Citadel power grid reports one remaining core, buried in the telemetry of an Explorer who has seen every region of the archipelago.',
    objective: 'Visit all four regions of the archipelago and complete the four primary side quests.',
    hint: 'Arrival, Crucible, Archive, Citadel. The grid rewards thoroughness.',
    location: '/',
    reward: 'Badge',
    rewardDetail: 'Awards the ARCHITECT badge and the final Aether Core.',
    grantsCore: true,
  }),
];

export const QUEST_MAP: Record<string, Quest> = Object.fromEntries(QUESTS.map((x) => [x.id, x]));

export const questAt = (location: QuestLocation) => QUESTS.filter((x) => x.location === location);

/** Copy for the celebratory overlay fired when a core is recovered. */
export const CORE_RECOVERY_LINES = [
  'AETHER CORE STABILISED',
  'GRID SEGMENT RE-ENERGISED',
  'RESONANCE LOCKED AT 432Hz',
  'CITADEL POWER RESTORED +20%',
  'THE ARCHIPELAGO REMEMBERS YOU',
];
