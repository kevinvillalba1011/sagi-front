import { HttpClient } from '@angular/common/http';
import { Service, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API, INACTIVIDAD_MIN } from '../config';
import { PERMISO_VISTA, UsuarioSesion, nombreRol } from '../models';

interface RespuestaAuth { accessToken: string; expiresIn: number }

/**
 * Sesión (RF06): el access token vive solo en memoria; el refresh token va en una cookie httpOnly.
 * Los permisos vienen del backend (roles dinámicos); el Super Administrador tiene todos.
 */
@Service()
export class SesionService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly usuario = signal<UsuarioSesion | null>(null);
  readonly aviso = signal(''); // texto en el login (p. ej. cierre por inactividad)
  readonly nombre = computed(() => this.usuario()?.fullName ?? 'Usuario');
  readonly rol = computed(() => { const r = this.usuario()?.role; return r ? nombreRol(r) : ''; });
  readonly esSuper = computed(() => !!this.usuario()?.role.isSuperAdmin);
  readonly soloConsulta = computed(() => !this.has('movements:create') && !this.has('products:create') && !this.has('products:update') && !this.esSuper());

  private token: string | null = null;
  private restaurado = false;
  private renovando?: Promise<boolean>;
  private temporizador?: ReturnType<typeof setTimeout>;
  private reiniciar = () => this.armar();

  get accessToken() { return this.token; }

  has(permiso: string): boolean {
    const u = this.usuario();
    return !!u && (u.role.isSuperAdmin || u.permissions.includes(permiso));
  }

  can(vista: string): boolean {
    if (!this.usuario()) return false;
    if (vista === 'panel') return true;
    return this.has(PERMISO_VISTA[vista] ?? '');
  }

  /** Intenta recuperar la sesión con la cookie de refresco (una sola vez al abrir la app). */
  async restaurar(): Promise<void> {
    if (this.restaurado) return;
    this.restaurado = true;
    if (await this.renovar()) await this.cargarUsuario();
  }

  async login(username: string, password: string): Promise<UsuarioSesion> {
    const r = await firstValueFrom(this.http.post<RespuestaAuth>(`${API}/auth/login`, { username, password }, { withCredentials: true }));
    this.token = r.accessToken;
    this.restaurado = true;
    return this.entrar();
  }

  async cambiarClave(currentPassword: string, newPassword: string): Promise<UsuarioSesion> {
    const r = await firstValueFrom(this.http.post<RespuestaAuth>(`${API}/auth/change-password`, { currentPassword, newPassword }, { withCredentials: true }));
    this.token = r.accessToken;
    return this.entrar();
  }

  /** Pide un nuevo access token; las peticiones simultáneas comparten la misma renovación. */
  renovar(): Promise<boolean> {
    this.renovando ??= firstValueFrom(this.http.post<RespuestaAuth>(`${API}/auth/refresh`, {}, { withCredentials: true }))
      .then((r) => { this.token = r.accessToken; return true; })
      .catch(() => { this.token = null; return false; })
      .finally(() => { this.renovando = undefined; });
    return this.renovando;
  }

  async cerrar(aviso = '', avisarServidor = true) {
    if (avisarServidor && this.token) await firstValueFrom(this.http.post(`${API}/auth/logout`, {}, { withCredentials: true })).catch(() => undefined);
    this.aviso.set(aviso);
    this.limpiar();
    this.router.navigate(['/login']);
  }

  /** Sesión vencida en el servidor: se limpia sin llamar a logout. */
  expirada() { return this.cerrar('Su sesión expiró. Inicie sesión de nuevo.', false); }

  private async entrar(): Promise<UsuarioSesion> {
    const u = await this.cargarUsuario();
    if (!u) throw new Error('sin usuario');
    return u;
  }

  private async cargarUsuario(): Promise<UsuarioSesion | null> {
    try {
      const u = await firstValueFrom(this.http.get<UsuarioSesion>(`${API}/auth/me`, { headers: { Authorization: `Bearer ${this.token}` }, withCredentials: true }));
      this.usuario.set(u);
      for (const e of ['click', 'keydown', 'mousemove', 'touchstart']) document.addEventListener(e, this.reiniciar);
      this.armar();
      return u;
    } catch {
      this.limpiar();
      return null;
    }
  }

  private limpiar() {
    clearTimeout(this.temporizador);
    for (const e of ['click', 'keydown', 'mousemove', 'touchstart']) document.removeEventListener(e, this.reiniciar);
    this.token = null;
    this.usuario.set(null);
  }

  private armar() {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.cerrar(`Su sesión se cerró tras ${INACTIVIDAD_MIN} minutos de inactividad.`), INACTIVIDAD_MIN * 60_000);
  }
}
