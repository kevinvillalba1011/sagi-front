import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, email, form, minLength, pattern, required } from '@angular/forms/signals';
import { Modal } from '../compartido/modal';
import { Paginador } from '../compartido/paginador';
import { mensajeError, primerError } from '../compartido/util';
import { MODULOS, Pagina, Permiso, Rol, Usuario, nombreRol } from '../models';
import { ApiService } from '../servicios/api';
import { SesionService } from '../servicios/sesion';
import { ConfirmarService } from '../servicios/confirmar';
import { UiService } from '../servicios/ui';

const CLAVE = /^(?=.*[A-Za-z])(?=.*\d).*$/;

@Component({
  selector: 'app-permisos',
  imports: [FormField, Modal, Paginador],
  template: `
    <div class="card">
      <div class="bar" style="margin-bottom:.4rem">
        <h2>Usuarios</h2>
        <span class="sp"></span>
        @if (puedeCrear) { <button class="btn p" type="button" (click)="abrirUsuario()">Nuevo usuario</button> }
      </div>
      <p class="mu sm">El rol asignado se aplica en el siguiente inicio de sesión del usuario. Toda contraseña nueva o restablecida debe cambiarse al ingresar.</p>

      @if (formUsuario()) {
        <app-modal titulo="Nuevo usuario" subtitulo="Recibirá una contraseña temporal que deberá cambiar al ingresar" (cerrar)="cerrarModales()">
        @if (errorModal()) { <p class="msg er" style="margin:0 0 .8rem" role="alert">{{ errorModal() }}</p> }
        <form class="f" novalidate (submit)="crearUsuario($event)">
          <div class="r2">
            <label>Nombre completo
              <input [formField]="fu.fullName" [attr.aria-invalid]="err(fu.fullName) ? 'true' : null" />
              <em class="fe" role="alert">{{ err(fu.fullName) }}</em>
            </label>
            <label>Usuario
              <input autocomplete="off" [formField]="fu.username" [attr.aria-invalid]="err(fu.username) ? 'true' : null" />
              <em class="fe" role="alert">{{ err(fu.username) }}</em>
            </label>
          </div>
          <div class="r2">
            <label>Correo electrónico
              <input type="email" autocomplete="off" [formField]="fu.email" [attr.aria-invalid]="err(fu.email) ? 'true' : null" />
              <em class="fe" role="alert">{{ err(fu.email) }}</em>
            </label>
            <label>Contraseña temporal
              <input type="text" autocomplete="off" [formField]="fu.password" [attr.aria-invalid]="err(fu.password) ? 'true' : null" />
              <em class="fe" role="alert">{{ err(fu.password) }}</em>
            </label>
          </div>
          <label>Rol
            <select [formField]="fu.roleId" [attr.aria-invalid]="err(fu.roleId) ? 'true' : null">
              <option value="">Seleccione…</option>
              @for (r of roles(); track r.id) { <option [value]="r.id">{{ nombreRol(r) }}</option> }
            </select>
            <em class="fe" role="alert">{{ err(fu.roleId) }}</em>
          </label>
          <div class="acts"><button class="btn" type="button" (click)="cerrarModales()">Cancelar</button><button class="btn p" type="submit" [disabled]="guardando()">Crear usuario</button></div>
        </form>
        </app-modal>
      }

      @if (usuarios().length) {
        <div class="tw">
          <table>
            <thead><tr><th>Usuario</th><th>Rol actual</th><th>Estado</th>@if (puedeEditar) { <th>Asignar rol</th><th>Acciones</th> }</tr></thead>
            <tbody>
              @for (u of usuarios(); track u.id) {
                <tr>
                  <td data-label="Usuario">{{ u.fullName }}<small class="mu" style="display:block">{{ u.username }} · {{ u.email }}</small>@if (u.id === sesion.usuario()?.id) { <span class="tag in">Usted</span> }</td>
                  <td data-label="Rol actual">{{ nombreRol(u.role) }}</td>
                  <td data-label="Estado"><span class="tag" [class.ok]="u.isActive" [class.ia]="!u.isActive">{{ u.isActive ? 'Activo' : 'Inactivo' }}</span>@if (u.mustChangePassword) { <span class="tag lo"> Debe cambiar clave</span> }</td>
                  @if (puedeEditar) {
                    <td data-label="Asignar rol">
                      @if (u.id !== sesion.usuario()?.id && roles().length) {
                        <select style="min-width:11rem" [attr.aria-label]="'Rol de ' + u.fullName" (change)="rolElegido.set({ id: u.id, rol: $any($event.target).value })">
                          @for (r of roles(); track r.id) { <option [value]="r.id" [selected]="r.id === u.role.id">{{ nombreRol(r) }}</option> }
                        </select>
                        @if (rolElegido()?.id === u.id && rolElegido()?.rol !== u.role.id) {
                          <button class="btn s p" type="button" (click)="cambiarRol(u)">Guardar</button>
                        }
                      } @else { <span class="sm mu">—</span> }
                    </td>
                    <td data-label="Acciones">
                      @if (u.id !== sesion.usuario()?.id) {
                        <button class="btn s" [class.d]="u.isActive" type="button" (click)="alternar(u)">{{ u.isActive ? 'Desactivar' : 'Activar' }}</button>
                        <button class="btn s" type="button" (click)="abrirReinicio(u)">Restablecer clave</button>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty">{{ lista.isLoading() ? 'Cargando…' : 'Sin usuarios.' }}</div>
      }
      <app-paginador [(pagina)]="pagina" [paginas]="totalPaginas()" />
    </div>

    @if (usuarioReinicio(); as u) {
      <app-modal titulo="Restablecer clave" [subtitulo]="u.fullName + ' (' + u.username + ')'" (cerrar)="cerrarModales()">
        @if (errorModal()) { <p class="msg er" style="margin:0 0 .8rem" role="alert">{{ errorModal() }}</p> }
        <form class="f" novalidate (submit)="restablecer($event, u)">
          <label>Nueva contraseña temporal
            <input type="text" autocomplete="off" [value]="claveNueva()" (input)="claveNueva.set($any($event.target).value)" />
          </label>
          <p class="sm mu">Mínimo 8 caracteres, con letras y números. El usuario deberá cambiarla al ingresar.</p>
          <div class="acts"><button class="btn" type="button" (click)="cerrarModales()">Cancelar</button><button class="btn p" type="submit" [disabled]="guardando()">Restablecer</button></div>
        </form>
      </app-modal>
    }

    @if (puedeRoles) {
      <div class="card">
        <div class="bar" style="margin-bottom:.4rem">
          <h2>Matriz de roles y permisos</h2>
          <span class="sp"></span>
          @if (puedeGestionar) { <button class="btn p" type="button" (click)="abrirRol()">Nuevo rol</button> }
        </div>
        <p class="mu sm">{{ puedeGestionar ? 'Marque los permisos de cada rol y pulse «Guardar». El Super Administrador siempre tiene todos.' : 'Permisos asignados a cada rol.' }}</p>

        @if (formRol()) {
          <app-modal titulo="Nuevo rol" subtitulo="Después de crearlo, marque sus permisos en la matriz" (cerrar)="cerrarModales()">
          @if (errorModal()) { <p class="msg er" style="margin:0 0 .8rem" role="alert">{{ errorModal() }}</p> }
          <form class="f" novalidate (submit)="crearRol($event)">
            <div class="r2">
              <label>Nombre del rol
                <input [formField]="fr.name" [attr.aria-invalid]="err(fr.name) ? 'true' : null" />
                <em class="fe" role="alert">{{ err(fr.name) }}</em>
              </label>
              <label>Descripción (opcional)
                <input [formField]="fr.description" />
              </label>
            </div>
            <div class="acts"><button class="btn" type="button" (click)="cerrarModales()">Cancelar</button><button class="btn p" type="submit" [disabled]="guardando()">Crear rol</button></div>
          </form>
          </app-modal>
        }

        <div class="tw">
          <table>
            <thead>
              <tr>
                <th>Permiso</th>
                @for (r of roles(); track r.id) { <th>{{ nombreRol(r) }}</th> }
              </tr>
            </thead>
            <tbody>
              @for (g of grupos(); track g[0]) {
                <tr><td [attr.colspan]="roles().length + 1" class="mu sm"><b>{{ modulos[g[0]] ?? g[0] }}</b></td></tr>
                @for (p of g[1]; track p.id) {
                  <tr>
                    <td data-label="Permiso">{{ p.description }}</td>
                    @for (r of roles(); track r.id) {
                      <td [attr.data-label]="r.name">
                        @if (r.isSuperAdmin) {
                          <span class="tag ok">Sí</span>
                        } @else if (puedeGestionar) {
                          <input type="checkbox" style="width:auto" [checked]="marcado(r, p.code)" [attr.aria-label]="p.description + ' — ' + r.name" (change)="alternarPermiso(r, p.code)" />
                        } @else if (marcado(r, p.code)) {
                          <span class="tag ok">Sí</span>
                        } @else { <span class="mu">—</span> }
                      </td>
                    }
                  </tr>
                }
              }
              @if (puedeGestionar) {
                <tr>
                  <td data-label="Acciones" class="sm mu">Acciones</td>
                  @for (r of roles(); track r.id) {
                    <td [attr.data-label]="r.name">
                      @if (cambios()[r.id]) {
                        <button class="btn s p" type="button" (click)="guardarRol(r)">Guardar</button>
                        <button class="btn s" type="button" (click)="descartar(r)">Descartar</button>
                      } @else if (!r.isSystem) {
                        <button class="btn s d" type="button" (click)="eliminarRol(r)">Eliminar</button>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class Permisos {
  private api = inject(ApiService);
  private ui = inject(UiService);
  protected sesion = inject(SesionService);
  private confirmar = inject(ConfirmarService);
  protected puedeCrear = this.sesion.has('users:create');
  protected puedeEditar = this.sesion.has('users:update');
  protected puedeRoles = this.sesion.has('roles:read');
  protected puedeGestionar = this.sesion.has('roles:manage');

  protected nombreRol = nombreRol;
  protected modulos = MODULOS;
  protected pagina = signal(1);
  protected guardando = signal(false);
  protected formUsuario = signal(false);
  protected formRol = signal(false);
  protected rolElegido = signal<{ id: string; rol: string } | null>(null);
  protected reiniciando = signal<string | null>(null);
  protected claveNueva = signal('');
  protected errorModal = signal('');
  protected usuarioReinicio = computed(() => this.usuarios().find((u) => u.id === this.reiniciando()) ?? null);
  protected cambios = signal<Record<string, string[]>>({});

  protected lista = resource({
    params: () => ({ page: this.pagina(), v: this.ui.version() }),
    loader: ({ params }) => this.api.get<Pagina<Usuario>>('/users', { page: params.page, limit: 10 }),
  });
  protected usuarios = computed(() => (this.lista.hasValue() ? this.lista.value().data : []));
  protected totalPaginas = computed(() => (this.lista.hasValue() ? this.lista.value().meta.totalPages : 1));

  private rolesRes = resource({
    params: () => (this.puedeRoles ? this.ui.version() : undefined),
    loader: () => this.api.get<Rol[]>('/roles'),
  });
  protected roles = computed(() => (this.rolesRes.hasValue() ? this.rolesRes.value() : []));
  private permisosRes = resource({
    params: () => (this.puedeRoles ? 1 : undefined),
    loader: () => this.api.get<Permiso[]>('/permissions'),
  });
  protected grupos = computed((): [string, Permiso[]][] => {
    const m = new Map<string, Permiso[]>();
    for (const p of this.permisosRes.hasValue() ? this.permisosRes.value() : []) m.set(p.module, [...(m.get(p.module) ?? []), p]);
    return [...m.entries()];
  });

  protected mu = { username: '', fullName: '', email: '', password: '', roleId: '' };
  protected modeloU = signal({ ...this.mu });
  protected fu = form(this.modeloU, (p) => {
    required(p.fullName, { message: 'Ingrese el nombre.' });
    minLength(p.fullName, 2, { message: 'Mínimo 2 caracteres.' });
    required(p.username, { message: 'Ingrese el usuario.' });
    minLength(p.username, 3, { message: 'Mínimo 3 caracteres.' });
    pattern(p.username, /^[a-z0-9._-]*$/, { message: 'Solo minúsculas, números, punto, guion y guion bajo.' });
    required(p.email, { message: 'Ingrese el correo.' });
    email(p.email, { message: 'Correo no válido.' });
    required(p.password, { message: 'Ingrese una contraseña temporal.' });
    minLength(p.password, 8, { message: 'Mínimo 8 caracteres.' });
    pattern(p.password, CLAVE, { message: 'Debe incluir letras y números.' });
    required(p.roleId, { message: 'Seleccione el rol.' });
  });

  protected modeloR = signal({ name: '', description: '' });
  protected fr = form(this.modeloR, (p) => { required(p.name, { message: 'Ingrese el nombre del rol.' }); });

  protected err(c: { (): { touched(): boolean; errors(): readonly { message?: string }[] } }) { return c().touched() ? primerError(c()) : ''; }

  private async ejecutar(accion: () => Promise<unknown>, ok: string): Promise<boolean> {
    this.guardando.set(true);
    try {
      await accion();
      this.ui.mostrar(ok);
      this.ui.recargar();
      return true;
    } catch (e) {
      const m = mensajeError(e);
      if (this.formUsuario() || this.formRol() || this.reiniciando()) this.errorModal.set(m);
      else this.ui.mostrar(m, true);
      return false;
    } finally {
      this.guardando.set(false);
    }
  }

  protected abrirUsuario() { this.fu().reset({ ...this.mu }); this.errorModal.set(''); this.formUsuario.set(true); }
  protected abrirRol() { this.fr().reset({ name: '', description: '' }); this.errorModal.set(''); this.formRol.set(true); }
  protected abrirReinicio(u: Usuario) { this.claveNueva.set(''); this.errorModal.set(''); this.reiniciando.set(u.id); }
  protected cerrarModales() { this.formUsuario.set(false); this.formRol.set(false); this.reiniciando.set(null); this.errorModal.set(''); }

  protected async crearUsuario(e: Event) {
    e.preventDefault();
    this.fu().markAsTouched();
    if (this.fu().invalid()) return;
    const m = this.modeloU();
    const ok = await this.ejecutar(() => this.api.post('/users', { ...m, username: m.username.trim(), fullName: m.fullName.trim(), email: m.email.trim() }), 'Usuario creado. Deberá cambiar la contraseña al ingresar.');
    if (ok) { this.fu().reset({ ...this.mu }); this.formUsuario.set(false); }
  }

  protected async cambiarRol(u: Usuario) {
    const sel = this.rolElegido();
    if (!sel) return;
    if (await this.ejecutar(() => this.api.patch(`/users/${u.id}`, { roleId: sel.rol }), 'Rol actualizado; se aplica en el próximo inicio de sesión.')) this.rolElegido.set(null);
  }

  protected async alternar(u: Usuario) {
    if (u.isActive && !(await this.confirmar.preguntar({ titulo: 'Desactivar usuario', mensaje: `${u.fullName} (${u.username}) ya no podrá iniciar sesión. Puede reactivarlo cuando quiera.`, confirmar: 'Desactivar', peligro: true }))) return;
    await this.ejecutar(() => this.api.patch(`/users/${u.id}`, { isActive: !u.isActive }), u.isActive ? 'Usuario desactivado.' : 'Usuario activado.');
  }

  protected async restablecer(e: Event, u: Usuario) {
    e.preventDefault();
    const c = this.claveNueva();
    if (c.length < 8 || !CLAVE.test(c)) { this.errorModal.set('La clave debe tener mínimo 8 caracteres, con letras y números.'); return; }
    if (await this.ejecutar(() => this.api.post(`/users/${u.id}/reset-password`, { password: c }), 'Clave restablecida. El usuario deberá cambiarla al ingresar.')) { this.reiniciando.set(null); this.claveNueva.set(''); }
  }

  protected async crearRol(e: Event) {
    e.preventDefault();
    this.fr().markAsTouched();
    if (this.fr().invalid()) return;
    const m = this.modeloR();
    if (await this.ejecutar(() => this.api.post('/roles', { name: m.name.trim(), description: m.description.trim() || undefined, permissions: [] }), 'Rol creado; marque sus permisos y guarde.')) {
      this.fr().reset({ name: '', description: '' });
      this.formRol.set(false);
    }
  }

  protected marcado(r: Rol, code: string): boolean {
    return (this.cambios()[r.id] ?? r.permissions.map((p) => p.code)).includes(code);
  }
  protected alternarPermiso(r: Rol, code: string) {
    const actual = this.cambios()[r.id] ?? r.permissions.map((p) => p.code);
    const nuevo = actual.includes(code) ? actual.filter((c) => c !== code) : [...actual, code];
    this.cambios.update((c) => ({ ...c, [r.id]: nuevo }));
  }
  protected descartar(r: Rol) { this.cambios.update(({ [r.id]: _, ...resto }) => resto); }
  protected async guardarRol(r: Rol) {
    const perms = this.cambios()[r.id];
    if (perms && (await this.ejecutar(() => this.api.patch(`/roles/${r.id}`, { permissions: perms }), `Permisos de «${r.name}» actualizados.`))) this.descartar(r);
  }
  protected async eliminarRol(r: Rol) {
    if (!(await this.confirmar.preguntar({ titulo: 'Eliminar rol', mensaje: `Se eliminará el rol «${r.name}». Solo es posible si no tiene usuarios asignados. Esta acción no se puede deshacer.`, confirmar: 'Eliminar', peligro: true }))) return;
    await this.ejecutar(() => this.api.delete(`/roles/${r.id}`), `Rol «${r.name}» eliminado.`);
  }
}
