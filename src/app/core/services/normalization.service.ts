import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Institucion {
    razonSocial: string;
    ruc: string;
    nombreComercial?: string;
}

export interface NormalizacionResponse {
    instituciones: Institucion[];
    total: number;
}

export interface CorregirRequest {
    institucionPrincipal: Institucion;
    institucionesPorCorregir: Institucion[];
}

export interface CorregirResponse {
    institucionPrincipal: Institucion;
    resultados: Array<{
        origen: string;
        registrosActualizados: number;
    }>;
    totalRegistrosActualizados: number;
}

@Injectable({
    providedIn: 'root'
})
export class NormalizationService {
    private apiUrl = `${environment.userServiceUrl}/instituciones/normalizacion`;

    constructor(private http: HttpClient) { }

    getInstitucionesNormalizacion(): Observable<NormalizacionResponse> {
        return this.http.get<NormalizacionResponse>(this.apiUrl);
    }

    corregirInstituciones(request: CorregirRequest): Observable<CorregirResponse> {
        return this.http.put<CorregirResponse>(`${this.apiUrl}/corregir`, request);
    }
}
