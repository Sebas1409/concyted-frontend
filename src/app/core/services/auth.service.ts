import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.models';
// Export legacy interfaces just in case, but prefer models
export type { LoginRequest, AuthResponse } from '../models/auth.models';

export interface PasswordResetRequest {
    email: string;
    recaptcha_token: string;
}

export interface PasswordResetValidate {
    email: string;
    code: string;
    recaptcha_token: string;
}

export interface PasswordResetConfirm {
    email: string;
    password: string;
    recaptcha_token: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private usuariosUrl = `${environment.apiUrl}/usuarios`;
    private authUrl = `${environment.apiUrl}/auth`;

    // User State Management
    private currentUserSubject = new BehaviorSubject<AuthResponse | null>(null);
    currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        this.restoreSession();
    }

    login(credentials: LoginRequest): Observable<any> {
        return this.http.post(`${this.authUrl}/login`, credentials)
            .pipe(map(response => response));
    }

    register(user: any): Observable<any> {
        return this.http.post(`${this.usuariosUrl}`, user);
    }

    registerResearcher(researcherData: any): Observable<any> {
        return this.http.post(`${environment.userServiceUrl}/v2/investigadores`, researcherData);
    }

    getResearcherVisibility(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${environment.userServiceUrl}/investigadores/${userId}/visibilidad`);
    }

    getInvestigatorByUserId(investigatorId: number): Observable<any> {
        return this.http.get(`${environment.userServiceUrl}/v2/investigadores/usuario/${investigatorId}`);
    }

    updateResearcher(investigatorId: number, researcherData: any): Observable<any> {
        return this.http.put(`${environment.userServiceUrl}/v2/investigadores/${investigatorId}`, researcherData);
    }

    updateResearcherVisibility(userId: number, visibilityData: any[]): Observable<any> {
        return this.http.put(`${environment.userServiceUrl}/investigadores/${userId}/visibilidad`, visibilityData);
    }

    requestPasswordReset(email: string, recaptchaToken: string): Observable<any> {
        return this.http.post(`${this.authUrl}/password-reset/request`, { email, recaptcha_token: recaptchaToken });
    }

    validateResetCode(email: string, code: string, recaptchaToken: string): Observable<any> {
        return this.http.post(`${this.authUrl}/password-reset/validate`, { code, email, recaptcha_token: recaptchaToken });
    }

    confirmPasswordReset(payload: { email: string; password: string; recaptcha_token: string }): Observable<any> {
        return this.http.put(`${this.authUrl}/password-reset`, payload);
    }

    getUserById(userId: number): Observable<any> {
        return this.http.get(`${this.usuariosUrl}/${userId}`);
    }

    updateUser(userId: number, payload: any): Observable<any> {
        return this.http.put(`${this.usuariosUrl}/${userId}`, payload);
    }

    requestAccountDeletion(payload: { correo: string, documento: string, investigadorId: number, motivoInvestigador: string }): Observable<any> {
        return this.http.post(`${environment.userServiceUrl}/solicitud-anulacion`, payload);
    }

    getDerecognitionRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.userServiceUrl}/solicitud-anulacion`);
    }

    processAccountDeletion(payload: any): Observable<any> {
        return this.http.put(`${environment.userServiceUrl}/solicitud-anulacion/${payload.id}/atender`, {
            adminId: payload.adminId,
            estado: payload.estado,
            observacionAdmin: payload.observacionAdmin
        });
    }

    sendContactMessage(payload: { celular: string, email: string, mensaje: string }): Observable<any> {
        return this.http.post(`${environment.userServiceUrl}/contacto`, payload);
    }

    saveUserUnified(payload: any): Observable<any> {
        return this.http.post(`${this.usuariosUrl}`, payload);
    }

    setCurrentUser(user: AuthResponse) {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
    }

    getCurrentUser(): AuthResponse | null {
        return this.currentUserSubject.value;
    }

    restoreSession() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user: AuthResponse = JSON.parse(storedUser);
                this.currentUserSubject.next(user);
            } catch (e) {
                console.error('Error parsing stored user', e);
                this.logout();
            }
        }
    }

    logout() {
        console.log('AuthService: Logging out...');
        // Remove all data from local storage to ensure clean state
        localStorage.clear();
        console.log('AuthService: Storage cleared. Items remaining:', localStorage.length);

        // Reset state
        this.currentUserSubject.next(null);
    }
    processLoginResponse(response: any): Observable<boolean> {
        if (response && response.accessToken) {
            try {
                const decoded = this.decodeToken(response.accessToken);
                console.log('Decoded Token:', decoded);

                const userId = decoded.sub;
                if (!userId) {
                    console.error('No user ID (sub) found in token');
                    return of(false);
                }

                // Save token immediately for interceptor
                localStorage.setItem('accessToken', response.accessToken);

                // Updated API endpoint as per user request (User Service v2)
                return this.http.get<AuthResponse>(`${environment.userServiceUrl}/v2/investigadores/usuario/${userId}`).pipe(
                    map(userInfo => {
                        console.log('User Info retrieved:', userInfo);
                        this.setCurrentUser(userInfo);
                        return true;
                    }),
                    catchError(err => {
                        console.error('Failed to fetch user info', err);
                        this.logout();
                        return of(false);
                    })
                );
            } catch (e) {
                console.error('Error decoding token', e);
                return of(false);
            }
        }
        return of(false);
    }

    getUserRoles(): string[] {
        const token = localStorage.getItem('accessToken');
        if (!token) return [];

        const decoded = this.decodeToken(token);
        if (!decoded) return [];

        // Return roles from typical JWT claim fields
        const roles = decoded.roles || decoded.authorities || [];

        if (Array.isArray(roles)) {
            return roles;
        } else if (typeof roles === 'string') {
            return [roles];
        }

        return [];
    }

    private decodeToken(token: string): any {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Failed to decode token', e);
            return null;
        }
    }
    refreshCurrentUser(): Observable<AuthResponse> {
        const currentUser = this.getCurrentUser();
        // We need usuarioId (the user ID) to query this endpoint, not the researcher ID (id)
        // If currentUser is valid, it should have usuarioId. 
        if (!currentUser || !currentUser.usuarioId) {
            return of(null as any);
        }

        return this.http.get<AuthResponse>(`${environment.userServiceUrl}/v2/investigadores/usuario/${currentUser.usuarioId}`).pipe(
            map(userInfo => {
                console.log('Refreshing User Info:', userInfo);
                this.setCurrentUser(userInfo);
                return userInfo;
            }),
            catchError(err => {
                console.error('Failed to refresh user info', err);
                return of(null as any);
            })
        );
    }

    getRoles(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/roles`);
    }
}
