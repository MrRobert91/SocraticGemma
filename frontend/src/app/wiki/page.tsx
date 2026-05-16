'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeMouseHandler,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWikiGraph, useWikiPage, useWikiStatus } from '@/hooks/useWiki';
import { WikiNode } from '@/lib/types';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Tooltip } from '@/components/Tooltip';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend';

// ─── Category colours + legend tooltips ───────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  topic:   { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a5f' },
  stream:  { bg: '#ede9fe', border: '#7c3aed', text: '#2e1065' },
  reading: { bg: '#fee2e2', border: '#dc2626', text: '#7f1d1d' },
  profile: { bg: '#fef9c3', border: '#ca8a04', text: '#713f12' },
};

const CATEGORY_LABELS: Record<string, string> = {
  topic:   'Tema filosófico que has explorado en tus conversaciones',
  stream:  'Corriente filosófica (utilitarismo, estoicismo…) relacionada con tus ideas',
  reading: 'Libro o ensayo recomendado por tu perfil',
  profile: 'Tu perfil filosófico global, síntesis de todas tus sesiones',
};

// ─── Resizable panel constants ────────────────────────────────────────────────

const PANEL_WIDTH_KEY = 'wiki-panel-width';
const PANEL_MIN_WIDTH = 280;
const PANEL_DEFAULT_WIDTH = 360;

function readStoredPanelWidth(): number {
  if (typeof window === 'undefined') return PANEL_DEFAULT_WIDTH;
  const raw = window.localStorage.getItem(PANEL_WIDTH_KEY);
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return PANEL_DEFAULT_WIDTH;
  return Math.max(PANEL_MIN_WIDTH, Math.min(n, window.innerWidth * 0.75));
}

function stripFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\s*/m, '').trim();
}

// ─── Custom node ──────────────────────────────────────────────────────────────

