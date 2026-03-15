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
    private publicApiUrl = (environment as any).catalogPublicServiceUrl || environment.catalogServiceUrl.replace('/api', '/public/api');

    constructor(private http: HttpClient) { }

    getMasterDetails(maestroId: number): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalogos/maestros/${maestroId}/detalles`);
    }

    getPublicMasterDetails(maestroId: number): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.publicApiUrl}/catalogos/maestros/${maestroId}/detalles`);
    }

    getMasterDetailsByCode(code: string): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalogos/maestros/codigo/${code}/detalles`);
    }

    // Public API for catalogs (used during registration)
    getPublicMasterDetailsByCode(code: string): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.publicApiUrl}/catalogos/maestros/codigo/${code}/detalles`);
    }

    searchMasterDetails(code: string, term: string): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalogos/maestros/codigo/${code}/busqueda/detalles`, {
            params: { search: term }
        });
    }

    getAreas(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/areas`);
    }

    getPublicAreas(): Observable<any[]> {
        return this.http.get<any[]>(`${this.publicApiUrl}/areas`);
    }

    getSubAreas(areaId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/areas/${areaId}/sub-areas`);
    }

    getDisciplines(subAreaId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/areas/${subAreaId}/disciplinas`);
    }

    getMasterSubDetails(masterCode: string, detailCode: string): Observable<CatalogItem[]> {
        return this.http.get<CatalogItem[]>(`${this.apiUrl}/catalogos/maestros/codigo/${masterCode}/detalles/codigo/${detailCode}/subdetalles`);
    }
}
