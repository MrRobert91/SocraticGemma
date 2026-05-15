'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3 mb-10 animate-fade-up">
        <span className="text-4xl" aria-hidden="true">🤔</span>
        <span className="text-2xl font-black tracking-tight text-[var(--text)]">SocraticGemma</span>
      </Link>

      {/* Card */}
      <div className="neo-card w-full max-w-sm p-8 animate-scale-in">
        <h1 className="text-2xl font-black text-[var(--text)] mb-1">Crear cuenta</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Guarda tus conversaciones filosóficas para siempre.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="neo-label" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="neo-input px-4 py-3"
            />
          </div>

          <div>
            <label className="neo-label" htmlFor="reg-password">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="neo-input px-4 py-3"
            />
          </div>

          <div>
            <label className="neo-label" htmlFor="reg-confirm">Confirmar contraseña</label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              className="neo-input px-4 py-3"
            />
          </div>

          {error && (
            <div className="neo-card bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-800 animate-fade-up">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || !confirm}
            className="neo-btn w-full py-3 text-base mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creando cuenta...
              </>
            ) : (
              '✓ Crear cuenta'
            )}
          </button>
        </form>

        <p className="text-sm text-center text-[var(--muted)] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-bold text-[var(--text)] underline underline-offset-2">
            Iniciar sesión
          </Link>
        </p>
      </div>

      <p className="text-xs text-[var(--muted)] mt-8 text-center max-w-xs">
        También puedes usar la app sin cuenta — tus conversaciones no se guardarán.{' '}
        <Link href="/" className="underline">Empezar sin registro</Link>
      </p>
    </div>
  );
}
