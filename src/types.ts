export interface Table {
  id: string;
  number: string;
  status: 'available' | 'occupied';
  qrUrl?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  description?: string;
  image?: string;
  available: boolean;
  variants?: { name: string; price: number }[];
  addOns?: { name: string; price: number }[];
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  addOns?: string[];
  note?: string;
}

export enum OrderStatus {
  RECEIVED = 'received',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Order {
  id: string;
  tableNumber: string;
  customerName?: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  createdAt: any; // Firestore Timestamp
  printedAt?: any;
}

export interface Bill {
  id: string;
  orderId: string;
  tableNumber: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  createdAt: any;
}

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin';
}

export interface PrinterSettings {
  ip: string;
  port: number;
  paperWidth: number;
}
