import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ICONOS } from './iconos';

/** Icono de línea del menú y los botones. Uso: <app-ico name="panel" [size]="17" /> */
@Component({
  selector: 'app-ico',
  host: { style: 'display:inline-flex' },
  template: `<span style="display:contents" [innerHTML]="html()"></span>`,
})
export class Ico {
  private san = inject(DomSanitizer);
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly html = computed(() =>
    this.san.bypassSecurityTrustHtml(
      `<svg width="${this.size()}" height="${this.size()}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[this.name()] ?? ''}</svg>`,
    ),
  );
}

/** Logo de SAGI. */
@Component({
  selector: 'app-logo',
  host: { style: 'display:inline-flex' },
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 40 44" aria-hidden="true">
    <path d="M20 3 36 11.5 20 20 4 11.5Z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
    <path d="M4 16 18 23.5V40L4 32.5Z" fill="#3dd6b5" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
    <path d="M36 16 22 23.5V40L36 32.5Z" fill="#b98df0" stroke="#fff" stroke-width="3" stroke-linejoin="round" />
  </svg>`,
})
export class Logo {
  readonly size = input(30);
}
