# SAGI — Front (Angular)

Cliente web del Sistema Automatizado de Gestión de Inventario. Consume la API de `back-sagi` (`/api/v1`).

## Requisitos

- Node.js ≥ 22.22 y npm.
- El backend corriendo en `http://localhost:3000` (ver el README de `back-sagi`).

## Ejecutar (PowerShell)

```powershell
npm install
npm start
```

Abre `http://localhost:4200`. El servidor de desarrollo reenvía `/api` al backend (`proxy.conf.json`), así que no hay CORS y la cookie de refresco funciona en el mismo origen.

Primer ingreso: usuario y contraseña del Super Administrador definidos en el seed del backend; el sistema pide cambiar la contraseña antes de continuar.

## Pantallas y permisos

Cada pantalla aparece solo si el rol del usuario tiene el permiso (los roles y permisos se administran en «Usuarios y roles», solo con permisos de Super Administrador o los que él asigne):

| Pantalla | Permiso |
| --- | --- |
| Productos | `products:read` (crear/editar/desactivar con `products:create`/`update`/`deactivate`) |
| Movimientos | `movements:create` |
| Inventario | `inventory:read` |
| Alertas | `alerts:read` |
| Historial | `movements:read` |
| Usuarios y roles | `users:read` (gestión con `users:*` y `roles:*`) |

## Sesión

El access token (5 min) vive en memoria; el refresh token va en una cookie httpOnly y se rota. Si la sesión expira se vuelve al login. Además se cierra tras 15 minutos de inactividad.

## Producción

`npm run build` genera `dist/sagi`. Sirva esos archivos detrás del mismo dominio que la API (o ajuste `API` en `src/app/config.ts` y `CORS_ORIGINS` en el backend).
