import { Component, inject } from '@angular/core';
import { ConfirmarService } from '../servicios/confirmar';
import { Modal } from './modal';

/** Modal de confirmación global (se coloca una sola vez en el Shell). */
@Component({
  selector: 'app-confirmar',
  imports: [Modal],
  template: `
    @if (c.pregunta(); as p) {
      <app-modal [titulo]="p.titulo" (cerrar)="c.responder(false)">
        <p>{{ p.mensaje }}</p>
        <div class="acts" style="margin-top:1.1rem">
          <button class="btn" type="button" (click)="c.responder(false)">Cancelar</button>
          <button class="btn p" [class.peligro]="p.peligro" type="button" (click)="c.responder(true)">{{ p.confirmar }}</button>
        </div>
      </app-modal>
    }
  `,
})
export class Confirmar {
  protected c = inject(ConfirmarService);
}
