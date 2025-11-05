import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ModalShell } from './ModalShell';

export function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const canSubmit = email.trim().length > 0;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    toast.success("If the email exists, We&apos;ll send a reset link.");
    onClose();
  };
  return (
    <ModalShell open={open} onClose={onClose}>
      <h3 className="mb-3 text-lg font-semibold text-brand-black">Forgotten password</h3>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email address *</label>
          <input type="email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={!canSubmit} className="rounded bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Continue</button>
        </div>
      </form>
    </ModalShell>
  );
}

export default ForgotPasswordModal;
