import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { FormField, form, max, min, readonly, required } from '@angular/forms/signals';
import { Ico } from '../compartido/ico';
import { Modal } from '../compartido/modal';
import { Paginador } from '../compartido/paginador';
import { exportarCsv, mensajeError, primerError } from '../compartido/util';
import { Categoria, EstadisticasProductos, Pagina, Producto, estadoProducto } from '../models';
import { ApiService } from '../servicios/api';
import { SesionService } from '../servicios/sesion';
import { ConfirmarService } from '../servicios/confirmar';
import { UiService } from '../servicios/ui';

type Filtro = 'ACTIVOS' | 'BAJO' | 'AGOTADO' | 'INACTIVOS';
type Columna = 'code' | 'name' | 'category' | 'stock' | 'minStock';
const NUEVA = '__nueva';
const TAM = 8;

@Component({
  selector: 'app-productos',
  imports: [FormField, Ico, Modal, Paginador],
  template: `
    <div class="bar">
      @for (f of filtros(); track f[0]) {
        <button class="chip" type="button" [class.on]="filtro() === f[0]" (click)="filtrar(f[0])">{{ f[1] }} ({{ f[2] }})</button>
      }
      <span class="sp"></span>
      <button class="btn s" type="button" (click)="exportar()"><app-ico name="dl" [size]="14" />Exportar CSV</button>
      <button class="btn s" type="button" (click)="imprimir()"><app-ico name="print" [size]="14" />Imprimir</button>
      @if (puedeCrear) {
        <button class="btn p" type="button" (click)="nuevo()"><app-ico name="plus" [size]="16" />Nuevo producto</button>
      }
    </div>
    <div class="split">
      <div class="card">
        @if (lista.error()) {
          <div class="empty">No se pudo cargar la lista.</div>
        } @else if (productos().length) {
          <div class="tw">
            <table>
              <thead>
                <tr>
                  @for (c of cols; track c[0]) {
                    <th [class]="c[2]" [attr.aria-sort]="orden() === c[0] ? (dir() === 'asc' ? 'ascending' : 'descending') : 'none'"><button class="sb" type="button" (click)="ordenar(c[0])">{{ c[1] }}@if (orden() === c[0]) {<app-ico [name]="dir() === 'asc' ? 'up' : 'down'" [size]="12" />}</button></th>
                  }
                  <th>Estado</th>
                  @if (puedeAcciones) { <th>Acciones</th> }
                </tr>
              </thead>
              <tbody>
                @for (p of productos(); track p.id) {
                  <tr>
                    <td class="cod" data-label="Código">{{ p.code }}</td>
                    <td data-label="Producto">{{ p.name }}</td>
                    <td data-label="Categoría">{{ p.category?.name }}</td>
                    <td class="r" data-label="Cantidad">{{ p.stock }}</td>
                    <td class="r" data-label="Mínimo">{{ p.minStock }}</td>
                    <td data-label="Estado"><span class="tag" [class]="estado(p)[1]">{{ estado(p)[0] }}</span></td>
                    @if (puedeAcciones) {
                      <td data-label="Acciones">
                        @if (puedeEditar && p.isActive) { <button class="btn s" type="button" (click)="editar(p)">Editar</button> }
                        @if (puedeDesactivar) {
                          <button class="btn s" [class.d]="p.isActive" type="button" (click)="cambiarActivo(p)">{{ p.isActive ? 'Desactivar' : 'Reactivar' }}</button>
                        }
                      </td>
                    }
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
      @if (panel()) {
        <app-modal [titulo]="editando() ? 'Editar producto' : 'Nuevo producto'" [subtitulo]="editando() ? editando()!.code : 'Registrar producto'" (cerrar)="cerrar()">
          @if (errorModal()) { <p class="msg er" style="margin:0 0 .8rem" role="alert">{{ errorModal() }}</p> }
          <form class="f" novalidate (submit)="guardar($event)">
            <label>Nombre del producto
              <input [formField]="f.name" [attr.aria-invalid]="err(f.name) ? 'true' : null" />
              <em class="fe" role="alert">{{ err(f.name) }}</em>
            </label>
            <div class="r2">
              <label>Código
                <input placeholder="PRD-0000" [formField]="f.code" [attr.title]="editando() ? 'El código no se puede modificar' : null" [attr.aria-invalid]="err(f.code) ? 'true' : null" />
                <em class="fe" role="alert">{{ err(f.code) }}</em>
              </label>
              <label>Categoría
                <select [formField]="f.categoryId" [attr.aria-invalid]="err(f.categoryId) ? 'true' : null">
                  <option value="">Seleccione…</option>
                  @for (c of categorias(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  @if (puedeCategorias) { <option [value]="nueva">+ Nueva categoría…</option> }
                </select>
                <em class="fe" role="alert">{{ err(f.categoryId) }}</em>
              </label>
            </div>
            @if (f.categoryId().value() === nueva) {
              <label>Nombre de la nueva categoría
                <input [formField]="f.newCategory" [attr.aria-invalid]="err(f.newCategory) ? 'true' : null" />
                <em class="fe" role="alert">{{ err(f.newCategory) }}</em>
              </label>
            }
            <div class="r2">
              <label>Cantidad inicial
                <input type="number" [formField]="f.initialStock" [attr.title]="editando() ? 'La existencia cambia mediante movimientos' : null" [attr.aria-invalid]="err(f.initialStock) ? 'true' : null" />
                <em class="fe" role="alert">{{ err(f.initialStock) }}</em>
              </label>
              <label>Stock mínimo
                <input type="number" [formField]="f.minStock" [attr.aria-invalid]="err(f.minStock) ? 'true' : null" />
                <em class="fe" role="alert">{{ err(f.minStock) }}</em>
              </label>
            </div>
            <label>Descripción (opcional)
              <input [formField]="f.description" />
            </label>
            <div class="acts">
              <button class="btn" type="button" (click)="cerrar()">Cancelar</button>
              <button class="btn p" type="submit" [disabled]="guardando()">Guardar</button>
            </div>
          </form>
        </app-modal>
      }
    </div>
  `,
})
export class Productos {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private sesion = inject(SesionService);
  private confirmar = inject(ConfirmarService);
  protected nueva = NUEVA;
  protected estado = estadoProducto;

