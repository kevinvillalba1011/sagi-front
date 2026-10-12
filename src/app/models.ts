/** Modelos que devuelve la API de SAGI (backend NestJS, /api/v1). */

export interface Categoria {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export type EstadoStock = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'AVAILABLE';

export interface Producto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string;
  category?: { id: string; name: string };
  stock: number; // existencia: solo cambia con movimientos
  minStock: number;
  isActive: boolean;
  stockStatus: EstadoStock;
  lowStockAlert: boolean;
}

export type TipoMov = 'IN' | 'OUT';

export interface Movimiento {
  id: string;
  type: TipoMov;
  quantity: number;
  balanceAfter: number; // existencia resultante tras el movimiento
  reason: string;
  observation: string | null;
  createdAt: string; // ISO
  product: { id: string; code: string; name: string };
  user: { id: string; fullName: string; username: string };
}

export interface Permiso {
  id: string;
  code: string;
  description: string;
  module: string;
}

export interface Rol {
  id: string;
  name: string;
  description: string | null;
  isSuperAdmin: boolean;
  isSystem: boolean;
  permissions: Permiso[];
}

export interface Usuario {
  id: string;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  role: { id: string; name: string; isSuperAdmin: boolean };
}

/** Usuario autenticado (GET /auth/me). */
export interface UsuarioSesion {
  id: string;
  username: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
  role: { id: string; name: string; isSuperAdmin: boolean };
  permissions: string[];
}

export interface Pagina<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ResumenInventario {
  activeProducts: number;
  totalUnits: number;
  lowStockCount: number; // existencia <= mínimo (incluye agotados)
  outOfStockCount: number;
  availableCount: number;
  categoriesCount: number;
  unitsByCategory: { category: string; units: number }[];
  todayMovements: { in: number; out: number; total: number };
  last7Days: { date: string; in: number; out: number }[];
}

export interface EstadisticasProductos {
  active: number;
  inactive: number;
  lowStock: number;
  outOfStock: number;
}

export interface Resultado {
  ok: boolean;
  msg: string;
}

/** Códigos de permiso del backend (ver permissions.constants.ts en back-sagi). */
export const P = {
  usuariosLeer: 'users:read',
  usuariosCrear: 'users:create',
  usuariosEditar: 'users:update',
  rolesLeer: 'roles:read',
  rolesGestionar: 'roles:manage',
  categoriasLeer: 'categories:read',
  categoriasGestionar: 'categories:manage',
  productosLeer: 'products:read',
  productosCrear: 'products:create',
  productosEditar: 'products:update',
  productosDesactivar: 'products:deactivate',
  movimientosCrear: 'movements:create',
  movimientosLeer: 'movements:read',
  inventarioLeer: 'inventory:read',
  alertasLeer: 'alerts:read',
} as const;

/** Pantalla → permiso que la habilita. «panel» es para todos. */
export const PERMISO_VISTA: Record<string, string> = {
  productos: P.productosLeer,
  movimientos: P.movimientosCrear,
  inventario: P.inventarioLeer,
  alertas: P.alertasLeer,
  historial: P.movimientosLeer,
  permisos: P.usuariosLeer,
};

export interface Vista {
  k: string; // ruta
  nombre: string; // texto del menú
  titulo: string; // título de la pantalla
  icono: string;
}

export const VISTAS: Vista[] = [
  { k: 'panel', nombre: 'Panel principal', titulo: 'Panel principal', icono: 'panel' },
  { k: 'productos', nombre: 'Productos', titulo: 'Gestión de productos', icono: 'productos' },
  { k: 'movimientos', nombre: 'Movimientos', titulo: 'Movimientos', icono: 'movimientos' },
  { k: 'inventario', nombre: 'Inventario', titulo: 'Consulta de inventario', icono: 'inventario' },
  { k: 'alertas', nombre: 'Alertas', titulo: 'Alertas de stock', icono: 'alertas' },
  { k: 'historial', nombre: 'Historial', titulo: 'Historial de movimientos', icono: 'historial' },
  { k: 'permisos', nombre: 'Usuarios y roles', titulo: 'Usuarios y roles', icono: 'permisos' },
];

/** Texto y clase CSS del estado visible de un producto. */
export function estadoProducto(p: Producto): [string, string] {
  if (!p.isActive) return ['Inactivo', 'ia'];
  if (p.stockStatus === 'OUT_OF_STOCK') return ['Agotado', 'ze'];
  if (p.stockStatus === 'LOW_STOCK') return ['Bajo stock', 'lo'];
  return ['Disponible', 'ok'];
}

/** Nombre legible de cada módulo de permisos. */
export const MODULOS: Record<string, string> = {
  users: 'Usuarios', roles: 'Roles', categories: 'Categorías', products: 'Productos',
  movements: 'Movimientos', inventory: 'Inventario', alerts: 'Alertas',
};

/** El rol interno SUPER_ADMIN se muestra como «Super Administrador». */
export const nombreRol = (r: { name: string; isSuperAdmin: boolean }) => (r.isSuperAdmin ? 'Super Administrador' : r.name);
