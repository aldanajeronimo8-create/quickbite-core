import { quickbiteApi } from './quickbiteApi';
import { requireSupabaseClient } from '../lib/supabase';

export type ApiMenuItem = Record<string, unknown>;

export async function getApiMenu() {
  return quickbiteApi<ApiMenuItem[]>('/v1/menu');
}

export async function getApiMe() {
  const session = (await requireSupabaseClient().auth.getSession()).data.session;
  if (!session?.access_token) throw new Error('No hay una sesion activa.');
  return quickbiteApi<Record<string, unknown>>('/v1/me', { accessToken: session.access_token });
}

export async function getApiOrders() {
  const session = (await requireSupabaseClient().auth.getSession()).data.session;
  if (!session?.access_token) throw new Error('No hay una sesion activa.');
  return quickbiteApi<Record<string, unknown>[]>('/v1/orders', { accessToken: session.access_token });
}
