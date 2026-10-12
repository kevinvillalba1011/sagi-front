import { Component, input, model } from '@angular/core';

/** Botones «Anterior / Siguiente» para listas paginadas por el servidor. */
@Component({
  selector: 'app-paginador',
  template: `@if (paginas() > 1) {
    <div class="pgr">
      <button class="btn s" type="button" [disabled]="pagina() < 2" (click)="pagina.set(pagina() - 1)">Anterior</button>
      <span class="sm mu">Página {{ pagina() }} de {{ paginas() }}</span>
      <button class="btn s" type="button" [disabled]="pagina() >= paginas()" (click)="pagina.set(pagina() + 1)">Siguiente</button>
    </div>
  }`,
})
export class Paginador {
  readonly pagina = model.required<number>();
  readonly paginas = input.required<number>();
}
