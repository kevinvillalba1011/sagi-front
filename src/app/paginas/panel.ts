import { Component, computed, inject, resource } from '@angular/core';
import { Stat } from '../compartido/stat';
import { diaCorto } from '../compartido/util';
import { Pagina, Producto, ResumenInventario, estadoProducto } from '../models';
import { ApiService } from '../servicios/api';
import { SesionService } from '../servicios/sesion';
import { UiService } from '../servicios/ui';

@Component({
  selector: 'app-panel',
  imports: [Stat],
  template: `
    @if (verResumen) {
      @if (r.error()) {
        <div class="card"><div class="empty">No se pudo cargar el resumen.</div></div>
      } @else if (resumen(); as s) {
        <div class="grid">
          <app-stat class="card" l="Productos activos" [n]="s.activeProducts" [s]="s.totalUnits + ' unidades en existencia'" c="c-gr" />
          <app-stat class="card" l="Movimientos hoy" [n]="s.todayMovements.total" [s]="s.todayMovements.in + ' entradas · ' + s.todayMovements.out + ' salidas'" />
          @if (verAlertas) {
            <app-stat class="card" l="Alertas de stock bajo" [n]="s.lowStockCount" [s]="s.outOfStockCount + ' agotados'" c="c-am" />
          }
          <app-stat class="card" l="Categorías activas" [n]="s.categoriesCount" s="En el catálogo" />
        </div>
        <div class="two2" [style.grid-template-columns]="verAlertas ? null : '1fr'">
          <div class="card">
            <h2>Entradas vs. salidas</h2>
            <p class="mu sm">Últimos 7 días (unidades)</p>
            <div class="ch" role="img" aria-label="Entradas y salidas de los últimos 7 días">
              @for (d of dias(); track d.date) {
                <div class="cc">
                  <div class="bb"><i class="g" [style.height.%]="d.in / maximo() * 100"></i><i class="b" [style.height.%]="d.out / maximo() * 100"></i></div>
                  <span>{{ d.n }}</span>
                </div>
              }
            </div>
            <p class="sm mu" style="margin-top:.6rem"><span class="dot" style="background:var(--cg);margin-left:0"></span>Entradas<span class="dot" style="background:var(--cp)"></span>Salidas</p>
          </div>
          @if (verAlertas) {
            <div class="card">
              <h2>Alertas recientes</h2>
              <p class="mu sm">Productos en o bajo el stock mínimo</p>
              @for (p of alertas(); track p.id) {
                <div class="li">
                  <span class="dot" [style.background]="p.stock === 0 ? 'var(--re)' : 'var(--am)'"></span>
                  <div class="g">{{ p.name }}</div>
                  <span class="sm mu">{{ p.stock }} / {{ p.minStock }}</span>
                  <span class="tag" [class]="estado(p)[1]">{{ estado(p)[0] }}</span>
                </div>
              } @empty {
                <div class="empty">Sin alertas.</div>
              }
            </div>
          }
        </div>
      } @else {
        <div class="card"><div class="empty">Cargando…</div></div>
      }
    } @else {
      <div class="card">
        <h2>Bienvenido, {{ sesion.nombre() }}</h2>
        <p class="mu sm">Su rol ({{ sesion.rol() }}) no incluye el resumen de inventario. Use el menú para acceder a sus funciones.</p>
      </div>
    }
  `,
})
export class Panel {
  protected sesion = inject(SesionService);
  private api = inject(ApiService);
  private ui = inject(UiService);
  protected verResumen = this.sesion.has('inventory:read');
  protected verAlertas = this.sesion.has('alerts:read');
  protected estado = estadoProducto;

  protected r = resource({
    params: () => (this.verResumen ? this.ui.version() : undefined),
    loader: () => this.api.get<ResumenInventario>('/inventory/summary'),
  });
  private a = resource({
    params: () => (this.verResumen && this.verAlertas ? this.ui.version() : undefined),
    loader: () => this.api.get<Pagina<Producto>>('/inventory/alerts', { limit: 5 }),
  });

  protected resumen = computed(() => (this.r.hasValue() ? this.r.value() : null));
  protected alertas = computed(() => (this.a.hasValue() ? this.a.value().data : []));
  protected dias = computed(() => (this.resumen()?.last7Days ?? []).map((d) => ({ ...d, n: diaCorto(d.date) })));
  protected maximo = computed(() => Math.max(1, ...this.dias().map((d) => Math.max(d.in, d.out))));
}
