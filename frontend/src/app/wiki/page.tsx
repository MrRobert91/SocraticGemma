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
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
  Simulation,
} from 'd3-force';

import { useWikiGraph, useWikiPage, useWikiStatus } from '@/hooks/useWiki';
import { WikiNode } from '@/lib/types';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Tooltip } from '@/components/Tooltip';
import { useLang } from '@/hooks/useLang';
import { getTranslations } from '@/lib/i18n';
import type { UITranslations } from '@/lib/i18n';

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

// Kept as a fallback reference; actual labels come from i18n at runtime

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

// ─── D3 force simulation types ────────────────────────────────────────────────

interface SimNode extends SimulationNodeDatum {
  id: string;
  wiki: WikiNode;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SimLink extends SimulationLinkDatum<SimNode> {}

function nodeRadius(wiki: WikiNode): number {
  return wiki.category === 'profile' ? 44 : Math.max(18, 18 + wiki.session_count * 4);
}

// ─── Custom node ──────────────────────────────────────────────────────────────

function WikiNodeComponent({ data }: { data: WikiNode & { selected: boolean; profileLabel?: string } }) {
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
            ? (data.profileLabel ?? 'Perfil')
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
  t: UITranslations;
}

function SlidePanel({ slug, width, onClose, onSelectSlug, onWidthChange, t }: SlidePanelProps) {
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
      <Tooltip content={t.panelResizeDrag} side="right">
        <div
          onMouseDown={onPointerDown}
          className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)] active:bg-[var(--accent-dark)] z-30 transition-colors"
          role="separator"
          aria-orientation="vertical"
          aria-label={t.panelResizeLabel}
        />
      </Tooltip>

      <div className="flex items-center justify-between p-4 border-b-2 border-[var(--border)] sticky top-0 bg-[var(--bg-card)] z-10">
        <h3 className="font-black text-sm text-[var(--text)] truncate pr-2">
          {page?.title ?? slug}
        </h3>
        <button
          onClick={onClose}
          className="neo-btn-ghost text-lg px-2 py-0.5 leading-none"
          aria-label={t.panelClose}
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="p-4 text-sm text-[var(--muted)] animate-pulse">{t.loadingEllipsis}</div>
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
                {page.sessions.length} {page.sessions.length !== 1 ? t.panelSessionPlural : t.panelSessionSingular}
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
              <p className="text-xs font-bold text-[var(--muted)] mb-2">{t.panelConversationsLabel}</p>
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
            {t.panelViewFullPage}
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── D3 force simulation hook ─────────────────────────────────────────────────

function useForceSimulation(
  graph: { nodes: WikiNode[]; edges: { source: string; target: string; relation: string; weight: number }[] } | null,
  setNodes: (updater: (nds: Node[]) => Node[]) => void,
) {
  const simulationRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodeMap = useRef<Map<string, SimNode>>(new Map());
  const draggingId = useRef<string | null>(null);

  useEffect(() => {
    if (!graph) return;

    simulationRef.current?.stop();

    const cx = 400;
    const cy = 300;

    const simNodes: SimNode[] = graph.nodes.map(wiki => {
      const prev = simNodeMap.current.get(wiki.id);
      return {
        id: wiki.id,
        wiki,
        x: prev?.x ?? cx + (Math.random() - 0.5) * 300,
        y: prev?.y ?? cy + (Math.random() - 0.5) * 300,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
      };
    });

    const nodeById = new Map(simNodes.map(n => [n.id, n]));
    simNodeMap.current = nodeById;

    const simLinks: SimLink[] = graph.edges
      .filter(e => nodeById.has(e.source) && nodeById.has(e.target))
      .map(e => ({ source: e.source, target: e.target }));

    const sim = forceSimulation<SimNode>(simNodes)
      // Connected nodes attract each other — the core of Obsidian clustering
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id(d => d.id)
          .distance(180)
          .strength(0.15),
      )
      // All nodes repel each other, spreading clusters apart
      .force('charge', forceManyBody<SimNode>().strength(-500).distanceMax(800))
      // Gentle center gravity so the graph doesn't drift off screen
      .force('center', forceCenter<SimNode>(cx, cy).strength(0.03))
      // Collision prevents overlap; radius proportional to visual node size
      .force('collide', forceCollide<SimNode>(d => nodeRadius(d.wiki) + 30).strength(0.9))
      .alphaDecay(0.02)
      .on('tick', () => {
        setNodes(nds =>
          nds.map(rfNode => {
            if (rfNode.id === draggingId.current) return rfNode;
            const sim = nodeById.get(rfNode.id);
            if (!sim) return rfNode;
            const r = nodeRadius(sim.wiki);
            return { ...rfNode, position: { x: (sim.x ?? 0) - r, y: (sim.y ?? 0) - r } };
          }),
        );
      });

    simulationRef.current = sim;
    return () => {
      sim.stop();
    };
    // We deliberately depend only on `graph` — `setNodes` is stable from useNodesState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  const onNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    draggingId.current = node.id;
    const sim = simNodeMap.current.get(node.id);
    if (sim) { sim.fx = sim.x; sim.fy = sim.y; }
    simulationRef.current?.alphaTarget(0.3).restart();
  }, []);

  const onNodeDrag = useCallback((_: React.MouseEvent, node: Node) => {
    const sim = simNodeMap.current.get(node.id);
    if (!sim) return;
    const r = nodeRadius(sim.wiki);
    sim.fx = node.position.x + r;
    sim.fy = node.position.y + r;
  }, []);

  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    draggingId.current = null;
    const sim = simNodeMap.current.get(node.id);
    if (sim) { sim.fx = null; sim.fy = null; }
    simulationRef.current?.alphaTarget(0);
  }, []);

  return { onNodeDragStart, onNodeDrag, onNodeDragStop };
}

