import { HttpErrorResponse } from '@angular/common/http';

export const nf = (x: number, d = 1) => x.toFixed(d).replace('.', ',');

const ZONA = 'America/Bogota';
const fmtFechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fmtDia = new Intl.DateTimeFormat('es-CO', { timeZone: ZONA, weekday: 'short' });

/** Fecha y hora de un instante ISO en hora de Colombia. */
export const fechaHora = (iso: string) => fmtFechaHora.format(new Date(iso)).replace(',', ' ·');
/** Día abreviado de una fecha AAAA-MM-DD (para la gráfica semanal). */
export const diaCorto = (f: string) => {
  const t = fmtDia.format(new Date(f + 'T12:00:00-05:00')).replace('.', '');
  return t.charAt(0).toUpperCase() + t.slice(1, 2);
};

/** Mensaje legible a partir de un error HTTP de la API (NestJS). */
export function mensajeError(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'No hay conexión con el servidor.';
    const m = e.error?.message;
    if (Array.isArray(m)) return m.join(' · ');
    if (typeof m === 'string' && m) return m;
    if (e.status === 403) return 'No tiene permiso para esta acción.';
    if (e.status === 429) return 'Demasiados intentos. Espere un momento e intente de nuevo.';
  }
  return 'Ocurrió un error inesperado.';
}

/** Primer mensaje de error de un campo de Signal Forms (vacío si no hay). */
export const primerError = (c: { errors(): readonly { message?: string }[] }) => c.errors()[0]?.message ?? '';

/** Descarga un CSV (separador «;», con BOM para que Excel respete las tildes). */
export function exportarCsv(nombre: string, cabecera: string[], filas: (string | number)[][]) {
  const c = (v: string | number) => '"' + String(v).replace(/"/g, '""') + '"';
  const texto = '﻿' + [cabecera, ...filas].map((r) => r.map(c).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }));
  a.download = 'sagi_' + nombre + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
