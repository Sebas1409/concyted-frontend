import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UbigeoService {
    private apiUrl = environment.managementServiceUrl + '/ubigeo';
    private publicApiUrl = environment.landingPublicUrl + '/ubigeo';

    constructor(private http: HttpClient) { }

    // Private APIs (standard)
    getCountries(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/paises`);
    }

    getDepartments(countryId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/paises/${countryId}/departamentos`);
    }

    getProvinces(departmentId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/departamentos/${departmentId}/provincias`);
    }

    getDistricts(provinceId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/provincias/${provinceId}/distritos`);
    }

    getIdsByNames(payload: { pais: string, departamento: string, provincia: string, distrito: string }): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/ids`, payload);
    }

    // Public APIs (for registration/landing)
    getPublicCountries(): Observable<any[]> {
        return this.http.get<any[]>(`${this.publicApiUrl}/paises`);
    }

    getPublicDepartments(countryId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.publicApiUrl}/paises/${countryId}/departamentos`);
    }

    getPublicProvinces(departmentId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.publicApiUrl}/departamentos/${departmentId}/provincias`);
    }

    getPublicDistricts(provinceId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.publicApiUrl}/provincias/${provinceId}/distritos`);
    }

    getPublicIdsByNames(payload: { pais: string, departamento: string, provincia: string, distrito: string }): Observable<any> {
        return this.http.post<any>(`${this.publicApiUrl}/ids`, payload);
    }
}
