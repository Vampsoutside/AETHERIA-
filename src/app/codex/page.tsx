'use client';

/**
 * The Citadel — long-form articles with inline terminal (spec §4, Page 4).
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { NavRail } from '@/components/hud/NavRail';
import { ToastStack } from '@/components/hud/ToastStack';
import { CelebrationOverlay } from '@/components/hud/CelebrationOverlay';
import { MagneticCursor } from '@/components/hud/MagneticCursor';
import { Panel } from '@/components/ui/panel';
import { useLenisScroll } from '@/hooks/useLenisScroll';
import { usePaletteSync } from '@/hooks/usePaletteSync';
import { useReveals } from '@/hooks/useReveals';
import { useFpsBridge, useTierDetection } from '@/hooks/useTierDetection';
import { useUIStore } from '@/lib/store/useUIStore';
import { useQuestStore } from '@/lib/store/useQuestStore';
import { audio } from '@/lib/audio/engine';
import { isQuestDone, completeQuest } from '@/lib/questEngine';
import { ARTICLES, ARTICLE_MAP, TERMINAL_PASSWORD, TERMINAL_BOOT_LINES } from '@/lib/content/articles';
import { ROUTES } from '@/lib/tokens';

/** WebGL is client-only and heavy — never ship it in the SSR pass. */
const CodexScene = dynamic(() => import('@/components/three/CodexScene').then((m) => m.CodexScene), {
  ssr: false,
  loading: () => <div className="fixed inset-0 -z-10 bg-void-900" />,
});

const CHAPTERS = 4;

export default function CodexPage() {
  useTierDetection();
  usePaletteSync();
  useReveals();
  useFpsBridge();
  useLenisScroll(CHAPTERS);

  const setMounted = useUIStore((s) => s.setMounted);
  const booted = useUIStore((s) => s.booted);
  const markVisited = useQuestStore((s) => s.markVisited);
  const setTerminalOpen = useUIStore((s) => s.setTerminalOpen);
  const terminalOpen = useUIStore((s) => s.terminalOpen);

  useEffect(() => {
    setMounted(true);
    markVisited('/codex');
    audio.arm((enabled) => useUIStore.getState().setAudioEnabled(enabled));
    audio.init();
    return () => setMounted(false);
  }, [setMounted, markVisited]);

  return (
    <>
      {/* WebGL backdrop — fixed, content scrolls above it */}
      <div className="pointer-events-auto fixed inset-0 -z-10">
        <CodexScene />
      </div>

      {/* Boot veil */}
      <div
        className={
          booted
            ? 'pointer-events-none fixed inset-0 z-[70] opacity-0 transition-opacity duration-1000'
            : 'fixed inset-0 z-[70]'
        }
        style={{ background: 'rgb(var(--bg))' }}
        aria-hidden
      />

      <MagneticCursor />
      <NavRail />
      <ToastStack />
      <CelebrationOverlay />

      <main className="relative z-10">
        <Hero />
        <Chapters />
        <Footer />
      </main>

      {/* Inline terminal for Q-04 */}
      {terminalOpen && (
        <Terminal
          onClose={() => setTerminalOpen(false)}
          onSubmit={handleTerminalSubmit}
        />
      )}
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center px-5">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-2xs uppercase tracking-[0.42em] text-aether/70" data-reveal>
          04 · Citadel of Knowledge
        </p>

        <h1
          className="mt-6 text-[clamp(2.6rem,9vw,6.2rem)] leading-[0.94] text-white"
          data-reveal
          data-reveal-anim="scale"
        >
          THE CITADEL
        </h1>

        <p
          className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-400"
          data-reveal
        >
          Four long-form articles, a floating glyph field, and a live terminal. One code block is glitching —
          the console beneath it is still live. Type <code className="font-mono text-aether">aetheria --unlock</code> to proceed.
        </p>

        <p className="mt-14 font-mono text-2xs uppercase tracking-[0.3em] text-slate-600" data-reveal>
          Scroll to travel
        </p>
      </div>
    </section>
  );
}

