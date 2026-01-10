import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IntellectualProperty {
    id?: number;
    investigadorId: number;
    titulo: string;
    tipoPropiedadCodigo: string;
    tipoPropiedadNombre?: string;
    estadoActualCodigo: string;
    estadoActualNombre?: string;
    paisRegistroId: number;
    paisRegistroNombre?: string;
    entidadRegistroCodigo: string;
    entidadRegistroNombre?: string;
    rolParticipacionCodigo: string;
    rolParticipacionNombre?: string;
    numeroRegistro: string;
    titular: string; // Owner
    participaDerechos: boolean;
    tramitePct: boolean;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class IntellectualPropertyService {
    private apiUrl = environment.userServiceUrl + '/propiedad-intelectual';

    constructor(private http: HttpClient) { }

    getIntellectualPropertiesByInvestigator(investigatorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/investigador/${investigatorId}`);
    }

    // Placeholders for Create/Update/Delete (will implement later if needed or now for completeness)
    createIntellectualProperty(payload: any): Observable<any> {
        return this.http.post(this.apiUrl, payload);
    }

    updateIntellectualProperty(id: number, payload: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, payload);
    }

    deleteIntellectualProperty(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
