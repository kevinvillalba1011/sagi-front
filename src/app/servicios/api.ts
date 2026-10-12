import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API } from '../config';
import { Pagina } from '../models';

export type Consulta = Record<string, string | number | boolean | null | undefined>;

/** Cliente HTTP mínimo de la API de SAGI (el token lo agrega el interceptor). */
@Service()
export class ApiService {
  private http = inject(HttpClient);

  private params(q?: Consulta) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(q ?? {})) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return p;
  }
  get<T>(ruta: string, q?: Consulta) { return firstValueFrom(this.http.get<T>(API + ruta, { params: this.params(q), withCredentials: true })); }
  post<T>(ruta: string, cuerpo: unknown = {}) { return firstValueFrom(this.http.post<T>(API + ruta, cuerpo, { withCredentials: true })); }
  patch<T>(ruta: string, cuerpo: unknown) { return firstValueFrom(this.http.patch<T>(API + ruta, cuerpo, { withCredentials: true })); }
  delete(ruta: string) { return firstValueFrom(this.http.delete<void>(API + ruta, { withCredentials: true })); }

  /** Recorre todas las páginas de un listado (para exportar a CSV). */
  async todas<T>(ruta: string, q?: Consulta): Promise<T[]> {
    const salida: T[] = [];
    for (let page = 1; ; page++) {
      const r = await this.get<Pagina<T>>(ruta, { ...q, page, limit: 100 });
      salida.push(...r.data);
      if (page >= r.meta.totalPages) return salida;
    }
  }
}
