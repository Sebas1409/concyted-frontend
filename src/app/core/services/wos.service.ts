import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WosService {
  constructor(private http: HttpClient) { }

  /**
   * Actualiza el ResearcherID (Web of Science) del investigador.
   * @param investigatorId ID del investigador
   * @param researcherId El ID de WoS (ej: HKV-7554-2023)
   */
  updateWos(investigatorId: number, researcherId: string): Observable<any> {
    const url = `${environment.userServiceUrl}/v2/investigadores/${investigatorId}/wos`;
    return this.http.put(url, { researcherId });
  }

  /**
   * Elimina la vinculación de Web of Science (ResearcherID) de un investigador.
   * @param investigatorId ID del investigador
   */
  deleteWos(investigatorId: number): Observable<any> {
    const url = `${environment.userServiceUrl}/v2/investigadores/${investigatorId}/wos`;
    return this.http.delete(url);
  }

  /**
   * Obtiene la URL de búsqueda/vinculación de Web of Science.
   */
  getWosLink(): Observable<any> {
    return this.http.get(`${environment.interopServiceUrl}/wos/login`);
  }

  /**
   * Obtiene las publicaciones de Web of Science por ResearcherID.
   */
  getWosPublications(researchId: string): Observable<any> {
    return this.http.get(`${environment.interopServiceUrl}/wos/publications/${researchId}`);
  }
}
