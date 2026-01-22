import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../../core/services/auth.service';
import { ReniecService, ReniecValidationRequest } from '../../../../../core/services/reniec.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { CatalogService } from '../../../../../core/services/catalog.service';

@Component({
    selector: 'app-identity-validation',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './identity-validation.component.html',
    styleUrl: './identity-validation.component.scss'
})
export class IdentityValidationComponent implements OnInit {
    identityForm: FormGroup;
    currentUserData: any = null;
    isValidatingReniec = false;
    documentTypes: any[] = [];

    private authService = inject(AuthService);
    private reniecService = inject(ReniecService);
    private alertService = inject(AlertService);
    private fb = inject(FormBuilder);
    private catalogService = inject(CatalogService);

    private ubigeoService = inject(UbigeoService);
    private cdr = inject(ChangeDetectorRef);

    resolvedLocationNames: any = {
        pais: 'Cargando...',
        departamento: 'Cargando...',
        provincia: 'Cargando...',
        distrito: 'Cargando...'
    };

    constructor() {
        this.identityForm = this.fb.group({
            // CE Fields
            ceNumber: ['', Validators.required],
            ceBirthDate: ['', Validators.required],

            // Passport Fields
            passportNumber: ['', Validators.required],
            passportExpiryDate: ['', Validators.required],
            passportCountry: ['', Validators.required]
        });
    }

    isLoading = true;

    ngOnInit() {
        this.loadInitialData();
    }

    loadInitialData() {
        this.isLoading = true;
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser || !currentUser.id) {
            this.isLoading = false;
            return;
        }

