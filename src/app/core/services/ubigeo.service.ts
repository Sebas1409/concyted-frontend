import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UbigeoService {
    private apiUrl = environment.managementServiceUrl + '/ubigeo';

    constructor(private http: HttpClient) { }

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
}
