import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReniecValidationRequest {
    dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
    recaptcha_token?: string;
}

export interface ReniecValidationResponse {
    dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;

    // Address info
    departamento: string;
    provincia: string;
    distrito: string;
    direccion: string;
    pais: string;

    validado: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ReniecService {
    private apiUrl = environment.reniecApiUrl;
    private privateApiUrl = environment.reniecPrivateApiUrl;

    constructor(private http: HttpClient) { }

    /** Public endpoint - for registration (no auth token needed, uses recaptcha) */
    validate(data: ReniecValidationRequest): Observable<ReniecValidationResponse> {
        return this.http.post<ReniecValidationResponse>(this.apiUrl, data);
    }

    /** Private endpoint - for dashboard identity validation (requires auth token) */
    validatePrivate(data: ReniecValidationRequest): Observable<ReniecValidationResponse> {
        return this.http.post<ReniecValidationResponse>(this.privateApiUrl, data);
    }
}
