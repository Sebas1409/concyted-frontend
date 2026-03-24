import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScopusService {

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la URL para iniciar sesión en Scopus y verificar perfil.
   * Generamos un 'state' dinámico para evitar que el enlace caduque.
   */
  getScopusLink(): Observable<any> {
    const state = this.generateRandomState();
    const baseUrl = 'https://id.elsevier.com/as/authorization.oauth2';
    const params = new URLSearchParams({
        state: state,
        ui_locales: 'en-US',
        redirect_uri: 'https://www.scopus.com/pages/callback/url',
        client_id: 'SCOPUS',
        platSite: 'SC/scopus',
        response_type: 'code',
        scope: 'openid+profile+email+els_auth_info+els_analytics_info+urn:com:elsevier:idp:policy:product:indv_identity',
        prompt: 'login',
        authType: 'SINGLE_SIGN_IN'
    });
    
    // El scope tiene caracteres especiales (+) que URLSearchParams escapa como %2B, 
    // pero ELSEVIER a veces requiere el + literalmente o el espacio. 
    // Usaremos el string directo si es necesario.
    const url = `${baseUrl}?${params.toString().replace(/%2B/g, '+')}`;
    return of({ url });
  }

  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Actualiza el Scopus Author ID del investigador.
   */
  updateScopus(investigatorId: number, scopusId: string): Observable<any> {
    const url = `${environment.userServiceUrl}/v2/investigadores/${investigatorId}/scopus`;
    return this.http.put(url, { scopusId });
  }

  /**
   * Elimina la vinculación de Scopus de un investigador.
   */
  deleteScopus(investigatorId: number): Observable<any> {
    const url = `${environment.userServiceUrl}/v2/investigadores/${investigatorId}/scopus`;
    return this.http.delete(url);
  }

  /**
   * Obtiene las publicaciones de Scopus por Author ID.
   */
  getScopusPublications(scopusId: string): Observable<any> {
    return this.http.get(`${environment.interopServiceUrl}/scopus/publications/${scopusId}`);
  }
}
