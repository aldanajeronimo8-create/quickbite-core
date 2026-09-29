import { useEffect, useState } from 'react';
import { appConfig } from '../../config/appConfig';
import { useAuthStore } from '../../store/authStore';

export function useLoyaltyProgram() {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return undefined;

    // Loyalty is not exposed by the Core API yet. Keep the feature safely
    // disabled instead of reaching for a legacy data provider.
    if (!user) {
      setEnabled(false);
      setLoading(false);
      return undefined;
    }

    setEnabled(false);
    setLoading(false);

    const interval = window.setInterval(() => {
      setEnabled(false);
    }, Math.max(appConfig.dataRefreshIntervalMs, 15_000));

    return () => window.clearInterval(interval);
  }, [authLoading, user]);

  return { enabled, loading };
}
