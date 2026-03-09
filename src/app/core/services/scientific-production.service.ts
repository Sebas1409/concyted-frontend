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
}
