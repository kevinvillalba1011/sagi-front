import { Service, signal } from '@angular/core';

export interface Pregunta {
  titulo: string;
  mensaje: string;
  confirmar: string; // texto del botón de confirmación
  peligro?: boolean; // botón rojo (desactivar, eliminar)
}

/** Confirmaciones con el modal de la app (en lugar de confirm() del navegador). Se muestra desde el Shell. */
@Service()
export class ConfirmarService {
  readonly pregunta = signal<Pregunta | null>(null);
  private resolver?: (ok: boolean) => void;

  preguntar(p: Pregunta): Promise<boolean> {
    this.resolver?.(false);
    this.pregunta.set(p);
    return new Promise<boolean>((r) => (this.resolver = r));
  }

  responder(ok: boolean) {
    this.pregunta.set(null);
    this.resolver?.(ok);
    this.resolver = undefined;
  }
}
