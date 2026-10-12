import { Component, ElementRef, computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Confirmar } from '../compartido/confirmar';
import { Ico, Logo } from '../compartido/ico';
import { VISTAS } from '../models';
import { ApiService } from '../servicios/api';
import { SesionService } from '../servicios/sesion';
import { UiService } from '../servicios/ui';

/** Marco de la aplicación: menú según permisos, encabezado con búsqueda y tema, y zona de mensajes. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Ico, Logo, Confirmar],
  host: { '(document:click)': 'clicFuera($event)', '(document:keydown.escape)': 'cerrarMenu(true)' },
  template: `
    <div id="app">
      <aside>
        <div class="brand"><app-logo [size]="30" />SAGI</div>
        <nav aria-label="Principal">
          @for (v of menu(); track v.k) {
            <button type="button" [class.on]="v.k === actual().k" [attr.aria-current]="v.k === actual().k ? 'page' : null" (click)="ir(v.k)">
              <app-ico [name]="v.icono" [size]="17" /><span class="t">{{ v.nombre }}</span>
              @if (v.k === 'alertas' && alertas()) {
                <span class="cnt" [attr.aria-label]="alertas() + ' alertas'">{{ alertas() }}</span>
              }
            </button>
          }
        </nav>
        <div class="usr">
          <div class="av">{{ iniciales() }}</div>
          <div><span>{{ sesion.nombre() }}</span><small>{{ sesion.rol() }}</small></div>
        </div>
      </aside>
      <main>
        <div class="top">
          <h1>{{ actual().titulo }}</h1>
          @if (sesion.soloConsulta()) { <span class="tag in">Solo consulta</span> }
          @if (buscable()) {
            <input type="search" placeholder="Buscar producto o código…" aria-label="Buscar producto o código" [value]="ui.q()" (input)="ui.q.set($any($event.target).value)" />
          }
          <button class="ic" type="button" title="Actualizar" aria-label="Actualizar" (click)="actualizar()"><app-ico name="refresh" /></button>
          <button class="ic" type="button" title="Cambiar tema" aria-label="Cambiar tema claro u oscuro" (click)="ui.alternarTema()"><app-ico [name]="ui.oscuro() ? 'sun' : 'moon'" /></button>
          <div class="um">
            <button class="av avb" type="button" aria-haspopup="menu" aria-label="Menú de usuario" [attr.aria-expanded]="menuAbierto()" [title]="sesion.nombre() + ' · ' + sesion.rol()" (click)="alternarMenu()">{{ iniciales() }}</button>
            @if (menuAbierto()) {
              <div class="mn" role="menu" aria-label="Usuario" tabindex="-1" (keydown)="teclas($event)">
                <div class="mi"><b>{{ sesion.nombre() }}</b><small>{{ sesion.rol() }}</small><small>{{ sesion.usuario()?.email }}</small></div>
                <button type="button" role="menuitem" (click)="cambiarClave()"><app-ico name="clave" [size]="16" />Cambiar contraseña</button>
                <button type="button" role="menuitem" class="sal" (click)="salir()"><app-ico name="salir" [size]="16" />Cerrar sesión</button>
              </div>
            }
          </div>
        </div>
        @if (ui.mensaje(); as m) {
          <div class="msg" [class.er]="m.error" role="status">{{ m.texto }}</div>
        }
        <div id="v"><router-outlet /></div>
      </main>
    </div>
    <app-confirmar />
  `,
})
export class Shell {
  protected sesion = inject(SesionService);
  protected ui = inject(UiService);
  protected router = inject(Router);
  private api = inject(ApiService);
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  protected menuAbierto = signal(false);

  private url = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );

  protected menu = computed(() => VISTAS.filter((v) => this.sesion.can(v.k)));
  protected actual = computed(() => VISTAS.find((v) => this.url().split('?')[0].startsWith('/' + v.k)) ?? VISTAS[0]);
  protected buscable = computed(() => ['productos', 'inventario', 'historial'].includes(this.actual().k));
  protected iniciales = computed(() => {
    const n = this.sesion.nombre(), w = n.split(' ');
    return (w.length > 1 ? w[0][0] + w[1][0] : n.slice(0, 2)).toUpperCase();
  });

  /** Cantidad de alertas del menú (productos en o bajo el mínimo). */
  private conteo = resource({
    params: () => (this.sesion.has('alerts:read') ? this.ui.version() : undefined),
    loader: async () => (await this.api.get<{ meta: { total: number } }>('/inventory/alerts', { limit: 1 })).meta.total,
  });
  protected alertas = computed(() => (this.conteo.hasValue() ? this.conteo.value() : 0));

  constructor() {
    // Al cambiar de pantalla se limpia la búsqueda para no arrastrarla.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.ui.q.set(''));
  }

  protected ir(k: string) { this.router.navigate(['/' + k]); }
  protected actualizar() { this.ui.recargar(); this.ui.mostrar('Datos actualizados.'); }
  protected salir() { this.cerrarMenu(); this.ui.q.set(''); this.sesion.cerrar(); }
  protected cambiarClave() { this.cerrarMenu(); this.router.navigate(['/cambiar-clave']); }

  protected alternarMenu() {
    this.menuAbierto.update((v) => !v);
    if (this.menuAbierto()) setTimeout(() => this.items()[0]?.focus());
  }
  protected cerrarMenu(devolverFoco = false) {
    if (!this.menuAbierto()) return;
    this.menuAbierto.set(false);
    if (devolverFoco) this.el.nativeElement.querySelector<HTMLElement>('.avb')?.focus();
  }
  protected clicFuera(e: Event) {
    if (this.menuAbierto() && !(e.target as HTMLElement).closest('.um')) this.cerrarMenu();
  }
  protected teclas(e: KeyboardEvent) {
    const it = this.items(), i = it.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); it[(i + 1) % it.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); it[(i - 1 + it.length) % it.length]?.focus(); }
    else if (e.key === 'Tab') this.cerrarMenu();
  }
  private items() { return [...this.el.nativeElement.querySelectorAll<HTMLElement>('.mn [role=menuitem]')]; }
}
