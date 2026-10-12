import { Component, computed, effect, inject, resource, signal, untracked } from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { Ico } from '../compartido/ico';
import { fechaHora, mensajeError, primerError } from '../compartido/util';
import { Movimiento, Pagina, Producto, TipoMov } from '../models';
import { ApiService } from '../servicios/api';
import { SesionService } from '../servicios/sesion';
import { UiService } from '../servicios/ui';

@Component({
  selector: 'app-movimientos',
  imports: [FormField, Ico],
  template: `
    <div class="two2">
      <div class="card">
        <h2>Registrar movimiento</h2>
        <p class="mu sm">Los movimientos registrados no se pueden editar ni eliminar. La fecha y la hora las asigna el sistema.</p>
        <form class="f" novalidate (submit)="registrar($event)">
          <label>Producto
            <select [formField]="f.productId" [attr.aria-invalid]="err(f.productId) ? 'true' : null">
              <option value="">Seleccione…</option>
              @for (x of productos(); track x.id) { <option [value]="x.id">{{ x.name }} — {{ x.code }} ({{ x.stock }} u.)</option> }
            </select>
            <em class="fe" role="alert">{{ err(f.productId) }}</em>
          </label>
          @if (truncado()) { <p class="sm mu">Se muestran los primeros 100 productos activos; escriba en la caja de búsqueda de arriba para acotar.</p> }
          <fieldset class="seg" style="border:0;padding:0;margin:0">
            <legend class="sm mu" style="padding:0;margin-bottom:.25rem">Tipo de movimiento</legend>
            <label><input type="radio" value="IN" [formField]="f.type" /><span><app-ico name="up" [size]="15" />Entrada</span></label>
            <label><input type="radio" value="OUT" [formField]="f.type" /><span><app-ico name="down" [size]="15" />Salida</span></label>
          </fieldset>
          <label>Motivo
            <select [formField]="f.reason" [attr.aria-invalid]="err(f.reason) ? 'true' : null">
              <option value="">Seleccione…</option>
              @for (m of motivos(); track m) { <option [value]="m">{{ m }}</option> }
            </select>
            <em class="fe" role="alert">{{ err(f.reason) }}</em>
          </label>
          <label>Cantidad
            <input type="number" [formField]="f.quantity" [attr.aria-invalid]="err(f.quantity) ? 'true' : null" />
            <em class="fe" role="alert">{{ err(f.quantity) }}</em>
          </label>
          <label>Observación (opcional)
            <input placeholder="Ej.: compra a proveedor" [formField]="f.observation" />
          </label>
          <div class="acts">
            <button class="btn" type="button" (click)="limpiar()">Cancelar</button>
            <button class="btn p" type="submit" [disabled]="guardando()">Registrar movimiento</button>
          </div>
        </form>
      </div>
      <div class="card">
        <h2>Movimientos recientes</h2>
        <p class="mu sm">{{ verHistorial ? 'Últimos 6 registrados' : 'Registrados en esta sesión' }}</p>
        @for (m of recientes(); track m.id) {
          <div class="li">
            <span class="ar" [class.ok]="m.type === 'IN'" [class.in]="m.type === 'OUT'"><app-ico [name]="m.type === 'IN' ? 'up' : 'down'" [size]="14" /></span>
            <div class="g">{{ m.product.name }}<small>{{ m.reason }} · {{ fechaHora(m.createdAt) }}</small></div>
            <b>{{ m.type === 'IN' ? '+' : '−' }}{{ m.quantity }}</b>
          </div>
        } @empty {
          <div class="empty">Sin movimientos.</div>
        }
      </div>
    </div>
  `,
})
export class Movimientos {
  private api = inject(ApiService);
  private ui = inject(UiService);
  private ruta = inject(ActivatedRoute);
  protected verHistorial = inject(SesionService).has('movements:read');
  protected fechaHora = fechaHora;

  protected modelo = signal({ productId: this.ruta.snapshot.queryParamMap.get('p') ?? '', type: 'IN' as TipoMov, reason: '', quantity: 1, observation: '' });
  protected f = form(this.modelo, (p) => {
    required(p.productId, { message: 'Seleccione un producto.' });
    required(p.reason, { message: 'Seleccione el motivo.' });
    min(p.quantity, 1, { message: 'La cantidad debe ser mayor que cero.' });
    max(p.quantity, 2_000_000_000, { message: 'Valor demasiado grande.' });
  });
  protected guardando = signal(false);
  private locales = signal<Movimiento[]>([]); // recientes de la sesión si el rol no puede leer el historial

  private motivosRes = resource({ loader: () => this.api.get<Record<TipoMov, string[]>>('/movements/reasons') });
  protected motivos = computed(() => (this.motivosRes.hasValue() ? this.motivosRes.value()[this.modelo().type] : []));

  private prod = resource({
    params: () => ({ q: this.ui.busqueda(), v: this.ui.version() }),
    loader: ({ params }) => this.api.get<Pagina<Producto>>('/products', { isActive: true, limit: 100, sortBy: 'name', search: params.q }),
  });
  protected productos = computed(() => (this.prod.hasValue() ? this.prod.value().data : []));
  protected truncado = computed(() => (this.prod.hasValue() ? this.prod.value().meta.total > 100 : false));

  private rec = resource({
    params: () => (this.verHistorial ? this.ui.version() : undefined),
    loader: () => this.api.get<Pagina<Movimiento>>('/movements', { limit: 6, order: 'desc' }),
  });
  protected recientes = computed(() => (this.verHistorial ? (this.rec.hasValue() ? this.rec.value().data : []) : this.locales()));

  constructor() {
    // Al cambiar el tipo, el motivo elegido puede no existir en el otro tipo.
    effect(() => {
      const t = this.modelo().type, m = untracked(() => this.modelo().reason);
      if (m && this.motivosRes.hasValue() && !this.motivosRes.value()[t].includes(m)) untracked(() => this.f.reason().value.set(''));
    });
  }

  protected err(c: { (): { touched(): boolean; errors(): readonly { message?: string }[] } }) { return c().touched() ? primerError(c()) : ''; }

  protected limpiar() { this.f().reset({ productId: '', type: 'IN', reason: '', quantity: 1, observation: '' }); }

  protected async registrar(e: Event) {
    e.preventDefault();
    this.f().markAsTouched();
    if (this.f().invalid()) return;
    const m = this.modelo();
    this.guardando.set(true);
    try {
      const r = await this.api.post<Movimiento>('/movements', {
        productId: m.productId, type: m.type, quantity: m.quantity, reason: m.reason, observation: m.observation.trim() || undefined,
      });
      this.locales.update((l) => [r, ...l].slice(0, 6));
      this.ui.mostrar(`${m.type === 'IN' ? 'Entrada' : 'Salida'} registrada. Existencia actual: ${r.balanceAfter}.`);
      this.limpiar();
      this.ui.recargar();
    } catch (err) {
      this.ui.mostrar(mensajeError(err), true);
    } finally {
      this.guardando.set(false);
    }
  }
}
