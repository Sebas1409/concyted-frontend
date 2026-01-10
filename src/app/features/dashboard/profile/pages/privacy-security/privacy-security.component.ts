import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/services/auth.service';
import { AlertService } from '../../../../../core/services/alert.service';

@Component({
    selector: 'app-privacy-security',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './privacy-security.component.html',
    styleUrl: './privacy-security.component.scss'
})
export class PrivacySecurityComponent implements OnInit {
    visibilityModules: any[] = [];
    savingSource: string | null = null;
    currentUser: any = null;

    constructor(
        private authService: AuthService,
        private alertService: AlertService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        const user = this.authService.getCurrentUser();
        if (user && user.id) {
            this.currentUser = user;
            this.loadVisibilitySettings(user.id);
        }
    }

    loadVisibilitySettings(userId: number) {
        this.authService.getResearcherVisibility(userId).subscribe({
            next: (data) => {
                console.log('Visibility Data:', data);
                if (data && Array.isArray(data)) {
                    this.processVisibilityData(data);
                }
            },
            error: (err) => console.error('Failed to load visibility settings', err)
        });
    }

    processVisibilityData(data: any[]) {
        const modules = JSON.parse(JSON.stringify(data)); // Deep copy
        const parents = modules.filter((m: any) => m.parentId === null);

        parents.forEach((parent: any) => {
            parent.children = modules.filter((m: any) => m.parentId === parent.moduleId);
        });

        this.visibilityModules = parents;
        this.cdr.detectChanges();
    }

    saveVisibility() {
        if (this.savingSource) return;
        if (!this.currentUser || !this.currentUser.id) return;

        this.alertService.confirm(
            '¿Estás seguro?',
            'Se actualizarán tus preferencias de visibilidad pública.',
            'Sí, actualizar'
        ).then((confirmed) => {
            if (confirmed) {
                this.performUpdate();
            }
        });
    }

    private performUpdate() {
        this.savingSource = 'visibility';

        // Flatten the hierarchy back to list for the API
        const payload: any[] = [];

        this.visibilityModules.forEach(parent => {
            payload.push({ moduleId: parent.moduleId, canView: parent.canView });
            if (parent.children) {
                parent.children.forEach((child: any) => {
                    payload.push({ moduleId: child.moduleId, canView: child.canView });
                });
            }
        });

        console.log('Updating Visibility Payload:', payload);

        this.authService.updateResearcherVisibility(this.currentUser.id, payload).subscribe({
            next: (res) => {
                this.savingSource = null;
                console.log('Visibility Updated:', res);
                this.alertService.success(
                    '¡Actualizado!',
                    'Tus preferencias de privacidad han sido guardadas.'
                );
            },
            error: (err) => {
                this.savingSource = null;
                console.error('Failed to update visibility', err);
                this.alertService.error(
                    'Error',
                    'No se pudieron guardar las preferencias.'
                );
            }
        });
    }

    getGroupDescription(name: string): string {
        if (!name) return '';
        const n = name.toLowerCase();
        if (n.includes('identidad')) {
            return 'Define qué datos básicos podrán ver otros usuarios para identificarte';
        }
        if (n.includes('trayectoria') || n.includes('profesional')) {
            return 'Haz visible tu experiencia laboral general, docente y como evaluador de proyectos';
        }
        if (n.includes('formación') || n.includes('academica') || n.includes('académica')) {
            return 'Permite que las instituciones y evaluadores vean tu historial educativo.';
        }
        if (n.includes('producción') || n.includes('científica') || n.includes('cientifica')) {
            return 'Habilita la visualización de tus líneas de investigación, patentes y publicaciones científicas.';
        }
        return 'Configura la visibilidad de esta sección.';
    }

    getGroupFooterNote(name: string): string {
        if (!name) return '';
        const n = name.toLowerCase();
        if (n.includes('identidad')) {
            return 'Recuerda: Tu dirección exacta, teléfono personal y documentos de identidad <strong>NUNCA</strong> serán públicos, independientemente de lo que marques aquí.';
        }
        if (n.includes('trayectoria') || n.includes('profesional')) {
            return 'Un historial completo te conecta con <strong>mejores ofertas</strong> de empleo, consultorías y oportunidades de evaluación técnica.';
        }
        if (n.includes('formación') || n.includes('academica') || n.includes('académica')) {
            return '<strong>Mostrar</strong> tus grados validos por <strong>SUNEDU</strong> aumenta la confianza en tu perfil profesional.';
        }
        if (n.includes('producción') || n.includes('científica') || n.includes('cientifica')) {
            return 'Esta es la sección más <strong>consultada</strong> por pares y financistas. Fomenta la colaboración académica y el reconocimiento de tu trabajo.';
        }
        return '';
    }

    toggleGroup(parent: any) {
        if (parent.children) {
            parent.children.forEach((child: any) => {
                child.canView = parent.canView;
            });
        }
    }
}
