import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthBrandingComponent } from '../../../shared/components/auth-branding/auth-branding.component';
import { CustomValidators } from '../../../shared/utils/validators';
import { RecoverPasswordFacade } from './recover-password.facade';
import { CountdownTimer } from '../../../shared/utils/timer.utils';
import { OnlyNumbersDirective } from '../../../shared/directives/only-numbers.directive';
import { PasswordStrengthDirective } from '../../../shared/directives/password-strength.directive';
import { RecaptchaService } from '../../../core/services/recaptcha.service';

@Component({
    selector: 'app-recover-password',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ReactiveFormsModule,
        AuthBrandingComponent,
        OnlyNumbersDirective,
        PasswordStrengthDirective
    ],
    templateUrl: './recover-password.component.html',
    styleUrl: './recover-password.component.scss'
})
export class RecoverPasswordComponent implements OnInit, OnDestroy {
    currentStep = 1;
    isLoading = false;

    step1Form: FormGroup;
    step2Form: FormGroup;
    step3Form: FormGroup;

    step1Error: string | null = null;
    step2Error: string | null = null;
    step3Error: string | null = null;

    // Timer Utility
    timer = new CountdownTimer();
    timeLeft$ = this.timer.timeLeft$;

    // Expose Validators to Template
    protected validators = CustomValidators;

    showPassword = false;
    showConfirmPassword = false;

    constructor(
        private fb: FormBuilder,
        private facade: RecoverPasswordFacade,
        private router: Router,
        private cdr: ChangeDetectorRef,
        private recaptchaService: RecaptchaService
    ) {
        this.step1Form = this.fb.group({
            email: ['', [Validators.required, Validators.pattern(CustomValidators.emailPattern)]]
        });

        // Clear error on input change
        this.step1Form.get('email')?.valueChanges.subscribe(() => {
            this.step1Error = null;
        });

        this.step2Form = this.fb.group({
            code: ['', [Validators.required, Validators.pattern(CustomValidators.codePattern)]]
        });

        this.step3Form = this.fb.group({
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        }, { validators: CustomValidators.checkPasswords });
    }

    ngOnInit() {
        // Ensure fresh token on view load
        this.recaptchaService.execute('recover_view_init').subscribe(token => {
            console.log('Recaptcha refreshed on Init');
            localStorage.setItem('recaptcha_token', token);
        });
    }

    ngOnDestroy() {
        this.timer.stop();
    }

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPasswordVisibility() {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    resendCode() {
        const email = this.step1Form.get('email')?.value;

        this.facade.requestReset(email).subscribe({
            next: (res) => {
                console.log('✅ Resend response:', res);
                if (res && (res.status === 'OK' || res.ok === true || res.success === true)) {
                    this.timer.start(50);
                } else {
                    alert(res?.message || 'Error al procesar la solicitud.');
                }
            },
            error: (err) => {
                const errorMessage = err.error?.message || err.message || 'Error al reenviar el código.';
                alert(errorMessage);
            }
        });
    }

    onStep1Submit() {
        if (this.step1Form.valid) {
            this.isLoading = true;
            this.step1Error = null;
            const email = this.step1Form.get('email')?.value;

            this.facade.requestReset(email).subscribe({
                next: (res) => {
                    this.isLoading = false;
                    if (res && (res.status === 'OK')) {
                        // Refresh Recaptcha Token before moving to Step 2
                        this.recaptchaService.execute('recover_step2').subscribe({
                            next: (token) => {
                                console.log('Recaptcha refreshed for Step 2');
                                localStorage.setItem('recaptcha_token', token);
                                this.goToStep(2);
                                this.timer.start(50);
                            },
                            error: (err) => {
                                console.error('Failed to refresh recaptcha', err);
                                // Fallback: try to proceed anyway or show error?
                                // User requested refresh, so best to proceed but warn?
                                // Or block? Blocking is safer if API requires it.
                                // Proceeding for now to avoid stuck UI if recaptcha network fails but API OK.
                                this.goToStep(2);
                                this.timer.start(50);
                            }
                        });
                    } else {
                        this.step1Error = res?.message || 'Error al procesar la solicitud.';
                    }
                },
                error: (err) => {
                    this.isLoading = false;
                    this.step1Error = err.error?.message || err.message || 'Error de conexión o servidor.';
                }
            });
        }
    }

    onStep2Submit() {
        if (this.step2Form.valid) {
            this.step2Error = null;
            const email = this.step1Form.get('email')?.value;
            const code = this.step2Form.get('code')?.value;

            this.facade.validateCode(email, code).subscribe({
                next: (res) => {
                    console.log('✅ Validation response:', res);
                    // Check if status is OK and if recaptchaStatus inside data is true
                    const isRecaptchaValid = res.data?.recaptchaStatus === true;

                    if (res && (res.status === 'OK' || res.ok === true) && isRecaptchaValid) {
                        console.log('Code valid and Recaptcha OK, refreshing token for Step 3...');

                        // REFRESH TOKEN for Step 3
                        this.recaptchaService.execute('recover_step3').subscribe({
                            next: (token) => {
                                console.log('Recaptcha refreshed for Step 3');
                                localStorage.setItem('recaptcha_token', token);
                                this.timer.stop();
                                this.goToStep(3);
                            },
                            error: (err) => {
                                console.error('Failed to refresh recaptcha for Step 3', err);
                                // Fallback: Proceed anyway
                                this.timer.stop();
                                this.goToStep(3);
                            }
                        });
                    } else {
                        this.step2Error = res?.message || 'El código ingresado es incorrecto o la validación falló.';
                        this.step2Form.get('code')?.setValue('');
                    }
                },
                error: (err) => {
                    console.error('❌ Validation error:', err);
                    if (err.status === 200 && err.error && err.error.text) {
                        this.timer.stop();
                        this.goToStep(3);
                        return;
                    }
                    this.step2Error = err.error?.message || err.message || 'El código ingresado es incorrecto o ha expirado.';
                    this.step2Form.get('code')?.setValue('');
                }
            });
        }
    }

    onSubmit() {
        const password = this.step3Form.get('password')?.value;
        const validRobustness = password && password.length >= 8 && CustomValidators.hasUpperCase(password) && CustomValidators.hasNumber(password);

        if (this.step3Form.valid && validRobustness) {
            const email = this.step1Form.get('email')?.value;
            const payload = { email, password };

            this.facade.confirmReset(payload).subscribe({
                next: () => {
                    this.router.navigate(['/auth/login'], { queryParams: { resetSuccess: true } });
                },
                error: (err) => {
                    console.error('Password reset failed', err);
                    this.step3Error = err.error?.message || err.message || 'Error al restablecer la contraseña. Intente nuevamente.';
                }
            });
        } else {
            if (!validRobustness) {
                this.step3Error = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.';
            }
            this.step3Form.markAllAsTouched();
        }
    }

    goToStep(step: number) {
        console.log('Navigating to step:', step);
        this.currentStep = step;
        if (step !== 2) {
            this.timer.stop();
        }
        if (this.cdr) {
            this.cdr.detectChanges();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
        }
    }
}
