import React, { useState, useSyncExternalStore } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { applyUpdate, getWaitingWorker, subscribeToUpdate } from '../services/pwa';
import { confirmDialog } from '../services/notify';

/** "New version available" banner (GitHub Pages build only). The user picks when to reload. */
const UpdateBanner: React.FC = () => {
  const waiting = useSyncExternalStore(subscribeToUpdate, getWaitingWorker);
  const [dismissed, setDismissed] = useState(false);
  if (!waiting || dismissed) return null;

  const update = async () => {
    // Reloading discards whatever is typed in an open form (record or wishlist item).
    if (document.querySelector('form') && !(await confirmDialog(
      'Updating reloads the app. Anything you have not saved in the open form will be lost.',
      { title: 'Update now?', confirmLabel: 'Update' },
    ))) return;
    applyUpdate();
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[60] w-[min(24rem,calc(100vw-2rem))] flex items-center gap-3 bg-[#451a03] text-amber-50 border-l-4 border-amber-500 rounded-sm shadow-xl px-4 py-3 animate-fade-in-up"
    >
      <RefreshCw className="w-5 h-5 text-amber-400 shrink-0" />
      <p className="text-sm flex-1">New version available.</p>
      <button
        onClick={update}
        className="px-3 py-1.5 rounded-sm bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        Update
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Later"
        title="Later"
        className="p-1 rounded-sm text-amber-200/70 hover:text-white transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default UpdateBanner;
