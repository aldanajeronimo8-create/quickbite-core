export interface LoyaltySettings {
  id: boolean;
  enabled: boolean;
  points_per_currency_unit: number;
  updated_at: string;
}
export interface LoyaltyReward {
  id: string;
  product_id: string;
  title: string;
  description?: string | null;
  points_required: number;
  points_cost?: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  product?: { name: string; image_url?: string };
}
export type LoyaltyRedemptionStatus = 'pending' | 'reserved' | 'approved' | 'fulfilled' | 'delivered' | 'cancelled';
export interface LoyaltyRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  product_id: string;
  points_spent: number;
  redemption_code: string;
  status: LoyaltyRedemptionStatus;
  created_at: string;
  admin_hidden?: boolean;
  fulfilled_at?: string | null;
  reward?: { id: string; title: string; product?: { name: string } };
}
