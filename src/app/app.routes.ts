import { Routes } from '@angular/router';
import { authGuard, rolGuard, sesionGuard } from './guards/rol';
import { CambiarClave } from './cambiar-clave/cambiar-clave';
import { Login } from './login/login';
import { Shell } from './shell/shell';

/** Cada pantalla declara en data.vista la que la habilita (ver PERMISO_VISTA en models.ts). */
const hija = (path: string, loadComponent: () => Promise<unknown>) => ({ path, loadComponent: loadComponent as never, canActivate: [rolGuard], data: { vista: path } });

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'cambiar-clave', component: CambiarClave, canActivate: [sesionGuard] },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'panel' },
      hija('panel', () => import('./paginas/panel').then((m) => m.Panel)),
      hija('productos', () => import('./paginas/productos').then((m) => m.Productos)),
      hija('movimientos', () => import('./paginas/movimientos').then((m) => m.Movimientos)),
      hija('inventario', () => import('./paginas/inventario').then((m) => m.Inventario)),
      hija('alertas', () => import('./paginas/alertas').then((m) => m.Alertas)),
      hija('historial', () => import('./paginas/historial').then((m) => m.Historial)),
      hija('permisos', () => import('./paginas/permisos').then((m) => m.Permisos)),
    ],
  },
  { path: '**', redirectTo: 'login' },
];
