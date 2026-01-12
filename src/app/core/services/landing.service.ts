import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LandingHeader {
    id: number;
    codigo: string;
    titulo: string;
    subtitulo: string;
    subtituloEnlace: string;
    fechaInicio: string;
    fechaFin: string;
}

export interface LandingDetail {
    id: number;
    codigoEncabezado?: string;
    nombre: string;
    detalle1: string;
    detalle2: string;
    detalle3: string;
    fotoToken: string;
    logoToken: string;
    fuenteDato: string;
    orden: number;
    publicado: boolean;
    activo: boolean;
}

export interface LandingSection {
    encabezado: LandingHeader;
    detalles: LandingDetail[];
}

@Injectable({
    providedIn: 'root'
})
export class LandingService {
    private apiUrl = `${environment.managementServiceUrl}/landing/encabezados`;
    private detailsUrl = `${environment.managementServiceUrl}/landing/detalles`;

    constructor(private http: HttpClient) { }

    getHeaderByCode(code: string): Observable<LandingHeader> {
        return this.http.get<LandingHeader>(`${this.apiUrl}/codigo/${code}`);
    }

    updateHeader(id: number, header: LandingHeader): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, header);
    }

    createDetail(detail: LandingDetail): Observable<LandingDetail> {
        return this.http.post<LandingDetail>(this.detailsUrl, detail);
    }

    getDetailsByHeaderCode(code: string): Observable<LandingDetail[]> {
        return this.http.get<LandingDetail[]>(`${this.detailsUrl}/encabezado/${code}`);
    }

    updateDetail(id: number, detail: LandingDetail): Observable<any> {
        return this.http.put(`${this.detailsUrl}/${id}`, detail);
    }

    deleteDetail(id: number): Observable<any> {
        return this.http.delete(`${this.detailsUrl}/${id}`);
    }

    getPublicContent(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.landingPublicUrl}/landing`);
    }
}