  protected puedeCrear = this.sesion.has('products:create');
  protected puedeEditar = this.sesion.has('products:update');
  protected puedeDesactivar = this.sesion.has('products:deactivate');
  protected puedeAcciones = this.puedeEditar || this.puedeDesactivar;
  protected puedeCategorias = this.sesion.has('categories:manage');

  protected filtro = signal<Filtro>('ACTIVOS');
  protected orden = signal<Columna>('name');
  protected dir = signal<'asc' | 'desc'>('asc');
  protected pagina = signal(1);
  protected panel = signal(false);
  protected editando = signal<Producto | null>(null);
  protected guardando = signal(false);
  protected errorModal = signal('');

  protected cols: [Columna, string, string][] = [['code', 'Código', ''], ['name', 'Producto', ''], ['category', 'Categoría', ''], ['stock', 'Cantidad', 'r'], ['minStock', 'Mínimo', 'r']];

  protected modelo = signal({ name: '', code: '', categoryId: '', newCategory: '', initialStock: 0, minStock: 5, description: '' });
  protected f = form(this.modelo, (p) => {
    required(p.name, { message: 'Ingrese el nombre del producto.' });
    required(p.code, { message: 'Ingrese el código.' });
    required(p.categoryId, { message: 'Seleccione una categoría.' });
    required(p.newCategory, { message: 'Ingrese el nombre de la categoría.', when: ({ valueOf }) => valueOf(p.categoryId) === NUEVA });
    readonly(p.code, () => !!this.editando());
    readonly(p.initialStock, () => !!this.editando());
    min(p.initialStock, 0, { message: 'Debe ser 0 o mayor.' });
    max(p.initialStock, 2_000_000_000, { message: 'Valor demasiado grande.' });
    min(p.minStock, 0, { message: 'Debe ser 0 o mayor.' });
    max(p.minStock, 2_000_000_000, { message: 'Valor demasiado grande.' });
  });

  private stats = resource({
    params: () => this.ui.version(),
    loader: () => this.api.get<EstadisticasProductos>('/products/stats'),
  });
  protected filtros = computed((): [Filtro, string, number | string][] => {
    const s = this.stats.hasValue() ? this.stats.value() : null;
    return [
      ['ACTIVOS', 'Activos', s?.active ?? '…'], ['BAJO', 'Bajo stock', s?.lowStock ?? '…'],
      ['AGOTADO', 'Agotado', s?.outOfStock ?? '…'], ['INACTIVOS', 'Inactivos', s?.inactive ?? '…'],
    ];
  });

  private catRes = resource({
    params: () => this.ui.version(),
    loader: () => this.api.get<Categoria[]>('/categories'),
  });
  protected categorias = computed(() => (this.catRes.hasValue() ? this.catRes.value() : []));