function WikiNodeComponent({ data }: { data: WikiNode & { selected: boolean } }) {
  const colors = CATEGORY_COLORS[data.category] ?? CATEGORY_COLORS.topic;
  const isProfile = data.category === 'profile';
  // Profile is the user's central hub: always larger, with an icon, so it
  // stands out even when the other nodes are small (session_count==0 cases).
  const size = isProfile ? 88 : Math.max(36, 36 + data.session_count * 8);
  // Hidden handles are required so React Flow can anchor edges to this custom
  // node. Without them the canvas renders nodes but the edges have nowhere
  // to attach, so they disappear visually.
  const handleStyle = {
    opacity: 0,
    width: 1,
    height: 1,
    background: 'transparent',
    border: 'none',
    pointerEvents: 'none' as const,
  };
  return (
    <Tooltip content={data.title} side="top">
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: colors.bg,
          border: `${isProfile ? 3 : 2.5}px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: data.selected
            ? `0 0 0 3px ${colors.border}`
            : isProfile
              ? '4px 4px 0 0 #222'
              : '2px 2px 0 0 #222',
          transition: 'box-shadow 0.1s',
          position: 'relative',
          gap: isProfile ? 2 : 0,
        }}
      >
        <Handle type="target" position={Position.Top} style={handleStyle} isConnectable={false} />
        <Handle type="source" position={Position.Bottom} style={handleStyle} isConnectable={false} />
        {isProfile && (
          <span style={{ fontSize: 26, lineHeight: 1 }} aria-hidden="true">🧠</span>
        )}
        <span
          style={{
            fontSize: isProfile ? 10 : Math.max(9, Math.min(12, size / 4)),
            fontWeight: 700,
            color: colors.text,
            textAlign: 'center',
            lineHeight: 1.1,
            padding: isProfile ? '0 4px' : '2px 4px',
            maxWidth: size - 8,
            overflow: 'hidden',
            wordBreak: 'break-word',
            display: 'block',
          }}
        >
          {isProfile
            ? 'Perfil'
            : data.title.length > 12
              ? data.title.slice(0, 11) + '…'
              : data.title}
        </span>
      </div>
    </Tooltip>
  );
}

const nodeTypes = { wiki: WikiNodeComponent };

// ─── Side panel ───────────────────────────────────────────────────────────────

interface SlidePanelProps {
  slug: string;
  width: number;
  onClose: () => void;
  onSelectSlug: (slug: string) => void;
  onWidthChange: (w: number) => void;
}

function SlidePanel({ slug, width, onClose, onSelectSlug, onWidthChange }: SlidePanelProps) {
  const { page, loading, error } = useWikiPage(slug);

  // Drag state lives in refs to avoid re-renders during the move.
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startW: width };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        // Pointer moves LEFT → panel grows (we anchor to right edge).
        const dx = dragRef.current.startX - ev.clientX;
        const max = window.innerWidth * 0.75;
        const next = Math.max(PANEL_MIN_WIDTH, Math.min(dragRef.current.startW + dx, max));
        onWidthChange(next);
      };

      const onUp = () => {
        dragRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        try {
          window.localStorage.setItem(PANEL_WIDTH_KEY, String(width));
        } catch {
          /* ignore quota / disabled storage */
        }
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [width, onWidthChange],
  );

  // Persist on every width change (the mouseup handler also does it, but
  // doing it here covers the case where the user closes the panel mid-drag).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PANEL_WIDTH_KEY, String(width));
    } catch {
      /* ignore */
    }
  }, [width]);

  return (
    <div
      className="absolute right-0 top-0 h-full bg-[var(--bg-card)] border-l-2 border-[var(--border)] overflow-y-auto z-20 flex flex-col"
      style={{ width, boxShadow: '-4px 0 0 0 var(--border)' }}
    >
      {/* Drag handle on the LEFT edge of the panel */}
      <Tooltip content="Arrastra para redimensionar" side="right">
        <div
          onMouseDown={onPointerDown}
          className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)] active:bg-[var(--accent-dark)] z-30 transition-colors"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar panel"
        />
      </Tooltip>

      <div className="flex items-center justify-between p-4 border-b-2 border-[var(--border)] sticky top-0 bg-[var(--bg-card)] z-10">
        <h3 className="font-black text-sm text-[var(--text)] truncate pr-2">
          {page?.title ?? slug}
        </h3>
        <button
          onClick={onClose}
          className="neo-btn-ghost text-lg px-2 py-0.5 leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="p-4 text-sm text-[var(--muted)] animate-pulse">Cargando…</div>
      )}
      {error && (
        <div className="p-4 text-sm text-rose-600">{error}</div>
      )}
      {page && (
        <div className="p-4 flex-1 flex flex-col gap-4">
          {/* Category badge */}
          <div className="flex gap-2 flex-wrap">
            <span className="neo-tag text-xs">{page.category}</span>
            {page.sessions.length > 0 && (
              <span className="neo-tag text-xs bg-[var(--accent-bg)]">
                {page.sessions.length} sesión{page.sessions.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>

          {/* Rendered markdown — wiki links swap the panel, sessions go full page */}
          <div className="bg-[var(--bg)] p-3 rounded border border-[var(--border)]">
            <MarkdownContent
              source={stripFrontmatter(page.content)}
              compact
              onWikiLinkClick={onSelectSlug}
            />
          </div>

          {/* Linked sessions */}
          {page.sessions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[var(--muted)] mb-2">CONVERSACIONES</p>
              <div className="flex flex-col gap-1">
                {page.sessions.map(sid => (
                  <Link
                    key={sid}
                    href={`/conversations/${sid}`}
                    className="text-xs text-[var(--accent)] underline truncate"
                  >
                    {sid.slice(0, 8)}…
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link
            href={`/wiki/${slug}`}
            className="neo-btn text-xs px-3 py-1.5 text-center mt-auto"
          >
            Ver página completa →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function layoutNodes(wikiNodes: WikiNode[]): Node[] {
  // The profile node sits in the centre as the hub; everyone else radiates
  // out so its many outgoing edges fan out instead of crossing the canvas.
  const profile = wikiNodes.find((n) => n.category === 'profile');
  const others = wikiNodes.filter((n) => n.category !== 'profile');
  const n = others.length;
  const radius = Math.max(220, n * 34);
  const cx = 400;
  const cy = 300;
  const PROFILE_SIZE = 88;
  const OTHER_SIZE_BASE = 36;

  const out: Node[] = [];
  if (profile) {
    out.push({
      id: profile.id,
      type: 'wiki',
      position: { x: cx - PROFILE_SIZE / 2, y: cy - PROFILE_SIZE / 2 },
      data: { ...profile, selected: false },
    });
  }
  others.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    const halfSize = (OTHER_SIZE_BASE + node.session_count * 8) / 2;
    out.push({
      id: node.id,
      type: 'wiki',
      position: {
        x: cx + radius * Math.cos(angle) - halfSize,
        y: cy + radius * Math.sin(angle) - halfSize,
      },
      data: { ...node, selected: false },
    });
  });
  return out;
}

// ─── Main page ────────────────────────────────────────────────────────────────

function WikiGraphInner() {
  const { graph, loading, error, refetch: refetchGraph } = useWikiGraph();
  const { status: wikiStatus, refetch: refetchStatus } = useWikiStatus();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState<number>(PANEL_DEFAULT_WIDTH);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null);

  // Hydrate panel width from localStorage after mount (SSR-safe).
  useEffect(() => {
    setPanelWidth(readStoredPanelWidth());
  }, []);

  const handleRebuild = useCallback(async () => {
    setRebuilding(true);
    setRebuildMsg(null);
    try {
      const res = await fetch(`${API_BASE}/wiki/rebuild`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRebuildMsg(
        `Regenerando wiki a partir de ${data.session_count ?? '?'} sesión(es). ` +
        `Esto puede tardar 1–3 minutos. Pulsa "Recargar" en un momento.`
      );
    } catch (e) {
      setRebuildMsg(
        'No se pudo iniciar la regeneración. ' +
        (e instanceof Error ? e.message : 'Error desconocido')
      );
    } finally {
      setRebuilding(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetchGraph();
    refetchStatus();
  }, [refetchGraph, refetchStatus]);

  // useNodesState only initialises once. Without the effect below the canvas
  // stays empty forever because the graph hook loads asynchronously and the
  // initial flowNodes/flowEdges are `[]`.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!graph) return;
    setNodes(layoutNodes(graph.nodes));
    setEdges(
      graph.edges.map(e => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: '#475569' },
        style: { stroke: '#475569', strokeWidth: 2 },
        label: e.relation !== 'related' ? e.relation : undefined,
        labelStyle: { fontSize: 9, fill: '#475569' },
      })),
    );
  }, [graph, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    setSelectedSlug((node.data as unknown as WikiNode).slug);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="bg-[var(--bg-card)] border-b-2 border-[var(--border)] sticky top-0 z-10"
        style={{ boxShadow: '0 4px 0 0 var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/conversations" className="neo-btn-ghost px-2 py-1 text-lg font-bold" aria-label="Volver">←</Link>
            <span className="text-2xl" aria-hidden="true">🗺️</span>
            <h1 className="text-xl font-black text-[var(--text)]">Tu wiki filosófico</h1>
          </div>
          <div className="flex gap-2 items-center">
            {/* Legend with per-category tooltip on hover (portal-based) */}
            <div className="hidden sm:flex gap-3 text-xs font-semibold mr-2">
              {Object.entries(CATEGORY_COLORS).map(([cat, c]) => (
                <Tooltip
                  key={cat}
                  content={CATEGORY_LABELS[cat] ?? ''}
                  side="bottom"
                  className="flex items-center gap-1 cursor-help"
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: c.bg,
                      border: `1.5px solid ${c.border}`,
                      display: 'inline-block',
                    }}
                  />
                  {cat}
                </Tooltip>
              ))}
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'}/wiki/export`}
              download="wiki.zip"
              className="neo-btn-ghost px-3 py-1.5 text-xs"
            >
              ⬇ Exportar ZIP
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {loading && (
          <div className="flex items-center justify-center h-96 text-[var(--muted)] font-semibold">
            Cargando grafo…
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-96 text-rose-600 font-semibold">
            {error}
          </div>
        )}
        {!loading && !error && graph && graph.nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 gap-4 text-[var(--muted)] max-w-xl mx-auto text-center px-4">
            {wikiStatus && wikiStatus.session_count === 0 ? (
              <>
                <span className="text-5xl">📭</span>
                <p className="font-bold text-lg">Tu wiki está vacío</p>
                <p className="text-sm">
                  Completa una sesión socrática y genera el informe filosófico para empezar a construir tu grafo de conocimiento.
                </p>
              </>
            ) : (
              <>
                <span className="text-5xl">⏳</span>
                <p className="font-bold text-lg">Tu wiki aún no se ha generado</p>
                <p className="text-sm">
                  Tienes {wikiStatus?.session_count ?? '?'} sesión(es) guardada(s) pero ninguna página en el wiki todavía.
                  {' '}La síntesis se ejecuta automáticamente al generar el informe filosófico de una sesión y puede tardar 1–3 minutos.
                  {' '}Si has esperado y sigue vacío, prueba a regenerarlo manualmente.
                </p>
                {rebuildMsg && (
                  <div className="neo-card p-3 text-xs text-[var(--text)] bg-amber-50 border-amber-300">
                    {rebuildMsg}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={handleRefresh}
                    className="neo-btn-ghost px-4 py-2 text-sm"
                  >
                    🔄 Recargar
                  </button>
                  <button
                    onClick={handleRebuild}
                    disabled={rebuilding}
                    className="neo-btn px-4 py-2 text-sm"
                  >
                    {rebuilding ? 'Solicitando…' : '🛠 Regenerar wiki'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {!loading && !error && graph && graph.nodes.length > 0 && (
          <div className="w-full h-[calc(100vh-72px)] relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.1}
              maxZoom={2.5}
              attributionPosition="bottom-right"
            >
              <Background gap={20} color="#ddd" />
              <Controls />
              <MiniMap
                nodeColor={(n) => {
                  const cat = (n.data as unknown as WikiNode)?.category ?? 'topic';
                  return CATEGORY_COLORS[cat]?.bg ?? '#eee';
                }}
              />
            </ReactFlow>

            {selectedSlug && (
              <SlidePanel
                slug={selectedSlug}
                width={panelWidth}
                onClose={() => setSelectedSlug(null)}
                onSelectSlug={setSelectedSlug}
                onWidthChange={setPanelWidth}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function WikiPage() {
  return (
    <ReactFlowProvider>
      <WikiGraphInner />
    </ReactFlowProvider>
  );
}
