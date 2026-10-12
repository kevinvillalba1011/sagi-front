import { Component, input } from '@angular/core';

/** Tarjeta de indicador. Se usa como <app-stat class="card b-re" l="Agotados" [n]="3" s="Detalle" c="c-re" /> */
@Component({
  selector: 'app-stat',
  host: { style: 'display:block' },
  template: `<p class="mu sm">{{ l() }}</p><p class="num">{{ n() }}</p><p class="sm" [class]="c()">{{ s() }}</p>`,
})
export class Stat {
  readonly l = input.required<string>();
  readonly n = input.required<string | number>();
  readonly s = input('');
  readonly c = input('mu');
}
