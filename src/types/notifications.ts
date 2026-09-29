export interface UserNotification {
  id: string;
  user_id: string;
  order_id?: string | null;
  type?: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at: string;
}
