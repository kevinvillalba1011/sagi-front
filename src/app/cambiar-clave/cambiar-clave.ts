import { Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, pattern, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Logo } from '../compartido/ico';
import { Ojo } from '../compartido/ojo';
import { mensajeError, primerError } from '../compartido/util';
import { SesionService } from '../servicios/sesion';

/** Cambio de contraseña; es obligatorio en el primer ingreso o tras un restablecimiento. */
@Component({
  selector: 'app-cambiar-clave',
  imports: [FormField, Logo, Ojo],
  template: `
    <section id="login">
      <div class="lf">
        <div class="lb"><app-logo [size]="72" />SAGI</div>
        <h2>Protege tu cuenta</h2>
        <p>Define una contraseña personal para continuar.</p>
      </div>
      <div class="rt">
        <form novalidate (submit)="guardar($event)">
          <div>
            <p class="mu sm">{{ sesion.nombre() }}</p>
            <h1>Cambiar contraseña</h1>
          </div>
          @if (sesion.usuario()?.mustChangePassword) {
            <p class="sm" role="status">Por seguridad debe cambiar la contraseña temporal antes de usar el sistema.</p>
          }
          <label>Contraseña actual
            <div class="pw"><input [type]="ver() ? 'text' : 'password'" autocomplete="current-password" [formField]="f.actual" [attr.aria-invalid]="error(f.actual) ? 'true' : null" /><app-ojo [(visible)]="ver" /></div>
            <em class="fe" role="alert">{{ error(f.actual) }}</em>
          </label>
          <label>Nueva contraseña
            <div class="pw"><input [type]="ver() ? 'text' : 'password'" autocomplete="new-password" [formField]="f.nueva" [attr.aria-invalid]="error(f.nueva) ? 'true' : null" /><app-ojo [(visible)]="ver" /></div>
            <em class="fe" role="alert">{{ error(f.nueva) }}</em>
          </label>
          <label>Confirmar nueva contraseña
            <div class="pw"><input [type]="ver() ? 'text' : 'password'" autocomplete="new-password" [formField]="f.confirmar" [attr.aria-invalid]="error(f.confirmar) ? 'true' : null" /><app-ojo [(visible)]="ver" /></div>
            <em class="fe" role="alert">{{ error(f.confirmar) }}</em>
          </label>
          <p class="sm mu">Mínimo 8 caracteres, con letras y números.</p>
          <button class="btn p" type="submit" [disabled]="cargando()">Guardar contraseña</button>
          <p class="sm" id="lm" role="status">{{ mensaje() }}</p>
          <button class="btn s" type="button" (click)="salir()">Cerrar sesión</button>
        </form>
      </div>
    </section>
  `,
})
export class CambiarClave {
  protected sesion = inject(SesionService);
  private router = inject(Router);
  protected modelo = signal({ actual: '', nueva: '', confirmar: '' });
  protected f = form(this.modelo, (p) => {
    required(p.actual, { message: 'Ingrese su contraseña actual.' });
    required(p.nueva, { message: 'Ingrese la nueva contraseña.' });
    minLength(p.nueva, 8, { message: 'Debe tener al menos 8 caracteres.' });
    pattern(p.nueva, /^(?=.*[A-Za-z])(?=.*\d).*$/, { message: 'Debe incluir letras y números.' });
    required(p.confirmar, { message: 'Confirme la nueva contraseña.' });
    validate(p.confirmar, ({ value, valueOf }) =>
      value() && value() !== valueOf(p.nueva) ? { kind: 'distinta', message: 'Las contraseñas no coinciden.' } : undefined);
  });
  protected ver = signal(false);
  protected cargando = signal(false);
  protected mensaje = signal('');

  protected error(c: typeof this.f.actual) { return c().touched() ? primerError(c()) : ''; }

  protected async guardar(e: Event) {
    e.preventDefault();
    this.f().markAsTouched();
    if (this.f().invalid()) return;
    this.cargando.set(true);
    try {
      const m = this.modelo();
      await this.sesion.cambiarClave(m.actual, m.nueva);
      this.router.navigate(['/panel']);
    } catch (err) {
      this.mensaje.set(mensajeError(err));
    } finally {
      this.cargando.set(false);
    }
  }

  protected salir() { this.sesion.cerrar(); }
}
