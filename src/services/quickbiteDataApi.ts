import type { Category, Order, Product } from '../lib/supabase';
import type { NewOrder } from '../repositories/quickbiteRepository';
import { getValidAccessToken } from './quickbiteAuth';
import { quickbiteApi } from './quickbiteApi';
import { enqueueSyncOperation } from './offlineSyncStore';

interface MenuRow {
  id: string;
  category_id: string | null;
  category_name: string | null;
  category_sort_order?: number | null;
  sku?: string | null;
  name: string;
  description?: string | null;
  price: number | string;
  stock: number;
  in_stock?: boolean;
  image_url?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbohydrates_g?: number | null;
  fats_g?: number | null;
  product_sort_order?: number | null;
}

interface ApiOrder {
  order_id: string;
  status: Order['status'];
  payment_status: Order['payment_status'];
  subtotal: number | string;
  total: number | string;
  pickup_code: string;
}

interface ApiOrderListRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  status: Order['status'];
  payment_status: Order['payment_status'];
  subtotal: number | string;
  total: number | string;
  created_at: string;
  notes?: string | null;
  pickup_code?: string | null;
  pickup_at?: string | null;
  exported_at?: string | null;
  admin_hidden?: boolean;
  items?: Array<{
    id: string;
    product_id: string;
    product_name: string;
    unit_price: number | string;
    quantity: number;
    line_total: number | string;
  }>;
}

function authRequired(): Promise<string> {
  return getValidAccessToken().then((token) => {
    if (!token) throw new Error('Tu sesión de QuickBite ha expirado. Inicia sesión nuevamente.');
    return token;
  });
}

function mapMenu(rows: MenuRow[]) {
  const categories = new Map<string, Category>();
  const products: Product[] = rows.map((row) => {
    if (row.category_id && !categories.has(row.category_id)) {
      categories.set(row.category_id, {
        id: row.category_id,
        name: row.category_name ?? 'Sin categoría',
        description: null,
        active: true,
        created_at: new Date().toISOString(),
      } as Category);
    }
    return {
      id: row.id,
      category_id: row.category_id,
      name: row.name,
      description: row.description ?? null,
      price: Number(row.price),
      stock: Number(row.stock),
      available: Boolean(row.in_stock),
      image_url: row.image_url ?? null,
      calories: row.calories ?? null,
      protein_g: row.protein_g ?? null,
      carbohydrates_g: row.carbohydrates_g ?? null,
      fats_g: row.fats_g ?? null,
      created_at: new Date().toISOString(),
      category: row.category_id ? categories.get(row.category_id) ?? null : null,
    } as Product;
  });
  return { categories: Array.from(categories.values()), products };
}

function mapOrder(row: ApiOrderListRow): Order {
  return {
    ...(row as unknown as Order),
    id: row.id,
    user_id: row.user_id,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    order_items: (row.items ?? []).map((item) => ({
      id: item.id,
      order_id: row.id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name,
      price: Number(item.unit_price),
      quantity: item.quantity,
      product: undefined,
    })),
  };
}

export async function loadCoreData() {
  const token = await authRequired();
  const [menu, orders] = await Promise.all([
    quickbiteApi<MenuRow[]>('/v1/menu'),
    quickbiteApi<ApiOrderListRow[]>('/v1/orders', { accessToken: token }),
  ]);
  const mapped = mapMenu(menu);
  return { ...mapped, orders: orders.map(mapOrder) };
}

export async function createCoreOrder(order: NewOrder) {
  const token = await authRequired();
  const idempotencyKey = crypto.randomUUID();
  const payload = {
    idempotencyKey,
    items: (order.order_items ?? []).map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    notes: order.notes ?? null,
    paymentMethod: order.payment_method ?? 'pending',
  };
  if (!navigator.onLine) {
    await enqueueSyncOperation({
      type: 'create_order',
      idempotencyKey,
      payload: order as unknown as Record<string, unknown>,
    });
    return {
      id: idempotencyKey,
      status: 'pending' as const,
      payment_status: 'pending' as const,
      subtotal: Number(order.total ?? 0),
      total: Number(order.total ?? 0),
      pickup_code: '',
    };
  }
  const result = await quickbiteApi<ApiOrder>('/v1/orders', {
    method: 'POST',
    accessToken: token,
    body: {
      idempotencyKey,
      items: (order.order_items ?? []).map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      notes: order.notes ?? null,
      paymentMethod: order.payment_method ?? 'pending',
    },
  });
  return {
    id: result.order_id,
    status: result.status,
    payment_status: result.payment_status,
    subtotal: Number(result.subtotal),
    total: Number(result.total),
    pickup_code: result.pickup_code,
  };
}
