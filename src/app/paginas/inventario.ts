import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Ico } from '../compartido/ico';
import { Paginador } from '../compartido/paginador';
import { Stat } from '../compartido/stat';
import { exportarCsv, mensajeError } from '../compartido/util';
import { Categoria, Pagina, Producto, ResumenInventario, estadoProducto } from '../models';
import { ApiService } from '../servicios/api';
import { UiService } from '../servicios/ui';

type Columna = 'code' | 'name' | 'category' | 'stock';
const TAM = 8;

@Component({
  selector: 'app-inventario',
  imports: [Stat, Ico, Paginador],
  template: `
    @if (resumen(); as s) {
      <div class="grid">
        <app-stat class="card" l="Unidades totales" [n]="s.totalUnits" [s]="'En ' + s.activeProducts + ' productos activos'" />
        <app-stat class="card" l="Productos disponibles" [n]="s.availableCount" [s]="porcentaje() + '% del catálogo'" c="c-gr" />
        <app-stat class="card" l="Categorías" [n]="s.categoriesCount" s="En el catálogo" />
      </div>
    }
    <div class="bar">
      <label style="display:flex;flex-direction:row;align-items:center;gap:.4rem">Categoría
        <select style="width:auto" aria-label="Filtrar por categoría" (change)="categoria.set($any($event.target).value); pagina.set(1)">
          <option value="">Todas</option>
          @for (c of categorias(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
        </select>
      </label>
      <span class="sp"></span>
      <button class="btn s" type="button" (click)="exportar()"><app-ico name="dl" [size]="14" />Exportar CSV</button>
      <button class="btn s" type="button" (click)="imprimir()"><app-ico name="print" [size]="14" />Imprimir</button>
    </div>
    <div class="two2">
      <div class="card">
        <h2>Existencias por producto</h2>
        <p class="mu sm">Cantidad disponible actual</p>
        @if (productos().length) {
          <div class="tw">
            <table>
              <thead>
                <tr>
                  @for (c of cols; track c[0]) {
                    <th [class]="c[2]" [attr.aria-sort]="orden() === c[0] ? (dir() === 'asc' ? 'ascending' : 'descending') : 'none'"><button class="sb" type="button" (click)="ordenar(c[0])">{{ c[1] }}@if (orden() === c[0]) {<app-ico [name]="dir() === 'asc' ? 'up' : 'down'" [size]="12" />}</button></th>
                  }
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (p of productos(); track p.id) {
                  <tr>
                    <td class="cod" data-label="Código">{{ p.code }}</td>
                    <td data-label="Producto">{{ p.name }}</td>
                    <td data-label="Categoría">{{ p.category?.name }}</td>
                    <td class="r" data-label="Cantidad">{{ p.stock }}</td>
                    <td data-label="Estado"><span class="tag" [class]="estado(p)[1]">{{ estado(p)[0] }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty">{{ lista.isLoading() ? 'Cargando…' : 'No se encontraron productos.' }}</div>
        }
        <app-paginador [(pagina)]="pagina" [paginas]="totalPaginas()" />
      </div>
      <div class="card">
        <h2>Unidades por categoría</h2>
        <p class="mu sm">Distribución del inventario activo</p>
        @for (c of resumen()?.unitsByCategory ?? []; track c.category) {
          <div class="cb">
            <span>{{ c.category }}</span>
            <div><i [style.width.%]="c.units / maxCat() * 100"></i></div>
            <b>{{ c.units }}</b>
          </div>
        } @empty {
          <div class="empty">Sin datos.</div>
        }
      </div>
    </div>
  `,
})
export class Inventario {
  private api = inject(ApiService);
  private ui = inject(UiService);
  protected estado = estadoProducto;
  protected orden = signal<Columna>('name');
  protected dir = signal<'asc' | 'desc'>('asc');
  protected pagina = signal(1);
  protected categoria = signal('');
  protected cols: [Columna, string, string][] = [['code', 'Código', ''], ['name', 'Producto', ''], ['category', 'Categoría', ''], ['stock', 'Cantidad', 'r']];

  private res = resource({ params: () => this.ui.version(), loader: () => this.api.get<ResumenInventario>('/inventory/summary') });
  protected resumen = computed(() => (this.res.hasValue() ? this.res.value() : null));
  protected porcentaje = computed(() => { const s = this.resumen(); return s && s.activeProducts ? Math.round((s.availableCount / s.activeProducts) * 100) : 0; });
  protected maxCat = computed(() => Math.max(1, ...(this.resumen()?.unitsByCategory.map((c) => c.units) ?? [1])));

  private cat = resource({ loader: () => this.api.get<Categoria[]>('/categories') });
  protected categorias = computed(() => (this.cat.hasValue() ? this.cat.value() : []));

  private consulta = computed(() => ({ sortBy: this.orden(), order: this.dir(), search: this.ui.busqueda(), categoryId: this.categoria() }));
  protected lista = resource({
    params: () => ({ ...this.consulta(), page: this.pagina(), v: this.ui.version() }),
    loader: ({ params: { v, ...q } }) => this.api.get<Pagina<Producto>>('/inventory', { ...q, limit: TAM }),
  });
  protected productos = computed(() => (this.lista.hasValue() ? this.lista.value().data : []));
  protected totalPaginas = computed(() => (this.lista.hasValue() ? this.lista.value().meta.totalPages : 1));

  constructor() {
    effect(() => { this.ui.busqueda(); untracked(() => this.pagina.set(1)); });
  }

  protected ordenar(c: Columna) {
    if (this.orden() === c) this.dir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { this.orden.set(c); this.dir.set('asc'); }
    this.pagina.set(1);
  }

  protected imprimir() { window.print(); }
  protected async exportar() {
    try {
      const todos = await this.api.todas<Producto>('/inventory', this.consulta());
      exportarCsv('inventario', ['Código', 'Producto', 'Categoría', 'Cantidad', 'Estado'], todos.map((p) => [p.code, p.name, p.category?.name ?? '', p.stock, estadoProducto(p)[0]]));
      this.ui.mostrar('Archivo CSV generado.');
    } catch (err) {
      this.ui.mostrar(mensajeError(err), true);
    }
  }
}
