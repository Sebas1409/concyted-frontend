
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface TechnologicalTransfer {
    id: number;
    titulo: string;
    descripcion?: string;
    areaOcdeId?: number;
    subareaOcdeId?: number;
    tipoTecnologiaId?: number;
    nivelTrlId?: number;
    rolId?: number;
    fechaRegistro?: string;
    // Helper fields for display (if backend returns names)
    areaOcdeNombre?: string;
    subareaOcdeNombre?: string;
    tipoTecnologiaNombre?: string;
    nivelTrlNombre?: string;
    rolNombre?: string;
}

@Injectable({
    providedIn: 'root'
})
export class TechnologicalTransferService {
    private apiUrl = `${environment.userServiceUrl}/transferencia-tecnologica`;

    constructor(private http: HttpClient) { }

    getTransfersByInvestigator(investigatorId: number): Observable<TechnologicalTransfer[]> {
        const timestamp = new Date().getTime();
        return this.http.get<TechnologicalTransfer[]>(`${this.apiUrl}/investigador/${investigatorId}?t=${timestamp}`);
    }

    createTransfer(transfer: any): Observable<any> {
        return this.http.post(this.apiUrl, transfer);
    }

    updateTransfer(id: number, transfer: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, transfer);
    }

    deleteTransfer(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
