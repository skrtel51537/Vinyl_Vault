import { RefObject, useEffect } from 'react';

/**
 * Modal dialog behaviour shared by the app's dialogs.
 * On open: focus moves into the dialog and the page behind stops scrolling.
 * On close: scroll is restored and focus returns to where it was.
 * Escape closes the dialog (unless `canDismiss` is false); Tab / Shift+Tab stay inside it.
 */
export const useDialog = (dialogRef: RefObject<HTMLElement | null>, onClose: () => void, canDismiss = true): void => {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (canDismiss) { e.preventDefault(); onClose(); }
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const candidates: ArrayLike<HTMLElement> = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(candidates).filter(el => el.offsetParent !== null);
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialogRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [canDismiss, onClose]);
};
