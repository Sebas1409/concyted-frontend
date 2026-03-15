import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthBrandingComponent } from '../../../shared/components/auth-branding/auth-branding.component';
import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { ROLES } from '../../../core/constants/roles.constants';
import { OrcidService } from '../../../core/services/orcid.service';

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
    private orcidService = inject(OrcidService);

    successMessage: string | null = null;
    loginError: string | null = null;

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            if (params['resetSuccess']) {
                this.successMessage = 'Tu contraseña ha sido restablecida correctamente.';
            }

            if (params['code']) {
                this.handleOrcidCallback(params['code']);
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
                        username: dni,
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

                                if (roles.includes(ROLES.INVESTIGADOR)) {
                                    this.router.navigate(['/app']);
                                } else {
                                    this.router.navigate(['/admin']);
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

    onOrcidLogin() {
        this.orcidService.loginWithOrcid();
    }

    private handleOrcidCallback(code: string) {
        this.isLoading = true;
        this.loginError = null;
        console.log('--- Iniciando procesamiento de callback ORCID ---');
        console.log('Código de autorización:', code);

        // En un escenario real, aquí se llamaría al backend para intercambiar el código.
        // Simulamos el ID obtenido del token que devolvería el backend:
        const researcherOrcidId = '0009-0004-1341-9270'; 

        console.log('Obteniendo perfil público para ORCID:', researcherOrcidId);

        this.orcidService.getPublicProfile(researcherOrcidId).subscribe({
            next: (profileData) => {
                console.log('Datos de perfil recibidos:', profileData);

                // Mapeamos los datos de ORCID al modelo AuthResponse que usa la app
                const authUser = this.orcidService.mapOrcidToAuthResponse(profileData);
                
                // 1. Primero generamos y guardamos el token
                const simulatedToken = this.orcidService.generateSimulatedToken(authUser.roles || []);
                localStorage.setItem('accessToken', simulatedToken);
                console.log('Token de sesión guardado');
                
                // 2. Luego establecemos el usuario (esto activará los timers de sesión)
                this.authService.setCurrentUser(authUser);
                console.log('Usuario establecido en la sesión:', authUser.nombres);

                setTimeout(() => {
                    console.log('Redirigiendo al dashboard...');
                    this.isLoading = false;
                    this.router.navigate(['/app/profile']);
                    this.cdr.detectChanges();
                }, 1500);
            },
            error: (err) => {
                console.error('Error crítico al procesar ORCID:', err);
                this.isLoading = false;
                this.loginError = 'No se pudo obtener la información de su perfil ORCID. Verifique su conexión.';
                this.cdr.detectChanges();
            }
        });
    }

    isFieldInvalid(field: string): boolean {
        const control = this.loginForm.get(field);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }
}
