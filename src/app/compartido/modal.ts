import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, viewChild } from '@angular/core';

let contador = 0;

/**
 * Ventana modal accesible basada en <dialog> nativo (foco atrapado, Esc para cerrar y foco devuelto al cerrar).
 * Se muestra al crearse: el padre la pone dentro de un @if. Uso:
 * <app-modal titulo="Nuevo producto" subtitulo="…" (cerrar)="cerrar()"> …contenido… </app-modal>
 */
@Component({
  selector: 'app-modal',
  template: `
    <dialog #d class="modal" [attr.aria-labelledby]="id" (cancel)="$event.preventDefault(); cerrar.emit()" (click)="fondo($event)">
      <div class="mb">
        <div class="mh">
          <div>
            <h2 [id]="id">{{ titulo() }}</h2>
            @if (subtitulo()) { <p class="mu sm">{{ subtitulo() }}</p> }
          </div>
          <button class="ic" type="button" aria-label="Cerrar" (click)="cerrar.emit()">✕</button>
        </div>
        <ng-content />
      </div>
    </dialog>
  `,
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
  readonly cerrar = output<void>();
  protected id = 'modal-' + ++contador;
  private d = viewChild.required<ElementRef<HTMLDialogElement>>('d');

  constructor() {
    afterNextRender(() => this.d().nativeElement.showModal());
    inject(DestroyRef).onDestroy(() => this.d().nativeElement.close());
  }

  protected fondo(e: MouseEvent) {
    if (e.target === this.d().nativeElement) this.cerrar.emit();
  }
}
