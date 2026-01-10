import { Injectable } from '@angular/core';
import { ReCaptchaV3Service } from 'ng-recaptcha';
import { Observable, catchError, throwError, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class RecaptchaService {

    constructor(private recaptchaV3Service: ReCaptchaV3Service) { }

    /**
     * Executes reCAPTCHA v3 verification for a specific action.
     * @param action The action name for analytics (e.g., 'login', 'register').
     * @returns Observable resolving to the token string.
     */
    execute(action: string): Observable<string> {
        return this.recaptchaV3Service.execute(action).pipe(
            tap(token => console.log(`Recaptcha token generated for ${action}`)),
            catchError(error => {
                console.error('Recaptcha execution error:', error);
                return throwError(() => new Error('Recaptcha verification failed'));
            })
        );
    }

    getToken(): string | null {
        return localStorage.getItem('recaptcha_token');
    }
}
