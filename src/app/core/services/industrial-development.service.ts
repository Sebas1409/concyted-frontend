import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IndustrialDevelopment {
    id: number;
    investigadorId: number;
    nombreDesarrollo: string;
    tipoProductoCodigo: string;
    tipoProductoNombre: string;
    alcanceNovedadCodigo: string;
    alcanceNovedadNombre: string;
    faseDesarrolloCodigo: string;
    faseDesarrolloNombre: string;
    estadoComercialCodigo: string;
    estadoComercialNombre: string;
    rolParticipacionCodigo: string;
    rolParticipacionNombre: string;
    titular: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class IndustrialDevelopmentService {
    private apiUrl = `${environment.userServiceUrl}/desarrollo-industrial`;

    constructor(private http: HttpClient) { }

    getIndustrialDevelopmentsByInvestigator(investigatorId: number): Observable<IndustrialDevelopment[]> {
        const timestamp = new Date().getTime();
        return this.http.get<IndustrialDevelopment[]>(`${this.apiUrl}/investigador/${investigatorId}?t=${timestamp}`);
    }

    createIndustrialDevelopment(data: any): Observable<any> {
        return this.http.post(this.apiUrl, data);
    }

    updateIndustrialDevelopment(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, data);
    }

    deleteIndustrialDevelopment(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
