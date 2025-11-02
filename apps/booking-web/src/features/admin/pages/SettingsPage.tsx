import { Link, useSearchParams } from 'react-router-dom';
import { CompanySettings } from '../settings/CompanySettings';
import { CatalogManager } from '../CatalogManager';
import { CalendarManager } from '../CalendarManager';
import { RecipientsManager } from '../RecipientsManager';
import { IntegrationsSettings } from '../settings/IntegrationsSettings';

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'company';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-white">Settings</h2>
        <p className="text-sm text-slate-400">Configure your system</p>
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-slate-700">
        <nav className="-mb-px flex gap-4 overflow-x-auto">
          <Link
            to="/admin/settings?tab=company"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'company'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'company' ? 'page' : undefined}
          >
            Company
          </Link>
          <Link
            to="/admin/settings?tab=catalog"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'catalog'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'catalog' ? 'page' : undefined}
          >
            Catalog & Pricing
          </Link>
          <Link
            to="/admin/settings?tab=calendar"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'calendar'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'calendar' ? 'page' : undefined}
          >
            Calendar
          </Link>
          <Link
            to="/admin/settings?tab=notifications"
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition ${
              activeTab === 'notifications'
                ? 'border-brand-orange text-brand-orange'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            aria-current={activeTab === 'notifications' ? 'page' : undefined}
          >
            Notifications
          </Link>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'catalog' && <CatalogManager />}
        {activeTab === 'calendar' && <CalendarManager />}
        {activeTab === 'notifications' && <RecipientsManager />}
      </div>

      {/* Footer with Dev Tools link */}
      <div className="border-t border-slate-800 pt-6 text-center">
        <Link
          to="/admin/dev"
          className="text-xs text-slate-500 transition hover:text-brand-orange"
        >
          Developer Tools
        </Link>
      </div>
    </div>
  );
}
