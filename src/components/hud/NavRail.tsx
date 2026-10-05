'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ROUTES } from '@/lib/tokens';
import { cn } from '@/lib/utils';
import { audio } from '@/lib/audio/engine';
import { useUIStore } from '@/lib/store/useUIStore';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { AetheriaMark, MenuIcon, CloseIcon, QuestIcon, SlidersIcon, SoundOnIcon, SoundOffIcon } from '@/components/ui/icons';
import { CoreMeter } from './CoreMeter';

/**
 * The persistent HUD chrome (spec §2 — "2D HUD Layer").
 * Never animates during camera travel: it is the static peripheral anchor that
 * keeps depth motion comfortable (see Codex article 02, Rule 3).
 */
export function NavRail() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const audioEnabled = useUIStore((s) => s.audioEnabled);
  const setAudioEnabled = useUIStore((s) => s.setAudioEnabled);
  const setQuestLogOpen = useUIStore((s) => s.setQuestLogOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const mounted = useUIStore((s) => s.mounted);
  const completed = useQuestStore((s) => s.quests.filter((q) => q.isCompleted).length);
  const total = useQuestStore((s) => s.quests.length);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const toggleAudio = () => {
    if (audioEnabled) {
      audio.disable();
      setAudioEnabled(false);
    } else {
      audio.enable();
      setAudioEnabled(true);
      audio.play('click');
    }
  };

  const current = ROUTES.find((r) => r.path === pathname) ?? ROUTES[0];

  const navLink = (route: (typeof ROUTES)[number], vertical = false) => {
    const active = route.path === pathname;
    return (
      <Link
        key={route.path}
        href={route.path}
        data-cursor="enter"
        data-cursor-label={route.name}
        onMouseEnter={() => audio.play('hover')}
        className={cn(
          'group relative flex items-center gap-2.5 transition-colors duration-300',
          vertical ? 'w-full py-2.5' : 'px-3 py-1.5',
          active ? 'text-white' : 'text-slate-500 hover:text-slate-200',
        )}
      >
        <span
          className={cn(
            'font-mono text-2xs tabular-nums transition-colors',
            active ? 'text-aether' : 'text-slate-600 group-hover:text-slate-400',
          )}
        >
          {route.index}
        </span>
        <span className={cn('font-mono text-[0.66rem] uppercase tracking-[0.18em]', vertical && 'text-xs')}>
          {route.name}
        </span>
        <span
          className={cn(
            'absolute -bottom-0.5 left-0 h-px bg-aether transition-all duration-500 ease-out-expo',
            active ? 'w-full opacity-100 shadow-[0_0_8px_rgb(var(--accent))]' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-60',
          )}
        />
      </Link>
    );
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-[60] transition-all duration-500 ease-out-expo',
          scrolled ? 'py-2' : 'py-4',
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 transition-all duration-500 md:px-7',
          )}
        >
          {/* Identity */}
          <Link
            href="/"
            data-cursor="enter"
            data-cursor-label="Return to Gate"
            onMouseEnter={() => audio.play('hover')}
            className="group flex items-center gap-3"
          >
            <span className="relative text-aether transition-transform duration-700 ease-out-expo group-hover:rotate-180">
              <AetheriaMark size={26} />
              <span className="absolute inset-0 -z-10 rounded-full bg-aether/25 blur-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-sm font-extrabold tracking-[0.34em] text-white">AETHERIA</span>
              <span className="mt-1 font-mono text-2xs uppercase tracking-[0.22em] text-slate-600">
                {current.index} · {current.name}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Regions">
            {ROUTES.map((r) => navLink(r))}
          </nav>

          {/* Instruments */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <CoreMeter />
            </div>

            <button
              type="button"
              onClick={() => setQuestLogOpen(true)}
              data-cursor="inspect"
              data-cursor-label="Quest Log"
              aria-label="Open quest log"
              className="relative flex h-9 items-center gap-2 rounded-md border border-white/10 bg-black/35 px-2.5 text-slate-400 backdrop-blur-md transition-colors hover:border-aether/50 hover:text-aether sm:h-9"
            >
              <QuestIcon size={15} />
              <span className="readout hidden font-mono text-2xs tabular-nums sm:inline">
                {completed}/{total}
              </span>
              {completed < total && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-signal-gold shadow-[0_0_8px_rgba(255,196,107,0.9)]" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleAudio}
              data-cursor="enter"
              aria-label={audioEnabled ? 'Mute realm audio' : 'Enable realm audio'}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md border backdrop-blur-md transition-colors',
                audioEnabled
                  ? 'border-aether/45 bg-aether/10 text-aether'
                  : 'border-white/10 bg-black/35 text-slate-500 hover:text-slate-200',
              )}
            >
              {audioEnabled ? <SoundOnIcon size={15} /> : <SoundOffIcon size={15} />}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              data-cursor="enter"
              aria-label="Graphics and system settings"
              className="hidden h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/35 text-slate-500 backdrop-blur-md transition-colors hover:border-aether/50 hover:text-aether sm:flex"
            >
              <SlidersIcon size={15} />
            </button>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/35 text-slate-300 backdrop-blur-md transition-colors hover:border-aether/50 lg:hidden"
            >
              {open ? <CloseIcon size={16} /> : <MenuIcon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sheet */}
      <div
        className={cn(
          'fixed inset-x-0 top-[62px] z-[59] origin-top px-4 transition-all duration-500 ease-out-expo lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none -translate-y-3 opacity-0',
        )}
      >
        <div className="glass-strong hud-frame rounded-xl p-3">
          <nav className="flex flex-col divide-y divide-white/5" aria-label="Regions (mobile)">
            {ROUTES.map((r) => navLink(r, true))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
            <CoreMeter compact />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleAudio}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded border transition-colors',
                  audioEnabled ? 'border-aether/50 text-aether' : 'border-white/10 text-slate-500',
                )}
                aria-label="Toggle audio"
              >
                {audioEnabled ? <SoundOnIcon size={14} /> : <SoundOffIcon size={14} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                  setOpen(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded border border-white/10 text-slate-400"
                aria-label="Settings"
              >
                <SlidersIcon size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Screen-reader live region so quest progress is announced */}
      <p className="sr-only" aria-live="polite">
        {mounted ? `${completed} of ${total} side quests complete.` : 'Loading Aetheria.'}
      </p>
    </>
  );
}
