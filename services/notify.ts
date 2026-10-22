/**
 * Themed replacements for window.alert / window.confirm.
 *
 * A tiny external store: services and components call notify() / confirmDialog()
 * from anywhere (including non-React code like backupService), and the
 * <Notifications /> component mounted at the app root renders them.
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive action: styles the confirm button in red and focuses Cancel by default. */
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number;
  message: string;
  resolve: (ok: boolean) => void;
}

export interface NotifyState {
  toasts: Toast[];
  /** Only one confirmation is shown at a time; later requests wait in line. */
  confirm: ConfirmRequest | null;
}

let nextId = 1;
let toasts: Toast[] = [];
let confirmQueue: ConfirmRequest[] = [];
let state: NotifyState = { toasts, confirm: null };
const listeners = new Set<() => void>();

const emit = () => {
  state = { toasts, confirm: confirmQueue[0] ?? null };
  listeners.forEach(listener => listener());
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const getNotifyState = (): NotifyState => state;

export const dismissToast = (id: number): void => {
  toasts = toasts.filter(t => t.id !== id);
  emit();
};

/** Show a toast. Errors stay longer, since they usually need to be read. */
export const notify = (message: string, kind: ToastKind = 'info'): void => {
  const id = nextId++;
  toasts = [...toasts, { id, message, kind }].slice(-4);
  emit();
  setTimeout(() => dismissToast(id), kind === 'error' ? 8000 : 5000);
};

/** Ask the user to confirm an action. Resolves to true only if they confirm. */
export const confirmDialog = (message: string, options: ConfirmOptions = {}): Promise<boolean> =>
  new Promise(resolve => {
    confirmQueue = [...confirmQueue, { id: nextId++, message, resolve, ...options }];
    emit();
  });

export const resolveConfirm = (id: number, ok: boolean): void => {
  const request = confirmQueue.find(c => c.id === id);
  if (!request) return;
  confirmQueue = confirmQueue.filter(c => c.id !== id);
  emit();
  request.resolve(ok);
};