        forkJoin({
            docTypes: this.catalogService.getMasterDetails(1),
            userData: this.authService.getInvestigatorByUserId(currentUser.id)
        }).subscribe({
            next: (results: any) => {
                // 1. Set Document Types
                this.documentTypes = results.docTypes;

                // 2. Set User Data
                this.currentUserData = results.userData.data || results.userData;

                // Normalize location fields
                if (!this.currentUserData.paisId && this.currentUserData.paisResidenciaId) {
                    this.currentUserData.paisId = this.currentUserData.paisResidenciaId;
                }

                console.log('Identity - Initial Data Loaded:', this.currentUserData);

                // 3. Update View State
                this.isLoading = false;
                this.cdr.detectChanges();

                // 4. Resolve secondary data (names) - Async, doesn't block form
                this.resolveLocationNames();
            },
            error: (err) => {
                console.error('Failed to load initial data', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    get showReniec(): boolean {
        return this.checkDocType(['DOC001', 'DNI']);
    }

    get showCe(): boolean {
        return this.checkDocType(['DOC002', 'CARNET EXT', 'CE']);
    }

    get showPassport(): boolean {
        return this.checkDocType(['DOC003', 'PASAPORTE', 'PAS']);
    }

    private checkDocType(codesOrNames: string[]): boolean {
        if (!this.currentUserData) return false;
        const type = this.currentUserData.tipoDoc || this.currentUserData.tipoDocumento;
        if (!type) return false;

        // Check exact match first
        if (codesOrNames.includes(type)) return true;

        // Check via catalog if type is ID
        if (this.documentTypes.length > 0) {
            const found = this.documentTypes.find(d => d.id == type || d.codigo === type || d.nombre === type);
            if (found && codesOrNames.includes(found.codigo)) return true;
        }

        return false;
    }



    resolveLocationNames() {
        if (!this.currentUserData) return;

        // Reset with loading state
        this.resolvedLocationNames = {
            pais: 'Cargando...',
            departamento: 'Cargando...',
            provincia: 'Cargando...',
            distrito: 'Cargando...'
        };

        const { paisId, departamentoId, provinciaId, distritoId } = this.currentUserData;

        // Create array of observables for parallel execution
        const requests: any = {};

        if (paisId) requests.pix = this.ubigeoService.getCountries();
        if (paisId && departamentoId) requests.dep = this.ubigeoService.getDepartments(paisId);
        if (departamentoId && provinciaId) requests.prv = this.ubigeoService.getProvinces(departamentoId);
        if (provinciaId && distritoId) requests.dis = this.ubigeoService.getDistricts(provinciaId);

        if (Object.keys(requests).length === 0) {
            this.resolvedLocationNames = { pais: '-', departamento: '-', provincia: '-', distrito: '-' };
            this.cdr.detectChanges();
            return;
        }

        forkJoin(requests).subscribe({
            next: (results: any) => {
                // Map results
                if (results.pix) {
                    const found = results.pix.find((x: any) => x.id == paisId);
                    this.resolvedLocationNames.pais = found ? found.nombre : 'No encontrado';
                }

                if (results.dep) {
                    const found = results.dep.find((x: any) => x.id == departamentoId);
                    this.resolvedLocationNames.departamento = found ? found.nombre : 'No encontrado';
                }

                if (results.prv) {
                    const found = results.prv.find((x: any) => x.id == provinciaId);
                    this.resolvedLocationNames.provincia = found ? found.nombre : 'No encontrado';
                }

                if (results.dis) {
                    const found = results.dis.find((x: any) => x.id == distritoId);
                    this.resolvedLocationNames.distrito = found ? found.nombre : 'No encontrado';
                }

                this.cdr.detectChanges(); // Update view with names
            },
            error: (err) => {
                console.error('Error resolving locations', err);
                this.resolvedLocationNames = { pais: 'Error', departamento: 'Error', provincia: 'Error', distrito: 'Error' };
                this.cdr.detectChanges();
            }
        });
    }

    validateReniec() {
        if (!this.currentUserData) return;

        this.isValidatingReniec = true;

        const request: ReniecValidationRequest = {
            dni: this.currentUserData.numDoc || this.currentUserData.dni, // Adjust based on actual field name
            nombres: this.currentUserData.nombres,
            apellido_paterno: this.currentUserData.apellidoPaterno,
            apellido_materno: this.currentUserData.apellidoMaterno
        };

        console.log('Validating with Reniec:', request);

        this.reniecService.validate(request).subscribe({
            next: (response) => {
                console.log('Reniec Response:', response);
                this.isValidatingReniec = false;

                if (response.validado) {
                    this.alertService.success('Validación Exitosa', 'Sus datos han sido validados y verificados correctamente con RENIEC.');

                    // Update profile with new data
                    this.updateUserProfile(response);
                } else {
                    this.alertService.warning('Validación Fallida', 'Los datos no coincidieron con los registros de RENIEC.');
                }
            },
            error: (err) => {
                console.error('Reniec Error:', err);
                this.isValidatingReniec = false;
                this.alertService.error('Error de Conexión', 'No se pudo establecer conexión con RENIEC. Por favor intente más tarde.');
            }
        });
    }

    updateUserProfile(reniecData: any) {
        this.isValidatingReniec = true; // Keep spinner going while resolving locations

        try {
            // 1. Start by finding Peru ID (Assuming Reniec is for Peru)
            this.ubigeoService.getCountries().subscribe({
                next: (countries: any[]) => {
                    try {
                        const peru = countries ? countries.find(c => c.nombre.toUpperCase().includes('PERU') || c.nombre.toUpperCase().includes('PERÚ')) : null;
                        const paisId = peru ? peru.id : null;

                        if (!paisId) {
                            this.finalizeUserUpdate(reniecData, null, null, null, null);
                            return;
                        }

                        // 2. Find Department
                        this.ubigeoService.getDepartments(paisId).subscribe({
                            next: (departments: any[]) => {
                                try {
                                    const targetDep = reniecData.departamento || '';
                                    const foundDep = departments ? departments.find(d => d.nombre.toUpperCase() === targetDep.toUpperCase()) : null;
                                    const departamentoId = foundDep ? foundDep.id : null;

                                    if (!departamentoId) {
                                        this.finalizeUserUpdate(reniecData, paisId, null, null, null);
                                        return;
                                    }

                                    // 3. Find Province
                                    this.ubigeoService.getProvinces(departamentoId).subscribe({
                                        next: (provinces: any[]) => {
                                            try {
                                                const targetProv = reniecData.provincia || '';
                                                const foundProv = provinces ? provinces.find(p => p.nombre.toUpperCase() === targetProv.toUpperCase()) : null;
                                                const provinciaId = foundProv ? foundProv.id : null;

                                                if (!provinciaId) {
                                                    this.finalizeUserUpdate(reniecData, paisId, departamentoId, null, null);
                                                    return;
                                                }

                                                // 4. Find District
                                                this.ubigeoService.getDistricts(provinciaId).subscribe({
                                                    next: (districts: any[]) => {
                                                        try {
                                                            const targetDist = reniecData.distrito || '';
                                                            const foundDist = districts ? districts.find(d => d.nombre.toUpperCase() === targetDist.toUpperCase()) : null;
                                                            const distritoId = foundDist ? foundDist.id : null;

                                                            this.finalizeUserUpdate(reniecData, paisId, departamentoId, provinciaId, distritoId);
                                                        } catch (e) {
                                                            console.error('Error resolving district', e);
                                                            this.finalizeUserUpdate(reniecData, paisId, departamentoId, provinciaId, null);
                                                        }
                                                    },
                                                    error: () => this.finalizeUserUpdate(reniecData, paisId, departamentoId, provinciaId, null)
                                                });
                                            } catch (e) {
                                                console.error('Error resolving province', e);
                                                this.finalizeUserUpdate(reniecData, paisId, departamentoId, null, null);
                                            }
                                        },
                                        error: () => this.finalizeUserUpdate(reniecData, paisId, departamentoId, null, null)
                                    });
                                } catch (e) {
                                    console.error('Error resolving department', e);
                                    this.finalizeUserUpdate(reniecData, paisId, null, null, null);
                                }
                            },
                            error: () => this.finalizeUserUpdate(reniecData, paisId, null, null, null)
                        });
                    } catch (e) {
                        console.error('Error resolving country', e);
                        this.finalizeUserUpdate(reniecData, null, null, null, null);
                    }
                },
                error: (err) => {
                    console.error('Failed to get countries', err);
                    this.finalizeUserUpdate(reniecData, null, null, null, null);
                }
            });
        } catch (e) {
            console.error('Error starting location resolution', e);
            this.finalizeUserUpdate(reniecData, null, null, null, null);
        }
    }

    finalizeUserUpdate(reniecData: any, paisId: any, departamentoId: any, provinciaId: any, distritoId: any) {
        const payload = {
            ...this.currentUserData,
            nombres: reniecData.nombres,
            apellidoPaterno: reniecData.apellido_paterno,
            apellidoMaterno: reniecData.apellido_materno,
            numDoc: reniecData.dni,
            direccion: reniecData.direccion,
            // Update location fields if found - map to Researcher API fields
            paisResidenciaId: paisId || this.currentUserData.paisId,
            departamentoId: departamentoId || this.currentUserData.departamentoId,
            provinciaId: provinciaId || this.currentUserData.provinciaId,
            distritoId: distritoId || this.currentUserData.distritoId,
            validado: true,
            updatedAt: new Date().toISOString()
        };

        this.authService.updateResearcher(this.currentUserData.id, payload).subscribe({
            next: (res) => {
                console.log('User updated with Reniec data:', res);
                this.isValidatingReniec = false;
                this.alertService.success('Perfil Actualizado', 'Su información ha sido actualizada con los datos de RENIEC.');
                this.authService.refreshCurrentUser().subscribe();
                this.loadInitialData(); // Reload to show new data
            },
            error: (err) => {
                console.error('Failed to update user after Reniec validation', err);
                this.isValidatingReniec = false;
                this.alertService.error('Error', 'Se validó con RENIEC pero falló la actualización del perfil.');
            }
        });
    }
}
