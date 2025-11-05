import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { apiPost } from '../../../../../lib/api';
import { ModalShell } from './ModalShell';
import type { LoginResponse, AccountUser } from '../details-confirm.schemas';

export function LoginModal({ open, onClose, onLoggedIn }: { open: boolean; onClose: () => void; onLoggedIn: (payload: { token: string; user: AccountUser }) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setBusy(true);
      const response = await apiPost<LoginResponse>('/auth/login', { email: email.trim(), password }, { skipAuth: true });
      onLoggedIn({ token: response.token, user: response.user });
      toast.success('Welcome back!');
      onClose();
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Login failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell open={open} onClose={onClose}>
      <h3 className="mb-3 text-lg font-semibold text-brand-black">Login to your account</h3>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email address *</label>
          <input type="email" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password *</label>
          <input type="password" className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span />
          <button type="button" onClick={() => { onClose(); document.dispatchEvent(new CustomEvent('open-forgot-password')); }} className="text-blue-700 underline">Forgotten password?</button>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={!canSubmit} className="rounded bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Logging in...' : 'Login'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

export default LoginModal;
