import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../../../lib/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  mobileNumber: string | null;
  landlineNumber: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  _count?: {
    bookings: number;
  };
}

export function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'bookings'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Create user modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    title: '',
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    mobileNumber: '',
    landlineNumber: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    county: '',
    postcode: '',
    role: 'CUSTOMER',
  });

  useEffect(() => {
    let cancelled = false;
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          sort: sortBy,
          order: sortOrder,
        });

        if (search.trim()) {
          params.set('search', search.trim());
        }

        const response = await apiGet<{ users: User[]; total: number; pages: number }>(
          `/admin/users?${params.toString()}`
        );

        if (cancelled) return;
        setUsers(response.users);
        setTotalPages(response.pages);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to load users.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [search, sortBy, sortOrder, page]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.email.split('@')[0];
  };

  const getPhoneNumber = (user: User) => {
    return user.mobileNumber || user.landlineNumber || '—';
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required');
      return;
    }
    if (newUser.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!newUser.firstName || !newUser.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    try {
      setCreating(true);
      await apiPost('/admin/users', newUser);
      toast.success('User created successfully');
      setShowCreateModal(false);
      // Reset form
      setNewUser({
        title: '',
        companyName: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        mobileNumber: '',
        landlineNumber: '',
        addressLine1: '',
        addressLine2: '',
        addressLine3: '',
        city: '',
        county: '',
        postcode: '',
        role: 'CUSTOMER',
      });
      // Reload users list
      setPage(1);
      const params = new URLSearchParams({
        page: '1',
        pageSize: pageSize.toString(),
        sort: sortBy,
        order: sortOrder,
      });
      const response = await apiGet<{ users: User[]; total: number; pages: number }>(
        `/admin/users?${params.toString()}`
      );
      setUsers(response.users);
      setTotalPages(response.pages);
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Users</h2>
          <p className="text-sm text-slate-400">Manage customer accounts</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-full bg-brand-orange px-6 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-400"
        >
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-400">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name or email..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-semibold text-slate-400">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            >
              <option value="createdAt">Registered Date</option>
              <option value="name">Name</option>
              <option value="bookings">Booking Count</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-xs font-semibold text-slate-400">Order</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading users...</div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No users found.</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-3">Name</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Registered</th>
                    <th className="pb-3">Last Login</th>
                    <th className="pb-3 text-right">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 font-medium text-white">
                        <Link to={`/admin/users/${user.id}`} className="hover:underline">
                          {getUserName(user)}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-300">
                        <Link to={`/admin/users/${user.id}`} className="hover:underline">
                          {user.email}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-300">{getPhoneNumber(user)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-500/20 text-purple-300'
                              : user.role === 'STAFF'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{formatDate(user.createdAt)}</td>
                      <td className="py-3 text-slate-400">{formatDate(user.lastLoginAt)}</td>
                      <td className="py-3 text-right text-slate-300">{user._count?.bookings ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="space-y-3 lg:hidden">
              {users.map((user) => (
                <Link key={user.id} to={`/admin/users/${user.id}`} className="block rounded-lg border border-slate-700 bg-slate-800 p-4 hover:border-orange-500/60">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-white">{getUserName(user)}</div>
                      <div className="mt-1 text-xs text-slate-400">{user.email}</div>
                      <div className="mt-1 text-xs text-slate-400">{getPhoneNumber(user)}</div>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-300'
                          : user.role === 'STAFF'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>Registered: {formatDate(user.createdAt)}</span>
                    <span>{user._count?.bookings ?? 0} bookings</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-brand-orange hover:text-white disabled:opacity-50 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-brand-orange hover:text-white disabled:opacity-50 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create New User</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Title</label>
                  <input
                    type="text"
                    value={newUser.title}
                    onChange={(e) => setNewUser({ ...newUser, title: e.target.value })}
                    placeholder="Mr, Mrs, Ms, etc."
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Company Name</label>
                  <input
                    type="text"
                    value={newUser.companyName}
                    onChange={(e) => setNewUser({ ...newUser, companyName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">First Name *</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Last Name *</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Mobile</label>
                  <input
                    type="tel"
                    value={newUser.mobileNumber}
                    onChange={(e) => setNewUser({ ...newUser, mobileNumber: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Landline</label>
                  <input
                    type="tel"
                    value={newUser.landlineNumber}
                    onChange={(e) => setNewUser({ ...newUser, landlineNumber: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400">Address Line 1</label>
                  <input
                    type="text"
                    value={newUser.addressLine1}
                    onChange={(e) => setNewUser({ ...newUser, addressLine1: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400">Address Line 2</label>
                  <input
                    type="text"
                    value={newUser.addressLine2}
                    onChange={(e) => setNewUser({ ...newUser, addressLine2: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400">Address Line 3</label>
                  <input
                    type="text"
                    value={newUser.addressLine3}
                    onChange={(e) => setNewUser({ ...newUser, addressLine3: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">City</label>
                  <input
                    type="text"
                    value={newUser.city}
                    onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">County</label>
                  <input
                    type="text"
                    value={newUser.county}
                    onChange={(e) => setNewUser({ ...newUser, county: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Postcode</label>
                  <input
                    type="text"
                    value={newUser.postcode}
                    onChange={(e) => setNewUser({ ...newUser, postcode: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400">Email *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400">Password * (min 8 chars)</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                    minLength={8}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-orange-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-full bg-brand-orange px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
