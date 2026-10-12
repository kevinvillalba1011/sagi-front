import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from '../servicios/sesion';

/** Exige sesión (la restaura con la cookie al abrir la app) y obliga a cambiar la clave inicial. */
export const authGuard: CanActivateFn = async () => {
  const s = inject(SesionService);
  const router = inject(Router);
  await s.restaurar();
  const u = s.usuario();
  if (!u) return router.createUrlTree(['/login']);
  return u.mustChangePassword ? router.createUrlTree(['/cambiar-clave']) : true;
};

/** Para /cambiar-clave: solo exige estar autenticado. */
export const sesionGuard: CanActivateFn = async () => {
  const s = inject(SesionService);
  await s.restaurar();
  return s.usuario() ? true : inject(Router).createUrlTree(['/login']);
};

/** Exige que el rol tenga permiso para la pantalla (route.data.vista). */
export const rolGuard: CanActivateFn = (route) => {
  const s = inject(SesionService);
  return s.can(route.data['vista']) ? true : inject(Router).createUrlTree(['/panel']);
};