  private consulta = computed(() => ({
    page: this.pagina(), limit: TAM, sortBy: this.orden(), order: this.dir(), search: this.ui.busqueda(),
    isActive: this.filtro() !== 'INACTIVOS',
    stockStatus: this.filtro() === 'BAJO' ? 'LOW_STOCK' : this.filtro() === 'AGOTADO' ? 'OUT_OF_STOCK' : undefined,
  }));
  protected lista = resource({
    params: () => ({ ...this.consulta(), v: this.ui.version() }),
    loader: ({ params: { v, ...q } }) => this.api.get<Pagina<Producto>>('/products', q),
  });
  protected productos = computed(() => (this.lista.hasValue() ? this.lista.value().data : []));
  protected totalPaginas = computed(() => (this.lista.hasValue() ? this.lista.value().meta.totalPages : 1));

  constructor() {
    effect(() => { this.ui.busqueda(); untracked(() => this.pagina.set(1)); });
  }

  protected err(c: { (): { touched(): boolean; errors(): readonly { message?: string }[] } }) { return c().touched() ? primerError(c()) : ''; }

  protected filtrar(f: Filtro) { this.filtro.set(f); this.pagina.set(1) }
  protected ordenar(c: Columna) {
    if (this.orden() === c) this.dir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { this.orden.set(c); this.dir.set('asc'); }
    this.pagina.set(1);
  }

  protected nuevo() {
    this.editando.set(null);
    this.f().reset({ name: '', code: '', categoryId: '', newCategory: '', initialStock: 0, minStock: 5, description: '' });
    this.errorModal.set('');
    this.panel.set(true);
  }
  protected editar(p: Producto) {
    this.editando.set(p);
    this.f().reset({ name: p.name, code: p.code, categoryId: p.categoryId, newCategory: '', initialStock: p.stock, minStock: p.minStock, description: p.description ?? '' });
    this.errorModal.set('');
    this.panel.set(true);
  }
  protected cerrar() { this.panel.set(false); this.editando.set(null); }

  protected async guardar(e: Event) {
    e.preventDefault();
    this.f().markAsTouched();
    if (this.f().invalid()) return;
    const m = this.modelo();
    this.guardando.set(true);
    try {
      let categoryId = m.categoryId;
      if (categoryId === NUEVA) {
        const nombre = m.newCategory.trim();
        const existente = this.categorias().find((c) => c.name.toLowerCase() === nombre.toLowerCase());
        categoryId = existente ? existente.id : (await this.api.post<Categoria>('/categories', { name: nombre })).id;
      }
      const ed = this.editando();
      if (ed) {
        await this.api.patch(`/products/${ed.id}`, { name: m.name.trim(), description: m.description.trim(), categoryId, minStock: m.minStock });
        this.ui.mostrar('Producto actualizado.');
      } else {
        await this.api.post('/products', { code: m.code.trim(), name: m.name.trim(), description: m.description.trim() || undefined, categoryId, initialStock: m.initialStock, minStock: m.minStock });
        this.ui.mostrar('Producto registrado.');
      }
      this.cerrar();
      this.ui.recargar();
    } catch (err) {
      this.errorModal.set(mensajeError(err));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async cambiarActivo(p: Producto) {
    const ok = await this.confirmar.preguntar(p.isActive
      ? { titulo: 'Desactivar producto', mensaje: `«${p.name}» dejará de aparecer para registrar movimientos. Se conserva en el historial y se puede reactivar.`, confirmar: 'Desactivar', peligro: true }
      : { titulo: 'Reactivar producto', mensaje: `«${p.name}» volverá a estar disponible para movimientos.`, confirmar: 'Reactivar' });
    if (!ok) return;
    try {
      await this.api.post(`/products/${p.id}/${p.isActive ? 'deactivate' : 'activate'}`);
      if (this.editando()?.id === p.id) this.cerrar();
      this.ui.mostrar(p.isActive ? 'Producto desactivado; se conserva en el historial.' : 'Producto reactivado.');
      this.ui.recargar();
    } catch (err) {
      this.ui.mostrar(mensajeError(err), true);
    }
  }

  protected imprimir() { window.print(); }
  protected async exportar() {
    try {
      const { page, limit, ...q } = this.consulta();
      const todos = await this.api.todas<Producto>('/products', q);
      exportarCsv('productos', ['Código', 'Producto', 'Categoría', 'Cantidad', 'Mínimo', 'Estado'], todos.map((p) => [p.code, p.name, p.category?.name ?? '', p.stock, p.minStock, estadoProducto(p)[0]]));
      this.ui.mostrar('Archivo CSV generado.');
    } catch (err) {
      this.ui.mostrar(mensajeError(err), true);
    }
  }
}
