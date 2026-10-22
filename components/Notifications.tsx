import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { ConfirmRequest, dismissToast, getNotifyState, resolveConfirm, subscribe, ToastKind } from '../services/notify';

const toastStyles: Record<ToastKind, { accent: string; icon: React.ReactNode }> = {
  success: { accent: 'border-emerald-500', icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> },
  error: { accent: 'border-red-500', icon: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" /> },
  info: { accent: 'border-amber-500', icon: <Info className="w-5 h-5 text-amber-400 shrink-0" /> },
};

const ConfirmDialog: React.FC<{ request: ConfirmRequest }> = ({ request }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const answer = (ok: boolean) => resolveConfirm(request.id, ok);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Destructive actions default to Cancel, so a stray Enter can't delete data.
    (request.danger ? cancelRef : confirmRef).current?.focus();

    // Capture on window so this runs before any dialog underneath (e.g. the record
    // modal, which listens on document) and stop the event there: Escape must only
    // close this confirmation, and Tab must stay within it.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        answer(false);
      } else if (e.key === 'Tab') {
        e.preventDefault(); e.stopPropagation();
        const next = document.activeElement === cancelRef.current ? confirmRef.current : cancelRef.current;
        next?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [request.id]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={() => answer(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="bg-[#fcfaf9] w-full max-w-md rounded-lg shadow-2xl overflow-hidden border-4 border-[#78350f] animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#451a03] px-5 py-3 flex items-center gap-2 border-b border-[#78350f]">
          {request.danger
            ? <AlertTriangle className="w-5 h-5 text-red-400" />
            : <Info className="w-5 h-5 text-amber-500" />}
          <h2 id="confirm-dialog-title" className="text-lg font-serif font-bold text-amber-50">
            {request.title ?? 'Please confirm'}
          </h2>
        </div>
        <p id="confirm-dialog-message" className="px-5 py-5 text-stone-700 text-sm leading-relaxed whitespace-pre-line">
          {request.message}
        </p>
        <div className="px-5 pb-5 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={() => answer(false)}
            className="px-4 py-2 rounded-sm border border-stone-300 text-stone-600 hover:text-stone-900 hover:border-stone-500 text-sm font-bold uppercase tracking-wider transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {request.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            onClick={() => answer(true)}
            className={`px-4 py-2 rounded-sm text-white text-sm font-bold uppercase tracking-wider shadow-md transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 ${request.danger
              ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
              : 'bg-amber-800 hover:bg-amber-900 focus-visible:ring-amber-500'}`}
          >
            {request.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Renders toasts and the confirmation dialog. Mounted once at the app root. */
const Notifications: React.FC = () => {
  const { toasts, confirm } = useSyncExternalStore(subscribe, getNotifyState);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-3 w-[min(24rem,calc(100vw-2rem))] pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-start gap-3 bg-[#451a03] text-amber-50 rounded-md shadow-2xl border-l-4 ${toastStyles[t.kind].accent} px-4 py-3 animate-fade-in-up`}
          >
            {toastStyles[t.kind].icon}
            <p className="text-sm leading-relaxed grow whitespace-pre-line">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="text-amber-200/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {confirm && <ConfirmDialog key={confirm.id} request={confirm} />}
    </>
  );
};

export default Notifications;
