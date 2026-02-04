import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserProfileApi {
    id: number;
    username: string;
    email: string | null;
    enabled: boolean;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    numDoc: string;
    telefono: string | null;
    tipodoc: string;
    accountNonExpired?: boolean;
    accountNonLocked?: boolean;
    active?: boolean;
    activo?: boolean;
    createdAt?: string;
    credentialsNonExpired?: boolean;
    updatedAt?: string;
    areaId?: number;
    roles?: any;
    docToken?: string | null;
    idInvestigador?: number | null;
    sexo?: string; // Código de género (ej: SEX001, SEX002, M, F)
}

export interface UserRequestDTO {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    tipoDoc: string;
    numDoc: string;
    email: string;
    telefono: string;
    username: string;
    password?: string;
    roles: string[];
    enabled: boolean;
    active: boolean;
    activo?: boolean;
    accountNonExpired: boolean;
    accountNonLocked: boolean;
    credentialsNonExpired: boolean;
    areaId?: number;
}

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = environment.apiUrl; // http://.../cti-auth-service/api

    constructor(private http: HttpClient) { }

    getUsers(): Observable<UserProfileApi[]> {
        return this.http.get<UserProfileApi[]>(`${this.apiUrl}/v2/usuarios`);
    }

    getOnlyUsers(isAdmin: boolean = true, page: number = 0, size: number = 10, filter: string = ''): Observable<any> {
        let params = new HttpParams()
            .set('isAdmin', isAdmin.toString())
            .set('pageNumber', page.toString())
            .set('pageSize', size.toString())
            .set('paged', 'true')
            .set('unpaged', 'false')
            .set('sort.sorted', 'true')
            .set('sort.unsorted', 'false');

        if (filter) {
            params = params.set('filter', filter);
        }

        return this.http.get<any>(`${this.apiUrl}/v2/usuarios/page`, { params });
    }

    createUser(user: UserRequestDTO): Observable<UserProfileApi> {
        return this.http.post<UserProfileApi>(`${this.apiUrl}/v2/usuarios`, user);
    }

    updateUser(id: number | string, user: UserRequestDTO): Observable<UserProfileApi> {
        return this.http.put<UserProfileApi>(`${this.apiUrl}/v2/usuarios/${id}`, user);
    }

    deleteUser(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/v2/usuarios/${id}`);
    }

    activateUser(id: number | string): Observable<any> {
        return this.http.put(`${this.apiUrl}/v2/usuarios/${id}/activate`, {});
    }

    deactivateUser(id: number | string): Observable<any> {
        return this.http.put(`${this.apiUrl}/v2/usuarios/${id}/deactivate`, {});
    }
}
