import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthBrandingComponent } from '../../../shared/components/auth-branding/auth-branding.component';
import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, RouterLink, AuthBrandingComponent, ReactiveFormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private recaptchaService = inject(RecaptchaService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private cdr = inject(ChangeDetectorRef);

    successMessage: string | null = null;
    loginError: string | null = null;

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params['resetSuccess']) {
                this.successMessage = 'Tu contraseña ha sido restablecida correctamente.';
            }
        });


    }

    loginForm: FormGroup = this.fb.group({
        dni: ['', [Validators.required]],
        password: ['', [Validators.required]]
    });

    showPassword = false;
    isLoading = false;

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    onSubmit() {
        this.loginError = null;
        if (this.loginForm.valid) {
            this.isLoading = true;
            this.loginForm.disable(); // Prevent multiple submissions

            // Execute reCAPTCHA immediately before login to ensure fresh token
            this.recaptchaService.execute('login').subscribe({
                next: (token) => {
                    const { dni, password } = this.loginForm.value;

                    const credentials = {
                        dni: Number(dni),
                        num_doc: Number(dni),
                        password: password,
                        recaptcha_token: token
                    };

                    this.performLogin(credentials);
                },
                error: (err) => {
                    console.error('Recaptcha execution failed', err);
                    this.loginError = 'Error de seguridad al validar reCAPTCHA. Por favor intente nuevamente.';
                    this.isLoading = false;
                    this.loginForm.enable();
                    this.cdr.detectChanges();
                }
            });
        } else {
            this.loginForm.markAllAsTouched();
        }
    }

    private performLogin(credentials: any) {
        this.authService.login(credentials).subscribe({
            next: (response: any) => {
                console.log('Login response:', response);

                if (response.data && response.data.recaptchaStatus === false) {
                    this.loginError = response.data.recaptchaErrorMessage || response.message || 'Error al validar el reCAPTCHA';
                    this.isLoading = false;
                    this.loginForm.enable();
                    this.cdr.detectChanges();
                    return;
                }

                if (response.accessToken) {
                    this.authService.processLoginResponse(response).subscribe({
                        next: (success) => {
                            if (success) {
                                const roles = this.authService.getUserRoles();
                                console.log('User roles redirecting:', roles);

                                if (roles.includes('ROLE_SUPERADMIN') || roles.includes('ROLE_ADMIN')) {
                                    this.router.navigate(['/admin']);
                                } else {
                                    this.router.navigate(['/app']);
                                }
                            } else {
                                this.loginError = 'Error al obtener información del usuario.';
                                this.isLoading = false;
                                this.loginForm.enable();
                                this.cdr.detectChanges();
                            }
                        },
                        error: (err) => {
                            this.loginError = 'Error procesando inicio de sesión.';
                            this.isLoading = false;
                            this.loginForm.enable();
                            this.cdr.detectChanges();
                        }
                    });
                } else if (response.status === 'OK' || response.ok) {
                    this.authService.setCurrentUser(response.data);
                    this.router.navigate(['/app']);
                } else {
                    this.loginError = response.message || 'Error al iniciar sesión.';
                    this.isLoading = false;
                    this.loginForm.enable();
                    this.cdr.detectChanges();
                }
            },
            error: (error) => {
                console.error('Login failed', error);
                this.loginError = error.error?.message || error.message || 'Error al iniciar sesión. Verifique sus credenciales.';
                this.isLoading = false;
                this.loginForm.enable();
                this.cdr.detectChanges();
            }
        });
    }

    isFieldInvalid(field: string): boolean {
        const control = this.loginForm.get(field);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }
}
