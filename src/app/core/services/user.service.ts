import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    createdAt?: string;
    credentialsNonExpired?: boolean;
    updatedAt?: string;
    areaId?: number;
    roles?: string[];
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

    createUser(user: UserRequestDTO): Observable<UserProfileApi> {
        return this.http.post<UserProfileApi>(`${this.apiUrl}/v2/usuarios`, user);
    }

    updateUser(id: number | string, user: UserRequestDTO): Observable<UserProfileApi> {
        return this.http.put<UserProfileApi>(`${this.apiUrl}/v2/usuarios/${id}`, user);
    }

    deleteUser(id: number | string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/v2/usuarios/${id}`);
    }
}
