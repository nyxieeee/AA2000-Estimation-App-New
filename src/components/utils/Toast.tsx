/**
 * Lightweight in-app Toast + ConfirmDialog system.
 *
 * Usage:
 *   // Wrap your app (already done in App.tsx):
 *   <ToastProvider><App /></ToastProvider>
 *
 *   // In any component:
 *   const { toast, confirm } = useToast();
 *   toast.success('Saved!');
 *   toast.error('Something went wrong');
 *   toast.info('FYI...');
 *   toast.warning('Watch out!');
 *
 *   // Replaces window.confirm():
 *   const ok = await confirm('Are you sure?');
 *   if (ok) { ... }
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  /** ms until auto-dismiss — 0 = persistent */
  duration: number;
  leaving: boolean;
}

interface ConfirmState {
  message: string;
  resolve: (value: boolean) => void;
}

interface ToastActions {
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

interface ToastContextValue {
  toast: ToastActions;
  confirm: (message: string) => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    // Trigger leave animation then remove
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, leaving: true } : t))
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 320);
  }, []);

  const add = useCallback(
    (message: string, variant: ToastVariant, duration = 4000) => {
      const id = ++nextId.current;
      setToasts(prev => [...prev, { id, message, variant, duration, leaving: false }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const toast: ToastActions = {
    success: (m, d) => add(m, 'success', d),
    error: (m, d) => add(m, 'error', d ?? 6000),
    info: (m, d) => add(m, 'info', d),
    warning: (m, d) => add(m, 'warning', d),
  };

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast Stack ── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Confirm Dialog ── */}
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}
    </ToastContext.Provider>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
  success: {
    bg: 'rgba(240,253,244,0.97)',
    border: '#86efac',
    iconColor: '#16a34a',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    bg: 'rgba(254,242,242,0.97)',
    border: '#fca5a5',
    iconColor: '#dc2626',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={10} />
        <path d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
  },
  info: {
    bg: 'rgba(239,246,255,0.97)',
    border: '#93c5fd',
    iconColor: '#2563eb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={12} cy={12} r={10} />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  warning: {
    bg: 'rgba(255,251,235,0.97)',
    border: '#fcd34d',
    iconColor: '#d97706',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    ),
  },
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => {
        const s = VARIANT_STYLES[t.variant];
        return (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              minWidth: '18rem',
              maxWidth: '26rem',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              background: s.bg,
              border: `1px solid ${s.border}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
              backdropFilter: 'blur(8px)',
              transform: t.leaving ? 'translateX(110%)' : 'translateX(0)',
              opacity: t.leaving ? 0 : 1,
              transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
            }}
          >
            {/* Icon */}
            <span
              style={{
                flexShrink: 0,
                width: '1.125rem',
                height: '1.125rem',
                marginTop: '0.1rem',
                color: s.iconColor,
              }}
            >
              {s.icon}
            </span>

            {/* Message */}
            <span
              style={{
                flex: 1,
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: '#1e293b',
                lineHeight: 1.45,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {t.message}
            </span>

            {/* Close button */}
            <button
              onClick={() => onDismiss(t.id)}
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.125rem',
                color: '#94a3b8',
                lineHeight: 1,
                borderRadius: '0.25rem',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => ((e.target as HTMLElement).style.color = '#475569')}
              onMouseLeave={e => ((e.target as HTMLElement).style.color = '#94a3b8')}
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(4px)',
        animation: 'toastFadeIn 0.18s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <style>{`@keyframes toastFadeIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
      <div
        style={{
          background: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          padding: '1.75rem 2rem',
          maxWidth: '26rem',
          width: '90vw',
          animation: 'toastFadeIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Warning icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <span style={{
            width: '2.25rem', height: '2.25rem', borderRadius: '50%',
            background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </span>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif" }}>
            Confirm Action
          </h3>
        </div>

        <p style={{ margin: '0 0 1.5rem', fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1.125rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.background = '#f1f5f9')}
            onMouseLeave={e => ((e.target as HTMLElement).style.background = '#f8fafc')}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: '#1e3a8a',
              color: '#fff',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.background = '#1e40af')}
            onMouseLeave={e => ((e.target as HTMLElement).style.background = '#1e3a8a')}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
