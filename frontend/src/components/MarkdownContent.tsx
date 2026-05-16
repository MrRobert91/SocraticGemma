'use client';

import Link from 'next/link';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  source: string;
  compact?: boolean;
  className?: string;
  /**
   * When provided, [[wiki-links]] render as buttons that invoke this callback
   * with the slug instead of navigating. Used by the wiki side panel to swap
   * which note is shown without leaving the graph.
   */
  onWikiLinkClick?: (slug: string) => void;
}

// Sentinel scheme used to mark wiki links during the pre-processing step.
// react-markdown's `a` renderer detects it and either invokes the callback
// (if provided) or rewrites to a real /wiki/<slug> route.
const WIKI_SCHEME = 'wiki-internal:';

function transformWikiLinks(text: string): string {
  return text.replace(/\[\[([^\[\]]+)\]\]/g, (_m, slug) => {
    const trimmed = String(slug).trim();
    return `[${trimmed}](${WIKI_SCHEME}${trimmed})`;
  });
}

const buildComponents = (
  compact: boolean,
  onWikiLinkClick?: (slug: string) => void,
): Components => ({
  h1: ({ children }) => (
    <h1 className={`font-black text-[var(--text)] ${compact ? 'text-base mt-3 mb-2' : 'text-2xl mt-6 mb-4'}`}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className={`font-black text-[var(--text)] border-b-2 border-[var(--border)] pb-1 ${compact ? 'text-sm mt-3 mb-1.5' : 'text-xl mt-6 mb-3'}`}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className={`font-bold text-[var(--text)] ${compact ? 'text-sm mt-2 mb-1' : 'text-lg mt-4 mb-2'}`}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className={`font-bold text-[var(--text)] ${compact ? 'text-xs mt-2 mb-1' : 'text-base mt-3 mb-1.5'}`}>
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className={`text-[var(--text)] leading-relaxed ${compact ? 'text-xs mb-2' : 'text-sm mb-3'}`}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className={`list-disc list-outside text-[var(--text)] ${compact ? 'pl-4 my-2 space-y-0.5 text-xs' : 'pl-5 my-3 space-y-1 text-sm'}`}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className={`list-decimal list-outside text-[var(--text)] ${compact ? 'pl-4 my-2 space-y-0.5 text-xs' : 'pl-5 my-3 space-y-1 text-sm'}`}>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-black text-[var(--text)]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-4 border-t-2 border-[var(--border)]" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[var(--accent)] pl-3 my-3 italic text-[var(--muted)]">
      {children}
    </blockquote>
  ),
  code: ({ children, className: codeClass }) => {
    const isBlock = (codeClass ?? '').startsWith('language-');
    if (isBlock) {
      return (
        <pre className="my-3 p-3 bg-[var(--bg)] border-2 border-[var(--border)] rounded text-xs overflow-x-auto">
          <code className={codeClass}>{children}</code>
        </pre>
      );
    }
    return (
      <code className="px-1 py-0.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  a: ({ href, children }) => {
    // Wiki-internal link produced by transformWikiLinks: either invoke the
    // callback (in-grafo navigation) or fall back to a real route Link.
    if (typeof href === 'string' && href.startsWith(WIKI_SCHEME)) {
      const slug = href.slice(WIKI_SCHEME.length);
      if (onWikiLinkClick) {
        return (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWikiLinkClick(slug);
            }}
            className="text-[var(--accent-dark)] underline font-semibold hover:text-[var(--accent)] transition-colors inline cursor-pointer bg-transparent border-0 p-0"
          >
            {children}
          </button>
        );
      }
      return (
        <Link
          href={`/wiki/${encodeURIComponent(slug)}`}
          className="text-[var(--accent-dark)] underline font-semibold hover:text-[var(--accent)] transition-colors"
        >
          {children}
        </Link>
      );
    }

    const isInternal = typeof href === 'string' && href.startsWith('/');
    if (isInternal) {
      return (
        <Link
          href={href as string}
          className="text-[var(--accent-dark)] underline font-semibold hover:text-[var(--accent)] transition-colors"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--accent-dark)] underline hover:text-[var(--accent)] transition-colors"
      >
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-2 border-[var(--border)] text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-[var(--border)] px-2 py-1 font-bold bg-[var(--bg)] text-left">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-[var(--border)] px-2 py-1">{children}</td>
  ),
});

export function MarkdownContent({
  source,
  compact = false,
  className = '',
  onWikiLinkClick,
}: MarkdownContentProps) {
  const processed = transformWikiLinks(source ?? '');
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // The default urlTransform strips unknown protocols — including our
        // wiki-internal: scheme — which would erase the href before our `a`
        // renderer ever sees it. Allow it through verbatim.
        urlTransform={(url) => url}
        components={buildComponents(compact, onWikiLinkClick)}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
