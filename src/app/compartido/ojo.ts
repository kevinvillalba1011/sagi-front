import { Component, model } from '@angular/core';
import { Ico } from './ico';

/** Botón «ojito» para mostrar u ocultar una contraseña. Uso: <app-ojo [(visible)]="ver" /> junto al input. */
@Component({
  selector: 'app-ojo',
  imports: [Ico],
  template: `<button class="ojo" type="button" [attr.aria-pressed]="visible()" [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'" (click)="visible.set(!visible())"><app-ico [name]="visible() ? 'eyeoff' : 'eye'" [size]="18" /></button>`,
})
export class Ojo {
  readonly visible = model(false);
}
