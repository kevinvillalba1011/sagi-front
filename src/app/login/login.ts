import { Component, inject, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Logo } from '../compartido/ico';
import { Ojo } from '../compartido/ojo';
import { mensajeError, primerError } from '../compartido/util';
import { SesionService } from '../servicios/sesion';

@Component({
  selector: 'app-login',
  imports: [FormField, Logo, Ojo],
  template: `
    <section id="login">
      <div class="lf">
        <div class="lb"><app-logo [size]="72" />SAGI</div>
        <h2>Control total de tu inventario</h2>
        <p>Registra productos, controla entradas y salidas, y consulta el estado de tus existencias en un solo lugar.</p>
      </div>
      <div class="rt">
        <form novalidate (submit)="entrar($event)">
          <div><p class="mu sm">Bienvenido de nuevo</p><h1>Ingresa a tu cuenta</h1></div>
          <label>Usuario
            <input type="text" autocomplete="username" [formField]="f.username" [attr.aria-invalid]="error(f.username) ? 'true' : null" />
            <em class="fe" role="alert">{{ error(f.username) }}</em>
          </label>
          <label>Contraseña
            <div class="pw"><input [type]="ver() ? 'text' : 'password'" autocomplete="current-password" [formField]="f.password" [attr.aria-invalid]="error(f.password) ? 'true' : null" /><app-ojo [(visible)]="ver" /></div>
            <em class="fe" role="alert">{{ error(f.password) }}</em>
          </label>
          <button class="btn p" type="submit" [disabled]="cargando()">Iniciar sesión</button>
          <p class="sm" id="lm" role="status">{{ mensaje() }}</p>
          <p class="sm mu">Las cuentas las crea el Super Administrador, quien también asigna el rol. Si olvidó su contraseña, solicite que la restablezca.</p>
        </form>
      </div>
    </section>
  `,
})
export class Login {
  private sesion = inject(SesionService);
  private router = inject(Router);
  protected modelo = signal({ username: '', password: '' });
  protected f = form(this.modelo, (p) => {
    required(p.username, { message: 'Ingrese su usuario.' });
    required(p.password, { message: 'Ingrese su contraseña.' });
  });
  protected ver = signal(false);
  protected cargando = signal(false);
  protected mensaje = signal(this.sesion.aviso());

  protected error(c: typeof this.f.username) { return c().touched() ? primerError(c()) : ''; }

  protected async entrar(e: Event) {
    e.preventDefault();
    this.f().markAsTouched();
    if (this.f().invalid()) return;
    this.sesion.aviso.set('');
    this.mensaje.set('');
    this.cargando.set(true);
    try {
      const { username, password } = this.modelo();
      const u = await this.sesion.login(username.trim(), password);
      this.router.navigate([u.mustChangePassword ? '/cambiar-clave' : '/panel']);
    } catch (err) {
      this.mensaje.set(mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }
}
