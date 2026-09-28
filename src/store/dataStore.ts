import { create } from 'zustand';
import type { Category, Order, Product, Profile } from '../types/domain';
import { writeAuditLog } from '../lib/auditLog';
import { quickbiteApi, type ApiOrder, type MenuItem } from '../services/api/quickbiteApi';

export interface HistoryEntry {
  id: string;
  action: 'create' | 'update' | 'delete' | 'status_change';
  entity: 'product' | 'order' | 'category' | 'user';
  description: string;
  timestamp: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

interface DataState {
  categories: Category[];
  products: Product[];
  orders: Order[];
  users: Profile[];
  history: HistoryEntry[];
  loading: boolean;
  loadData: (options?: { silent?: boolean }) => Promise<void>;
  addProduct: (product: any) => Promise<void>;
  updateProduct: (id: string, updates: any) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (orderData: any) => Promise<string>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  moderateOrderPayment: (id: string, action: 'approve' | 'reject') => Promise<void>;
  archiveOrders: (ids: string[]) => Promise<number>;
  resetOrdersForNewPeriod: () => Promise<number>;
  deleteOrder: (id: string) => Promise<void>;
  addUser: (user: any) => Promise<void>;
  updateUser: (user: any) => Promise<void>;
  updateProtectedCredentials: (user: any) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getProductsByCategory: (categoryId?: string) => Product[];
  getOrdersByUser: (userId: string) => Order[];
  subscribeRealtime: () => () => void;
  clearHistory: () => void;
}

const unsupported = (feature: string): never => {
  throw new Error(`${feature} todavía no está expuesto por QuickBite Core API.`);
};

function mapMenuItem(item: MenuItem): Product {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    price: Number(item.price),
    category_id: item.category_id ?? '',
    stock: Number(item.stock),
    available: item.stock > 0,
    created_at: new Date().toISOString(),
    category: item.category_id && item.category_name
      ? { id: item.category_id, name: item.category_name, created_at: new Date().toISOString() }
      : undefined,
  };
}

function mapOrder(item: ApiOrder): Order {
  return {
    id: item.id,
    user_id: item.user_id,
    total: Number(item.total),
    status: item.status as Order['status'],
    payment_method: item.payment_method as Order['payment_method'],
    payment_status: item.payment_status as Order['payment_status'],
    order_number: item.pickup_code,
    pickup_code: item.pickup_code,
    created_at: item.created_at,
  };
}

export const useDataStore = create<DataState>((set, get) => ({
  categories: [],
  products: [],
  orders: [],
  users: [],
  history: [],
  loading: false,

  loadData: async (options) => {
    if (!options?.silent) set({ loading: true });
    try {
      const { items } = await quickbiteApi().menu();
      const products = items.map(mapMenuItem);
      const categories = Array.from(
        new Map(items.filter((item) => item.category_id).map((item) => [
          item.category_id!,
          { id: item.category_id!, name: item.category_name ?? 'Sin categoría', created_at: new Date().toISOString() },
        ])).values(),
      ) as Category[];

      let orders: Order[] = [];
      try { orders = (await quickbiteApi().orders()).items.map(mapOrder); } catch { orders = []; }
      set({ categories, products, orders });
    } finally {
      if (!options?.silent) set({ loading: false });
    }
  },

  addProduct: async () => unsupported('La creación de productos'),
  updateProduct: async () => unsupported('La edición de productos'),
  deleteProduct: async () => unsupported('La eliminación de productos'),

  addOrder: async (orderData) => {
    const items = (orderData.order_items ?? []).map((item: any) => ({
      productId: item.product_id,
      quantity: Number(item.quantity),
    }));
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const result = await quickbiteApi().createOrder(items, orderData.payment_method, idempotencyKey);
    const order = mapOrder(result.order);
    set({ orders: [order, ...get().orders] });
    void writeAuditLog({
      action: 'order.create',
      actorId: order.user_id ?? undefined,
      entity: 'order',
      entityId: order.id,
      metadata: { payment_method: order.payment_method },
    });
    return order.order_number;
  },

  updateOrder: async () => unsupported('La actualización administrativa de pedidos'),
  moderateOrderPayment: async () => unsupported('La moderación de pagos'),
  archiveOrders: async () => unsupported('El archivado de pedidos'),
  resetOrdersForNewPeriod: async () => unsupported('El reinicio de período'),
  deleteOrder: async () => unsupported('La eliminación de pedidos'),
  addUser: async () => unsupported('La creación de usuarios'),
  updateUser: async () => unsupported('La edición de usuarios'),
  updateProtectedCredentials: async () => unsupported('La gestión de credenciales protegidas'),
  deleteUser: async () => unsupported('La eliminación de usuarios'),

  getProductsByCategory: (categoryId) => {
    const visible = get().products.filter((product) => product.available && product.stock > 0);
    return categoryId ? visible.filter((product) => product.category_id === categoryId) : visible;
  },

  getOrdersByUser: (userId) => get().orders.filter((order) => order.user_id === userId),

  subscribeRealtime: () => () => undefined,

  clearHistory: () => set({ history: [] }),
}));
