import React from 'react';

export function ModalShell({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:text-slate-700">×</button>
        {children}
      </div>
    </div>
  );
}

export default ModalShell;

