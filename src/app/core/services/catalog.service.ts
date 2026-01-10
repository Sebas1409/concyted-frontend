import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CatalogItem {
    id: number;
    codigo: string;
    nombre: string;
    descripcion: string;
    maestroId: number;
    activo: boolean | null;
}

@Injectable({
    providedIn: 'root'
})
export class CatalogService {
    private apiUrl = environment.catalogServiceUrl;

    constructor(private http: HttpClient) { }

    getMasterDetails(maestroId: number): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalogos/maestros/${maestroId}/detalles`);
    }

    getMasterDetailsByCode(code: string): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalogos/maestros/codigo/${code}/detalles`);
    }

    searchMasterDetails(code: string, term: string): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalogos/maestros/codigo/${code}/busqueda/detalles`, {
            params: { search: term }
        });
    }

    getAreas(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/areas`);
    }

    getSubAreas(areaId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/areas/${areaId}/sub-areas`);
    }

    getDisciplines(subAreaId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/areas/${subAreaId}/disciplinas`);
    }
}
