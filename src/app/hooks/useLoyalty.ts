import { useCallback, useEffect, useMemo, useState } from 'react';
import { appConfig } from '../../config/appConfig';
import { getErrorMessage } from '../../lib/errorMessage';
import type { LoyaltyRedemption, LoyaltyReward, LoyaltySettings } from '../../types/loyalty';
import { getLoyaltySettings, getUserLoyaltyPoints, listLoyaltyRewards, listUserLoyaltyRedemptions, redeemLoyaltyReward } from '../../repositories/quickbiteRepository';

export function useLoyalty(userId: string | undefined, _orders?: unknown) {
  void _orders;
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [redemptions, setRedemptions] = useState<LoyaltyRedemption[]>([]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      const nextSettings = await getLoyaltySettings();
      setSettings(nextSettings);
      if (!nextSettings.enabled) {
        setRewards([]);
        setRedemptions([]);
        setEarnedPoints(0);
        return;
      }

      const [nextRewards, nextRedemptions, nextEarnedPoints] = await Promise.all([
        listLoyaltyRewards(),
        listUserLoyaltyRedemptions(userId),
        getUserLoyaltyPoints(userId),
      ]);
      setRewards(nextRewards);
      setRedemptions(nextRedemptions);
      setEarnedPoints(nextEarnedPoints);
    } catch (nextError) {
      setError(getErrorMessage(nextError, 'No se pudo cargar el programa de puntos.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void refresh();

    const refreshDelay = Math.max(appConfig.dataRefreshIntervalMs, 15_000);
    const interval = window.setInterval(() => void refresh(), refreshDelay);
    // Core API is the source of truth. Until loyalty realtime endpoints are exposed,
    // refresh on a short interval rather than opening a legacy Supabase channel.
    const refreshDelay = Math.max(appConfig.dataRefreshIntervalMs, 15_000);
    const interval = window.setInterval(() => void refresh(), refreshDelay);
    return () => window.clearInterval(interval);
  }, [refresh, userId]);

  const spentPoints = useMemo(
    () => redemptions
      .filter((redemption) => redemption.status !== 'cancelled')
      .reduce((sum, redemption) => sum + redemption.points_spent, 0),
    [redemptions],
  );

  const redeem = useCallback(async (rewardId: string) => {
    const redemption = await redeemLoyaltyReward(rewardId);
    await refresh();
    return redemption;
  }, [refresh]);

  return {
    availablePoints: settings?.enabled ? Math.max(earnedPoints - spentPoints, 0) : 0,
    enabled: settings?.enabled === true,
    error,
    loading,
    redeem,
    redemptions,
    rewards,
    settings,
    refresh,
  };
}
