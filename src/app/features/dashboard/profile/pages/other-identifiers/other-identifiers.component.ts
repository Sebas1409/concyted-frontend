import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize, switchMap } from 'rxjs';
import Swal from 'sweetalert2';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { QualificationBadgeComponent } from '../../../../../shared/components/qualification-badge/qualification-badge.component';

import { AlertService } from '../../../../../core/services/alert.service';
import { OrcidService } from '../../../../../core/services/orcid.service';
import { WosService } from '../../../../../core/services/wos.service';
import { OnInit, ChangeDetectorRef } from '@angular/core';

@Component({
    selector: 'app-other-identifiers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, QualificationBadgeComponent],
    templateUrl: './other-identifiers.component.html',
    styleUrl: './other-identifiers.component.scss'
})
export class OtherIdentifiersComponent implements OnInit {
    orcidId: string = '';
    orcidName: string = '';
    wosId: string = '';

    constructor(
        private orcidService: OrcidService,
        private wosService: WosService,
        private authService: AuthService,
        private alertService: AlertService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.orcidId = user.orcid || '';
                this.orcidName = user.orcidFamilyName || '';
                this.wosId = user.researcherId || '';
            } else {
                this.orcidId = '';
                this.orcidName = '';
                this.wosId = '';
            }
            this.cdr.markForCheck();
        });
    }

    onOrcidLogin() {
        this.orcidService.loginWithOrcid(true);

        const listener = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            if (event.data?.type === 'ORCID_CALLBACK') {
                const { code, state } = event.data;
                this.handleOrcidCallback(code, state);
                window.removeEventListener('message', listener);
            }
        };

        window.addEventListener('message', listener);
    }

    private handleOrcidCallback(code: string, state: string) {
        this.alertService.loading('Obteniendo datos', 'Recuperando información de ORCID...');

        // Paso 1: Intercambiar código por ORCID ID
        this.orcidService.getInfo(code, state).pipe(
            switchMap((authRes: any) => {
                // Paso 2: Obtener el perfil usando el ORCID ID devuelto
                const orcid = authRes.orcid;
                return this.orcidService.getOrcidProfile(orcid);
            })
        ).subscribe({
            next: (profile: any) => {
                this.alertService.close();
                
                // Usamos los campos exactos de la respuesta del perfil (interop)
                const name = `${profile.givenNames} ${profile.familyName}`.trim();
                const orcid = profile.orcid;

                if (orcid) {
                    this.showOrcidDataModal(name, orcid);
                } else {
                    this.alertService.error('Error', 'No se encontró el ID de ORCID en el perfil.');
                }
            },
            error: (err) => {
                console.error('Error al obtener datos de ORCID:', err);
                this.alertService.error('Error', 'No se pudo obtener la información de ORCID.');
            }
        });
    }

    private showOrcidDataModal(name: string, orcid: string) {
        Swal.fire({
            title: '',
            html: `
                <div class="orcid-preview-modal" style="padding: 20px; font-family: 'Inter', sans-serif;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="https://orcid.org/assets/vectors/orcid.logo.svg" alt="ORCID Logo" style="width: 150px;">
                    </div>
                    
                    <h2 style="color: #00B0E4; font-weight: 400; font-size: 32px; margin-bottom: 40px; text-align: center; letter-spacing: 1px;">DATOS DE ORCID</h2>
                    
                    <div style="text-align: left; border-bottom: 1.5px solid #00B0E4; margin-bottom: 25px; padding-bottom: 8px; display: flex; align-items: baseline;">
                        <span style="color: #666; font-size: 14px; font-weight: 600; min-width: 80px; text-transform: uppercase;">NOMBRE:</span> 
                        <span style="color: #555; font-size: 16px; margin-left: 10px;">${name}</span>
                    </div>
                    
                    <div style="text-align: left; border-bottom: 1.5px solid #00B0E4; margin-bottom: 40px; padding-bottom: 8px; display: flex; align-items: baseline;">
                        <span style="color: #666; font-size: 14px; font-weight: 600; min-width: 80px; text-transform: uppercase;">ID ORCID:</span> 
                        <span style="color: #555; font-size: 16px; margin-left: 10px;">${orcid}</span>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#00A6B1',
            cancelButtonColor: '#00A6B1',
            reverseButtons: true,
            width: '700px',
            padding: '2em'
        }).then((result) => {
            if (result.isConfirmed) {
                const user = this.authService.getCurrentUser();
                if (user && user.id) {
                    this.alertService.loading('Guardando', 'Actualizando perfil con datos de ORCID...');
                    this.orcidService.updateOrcid(user.id, {
                        orcid: orcid,
                        orcidFamilyName: name
                    }).subscribe({
                        next: () => {
                            // Refrescamos el usuario para que los cambios se mantengan en el estado global
                            this.authService.refreshCurrentUser().subscribe();
                            
                            this.orcidId = orcid;
                            this.orcidName = name;
                            this.cdr.detectChanges();
                            this.alertService.success('Completado', 'Los datos de ORCID han sido actualizados en tu perfil.');
                        },
                        error: (err) => {
                            console.error('Error al actualizar ORCID:', err);
                            this.alertService.error('Error', 'No se pudo guardar la información en el perfil.');
                        }
                    });
                }
            }
        });
    }

    onOrcidDelete() {
        const user = this.authService.getCurrentUser();
        if (!user || (!user.orcid && !this.orcidId)) {
            this.alertService.info('Información', 'No existe una cuenta de ORCID vinculada para eliminar.');
            return;
        }

        this.alertService.confirm(
            'Desvincular ORCID',
            '¿Está seguro de que desea eliminar la vinculación con su cuenta de ORCID?',
            'Sí, eliminar',
            'No, cancelar'
        ).then(confirmed => {
            if (confirmed) {
                this.alertService.loading('Eliminando', 'Desvinculando su cuenta de ORCID...');
                
                // Nota: user.id en el modelo AuthResponse corresponde al id del investigador
                this.orcidService.deleteOrcid(user.id).subscribe({
                    next: () => {
                        this.authService.refreshCurrentUser().subscribe({
                            next: () => {
                                this.alertService.success('Desvinculado', 'Su cuenta de ORCID ha sido desvinculada correctamente.');
                            },
                            error: () => this.alertService.error('Error', 'Se eliminó la vinculación pero no se pudo actualizar el perfil local.')
                        });
                    },
                    error: (err) => {
                        console.error('Error al desvincular ORCID:', err);
                        this.alertService.error('Error', 'No se pudo completar la desvinculación con ORCID.');
                    }
                });
            }
        });
    }

    onCreateOrcid() {
        window.open('https://orcid.org/register', '_blank');
    }

    onWosSync() {
        const user = this.authService.getCurrentUser();
        if (!user || !user.id) return;

        if (!this.wosId || !this.wosId.trim()) {
            this.alertService.warning('Campo Requerido', 'Por favor ingrese su ResearcherID para sincronizar.');
            return;
        }

        this.alertService.loading('Actualizando', 'Sincronizando con Web of Science...');
        this.wosService.updateWos(user.id, this.wosId.trim()).subscribe({
            next: () => {
                this.authService.refreshCurrentUser().subscribe();
                this.alertService.success('Completado', 'Su ResearcherID ha sido sincronizado correctamente.');
            },
            error: (err) => {
                console.error('Error al sincronizar WoS:', err);
                this.alertService.error('Error', 'No se pudo sincronizar con Web of Science.');
            }
        });
    }

    onWosDelete() {
        const user = this.authService.getCurrentUser();
        if (!user || (!user.researcherId && !this.wosId)) {
            this.alertService.info('Información', 'No existe un ResearcherID vinculado para eliminar.');
            return;
        }

        this.alertService.confirm(
            'Desvincular Web of Science',
            '¿Está seguro de que desea eliminar la vinculación con su cuenta de ResearcherID?',
            'Sí, eliminar',
            'No, cancelar'
        ).then(confirmed => {
            if (confirmed) {
                this.alertService.loading('Eliminando', 'Desvinculando su cuenta de Web of Science...');
                this.wosService.deleteWos(user.id).subscribe({
                    next: () => {
                        this.authService.refreshCurrentUser().subscribe();
                        this.wosId = '';
                        this.alertService.success('Desvinculado', 'Su cuenta de ResearcherID ha sido desvinculada correctamente.');
                    },
                    error: (err) => {
                        console.error('Error al desvincular WoS:', err);
                        this.alertService.error('Error', 'No se pudo completar la desvinculación con Web of Science.');
                    }
                });
            }
        });
    }
}
