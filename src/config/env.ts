/**
 * Centralized Environment Configuration
 *
 * Single source of truth for all environment-related checks.
 * Import from here instead of reading process.env directly.
 *
 * Usage:
 *   import { env } from '@/config/env';
 *   if (env.isDev) { ... }
 */

export const env = {
  /** Current environment: 'development' | 'production' */
  APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',

  /** True when running in development mode */
  isDev: process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.NODE_ENV === 'development',

  /** True when running in production mode */
  isProd: process.env.NEXT_PUBLIC_APP_ENV === 'production' || process.env.NODE_ENV === 'production',

  /** Supabase configuration */
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
} as const;

/**
 * Validate that required environment variables are set.
 * Call this at app startup to fail fast.
 */
export function validateEnv(): void {
  const missing: string[] = [];

  if (!env.supabase.url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!env.supabase.anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    console.warn(
      `⚠️ Missing environment variables: ${missing.join(', ')}.\n` +
      `Check your .env.development or .env.production file.`
    );
  }
}