// ─── Main page ────────────────────────────────────────────────────────────────

function WikiGraphInner() {
  const lang = useLang();
  const t = getTranslations(lang);
  const { graph, loading, error, refetch: refetchGraph } = useWikiGraph();
  const { status: wikiStatus, refetch: refetchStatus } = useWikiStatus();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState<number>(PANEL_DEFAULT_WIDTH);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

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
        lang === 'en'
          ? `Rebuilding wiki from ${data.session_count ?? '?'} session(s). This may take 1–3 minutes. Click “Refresh” in a moment.`
          : `Regenerando wiki a partir de ${data.session_count ?? '?'} sesión(es). Esto puede tardar 1–3 minutos. Pulsa “Recargar” en un momento.`
      );
    } catch (e) {
      setRebuildMsg(
        (lang === 'en' ? 'Could not start rebuilding. ' : 'No se pudo iniciar la regeneración. ') +
        (e instanceof Error ? e.message : t.unknownError)
      );
    } finally {
      setRebuilding(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetchGraph();
    refetchStatus();
  }, [refetchGraph, refetchStatus]);

  const handleSyncEdges = useCallback(async () => {
    setSyncing(true);
    try {
      await fetch(`${API_BASE}/wiki/sync-edges`, { method: 'POST', credentials: 'include' });
      refetchGraph();
    } finally {
      setSyncing(false);
    }
  }, [refetchGraph]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { onNodeDragStart, onNodeDrag, onNodeDragStop } = useForceSimulation(graph, setNodes);

  // Initialise ReactFlow nodes and edges when graph data arrives.
  // The D3 simulation (created inside useForceSimulation) drives positions from here on.
  useEffect(() => {
    if (!graph) return;
    setNodes(
      graph.nodes.map(wiki => ({
        id: wiki.id,
        type: 'wiki',
        position: { x: 400 + (Math.random() - 0.5) * 300, y: 300 + (Math.random() - 0.5) * 300 },
        data: { ...wiki, selected: false, profileLabel: t.wikiProfileNodeLabel },
      })),
    );
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
            <Link href="/conversations" className="neo-btn-ghost px-2 py-1 text-lg font-bold" aria-label={t.navBackConversations}>←</Link>
            <span className="text-2xl" aria-hidden="true">🗺️</span>
            <h1 className="text-xl font-black text-[var(--text)]">{t.wikiPageTitle}</h1>
          </div>
          <div className="flex gap-2 items-center">
            {/* Legend with per-category tooltip on hover (portal-based) */}
            <div className="hidden sm:flex gap-3 text-xs font-semibold mr-2">
              {Object.entries(CATEGORY_COLORS).map(([cat, c]) => (
                <Tooltip
                  key={cat}
                  content={t.wikiCategoryLabels[cat] ?? CATEGORY_LABELS[cat] ?? ''}
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
            {graph && graph.nodes.length > 0 && (
              <button
                onClick={handleSyncEdges}
                disabled={syncing}
                className="neo-btn-ghost px-3 py-1.5 text-xs"
                title="Reconstruye las relaciones del grafo sin regenerar el contenido"
              >
                {syncing
                  ? (lang === 'en' ? '⏳ Syncing…' : '⏳ Sincronizando…')
                  : (lang === 'en' ? '🔗 Sync graph' : '🔗 Sincronizar grafo')
                }
              </button>
            )}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'}/wiki/export`}
              download="wiki.zip"
              className="neo-btn-ghost px-3 py-1.5 text-xs"
            >
              {t.exportZip}
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        {loading && (
          <div className="flex items-center justify-center h-96 text-[var(--muted)] font-semibold">
            {t.wikiLoadingGraph}
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
                <p className="font-bold text-lg">{t.wikiEmptyGraphTitle}</p>
                <p className="text-sm">
                  {t.wikiEmptyGraphDesc}
                </p>
              </>
            ) : (
              <>
                <span className="text-5xl">⏳</span>
                <p className="font-bold text-lg">{t.wikiNotGeneratedTitle}</p>
                <p className="text-sm">
                  {lang === 'en'
                    ? `You have ${wikiStatus?.session_count ?? '?'} saved session(s) but no wiki pages yet. The synthesis runs automatically when you generate a session’s philosophical report and may take 1–3 minutes. If you’ve waited and it’s still empty, try rebuilding it manually.`
                    : `Tienes ${wikiStatus?.session_count ?? '?'} sesión(es) guardada(s) pero ninguna página en el wiki todavía. La síntesis se ejecuta automáticamente al generar el informe filosófico de una sesión y puede tardar 1–3 minutos. Si has esperado y sigue vacío, prueba a regenerarlo manualmente.`
                  }
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
                    {t.refreshButton}
                  </button>
                  <button
                    onClick={handleRebuild}
                    disabled={rebuilding}
                    className="neo-btn px-4 py-2 text-sm"
                  >
                    {rebuilding ? t.rebuildingButton : t.rebuildButton}
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
              onNodeDragStart={onNodeDragStart}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
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
                t={t}
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
