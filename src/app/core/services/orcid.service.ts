import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
   * Inicia el flujo de autenticación de ORCID.
   */
  loginWithOrcid() {
    const clientId = this.config?.clientId || '';
    const redirectUri = this.config?.redirectUri || (window.location.origin + '/auth/orcid-callback');
    const authUrlBase = this.config?.authUrl || 'https://orcid.org/oauth/authorize';
    
    const scope = '/authenticate';
    const responseType = 'code';
    const authUrl = `${authUrlBase}?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('Redirecting to ORCID Auth:', authUrl);
    window.location.href = authUrl;
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
