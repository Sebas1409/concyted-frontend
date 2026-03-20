import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../../core/services/auth.service';
import { RecaptchaService } from '../../../../../core/services/recaptcha.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { CustomValidators } from '../../../../../shared/utils/validators';
import { PasswordStrengthDirective } from '../../../../../shared/directives/password-strength.directive';

import { CvExportService } from '../../../../../core/services/cv-export.service';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, PasswordStrengthDirective],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    activeTab: 'settings' | 'export' = 'settings';
    isLoading = false;

    // Forms
    passwordForm: FormGroup;
    contactForm: FormGroup;
    deleteAccountForm: FormGroup;

    // Export Options State
    exportSections = {
        identity: {
            all: true,
            options: [
                { key: 'datper', label: 'Datos Personales', checked: true },
                { key: 'datact', label: 'Datos Actuales', checked: true },
                { key: 'otride', label: 'Otros Identificadores', checked: true }
            ]
        },
        trajectory: {
            all: true,
            options: [
                { key: 'explab', label: 'Experiencia Laboral General', checked: true },
                { key: 'expdoc', label: 'Experiencia Docente', checked: true },
                { key: 'expase', label: 'Experiencia como Asesor de Tesis', checked: true },
                { key: 'expeva', label: 'Experiencia como Evaluador de Proyectos', checked: true }
            ]
        },
        formation: {
            all: true,
            options: [
                { key: 'forsun', label: 'Formación Académica (Fuente SUNEDU)', checked: true },
                { key: 'forman', label: 'Formación Académica (Fuente Manual)', checked: true },
                { key: 'esttec', label: 'Estudios Técnicos', checked: true },
                { key: 'estcur', label: 'Estudios Académicos y/o Técnicos Superiores en curso', checked: true },
                { key: 'forcom', label: 'Formación Complementaria', checked: true },
                { key: 'conidi', label: 'Conocimiento de Idiomas', checked: true }
            ]
        },
        production: {
            all: true,
            options: [
                { key: 'lininv', label: 'Línea de Investigación', checked: true },
                { key: 'proyec', label: 'Proyectos', checked: true },
                { key: 'proorc', label: 'Proyectos Importados de ORCID', checked: true },
                { key: 'derint', label: 'Derechos de Propiedad Intelectual', checked: true },
                { key: 'prodin', label: 'Productos de Desarrollo Industrial', checked: true },
                { key: 'prosci', label: 'Producción Científica (Importadas de Scopus, Web Of Science,etc)', checked: true },
                { key: 'otrpro', label: 'Otras Producciones (Ingreso Manual)', checked: true },
                { key: 'distpr', label: 'Distinciones y Premios', checked: true }
            ]
        }
    };

    showPassword = false;
    showConfirmPassword = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private recaptchaService: RecaptchaService,
        private alertService: AlertService,
        private cvExportService: CvExportService,
        private cdr: ChangeDetectorRef
    ) {
        this.passwordForm = this.fb.group({
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        }, { validators: CustomValidators.checkPasswords });

        this.contactForm = this.fb.group({
            phone: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            message: ['', Validators.required]
        });

        this.deleteAccountForm = this.fb.group({
            reason: ['', Validators.required]
        });
    }

    ngOnInit(): void { }

    setActiveTab(tab: 'settings' | 'export') {
        this.activeTab = tab;
    }

    toggleSection(sectionKey: keyof typeof this.exportSections) {
        const section = this.exportSections[sectionKey];
        section.all = !section.all;
        section.options.forEach(opt => opt.checked = section.all);
    }

    toggleOption(sectionKey: keyof typeof this.exportSections, index: number) {
        const section = this.exportSections[sectionKey];
        section.options[index].checked = !section.options[index].checked;
        section.all = section.options.every(opt => opt.checked);
    }

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPasswordVisibility() {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    updatePassword() {
        if (this.passwordForm.valid && !this.isLoading) {
            const currentUser = this.authService.getCurrentUser();
            if (!currentUser) {
                this.alertService.error('Error', 'No se pudo identificar al usuario.');
                return;
            }

            this.isLoading = true;
            this.alertService.loading('Actualizando contraseña...');

            // Re-use logic for password reset which requires reCAPTCHA
            this.recaptchaService.execute('settings_password_change').subscribe({
                next: (token) => {
                    const newPassword = this.passwordForm.get('password')?.value;

                    this.authService.confirmPasswordReset({
                        recaptcha_token: token,
                        email: currentUser.email || '',
                        password: newPassword
                    }).subscribe({
                        next: () => {
                            this.isLoading = false;
                            this.alertService.success('Éxito', 'Contraseña actualizada correctamente.');
                            this.passwordForm.reset();
                        },
                        error: (err: any) => {
                            this.isLoading = false;
                            this.alertService.error('Error', 'No se pudo actualizar la contraseña. Intente nuevamente.');
                        }
                    });
                },
                error: (err: any) => {
                    this.isLoading = false;
                    this.alertService.error('Error', 'Error de validación de seguridad.');
                }
            });
        } else {
            this.passwordForm.markAllAsTouched();
            // No alert shown, visual validation only
        }
    }

    sendMessage() {
        if (this.contactForm.valid && !this.isLoading) {
            this.isLoading = true;
            this.alertService.loading('Enviando mensaje...');

            const payload = {
                celular: this.contactForm.get('phone')?.value || '',
                email: this.contactForm.get('email')?.value || '',
                mensaje: this.contactForm.get('message')?.value || ''
            };

            this.authService.sendContactMessage(payload).subscribe({
                next: (res) => {
                    this.isLoading = false;
                    console.log('Contacto enviado', res);
                    this.alertService.success('Éxito', 'Mensaje enviado correctamente.');
                    this.contactForm.reset();
                },
                error: (err) => {
                    this.isLoading = false;
                    console.error('Error enviando contacto:', err);
                    const msg = err.error?.message || 'Error al enviar el mensaje. Intente nuevamente.';
                    this.alertService.error('Error', msg);
                }
            });
        } else {
            this.contactForm.markAllAsTouched();
            // No alert shown, visual validation only
        }
    }

    requestDelete() {
        if (this.deleteAccountForm.valid && !this.isLoading) {
            const currentUser = this.authService.getCurrentUser();
            if (!currentUser) {
                this.alertService.error('Error', 'No se pudo identificar al usuario.');
                return;
            }

            const payload = {
                correo: currentUser.email || '',
                documento: currentUser.numDoc || '',
                investigadorId: currentUser.id || 0,
                motivoInvestigador: this.deleteAccountForm.get('reason')?.value || ''
            };

            this.isLoading = true;
            this.alertService.loading('Enviando solicitud...');

            this.authService.requestAccountDeletion(payload).subscribe({
                next: (res: any) => {
                    this.isLoading = false;
                    console.log('Solicitud enviada:', res);
                    this.alertService.success('Éxito', 'Su solicitud de baja ha sido enviada correctamente.');
                    this.deleteAccountForm.reset();
                },
                error: (err: any) => {
                    this.isLoading = false;
                    console.error('Error enviando solicitud:', err);
                    const msg = err.error?.message || 'Error al enviar la solicitud.';
                    this.alertService.error('Error', msg);
                }
            });
        } else {
            this.deleteAccountForm.markAllAsTouched();
            // No alert shown, visual validation only
        }
    }

    exportPdf() {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario.');
            return;
        }

        const payload: any = { investigadorId: currentUser.id };
        
        // Mapear todas las opciones seleccionadas al payload
        Object.values(this.exportSections).forEach(section => {
            section.options.forEach(opt => {
                payload[opt.key] = opt.checked;
            });
        });

        this.alertService.loading('Generando CV', 'Obteniendo datos del servidor...');
        this.cvExportService.getExportData(payload).subscribe({
            next: (data) => {
                this.alertService.loading('Generando PDF', 'Preparando documento...');
                this.cvExportService.generateCvFromBackendData(data, currentUser).then(() => {
                    this.alertService.success('Éxito', 'CV exportado correctamente.');
                }).catch(err => {
                    console.error('Error al generar PDF:', err);
                    this.alertService.error('Error', 'No se pudo generar el archivo PDF.');
                });
            },
            error: (err) => {
                console.error('Error al obtener datos de exportación:', err);
                this.alertService.error('Error', 'No se pudo obtener la información para exportar.');
            }
        });
    }
}
