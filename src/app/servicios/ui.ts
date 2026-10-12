import { Service, effect, signal } from '@angular/core';

/** Estado de la interfaz: mensajes, búsqueda del encabezado, tema y un contador para «Actualizar». */
@Service()
export class UiService {
  readonly mensaje = signal<{ texto: string; error: boolean } | null>(null);
  readonly q = signal(''); // búsqueda del encabezado
  readonly busqueda = signal(''); // q con retardo de 300 ms para no consultar la API en cada tecla
  readonly version = signal(0); // las páginas lo leen en sus resource() para recargar
  readonly oscuro = signal(false);
  private temporizador?: ReturnType<typeof setTimeout>;

  constructor() {
    try {
      const t = localStorage.getItem('sagi:tema');
      this.oscuro.set(t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
    } catch { /* sin almacenamiento */ }
    this.aplicarTema();
    effect((limpiar) => {
      const v = this.q();
      const id = setTimeout(() => this.busqueda.set(v), 300);
      limpiar(() => clearTimeout(id));
    });
  }

  mostrar(texto: string, error = false) {
    this.mensaje.set({ texto, error });
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.mensaje.set(null), 3800);
  }

  recargar() { this.version.update((v) => v + 1); }

  alternarTema() {
    this.oscuro.update((v) => !v);
    try { localStorage.setItem('sagi:tema', this.oscuro() ? 'dark' : 'light'); } catch { /* sin almacenamiento */ }
    this.aplicarTema();
  }

  private aplicarTema() { document.documentElement.dataset['theme'] = this.oscuro() ? 'dark' : 'light'; }
}
