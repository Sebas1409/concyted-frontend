import { Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { BehaviorSubject, Observable, throwError } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class RecoverPasswordFacade {
    private _isLoading = new BehaviorSubject<boolean>(false);

    // State exposers could be added here if we wanted to manage 'currentStep' in logic

    constructor(
        private authService: AuthService,
        private recaptchaService: RecaptchaService
    ) { }

    get isLoading$() {
        return this._isLoading.asObservable();
    }

    // Helper to check token
    private getTokenOrThrow(): string {
        const token = this.recaptchaService.getToken();
        if (!token) {
            throw new Error('Token de seguridad no encontrado (Recaptcha). Refresque la página.');
        }
        return token;
    }

    // Step 1: Request Code
    requestReset(email: string): Observable<any> {
        this._isLoading.next(true);
        let token: string;
        try {
            token = this.getTokenOrThrow();
        } catch (e: any) {
            this._isLoading.next(false);
            return throwError(() => new Error(e.message));
        }

        return new Observable(observer => {
            this.authService.requestPasswordReset(email, token).subscribe({
                next: (res) => {
                    this._isLoading.next(false);
                    observer.next(res);
                    observer.complete();
                },
                error: (err) => {
                    this._isLoading.next(false);
                    observer.error(err);
                }
            });
        });
    }

    // Step 2: Validate Code
    validateCode(email: string, code: string): Observable<any> {
        let token: string;
        try {
            token = this.getTokenOrThrow();
        } catch (e: any) {
            return throwError(() => new Error(e.message));
        }

        return this.authService.validateResetCode(email, code, token);
    }

    // Step 3: Confirm Password
    confirmReset(payload: { email: string, password: string }): Observable<any> {
        let token: string;
        try {
            token = this.getTokenOrThrow();
        } catch (e: any) {
            return throwError(() => new Error(e.message));
        }

        return this.authService.confirmPasswordReset({ ...payload, recaptcha_token: token });
    }
}
