'use client';

import { useState } from 'react';
import { Stimulus } from '@/lib/types';
import { LangCode } from '@/lib/i18n';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/backend';

interface StimulusProposal {
  title: string;
  content: string;
  type: string;
  reason: string;
}

interface StimulusFormProps {
  stimulus: Stimulus;
  onChange: (stimulus: Stimulus) => void;
  lang?: LangCode;
}

export function StimulusForm({ stimulus, onChange, lang = 'es' }: StimulusFormProps) {
  const [mode, setMode] = useState<'manual' | 'generator'>('manual');
  const [proposals, setProposals] = useState<StimulusProposal[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [noWiki, setNoWiki] = useState(false);

  const isEs = lang === 'es';

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    setNoWiki(false);
    try {
      const res = await fetch(`${API_BASE}/wiki/suggest-stimuli`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.status === 401) {
        setGenError(
          isEs
            ? 'Debes iniciar sesión para usar el generador.'
            : 'Please log in to use the generator.',
        );
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      if (!data.has_wiki) {
        setNoWiki(true);
        setProposals([]);
      } else if (!data.stimuli?.length) {
        setGenError(
          isEs
            ? 'No se pudieron generar sugerencias. Intenta de nuevo.'
            : 'Could not generate suggestions. Try again.',
        );
      } else {
        setProposals(data.stimuli);
      }
    } catch {
      setGenError(
        isEs ? 'Error al conectar con el servidor.' : 'Error connecting to the server.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const selectProposal = (p: StimulusProposal) => {
    onChange({ type: p.type || 'question', title: p.title, content: p.content });
    setMode('manual');
  };

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={mode === 'manual' ? 'neo-toggle-on px-4 py-2 text-sm' : 'neo-toggle-off px-4 py-2 text-sm'}
        >
          ✏️ {isEs ? 'Manual' : 'Manual'}
        </button>
        <button
          type="button"
          onClick={() => setMode('generator')}
          className={mode === 'generator' ? 'neo-toggle-on px-4 py-2 text-sm' : 'neo-toggle-off px-4 py-2 text-sm'}
        >
          ✨ {isEs ? 'Generar desde mi wiki' : 'Generate from my wiki'}
        </button>
      </div>

      {mode === 'manual' && (
        <>
          <div>
            <label className="neo-label" htmlFor="stimulus-title">
              {isEs ? 'Título' : 'Title'}{' '}
              <span className="font-normal normal-case tracking-normal text-[var(--muted)]">
                {isEs ? '(opcional)' : '(optional)'}
              </span>
            </label>
            <input
              id="stimulus-title"
              type="text"
              value={stimulus.title || ''}
              onChange={(e) => onChange({ ...stimulus, title: e.target.value })}
              placeholder={isEs ? 'Ej. ¿Qué es la justicia?' : 'E.g. What is justice?'}
              className="neo-input px-4 py-2.5"
            />
          </div>

          <div>
            <label className="neo-label" htmlFor="stimulus-content">
              {isEs ? 'Pregunta o escenario' : 'Question or scenario'}
            </label>
            <textarea
              id="stimulus-content"
              value={stimulus.content}
              onChange={(e) => onChange({ ...stimulus, content: e.target.value })}
              placeholder={
                isEs
                  ? 'Escribe aquí tu pregunta o situación de partida…'
                  : 'Write your question or starting scenario here…'
              }
              rows={4}
              className="neo-input px-4 py-3 resize-none"
            />
          </div>
        </>
      )}

      {mode === 'generator' && (
        <div className="space-y-3">
          {noWiki && (
            <div className="rounded border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {isEs
                ? 'Todavía no tienes wiki filosófico. Completa algunas conversaciones para que el generador pueda crear estímulos personalizados.'
                : 'You don't have a philosophical wiki yet. Complete some conversations so the generator can create personalised stimuli.'}
            </div>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="neo-btn px-4 py-2 text-sm disabled:opacity-60"
          >
            {generating
              ? `⏳ ${isEs ? 'Generando…' : 'Generating…'}`
              : proposals.length > 0
                ? `🔄 ${isEs ? 'Generar de nuevo' : 'Regenerate'}`
                : `✨ ${isEs ? 'Generar ideas' : 'Generate ideas'}`}
          </button>

          {genError && (
            <p className="text-sm text-rose-600">{genError}</p>
          )}

          {generating && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="neo-card animate-pulse space-y-2 p-4"
                >
                  <div className="h-4 w-3/4 rounded bg-[var(--muted)] opacity-30" />
                  <div className="h-3 w-full rounded bg-[var(--muted)] opacity-20" />
                  <div className="h-3 w-5/6 rounded bg-[var(--muted)] opacity-20" />
                  <div className="h-3 w-2/3 rounded bg-[var(--muted)] opacity-20" />
                </div>
              ))}
            </div>
          )}

          {!generating && proposals.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {proposals.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectProposal(p)}
                  className="neo-card neo-card-hover p-4 text-left space-y-2"
                >
                  <p className="font-bold text-sm">{p.title}</p>
                  <p className="text-xs line-clamp-3 text-[var(--foreground)]">{p.content}</p>
                  <p className="text-xs italic text-[var(--muted)]">{p.reason}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

