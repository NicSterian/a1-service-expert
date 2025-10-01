import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { useBookingWizard } from './state';
import type { CatalogSummary } from './types';

export function useCatalogSummary() {
  const { catalog, setCatalog } = useBookingWizard();
  const [loading, setLoading] = useState(!catalog);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<CatalogSummary>('/catalog');
      setCatalog(data);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to load catalogue.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setCatalog]);

  useEffect(() => {
    if (!catalog) {
      fetchCatalog().catch(() => undefined);
    } else {
      setLoading(false);
      setError(null);
    }
  }, [catalog, fetchCatalog]);

  return {
    catalog,
    loading,
    error,
    refresh: fetchCatalog,
  } as const;
}
