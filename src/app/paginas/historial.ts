import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { Ico } from '../compartido/ico';
import { Paginador } from '../compartido/paginador';
import { exportarCsv, fechaHora, mensajeError } from '../compartido/util';
import { Movimiento, Pagina } from '../models';
import { ApiService } from '../servicios/api';
import { UiService } from '../servicios/ui';

type Tipo = '' | 'IN' | 'OUT';
const TAM = 8;

@Component({
  selector: 'app-historial',
  imports: [Ico, Paginador],
  template: `
    <div class="bar">
      @for (f of filtros; track f[0]) {
        <button class="chip" type="button" [class.on]="tipo() === f[0]" (click)="filtrar(f[0])">{{ f[1] }}</button>
      }
      <span class="sp"></span>
      <label style="display:flex;flex-direction:row;align-items:center;gap:.4rem">Desde<input type="date" [value]="desde()" (change)="fecha(desde, $any($event.target).value)" style="width:auto" /></label>
      <label style="display:flex;flex-direction:row;align-items:center;gap:.4rem">Hasta<input type="date" [value]="hasta()" (change)="fecha(hasta, $any($event.target).value)" style="width:auto" /></label>
      <button class="btn s" type="button" (click)="exportar()"><app-ico name="dl" [size]="14" />Exportar CSV</button>
      <button class="btn s" type="button" (click)="imprimir()"><app-ico name="print" [size]="14" />Imprimir</button>
    </div>
    <div class="card">
      <p class="mu sm" style="margin-bottom:.6rem">Registro de solo lectura: los movimientos no se editan ni se eliminan. «Saldo» es la existencia del producto después del movimiento.</p>
      @if (error()) {
        <div class="empty">{{ error() }}</div>
      } @else if (movimientos().length) {
        <div class="tw">
          <table>
            <thead>
              <tr>
                <th [attr.aria-sort]="orden() === 'asc' ? 'ascending' : 'descending'"><button class="sb" type="button" (click)="invertir()">Fecha<app-ico [name]="orden() === 'asc' ? 'up' : 'down'" [size]="12" /></button></th>
                <th>Producto</th><th>Código</th><th>Tipo</th><th class="r">Cantidad</th><th class="r">Saldo</th><th>Motivo</th><th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              @for (m of movimientos(); track m.id) {
                <tr>
                  <td class="cod" data-label="Fecha">{{ fechaHora(m.createdAt) }}</td>
                  <td data-label="Producto">{{ m.product.name }}</td>
                  <td class="cod" data-label="Código">{{ m.product.code }}</td>
                  <td data-label="Tipo"><span class="tag" [class.ok]="m.type === 'IN'" [class.in]="m.type === 'OUT'">{{ m.type === 'IN' ? 'Entrada' : 'Salida' }}</span></td>
                  <td class="r" data-label="Cantidad">{{ m.type === 'IN' ? '+' : '−' }}{{ m.quantity }}</td>
                  <td class="r" data-label="Saldo">{{ m.balanceAfter }}</td>
                  <td data-label="Motivo">{{ m.reason }}@if (m.observation) { <small class="mu" style="display:block">{{ m.observation }}</small> }</td>
                  <td data-label="Responsable">{{ m.user.fullName }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty">{{ lista.isLoading() ? 'Cargando…' : 'No hay movimientos con esos filtros.' }}</div>
      }
      <app-paginador [(pagina)]="pagina" [paginas]="totalPaginas()" />
    </div>
  `,
})
export class Historial {
  private api = inject(ApiService);
  private ui = inject(UiService);
  protected fechaHora = fechaHora;
  protected filtros: [Tipo, string][] = [['', 'Todos'], ['IN', 'Entradas'], ['OUT', 'Salidas']];
  protected tipo = signal<Tipo>('');
  protected desde = signal('');
  protected hasta = signal('');
  protected orden = signal<'asc' | 'desc'>('desc');
  protected pagina = signal(1);
  protected error = signal('');

  private consulta = computed(() => ({ type: this.tipo(), from: this.desde(), to: this.hasta(), order: this.orden(), search: this.ui.busqueda() }));
  protected lista = resource({
    params: () => ({ ...this.consulta(), page: this.pagina(), v: this.ui.version() }),
    loader: async ({ params: { v, ...q } }) => {
      try { this.error.set(''); return await this.api.get<Pagina<Movimiento>>('/movements', { ...q, limit: TAM }); }
      catch (e) { this.error.set(mensajeError(e)); throw e; }
    },
  });
  protected movimientos = computed(() => (this.lista.hasValue() ? this.lista.value().data : []));
  protected totalPaginas = computed(() => (this.lista.hasValue() ? this.lista.value().meta.totalPages : 1));

  constructor() {
    effect(() => { this.ui.busqueda(); untracked(() => this.pagina.set(1)); });
  }

  protected filtrar(t: Tipo) { this.tipo.set(t); this.pagina.set(1); }
  protected invertir() { this.orden.update((o) => (o === 'asc' ? 'desc' : 'asc')); this.pagina.set(1); }
  protected fecha(s: { set(v: string): void }, v: string) {
    s.set(v);
    this.pagina.set(1);
    if (this.desde() && this.hasta() && this.desde() > this.hasta()) this.ui.mostrar('La fecha «Desde» es posterior a «Hasta».', true);
  }

  protected imprimir() { window.print(); }
  protected async exportar() {
    try {
      const todos = await this.api.todas<Movimiento>('/movements', this.consulta());
      exportarCsv('historial', ['Fecha', 'Producto', 'Código', 'Tipo', 'Cantidad', 'Saldo', 'Motivo', 'Observación', 'Responsable'],
        todos.map((m) => [fechaHora(m.createdAt), m.product.name, m.product.code, m.type === 'IN' ? 'Entrada' : 'Salida', m.quantity, m.balanceAfter, m.reason, m.observation ?? '', m.user.fullName]));
      this.ui.mostrar('Archivo CSV generado.');
    } catch (err) {
      this.ui.mostrar(mensajeError(err), true);
    }
  }
}
