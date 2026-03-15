import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AliciaRequest {
    apellidoMaterno: string;
    apellidoPaterno: string;
    primerNombre: string;
    segundoNombre: string;
}

export interface AliciaResponse {
    autor: string;
    coautor: string;
    fechaPublicacion: string;
    id: string;
    institucion: string;
    tipo: string;
    titulo: string;
    url: string;
}

@Injectable({
    providedIn: 'root'
})
export class ScientificProductionService {
    private aliciaUrl = `${environment.interopServiceUrl}/alicia/produccion`;

    constructor(private http: HttpClient) { }

    searchAlicia(request: AliciaRequest): Observable<AliciaResponse[]> {
        return this.http.post<AliciaResponse[]>(this.aliciaUrl, request);
    }

    validateDoi(doi: string): Observable<any> {
        // According to image: POST /cti-interop-service/api/doi/validate?url=...
        const url = `${environment.interopServiceUrl}/doi/validate?url=${encodeURIComponent(doi)}`;
        return this.http.post<any>(url, {});
    }

    createPublication(payload: any): Observable<any> {
        return this.http.post<any>(`${environment.userServiceUrl}/produccion-cientifica`, payload);
    }

    updatePublication(id: number, payload: any): Observable<any> {
        return this.http.put<any>(`${environment.userServiceUrl}/produccion-cientifica/${id}`, payload);
    }

    deleteProduction(id: number): Observable<any> {
        return this.http.delete<any>(`${environment.userServiceUrl}/produccion-cientifica/${id}`);
    }

    getProductionsByInvestigador(investigadorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${environment.userServiceUrl}/produccion-cientifica/investigador/${investigadorId}`);
    }
}
