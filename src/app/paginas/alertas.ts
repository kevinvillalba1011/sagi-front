import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Ico } from '../compartido/ico';
import { Paginador } from '../compartido/paginador';
import { Stat } from '../compartido/stat';
import { exportarCsv, mensajeError } from '../compartido/util';
import { Pagina, Producto, estadoProducto } from '../models';
import { ApiService } from '../servicios/api';
import { SesionService } from '../servicios/sesion';
import { UiService } from '../servicios/ui';

type Filtro = '' | 'OUT_OF_STOCK' | 'LOW_STOCK';
const TAM = 8;

@Component({
  selector: 'app-alertas',
  imports: [Stat, Ico, Paginador],
  template: `
    <div class="grid">
      <app-stat class="card b-re" l="Agotados" [n]="conteos()[0]" s="Requieren reposición urgente" c="c-re" />
      <app-stat class="card b-am" l="Bajo stock mínimo" [n]="conteos()[1]" s="Programar compra" c="c-am" />
    </div>
    <div class="card">
      <div class="bar">
        <h2>Productos en o bajo el mínimo</h2>
        <span class="sm mu">{{ total() }} resultados</span>
        <span class="sp"></span>
        @for (f of filtros(); track f[0]) {
          <button class="chip" type="button" [class.on]="filtro() === f[0]" (click)="filtrar(f[0])">{{ f[1] }} ({{ f[2] }})</button>
        }
        <button class="btn s" type="button" (click)="exportar()"><app-ico name="dl" [size]="14" />Exportar CSV</button>
        <button class="btn s" type="button" (click)="imprimir()"><app-ico name="print" [size]="14" />Imprimir</button>
      </div>
      @if (productos().length) {
        <div class="tw">
          <table>
            <thead>
              <tr><th>Producto</th><th>Categoría</th><th class="r">Actual</th><th class="r">Mínimo</th><th class="r">Faltante</th><th>Estado</th>@if (puedeMover) { <th>Acción</th> }</tr>
            </thead>
            <tbody>
              @for (p of productos(); track p.id) {
                <tr>
                  <td data-label="Producto">{{ p.name }}</td>
                  <td data-label="Categoría">{{ p.category?.name }}</td>
                  <td class="r" data-label="Actual">{{ p.stock }}</td>
                  <td class="r" data-label="Mínimo">{{ p.minStock }}</td>
                  <td class="r" data-label="Faltante">{{ p.minStock - p.stock }}</td>
                  <td data-label="Estado"><span class="tag" [class]="estado(p)[1]">{{ estado(p)[0] }}</span></td>
                  @if (puedeMover) {
                    <td data-label="Acción"><button class="btn s p" type="button" (click)="entrada(p.id)">Registrar entrada</button></td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty">{{ lista.isLoading() ? 'Cargando…' : 'No hay productos en alerta.' }}</div>
      }
      <app-paginador [(pagina)]="pagina" [paginas]="totalPaginas()" />
    </div>
  `,
})
export class Alertas {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private router = inject(Router);
  protected puedeMover = inject(SesionService).has('movements:create');
  protected estado = estadoProducto;
  protected filtro = signal<Filtro>('');
  protected pagina = signal(1);

  private cuenta = resource({
    params: () => this.ui.version(),
    loader: async () => {
      const n = async (stockStatus?: string) => (await this.api.get<Pagina<Producto>>('/inventory/alerts', { stockStatus, limit: 1 })).meta.total;
      return Promise.all([n('OUT_OF_STOCK'), n('LOW_STOCK')]);
    },
  });
  protected conteos = computed(() => (this.cuenta.hasValue() ? this.cuenta.value() : [0, 0]));
  protected filtros = computed((): [Filtro, string, number][] => {
    const [a, b] = this.conteos();
    return [['', 'Todos', a + b], ['OUT_OF_STOCK', 'Agotado', a], ['LOW_STOCK', 'Bajo stock', b]];
  });

  protected lista = resource({
    params: () => ({ stockStatus: this.filtro(), page: this.pagina(), v: this.ui.version() }),
    loader: ({ params: { v, ...q } }) => this.api.get<Pagina<Producto>>('/inventory/alerts', { ...q, limit: TAM }),
  });
  protected productos = computed(() => (this.lista.hasValue() ? this.lista.value().data : []));
  protected total = computed(() => (this.lista.hasValue() ? this.lista.value().meta.total : 0));
  protected totalPaginas = computed(() => (this.lista.hasValue() ? this.lista.value().meta.totalPages : 1));

  protected filtrar(f: Filtro) { this.filtro.set(f); this.pagina.set(1); }
  protected entrada(id: string) { this.router.navigate(['/movimientos'], { queryParams: { p: id } }); }
  protected imprimir() { window.print(); }
  protected async exportar() {
    try {
      const todos = await this.api.todas<Producto>('/inventory/alerts', { stockStatus: this.filtro() });
      exportarCsv('alertas', ['Producto', 'Categoría', 'Actual', 'Mínimo', 'Faltante', 'Estado'], todos.map((p) => [p.name, p.category?.name ?? '', p.stock, p.minStock, p.minStock - p.stock, estadoProducto(p)[0]]));
      this.ui.mostrar('Archivo CSV generado.');
    } catch (err) {
      this.ui.mostrar(mensajeError(err), true);
    }
  }
}
