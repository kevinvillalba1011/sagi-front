import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API } from '../config';
import { SesionService } from './sesion';

const conToken = <T>(req: T & { clone: (x: unknown) => T }, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/** Agrega el access token y, ante un 401, renueva la sesión una vez y repite la petición. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionService);
  if (!req.url.startsWith(API) || /\/auth\/(login|refresh)$/.test(req.url) || req.headers.has('Authorization')) return next(req);
  return next(conToken(req, sesion.accessToken)).pipe(
    catchError((e: unknown) => {
      // Un 401 en change-password significa «contraseña actual incorrecta», no sesión vencida.
      if (!(e instanceof HttpErrorResponse) || e.status !== 401 || req.url.endsWith('/auth/change-password')) return throwError(() => e);
      return from(sesion.renovar()).pipe(
        switchMap((ok) => {
          if (!ok) { sesion.expirada(); return throwError(() => e); }
          return next(conToken(req, sesion.accessToken));
        }),
      );
    }),
  );
};