function renderBlocks(blocks: typeof ARTICLES[number]['blocks']) {
  return blocks.map((block, i) => {
    switch (block.kind) {
      case 'h2':
        return <h2 key={i} className="text-2xl md:text-3xl font-display mt-8 mb-4">{block.text}</h2>;
      case 'h3':
        return <h3 key={i} className="text-xl font-semibold mt-6 mb-3">{block.text}</h3>;
      case 'p':
        return <p key={i} className="text-sm leading-relaxed text-slate-400 mb-4">{block.text}</p>;
      case 'code':
        return (
          <div key={i} className="relative my-4">
            {block.title && <p className="font-mono text-2xs text-slate-500 mb-1">{block.title}</p>}
            <pre className="glass-strong rounded-lg p-4 font-mono text-2xs text-slate-300 overflow-x-auto">
              <code>{block.code}</code>
            </pre>
          </div>
        );
      case 'glitch':
        return (
          <div key={i} className="relative my-4 border-aether/50 border-2 rounded-lg animate-glitch-border">
            <div className="bg-aether/10 px-3 py-1 font-mono text-2xs text-aether">{block.title}</div>
            <pre className="p-4 font-mono text-2xs text-slate-300 overflow-x-auto">
              <code className="text-red-400">{block.code}</code>
            </pre>
            <p className="px-4 pb-4 font-mono text-2xs text-slate-500 italic">{block.note}</p>
          </div>
        );
      case 'callout':
        const toneColors = {
          info: 'text-aether border-aether/30',
          warn: 'text-signal-gold border-signal-gold/30',
          insight: 'text-signal-mint border-signal-mint/30',
        };
        return (
          <div key={i} className={`glass-strong rounded-lg p-4 border-l-4 my-4 ${toneColors[block.tone]}`}>
            <p className="font-mono text-2xs uppercase tracking-[0.15em] mb-1">{block.title}</p>
            <p className="text-sm leading-relaxed text-slate-400">{block.text}</p>
          </div>
        );
      case 'list':
        return (
          <ul key={i} className="space-y-2 ml-4 my-4 list-disc text-sm leading-relaxed text-slate-400">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        );
      case 'quote':
        return (
          <blockquote key={i} className="border-l-4 border-aether/50 pl-4 my-6 italic text-slate-400">
            <p className="text-sm leading-relaxed">"{block.text}"</p>
            <footer className="mt-2 font-mono text-2xs text-slate-500">\u2014 {block.cite}</footer>
          </blockquote>
        );
      case 'visualizer':
        return (
          <div key={i} className="my-8 text-center">
            <div className="glass-strong hud-frame rounded-xl p-8 aspect-square flex items-center justify-center">
              <span className="font-mono text-2xs text-slate-500">
                [Visualizer: {block.id} \u2014 {block.caption}]
              </span>
            </div>
          </div>
        );
      case 'table':
        return (
          <div key={i} className="overflow-x-auto my-6">
            <table className="min-w-full font-mono text-2xs">
              <thead>
                <tr className="border-b border-white/10">
                  {block.head.map((h, j) => (
                    <th key={j} className="text-left p-3 text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, j) => (
                  <tr key={j} className="border-b border-white/5">
                    {row.map((cell, k) => (
                      <td key={k} className="p-3 text-slate-400">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  });
}

function ArticleSection({ article }: { article: typeof ARTICLES[number] }) {
  const isGlitching = article.id === 'glsl-domain-warp';

  return (
    <section className="relative mx-auto max-w-3xl px-5 py-20" data-reveal>
      <div
        className={`glass-strong hud-frame rounded-2xl p-8 md:p-12 ${
          isGlitching ? 'border-aether/50 animate-glitch-border relative' : ''
        }`}
      >
        {isGlitching && (
          <div className="absolute inset-0 -z-10 rounded-2xl border-2 border-aether/30 blur-[2px] animate-pulse" />
        )}

        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="font-mono text-2xs uppercase tracking-[0.22em] text-aether/70">{article.index}</p>
          <p className="font-mono text-2xs text-slate-500">{article.kicker}</p>
        </div>

        <h2 className="text-3xl md:text-4xl font-display mb-4">{article.title}</h2>

        <p className="text-sm leading-relaxed text-slate-400 mb-6">{article.dek}</p>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
          <span>By {article.author}</span>
          <span>·</span>
          <span>{article.role}</span>
          <span>·</span>
          <time dateTime={article.date}>{article.date}</time>
          <span>·</span>
          <span>{article.readMins} min read</span>
          <span>·</span>
          <span>Difficulty: {article.difficulty}</span>
        </div>

        <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-400">
          {renderBlocks(article.blocks)}
        </div>

        {isGlitching && (
          <div className="mt-8 relative">
            <p className="font-mono text-2xs text-slate-500 mb-2">INLINE TERMINAL DETECTED</p>
            <div className="glass-strong rounded-lg p-4 font-mono text-2xs" style={{ background: 'rgb(5 5 8 / 0.9)' }}>
              <div className="mb-2 text-slate-500">{'\u003e'} BOOTING SUBSYSTEM...</div>
              <div className="mb-2 text-slate-500">{'\u003e'} CHECKING INTEGRITY...</div>
              <div className="mb-2 text-aether animate-pulse">{'\u003e'} WARNING: CODE BLOCK CORRUPTION DETECTED</div>
              <div className="mb-2 text-slate-500">{'\u003e'} TERMINAL ACCESS: AVAILABLE</div>
              <div className="mt-4 text-slate-600">
                Type <span className="text-aether">{TERMINAL_PASSWORD}</span> to override
              </div>
            </div>
            <button
              onClick={() => useUIStore.getState().setTerminalOpen(true)}
              className="mt-4 hud-frame glass-strong px-4 py-2 font-mono text-2xs uppercase tracking-[0.2em] text-aether hover:bg-aether/10 transition-colors"
            >
              Open Terminal
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Chapters() {
  return (
    <div className="relative mx-auto max-w-3xl px-5 pb-32">
      {ARTICLES.map((article, i) => (
        <ArticleSection key={article.id} article={article} />
      ))}

      <section className="flex min-h-[85svh] items-center py-20" data-reveal>
        <div className="glass-strong hud-frame w-full rounded-2xl p-8 md:p-12">
          <p className="font-mono text-2xs uppercase tracking-[0.34em] text-aether/60">IV</p>
          <h2 className="mt-4 text-3xl md:text-4xl">The Override</h2>
          <p className="mt-5 text-sm leading-relaxed text-slate-400 md:text-base">
            One article in this archive is executing code it was never meant to. The terminal beneath it is live.
            The password is known to those who have read the transcripts.
          </p>
          <p className="mt-8 font-mono text-2xs tabular-nums text-slate-600">
            CHAPTER 04 / {String(CHAPTERS).padStart(2, '0')}
          </p>
        </div>
      </section>
    </div>
  );
}

interface TerminalProps {
  onClose: () => void;
  onSubmit: (cmd: string) => void;
}

function Terminal({ onClose, onSubmit }: TerminalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([...TERMINAL_BOOT_LINES]);
  const [input, setInput] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (input.trim()) {
        onSubmit(input.trim());
        setHistory((h) => [...h, `> ${input.trim()}`]);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <Panel className="w-full max-w-2xl max-h-[70vh] flex flex-col" style={{ borderColor: 'rgb(var(--accent))' }}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <span className="font-mono text-2xs text-slate-500">aetheria-shell.v1</span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Close terminal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-2xs text-slate-400 space-y-1">
          {history.map((line, i) => (
            <div key={i} className={line.startsWith('>') ? 'text-aether' : ''} dangerouslySetInnerHTML={{ __html: line }} />
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <span className="text-aether text-glow">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none font-mono text-2xs text-white caret-aether"
            placeholder="Type command..."
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </Panel>
    </div>
  );
}

function handleTerminalSubmit(cmd: string) {
  const normalized = cmd.trim().toLowerCase();
  if (normalized === TERMINAL_PASSWORD.toLowerCase() && !isQuestDone('terminal-override')) {
    completeQuest('terminal-override');
  }
}

function Footer() {
  return (
    <footer className="relative border-t border-white/5 px-5 py-14">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-2xs uppercase tracking-[0.3em] text-slate-600">
          {ROUTES.length} regions · recover 5 cores
        </p>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          {ARTICLES.length} articles in the Citadel. The terminal remembers. Clearing site data resets the archives.
        </p>
      </div>
    </footer>
  );
}