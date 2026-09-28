import type { UserRole } from '../lib/access';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  roles?: UserRole[];
  protected?: boolean;
  ti?: string | null;
  created_at: string;
  section?: string | null;
  grade?: string | null;
  course?: string | null;
  section_id?: string | null;
  grade_id?: string | null;
  course_id?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id: string;
  stock: number;
  available: boolean;
  created_at: string;
  category?: Category;
}

export interface Order {
  id: string;
  user_id: string | null;
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'rejected' | 'cancelled';
  payment_method: 'nequi' | 'cash' | 'bre-b' | 'credits';
  payment_status: 'pending' | 'confirmed' | 'rejected';
  order_number: string;
  created_at: string;
  admin_hidden?: boolean;
  pickup_code?: string;
  estimated_minutes?: number;
  payment_reference?: string;
  notes?: string | null;
  student_comment?: string | null;
  user?: Profile;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}
