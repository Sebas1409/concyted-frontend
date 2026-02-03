import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PublicResearcher {
    activo: boolean;
    apellidoMaterno: string;
    apellidoPaterno: string;
    areaId: number;
    celular: string;
    codigoUnico: string;
    departamentoId: number;
    direccion: string;
    distritoId: number;
    email: string;
    emailPublico: string;
    estado: string;
    estadoRenacyt: string;
    fechaActualizacion: string;
    fechaCreacion: string;
    fechaNacimiento: string;
    fechaValidacion: string;
    fotoToken: string;
    googleScholarId: string;
    id: number;
    nacionalidad: string;
    nombres: string;
    numDoc: string;
    orcid: string;
    paisNacimientoId: number;
    paisResidenciaId: number;
    provinciaId: number;
    researcherId: string;
    resumenEjecutivo: string;
    scopusAuthorId: string;
    sexo: string;
    telefono: string;
    telefonoAlternativo: string;
    tipoDoc: string;
    ubigeo: string;
    usuarioId: number;
    validado: boolean;
    validadoPor: number;
    webPersonal: string;
    docToken?: string | null;
}

export interface ResearcherResponse {
    content: PublicResearcher[];
    empty: boolean;
    first: boolean;
    last: boolean;
    number: number;
    numberOfElements: number;
    pageable: any;
    size: number;
    sort: any;
    totalElements: number;
    totalPages: number;
}

@Injectable({
    providedIn: 'root'
})
export class ResearcherService {
    // Adjust base URL if needed. The user said "/cti-user-service/public/api/investigadores"
    // Assuming environment.apiUrl points to the gateway, usually ending in /api or just base.
    // If environment.apiUrl is 'http://localhost:8080/api', we might need to adjust.
    // Usually it is 'http://gateway-url'.
    // I'll assume standard microservice path usage.

    private apiUrl = environment.userServiceUrl.replace('/api', '/public/api');
    // Wait, let's verify environment.apiUrl common usage in other services.
    // user.service.ts uses `${this.apiUrl}/v2/usuarios`.
    // I will check user.service.ts again to be sure about apiUrl.

    constructor(private http: HttpClient) { }

    getPublicResearchers(params: any): Observable<ResearcherResponse> {
        let httpParams = new HttpParams();

        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                httpParams = httpParams.set(key, params[key]);
            }
        });

        return this.http.get<ResearcherResponse>(`${this.apiUrl}/investigadores`, { params: httpParams });
    }

    updateResearcher(id: number | string, data: any): Observable<any> {
        // As per user request: /cti-user-service/api/v2/investigadores/{id}
        // Environment userServiceUrl is '/cti-user-service/api'
        return this.http.put(`${environment.userServiceUrl}/v2/investigadores/${id}`, data);
    }
}
