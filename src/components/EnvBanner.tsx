'use client';

import { env } from '@/config/env';

/**
 * Environment Banner
 *
 * Displays a small fixed badge in the corner when running in development mode.
 * Completely hidden in production — no DOM element rendered at all.
 */
export default function EnvBanner() {
  if (env.isProd) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '12px',
        left: '12px',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '4px 10px',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
      }}
    >
      ⚡ DEV
    </div>
  );
}
