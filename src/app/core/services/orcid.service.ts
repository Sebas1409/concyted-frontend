import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth.models';
import { ROLES } from '../constants/roles.constants';

@Injectable({
  providedIn: 'root'
})
export class OrcidService {
  private config = (environment as any).externalProviders?.orcid;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene la información pública de un perfil ORCID.
   * Utiliza la API Pública de ORCID.
   * @param orcidId El ID de ORCID (ej. 0009-0004-1341-9270)
   */
  getPublicProfile(orcidId: string): Observable<any> {
    const apiUrl = this.config?.apiUrl || 'https://pub.orcid.org/v3.0';
    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });
    return this.http.get(`${apiUrl}/${orcidId}`, { headers });
  }

  /**
   * Obtiene la URL de autorización para ORCID desde nuestro backend.
   */
  getAuthorizationUrl(): Observable<{ authorizationUrl: string; state: string }> {
    return this.http.get<{ authorizationUrl: string; state: string }>(
      `${environment.interopServiceUrl}/auth/orcid/authorize`
    );
  }

  /**
   * Completa el inicio de sesión con el código y estado recibidos de ORCID.
   * Este método se usa en la página de Login principal.
   */
  login(code: string, state: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/auth/orcid/login`, { code, state });
  }

  /**
   * Obtiene la información de ORCID a través del servicio de interoperabilidad.
   * A diferencia del login, este método se usa para autocompletar campos en el Dashboard
   * sin afectar la sesión actual del usuario.
   */
  getInfo(code: string, state: string): Observable<any> {
    return this.http.post(`${environment.interopServiceUrl}/auth/orcid/login`, { code, state });
  }

  /**
   * Obtiene los datos del perfil público de un investigador por su ORCID iD
   * a través del servicio de interoperabilidad.
   */
  getOrcidProfile(orcidId: string): Observable<any> {
    return this.http.get(`${environment.interopServiceUrl}/auth/orcid/profile/${orcidId}`);
  }

  /**
   * Inicia el flujo de autenticación de ORCID.
   * Obtiene la URL de autorización y redirige al usuario o abre un popup.
   * @param isPopup Indica si se debe abrir en una ventana emergente.
   */
  loginWithOrcid(isPopup: boolean = false): void {
    this.getAuthorizationUrl().subscribe({
      next: (res) => {
        if (res && res.authorizationUrl) {
          let finalUrl = res.authorizationUrl;
          
          // Aseguramos que el puerto esté presente según la configuración del servidor
          const redirectFix = this.config?.redirectFix;
          if (redirectFix && finalUrl.includes(redirectFix.search) && !finalUrl.includes(redirectFix.replaceWith)) {
            finalUrl = finalUrl.split(redirectFix.search).join(redirectFix.replaceWith);
          }

          if (isPopup) {
            const width = 500;
            const height = 650;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            const features = `width=${width},height=${height},left=${left},top=${top},location=no,menubar=no,status=no,toolbar=no`;
            
            window.open(finalUrl, 'ORCID_Authorization', features);
          } else {
            console.log('Redirigiendo a ORCID:', finalUrl);
            window.location.assign(finalUrl);
          }
        } else {
          console.error('No se recibió la URL de autorización');
        }
      },
      error: (err) => {
        console.error('Error al obtener URL de autorización de ORCID', err);
      }
    });
  }

  /**
   * Actualiza el ORCID y el ORCID Family Name del investigador.
   */
  updateOrcid(investigatorId: number, payload: { orcid: string, orcidFamilyName: string }): Observable<any> {
    const url = `${environment.userServiceUrl}/v2/investigadores/${investigatorId}/orcid`;
    return this.http.put(url, payload);
  }

  /**
   * Elimina la vinculación de ORCID de un investigador.
   * @param investigatorId ID del investigador
   */
  deleteOrcid(investigatorId: number): Observable<any> {
    const url = `${environment.userServiceUrl}/v2/investigadores/${investigatorId}/orcid`;
    return this.http.delete(url);
  }

  /**
   * Mapea la respuesta compleja de ORCID al modelo AuthResponse de nuestra app
   * para evitar que el sistema se caiga por falta de campos obligatorios.
   */
  mapOrcidToAuthResponse(orcidData: any): AuthResponse {
    const person = orcidData?.person;
    const name = person?.name;

    // Extraer nombres y apellidos
    const givenNames = name?.['given-names']?.value || '';
    const familyName = name?.['family-name']?.value || '';

    // Extraer email (si es público)
    const emails = person?.emails?.email;
    const primaryEmail = Array.isArray(emails) && emails.length > 0 ? emails[0].email : '';

    return {
      id: 0, // El ID se asignará al persistir en DB
      usuarioId: 0,
      orcid: orcidData['orcid-identifier']?.path || '',
      nombres: givenNames,
      apellidoPaterno: familyName,
      apellidoMaterno: '', // ORCID suele agrupar apellidos, el backend deberá separar si es necesario
      email: primaryEmail,
      emailPublico: primaryEmail,
      numDoc: '', // No viene de ORCID
      tipoDoc: 'ORCID',
      codigoUnico: '',
      fechaNacimiento: '',
      sexo: '',
      nacionalidad: '',
      paisNacimientoId: 0,
      paisResidenciaId: 0,
      departamentoId: 0,
      provinciaId: 0,
      distritoId: 0,
      telefono: '',
      telefonoAlternativo: '',
      celular: '',
      direccion: '',
      ubigeo: '',
      scopusAuthorId: '',
      researcherId: '',
      googleScholarId: '',
      estado: 'true',
      estadoRenacyt: '',
      validado: true,
      fechaValidacion: new Date().toISOString(),
      validadoPor: 0,
      fotoToken: '',
      activo: true,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      username: primaryEmail || givenNames, // Fallback para el sistema
      roles: [ROLES.INVESTIGADOR] // Asignamos explícitamente el rol de INVESTIGADOR
    };
  }

  /**
   * Genera un token JWT simulado para que los guards de la app
   * no bloqueen el acceso al Dashboard.
   */
  generateSimulatedToken(roles: string[]): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: 'orcid-user',
      roles: roles,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora de expiración
    }));
    return `${header}.${payload}.signature`;
  }
}
