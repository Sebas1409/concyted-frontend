import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.models';
import { ROLES } from '../constants/roles.constants';
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
    private logoutTimer: any;

    constructor(private http: HttpClient, private router: Router) {
        this.restoreSession();
    }

    login(credentials: LoginRequest): Observable<any> {
        return this.http.post(`${this.authUrl}/login`, credentials)
            .pipe(map(response => response));
    }

    refreshToken(token: string): Observable<any> {
        return this.http.post(`${this.authUrl}/refresh`, { refreshToken: token });
    }

    register(user: any): Observable<any> {
        return this.http.post(`${this.usuariosUrl}`, user);
    }

    registerResearcher(researcherData: any): Observable<any> {
        // Use the public API for registration
        const publicUrl = environment.userServiceUrl.replace('/api', '/public/api');
        return this.http.post(`${publicUrl}/v2/investigadores`, researcherData);
    }

    getResearcherVisibility(userId: number): Observable<any[]> {
        return this.http.get<any[]>(`${environment.userServiceUrl}/investigadores/${userId}/visibilidad`);
    }

    getInvestigatorByUserId(investigatorId: number): Observable<any> {
        return this.http.get(`${environment.userServiceUrl}/v2/investigadores/usuario/${investigatorId}`);
    }

    getInvestigatorById(investigatorId: number): Observable<any> {
        return this.http.get(`${environment.userServiceUrl}/v2/investigadores/${investigatorId}`);
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

    deleteAccountImmediately(id: number | string): Observable<any> {
        return this.http.put(`${environment.userServiceUrl}/solicitud-anulacion/${id}/baja-inmediata`, {});
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

        // Start timer based on current token
        const token = localStorage.getItem('accessToken');
        if (token) {
            this.setLogoutTimer(token);
        }
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

                // Re-verify token expiration
                const token = localStorage.getItem('accessToken');
                if (token) {
                    this.setLogoutTimer(token);
                }
            } catch (e) {
                console.error('Error parsing stored user', e);
                this.logout();
            }
        }
    }

    logout() {
        console.log('AuthService: Logging out...');

        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
            this.logoutTimer = null;
        }

        // Remove all data from local storage to ensure clean state
        localStorage.clear();
        console.log('AuthService: Storage cleared. Items remaining:', localStorage.length);

        // Reset state
        this.currentUserSubject.next(null);
        this.router.navigate(['/auth/login']);
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
                if (response.refreshToken) {
                    localStorage.setItem('refreshToken', response.refreshToken);
                }

                // Roles check to choose API
                const roles = decoded.roles || decoded.authorities || [];
                const isResearcher = Array.isArray(roles) ? roles.includes(ROLES.INVESTIGADOR) : roles === ROLES.INVESTIGADOR;

                const profileUrl = isResearcher
                    ? `${environment.userServiceUrl}/v2/investigadores/usuario/${userId}`
                    : `${environment.apiUrl}/v2/usuarios/${userId}`;

                console.log(`Fetching profile from: ${profileUrl}`);

                return this.http.get<AuthResponse>(profileUrl).pipe(
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

    hasRole(role: string): boolean {
        return this.getUserRoles().includes(role);
    }

    isAdmin(): boolean {
        const user = this.getCurrentUser();
        return this.hasRole(ROLES.ADMIN) || this.hasRole(ROLES.SUPERADMIN);
    }

    isSuperAdmin(): boolean {
        return this.hasRole(ROLES.SUPERADMIN);
    }

    isInvestigador(): boolean {
        return this.hasRole(ROLES.INVESTIGADOR);
    }

    isConsulta(): boolean {
        return this.hasRole(ROLES.CONSULTA);
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

    private setLogoutTimer(token: string) {
        try {
            const decoded = this.decodeToken(token);
            if (!decoded || !decoded.exp) return;

            const expirationTime = decoded.exp * 1000; // to ms
            const currentTime = Date.now();
            const timeout = expirationTime - currentTime;

            if (this.logoutTimer) {
                clearTimeout(this.logoutTimer);
            }

            if (timeout <= 0) {
                console.warn('Token already expired. Logging out now.');
                this.logout();
            } else {
                console.log(`Session will expire in ${Math.round(timeout / 1000 / 60)} minutes.`);
                this.logoutTimer = setTimeout(() => {
                    console.error('Session expired (Timer). Redirecting to login.');
                    this.logout();
                }, timeout);
            }
        } catch (e) {
            console.error('Failed to set logout timer', e);
        }
    }
    refreshCurrentUser(): Observable<AuthResponse> {
        const currentUser = this.getCurrentUser();
        // We need usuarioId (the user ID) to query this endpoint, not the researcher ID (id)
        // If currentUser is valid, it should have usuarioId. 
        if (!currentUser || !currentUser.usuarioId) {
            return of(null as any);
        }

        const profileUrl = this.isInvestigador()
            ? `${environment.userServiceUrl}/v2/investigadores/usuario/${currentUser.usuarioId}`
            : `${environment.apiUrl}/v2/usuarios/${currentUser.usuarioId || currentUser.id}`;

        return this.http.get<AuthResponse>(profileUrl).pipe(
            map(userInfo => {
                console.log('Refreshing User Info:', userInfo);
                this.setCurrentUser(userInfo);
                return userInfo;
            }),
            catchError(err => {
                console.error('Error refreshing user info', err);
                return throwError(() => err);
            })
        );
    }

    getRoles(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiUrl}/roles`);
    }
}
