/**
 * Returns the current UI language code.
 * Priority: user.preferred_language → localStorage 'sg_lang' → 'es'
 */
import { useAuth } from '@/context/AuthContext';
import type { LangCode } from '@/lib/i18n';

export function useLang(): LangCode {
  const { user } = useAuth();

  if (user?.preferred_language === 'en' || user?.preferred_language === 'es') {
    return user.preferred_language as LangCode;
  }

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('sg_lang');
    if (stored === 'en' || stored === 'es') return stored as LangCode;
  }

  return 'es';
}
