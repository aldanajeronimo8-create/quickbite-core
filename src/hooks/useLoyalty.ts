import { useCallback, useEffect, useMemo, useState } from 'react';
import { quickbiteApi } from '../services/api/quickbiteApi';

type LoyaltySettings = { id: boolean; enabled: boolean; points_per_currency_unit: number; updated_at: string };
type LoyaltyReward = { id: string; product_id: string; title: string; description: string | null; points_required: number; active: boolean; created_at: string; updated_at: string; product?: { name?: string; image_url?: string | null } };
type LoyaltyRedemption = { id: string; user_id: string; reward_id: string; product_id: string; points_spent: number; redemption_code: string; status: string; created_at: string; fulfilled_at?: string | null };

export function useLoyalty(userId: string | undefined, _orders: unknown[] = []) {
  void _orders;
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [redemptions, setRedemptions] = useState<LoyaltyRedemption[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const points = useMemo(() => 0, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setSettings(null);
      setRewards([]);
      setRedemptions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await quickbiteApi().studentRewards();
      setSettings({
        id: true,
        enabled: Boolean(data.enabled),
        points_per_currency_unit: 0.01,
        updated_at: new Date().toISOString(),
      });
      setRewards((data.rewards ?? []).map((item: any) => ({
        id: String(item.reward_id),
        product_id: String(item.product_id),
        title: String(item.title),
        description: item.reward_description ?? null,
        points_required: Number(item.points_required ?? 0),
        active: Boolean(item.active),
        created_at: item.created_at ?? new Date().toISOString(),
        updated_at: item.updated_at ?? new Date().toISOString(),
        product: { name: item.product_name, image_url: item.image_url ?? null },
      })));
      setRedemptions((data.redemptions ?? []) as LoyaltyRedemption[]);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cargar los puntos y premios.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const redeem = useCallback(async (rewardId: string) => {
    try {
      await quickbiteApi().redeemReward(rewardId);
      await refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No pudimos registrar el canje.';
      setError(message);
      throw new Error(message);
    }
  }, [refresh]);

  return {
    settings,
    rewards,
    redemptions,
    points: settings?.enabled ? 0 : points,
    loading,
    error,
    refresh,
    redeem,
  };
}
