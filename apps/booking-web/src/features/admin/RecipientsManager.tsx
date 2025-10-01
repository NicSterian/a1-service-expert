import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost } from '../../lib/api';

interface NotificationRecipient {
  id: number;
  email: string;
}

export function RecipientsManager() {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await apiGet<NotificationRecipient[]>('/admin/notification-recipients');
        if (!cancelled) {
          setRecipients(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load recipients.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    const list = await apiGet<NotificationRecipient[]>('/admin/notification-recipients');
    setRecipients(list);
  };

  const handleAddRecipient = async (event: FormEvent) => {
    event.preventDefault();
    if (!newEmail.trim()) {
      return;
    }
    await apiPost('/admin/notification-recipients', { email: newEmail.trim() });
    setNewEmail('');
    await refresh();
  };

  const handleRemove = async (id: number) => {
    await apiDelete(`/admin/notification-recipients/${id}`);
    await refresh();
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-brand-black">Notification recipients</h2>
        <p className="text-sm text-slate-600">Control who receives booking notifications.</p>
      </div>

      <div className="space-y-3 rounded border border-slate-200 bg-white p-4">
        <form onSubmit={handleAddRecipient} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded bg-brand-orange px-3 py-2 text-sm text-white hover:bg-orange-500"
          >
            Add recipient
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-slate-500">Loading recipients...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recipients.map((recipient) => (
              <li key={recipient.id} className="flex items-center justify-between rounded border border-slate-200 p-3">
                <span className="font-medium text-brand-black">{recipient.email}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(recipient.id)}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:border-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
            {recipients.length === 0 ? <li className="text-xs text-slate-500">No recipients configured yet.</li> : null}
          </ul>
        )}
      </div>
    </section>
  );
}