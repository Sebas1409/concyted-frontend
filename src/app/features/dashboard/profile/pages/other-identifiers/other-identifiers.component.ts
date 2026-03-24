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
import { ScopusService } from '../../../../../core/services/scopus.service';
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
    wosExternalName: string = '';
    scopusId: string = '';
    scopusHIndex: string = '';

    constructor(
        private orcidService: OrcidService,
        private wosService: WosService,
        private scopusService: ScopusService,
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
                this.scopusId = user.scopusAuthorId || '';
                // mock h-index or get it from somewhere if it was saved
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

        const researcherId = this.wosId.trim();
        // Al no existir un API de perfil externo, mostramos el modal de confirmación con el ID ingresado.
        this.showWosDataModal('Información de Web of Science', researcherId);
    }

    private completeWosSync(researcherId: string) {
        const user = this.authService.getCurrentUser();
        if (!user || !user.id) return;

        this.alertService.loading('Actualizando', 'Sincronizando con Web of Science...');
        this.wosService.updateWos(user.id, researcherId).subscribe({
            next: () => {
                this.authService.refreshCurrentUser().subscribe();
                this.alertService.success('Sincronización Exitosa', 'Su ResearcherID ha sido vinculado correctamente.');
            },
            error: (err) => {
                console.error('Error al sincronizar WoS:', err);
                this.alertService.error('Error', 'No se pudo completar la sincronización con Web of Science.');
            }
        });
    }

    private showWosDataModal(name: string, researcherId: string) {
        Swal.fire({
            title: '',
            html: `
                <div class="orcid-preview-modal" style="padding: 20px; font-family: 'Inter', sans-serif;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <svg width="200" height="150" viewBox="0 0 100 80">
                            <!-- Aspa Izquierda (Negra) -->
                            <path d="M25,20 Q40,40 25,60" stroke="#000000" stroke-width="12" fill="none" stroke-linecap="round"/>
                            <!-- Aspa Superior Derecha (Púrpura) -->
                            <path d="M45,20 Q70,20 70,40" stroke="#7C3AED" stroke-width="12" fill="none" stroke-linecap="round"/>
                            <!-- Aspa Inferior Derecha (Verde) -->
                            <path d="M45,60 Q70,60 70,40" stroke="#22C55E" stroke-width="12" fill="none" stroke-linecap="round"/>
                        </svg>
                        <div style="color: #F97316; font-size: 20px; font-weight: bold; font-family: 'Inter', sans-serif; margin-top: 10px; letter-spacing: 1px;">
                            WEB OF SCIENCE
                        </div>
                    </div>
                    
                    <h2 style="color: #F97316; font-weight: 400; font-size: 32px; margin-bottom: 40px; text-align: center; letter-spacing: 1px;">DATOS DE Web of Science</h2>
                    
                    <div style="text-align: left; border-bottom: 1.5px solid #F97316; margin-bottom: 25px; padding-bottom: 8px; display: flex; align-items: baseline;">
                        <span style="color: #666; font-size: 14px; font-weight: 600; min-width: 80px; text-transform: uppercase;">PERFIL:</span> 
                        <span style="color: #555; font-size: 16px; margin-left: 10px;">${name}</span>
                    </div>
                    
                    <div style="text-align: left; border-bottom: 1.5px solid #F97316; margin-bottom: 40px; padding-bottom: 8px; display: flex; align-items: baseline;">
                        <span style="color: #666; font-size: 14px; font-weight: 600; min-width: 80px; text-transform: uppercase;">ID WoS:</span> 
                        <span style="color: #555; font-size: 16px; margin-left: 10px;">${researcherId}</span>
                    </div>
                </div>
            `,
            showCancelButton: false,
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#F97316',
            width: '700px',
            padding: '2em'
        }).then((result) => {
            if (result.isConfirmed) {
                this.completeWosSync(researcherId);
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

    onWosHelp() {
        this.wosService.getWosLink().subscribe({
            next: (res: any) => {
                const url = res?.data?.url || res?.url;
                if (url) {
                    const width = 1000;
                    const height = 800;
                    const left = window.screenX + (window.outerWidth - width) / 2;
                    const top = window.screenY + (window.outerHeight - height) / 2;
                    const features = `width=${width},height=${height},left=${left},top=${top},location=no,menubar=no,status=no,toolbar=no`;
                    
                    window.open(url, 'WoS_Authorization', features);
                } else {
                    this.alertService.error('Error', 'No se pudo obtener la URL de Web of Science.');
                }
            },
            error: (err) => {
                console.error('Error al obtener link de WoS:', err);
                this.alertService.error('Error', 'Hubo un problema al intentar conectar con Web of Science.');
            }
        });
    }

    // --- SCOPUS METHODS ---

    onScopusVerify() {
        this.scopusService.getScopusLink().subscribe({
            next: (res: any) => {
                const url = res?.data?.url || res?.url;
                if (url) {
                    const width = 1000;
                    const height = 800;
                    const left = window.screenX + (window.outerWidth - width) / 2;
                    const top = window.screenY + (window.outerHeight - height) / 2;
                    const features = `width=${width},height=${height},left=${left},top=${top},location=no,menubar=no,status=no,toolbar=no`;
                    
                    window.open(url, 'Scopus_Authorization', features);
                } else {
                    this.alertService.error('Error', 'No se pudo obtener la URL de Scopus.');
                }
            },
            error: (err) => {
                console.error('Error al obtener link de Scopus:', err);
                this.alertService.error('Error', 'Hubo un problema al intentar conectar con Scopus.');
            }
        });
    }

    onScopusSync() {
        const user = this.authService.getCurrentUser();
        if (!user || !user.id) return;

        if (!this.scopusId || !this.scopusId.trim()) {
            this.alertService.warning('Campo Requerido', 'Por favor ingrese su Scopus Author ID para sincronizar.');
            return;
        }

        const sid = this.scopusId.trim();
        this.showScopusDataModal('Investigador Scopus', sid);
    }

    private completeScopusSync(scopusId: string) {
        const user = this.authService.getCurrentUser();
        if (!user || user.id === undefined) return;

        this.alertService.loading('Actualizando', 'Sincronizando con Scopus...');
        this.scopusService.updateScopus(user.id, scopusId).subscribe({
            next: () => {
                this.authService.refreshCurrentUser().subscribe();
                this.alertService.success('Sincronización Exitosa', 'Su Scopus Author ID ha sido vinculado correctamente.');
            },
            error: (err) => {
                console.error('Error al sincronizar Scopus:', err);
                this.alertService.error('Error', 'No se pudo completar la sincronización con Scopus.');
            }
        });
    }

    private showScopusDataModal(name: string, scopusId: string) {
        Swal.fire({
            title: '',
            html: `
                <div class="orcid-preview-modal" style="padding: 20px; font-family: 'Inter', sans-serif;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="background: #EB5F05; color: white; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 24px; margin: 0 auto;">
                            SC
                        </div>
                        <div style="color: #EB5F05; font-size: 20px; font-weight: bold; font-family: 'Inter', sans-serif; margin-top: 10px; letter-spacing: 1px;">
                            SCOPUS
                        </div>
                    </div>
                    
                    <h2 style="color: #EB5F05; font-weight: 400; font-size: 32px; margin-bottom: 40px; text-align: center; letter-spacing: 1px;">DATOS DE SCOPUS</h2>
                    
                    <div style="text-align: left; border-bottom: 1.5px solid #EB5F05; margin-bottom: 25px; padding-bottom: 8px; display: flex; align-items: baseline;">
                        <span style="color: #666; font-size: 14px; font-weight: 600; min-width: 80px; text-transform: uppercase;">PERFIL:</span> 
                        <span style="color: #555; font-size: 16px; margin-left: 10px;">${name}</span>
                    </div>
                    
                    <div style="text-align: left; border-bottom: 1.5px solid #EB5F05; margin-bottom: 40px; padding-bottom: 8px; display: flex; align-items: baseline;">
                        <span style="color: #666; font-size: 14px; font-weight: 600; min-width: 100px; text-transform: uppercase;">AUTHOR ID:</span> 
                        <span style="color: #555; font-size: 16px; margin-left: 10px;">${scopusId}</span>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EB5F05',
            cancelButtonColor: '#999',
            reverseButtons: true,
            width: '700px',
            padding: '2em'
        }).then((result) => {
            if (result.isConfirmed) {
                this.completeScopusSync(scopusId);
            }
        });
    }

    onScopusDelete() {
        const user = this.authService.getCurrentUser();
        if (!user || (!user.scopusAuthorId && !this.scopusId)) {
            this.alertService.info('Información', 'No existe un Scopus Author ID vinculado para eliminar.');
            return;
        }

        this.alertService.confirm(
            'Desvincular Scopus',
            '¿Está seguro de que desea eliminar la vinculación con su cuenta de Scopus?',
            'Sí, eliminar',
            'No, cancelar'
        ).then(confirmed => {
            if (confirmed) {
                this.alertService.loading('Eliminando', 'Desvinculando su cuenta de Scopus...');
                this.scopusService.deleteScopus(user.id).subscribe({
                    next: () => {
                        this.authService.refreshCurrentUser().subscribe();
                        this.scopusId = '';
                        this.scopusHIndex = '';
                        this.alertService.success('Desvinculado', 'Su cuenta de Scopus ha sido desvinculada correctamente.');
                    },
                    error: (err) => {
                        console.error('Error al desvincular Scopus:', err);
                        this.alertService.error('Error', 'No se pudo completar la desvinculación con Scopus.');
                    }
                });
            }
        });
    }
}
