'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** Text or node shown inside the tooltip card. */
  content: ReactNode;
  /** Element(s) that triggers the tooltip when hovered/focused. */
  children: ReactNode;
  /** Which side of the trigger the tooltip appears on. */
  side?: Side;
  /** Extra classes for the trigger wrapper <span>. */
  className?: string;
  /** Max width in pixels (default 240). */
  maxWidth?: number;
  /** When false, the tooltip is never shown (acts as plain wrapper). */
  enabled?: boolean;
}

const OFFSET = 8;

/**
 * Universal tooltip used across the app.
 *
 * Renders into `document.body` via React portal with `position: fixed` and
 * `zIndex: 9999`, which guarantees the tooltip appears above ANY other UI
 * (side panels, modals, sticky headers) regardless of stacking context.
 *
 * The trigger element is wrapped in a `<span>` that registers mouse/focus
 * handlers — the children themselves are not modified, so this composes
 * with any child component.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  className = '',
  maxWidth = 240,
  enabled = true,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let x = 0;
    let y = 0;
    switch (side) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top - OFFSET;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom + OFFSET;
        break;
      case 'left':
        x = rect.left - OFFSET;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + OFFSET;
        y = rect.top + rect.height / 2;
        break;
    }
    setCoords({ x, y });
  };

  const show = () => {
    if (!enabled || !content) return;
    updatePosition();
    setVisible(true);
  };
  const hide = () => setVisible(false);

  // Re-position on scroll/resize while visible.
  useEffect(() => {
    if (!visible) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, side]);

  // Translate origin so the tooltip sits flush with the chosen side.
  const tooltipTransform = (() => {
    switch (side) {
      case 'top':    return 'translate(-50%, -100%)';
      case 'bottom': return 'translate(-50%, 0)';
      case 'left':   return 'translate(-100%, -50%)';
      case 'right':  return 'translate(0, -50%)';
    }
  })();

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={className}
      >
        {children}
      </span>
      {mounted && visible && enabled && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: coords.x,
            top: coords.y,
            transform: tooltipTransform,
            maxWidth,
            zIndex: 9999,
          }}
          className="bg-[var(--bg-card)] border-2 border-[var(--border)] p-2 rounded shadow-[2px_2px_0_0_var(--border)] text-xs font-semibold text-[var(--text)] leading-snug pointer-events-none whitespace-normal text-left"
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
