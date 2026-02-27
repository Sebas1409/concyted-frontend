import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { CatalogService, CatalogItem } from '../../../../../core/services/catalog.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { FileService } from '../../../../../core/services/file.service';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';
import { QualificationBadgeComponent } from '../../../../../shared/components/qualification-badge/qualification-badge.component';

@Component({
    selector: 'app-general-info',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, QualificationBadgeComponent],
    templateUrl: './general-info.component.html',
    styleUrl: './general-info.component.scss'
})
export class GeneralInfoComponent implements OnInit {
    personalForm: FormGroup;
    locationForm: FormGroup;
    isUploadingPhoto = false;

    countries: any[] = [];
    departments: any[] = [];
    provinces: any[] = [];
    districts: any[] = [];

    documentTypes: any[] = [];
    sexOptions: any[] = [];
    currentUserData: any = null;

    // Preview for newly uploaded photo
    photoPreview: string | ArrayBuffer | null = null;

    constructor(
        private fb: FormBuilder,
        private ubigeoService: UbigeoService,
        private catalogService: CatalogService,
        private authService: AuthService,
        private alertService: AlertService,
        private fileService: FileService,
        private cdr: ChangeDetectorRef
    ) {
        this.personalForm = this.fb.group({
            fotoUrl: [''],
            summary: ['', [Validators.required, Validators.maxLength(5000)]],
            fechaNacimiento: ['', Validators.required],
            sexo: ['', Validators.required],
            telefono: ['', Validators.required],
            celular: [''],
            email: [''], // Readonly
            emailAlternativo: ['', Validators.required],
            webPersonal: ['']
        });

        this.locationForm = this.fb.group({
            paisResidencia: ['', Validators.required],
            departamento: ['', Validators.required],
            provincia: ['', Validators.required],
            distrito: ['', Validators.required]
        });
    }

    ngOnInit() {
        this.loadDocumentTypes();
        this.loadCountries();
        this.loadSexOptions();
        this.loadUserData();
    }

    loadUserData() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.usuarioId) {
            console.log('Loading user data for ID:', currentUser.usuarioId);
            this.authService.getInvestigatorByUserId(currentUser.usuarioId).subscribe({
                next: (res: any) => {
                    // Check if response has data property or is direct
                    const userData = res.data || res;
                    console.log('User Data Loaded:', userData);
                    this.currentUserData = userData; // Store for updates

                    // Patch Personal Form
                    this.personalForm.patchValue({
                        fechaNacimiento: this.formatDateForInput(userData.fechaNacimiento),
                        email: userData.email,
                        emailAlternativo: userData.emailPublico,
                        telefono: userData.telefono,
                        celular: userData.celular,
                        webPersonal: userData.webPersonal,
                        fotoUrl: userData.fotoToken,
                        summary: userData.resumenEjecutivo
                    });

                    // Patch Location Form
                    this.locationForm.patchValue({
                        paisResidencia: userData.paisId || userData.paisResidenciaId,
                        departamento: userData.departamentoId,
                        provincia: userData.provinciaId,
                        distrito: userData.distritoId
                    });

                    // Set preview if token exists
                    if (userData.fotoToken) {
                        this.photoPreview = this.fileService.getFileUrl(userData.fotoToken);
                    }

                    // Trigger location loading sequences if IDs exist
                    const countryId = userData.paisId || userData.paisResidenciaId;

                    if (countryId) {
                        this.ubigeoService.getDepartments(countryId).subscribe(depts => {
                            this.departments = depts;
                            this.cdr.detectChanges(); // Update view so department select populates

                            if (userData.departamentoId) {
                                this.ubigeoService.getProvinces(userData.departamentoId).subscribe(provs => {
                                    this.provinces = provs;
                                    this.cdr.detectChanges(); // Update view so province select populates

                                    if (userData.provinciaId) {
                                        this.ubigeoService.getDistricts(userData.provinciaId).subscribe(dists => {
                                            this.districts = dists;
                                            this.cdr.detectChanges(); // Update view so district select populates
                                        });
                                    }
                                });
                            }
                        });
                    }

                    // Handle Sexo: if userData.sexo is string name, try to find ID
                    if (this.sexOptions.length > 0) {
                        this.setSexValue(userData.sexo);
                    } else {
                        // Options not loaded yet, wait for loadSexOptions
                    }
                },
                error: (err: any) => console.error('Failed to load user data', err)
            });
        }
    }

    setSexValue(incomingValue: any) {
        if (!incomingValue) return;

        // Use loose equality (==) for ID to handle string/number mismatch
        // check code and name as well
        const found = this.sexOptions.find(opt =>
            opt.id == incomingValue ||
            opt.codigo === incomingValue ||
            opt.nombre === incomingValue
        );

        console.log('Setting Sex Value:', incomingValue, 'Found:', found);

        if (found) {
            this.personalForm.patchValue({ sexo: found.id });
        } else {
            // Fallback
            this.personalForm.patchValue({ sexo: incomingValue });
        }
    }

    loadSexOptions() {
        // Master ID 2 for Sex/Gender
        this.catalogService.getMasterDetails(2).subscribe({
            next: (data) => {
                this.sexOptions = data;
                console.log('Sex Options Loaded:', data);
                // Try to patch if user data is already loaded
                if (this.currentUserData) {
                    this.setSexValue(this.currentUserData.sexo);
                }
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Failed to load sex options', err)
        });
    }

    loadDocumentTypes() {
        // Master ID 1 for Document Types
        this.catalogService.getMasterDetails(1).subscribe({
            next: (data) => {
                this.documentTypes = data;
                console.log('Document Types Loaded:', data);
                // Also load here if data arrived first
                // Document type logic removed as it's not in the edit forms
                this.cdr.detectChanges();
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Failed to load document types', err)
        });
    }

    loadCountries() {
        this.ubigeoService.getCountries().subscribe(data => {
            this.countries = data;
            this.cdr.detectChanges();
        });
    }

    onCountryChange(event: any) {
        // With ngValue, event value might be the object or we need to access form control
        const countryId = this.locationForm.get('paisResidencia')?.value;

        this.departments = [];
        this.provinces = [];
        this.districts = [];
        this.locationForm.patchValue({ departamento: '', provincia: '', distrito: '' });

        if (countryId) {
            this.ubigeoService.getDepartments(countryId).subscribe(data => {
                this.departments = data;
                this.cdr.detectChanges();
            });
        }
    }

    onDepartmentChange(event: any) {
        const deptId = this.locationForm.get('departamento')?.value;
        this.provinces = [];
        this.districts = [];
        this.locationForm.patchValue({ provincia: '', distrito: '' });

        if (deptId) {
            this.ubigeoService.getProvinces(deptId).subscribe(data => {
                this.provinces = data;
                this.cdr.detectChanges();
            });
        }
    }

    onProvinceChange(event: any) {
        const provId = this.locationForm.get('provincia')?.value;
        this.districts = [];
        this.locationForm.patchValue({ distrito: '' });

        if (provId) {
            this.ubigeoService.getDistricts(provId).subscribe(data => {
                this.districts = data;
                this.cdr.detectChanges();
            });
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            // 1. Show Local Preview immediately
            const reader = new FileReader();
            reader.onload = () => {
                this.photoPreview = reader.result;
                this.cdr.detectChanges();
            };
            reader.readAsDataURL(file);

            this.isUploadingPhoto = true;
            // Config: module=USER, type=PHOTO, category=DATGEN, isPublic=true (Photos must be public for avatar)
            this.fileService.uploadFile(file, FileModule.USER, FileType.PHOTO, FileModule.DATGEN, '', true).subscribe({
                next: (res) => {
                    console.log('Upload success:', res);
                    this.isUploadingPhoto = false;

                    // Extract token from response (as per user screenshot)
                    const token = res.token || res.data?.token; // Fallback just in case

                    if (token) {
                        this.personalForm.patchValue({ fotoUrl: token });
                        console.log('Photo Token Captured:', token);

                        // Update local tracking so saveProfile picks it up as fallback
                        if (this.currentUserData) {
                            this.currentUserData.fotoToken = token;
                        }

                        // Automatically save the profile to persist the new photo
                        this.saveProfile('general', true);
                    } else {
                        console.warn('Token not found in response:', res);
                        // Still allow saving in case response structure is weird but upload worked
                    }
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Upload failed:', err);
                    this.isUploadingPhoto = false;
                    this.alertService.error('Error', 'No se pudo subir la imagen.');
                    this.cdr.detectChanges();
                }
            });
        }
    }

    deletePhoto() {
        this.alertService.confirm(
            'Foto Perfil',
            '¿Está seguro que desea eliminarlo?',
            'Sí, eliminar'
        ).then((confirmed) => {
            if (confirmed) {
                this.photoPreview = null;
                this.personalForm.patchValue({ fotoUrl: null });
                this.personalForm.markAsDirty();
                this.saveProfile('general', true);
            }
        });
    }

    get initials(): string {
        if (!this.currentUserData) return '';
        const first = this.currentUserData.nombres ? this.currentUserData.nombres.charAt(0) : '';
        const last = this.currentUserData.apellidoPaterno ? this.currentUserData.apellidoPaterno.charAt(0) : '';
        return (first + last).toUpperCase();
    }

    savingSource: string | null = null;

    saveProfile(source: 'general' | 'location', isSilent: boolean = false) {
        if (this.savingSource) return;

        let formToValidate: FormGroup | null = null;
        let formValue: any = {};

        if (source === 'general') {
            formToValidate = this.personalForm;
        } else if (source === 'location') {
            formToValidate = this.locationForm;
        }

        if (formToValidate && formToValidate.valid && this.currentUserData) {
            if (!isSilent) {
                this.savingSource = source;
            }
            formValue = formToValidate.value;

            const baseData = this.currentUserData;

            // Construir payload limpio explícitamente para evitar campos extra o nulos inválidos
            let payload: any = {
                activo: baseData.activo,
                apellidoMaterno: baseData.apellidoMaterno || '',
                apellidoPaterno: baseData.apellidoPaterno || '',
                celular: baseData.celular || '',
                codigoUnico: baseData.codigoUnico || '',
                departamentoId: baseData.departamentoId || 0,
                direccion: baseData.direccion || '',
                distritoId: baseData.distritoId || 0,
                docToken: baseData.docToken || '',
                email: baseData.email || '',
                emailPublico: baseData.emailPublico || '',
                estado: String(baseData.estado || ''), // Asegurar string
                estadoRenacyt: baseData.estadoRenacyt || '',
                fechaNacimiento: this.formatDateForPayload(baseData.fechaNacimiento),
                fechaValidacion: baseData.fechaValidacion || new Date().toISOString(),
                fotoToken: baseData.fotoToken || '',
                googleScholarId: baseData.googleScholarId || '',
                nacionalidad: baseData.nacionalidad || '',
                nombres: baseData.nombres || '',
                numDoc: baseData.numDoc || '',
                orcid: baseData.orcid || '',
                paisNacimientoId: baseData.paisNacimientoId || 0,
                paisResidenciaId: baseData.paisResidenciaId || 0,
                //password: baseData.password || '', // Usualmente no se envía en update de perfil, pero mantener si el backend lo pide
                provinciaId: baseData.provinciaId || 0,
                researcherId: baseData.researcherId || '',
                resumenEjecutivo: baseData.resumenEjecutivo || '',
                scopusAuthorId: baseData.scopusAuthorId || '',
                sexo: baseData.sexo || '',
                telefono: baseData.telefono || '',
                telefonoAlternativo: baseData.telefonoAlternativo || '',
                tipoDoc: baseData.tipoDoc || '',
                ubigeo: baseData.ubigeo || '',
                usuarioId: baseData.usuarioId || 0,
                validado: baseData.validado,
                validadoPor: baseData.validadoPor || 0,
                webPersonal: baseData.webPersonal || '',
                updatedAt: new Date().toISOString()
            };

            // Sobrescribir con datos del formulario según la sección
            if (source === 'general') {
                payload.resumenEjecutivo = formValue.summary || '';
                payload.emailPublico = formValue.emailAlternativo || '';
                payload.telefono = formValue.telefono || '';
                payload.celular = formValue.celular || '';
                payload.webPersonal = formValue.webPersonal || '';
                payload.fechaNacimiento = formValue.fechaNacimiento; // Ya viene en YYYY-MM-DD del input date
                payload.fotoToken = formValue.fotoUrl || null;

                // Manejo de Sexo: Buscar el código si es un ID numérico
                const selectedSexId = Number(formValue.sexo);
                if (!isNaN(selectedSexId) && selectedSexId > 0) {
                    const sexObj = this.sexOptions.find(s => s.id === selectedSexId);
                    payload.sexo = sexObj ? sexObj.codigo : formValue.sexo;
                } else {
                    payload.sexo = formValue.sexo;
                }
            } else if (source === 'location') {
                payload.paisResidenciaId = Number(formValue.paisResidencia) || 0;
                payload.departamentoId = Number(formValue.departamento) || 0;
                payload.provinciaId = Number(formValue.provincia) || 0;
                payload.distritoId = Number(formValue.distrito) || 0;
            }

            console.log('Updating Researcher Payload (' + source + '):', payload);

            this.authService.updateResearcher(this.currentUserData.id, payload).subscribe({
                next: (res) => {
                    this.savingSource = null; // Stop loading
                    console.log('Update successful', res);

                    if (!isSilent) {
                        this.alertService.success(
                            '¡Actualizado!',
                            source === 'general' ? 'Datos personales actualizados.' : 'Ubicación actualizada.'
                        );
                    }

                    // Recargar datos
                    this.authService.refreshCurrentUser().subscribe(() => {
                        this.loadUserData();
                    });
                },
                error: (err) => {
                    this.savingSource = null; // Stop loading
                    console.error('Update failed', err);

                    let errorMessage = 'No se pudo actualizar el perfil.';

                    // Handle specific validation errors from API
                    if (err.error && err.error.validationErrors) {
                        const validationMessages = Object.entries(err.error.validationErrors)
                            .map(([field, msg]) => `${field}: ${msg}`)
                            .join('<br>'); // Use line breaks for multiple errors if logic allows HTML, otherwise ', '
                        // Assuming alertService might treat strings as plain text, using comma for safety
                        const safeValidationMessages = Object.entries(err.error.validationErrors)
                            .map(([field, msg]) => `${field}: ${msg}`)
                            .join(', ');

                        errorMessage = `Error de validación: ${safeValidationMessages}`;
                    } else if (err.error && err.error.message) {
                        errorMessage = err.error.message;
                    } else if (err.message) {
                        errorMessage = err.message;
                    }

                    this.alertService.error('Error', errorMessage);
                    this.cdr.detectChanges(); // Force UI update to ensure button spinner stops
                }
            });
        } else {
            if (formToValidate) {
                formToValidate.markAllAsTouched();
            }

            if (!this.currentUserData) {
                this.alertService.warning(
                    'Espera...',
                    'Los datos del usuario aún se están cargando.'
                );
            } else {
                this.alertService.warning(
                    'Formulario Inválido',
                    'Por favor, completa todos los campos requeridos de esta sección.'
                );
            }
        }
    }

    private formatDateForInput(dateStr: string | null): string {
        if (!dateStr) return '';

        // If ISO string (2023-01-01T...), take first 10 chars
        if (dateStr.includes('T')) {
            return dateStr.substring(0, 10);
        }

        // If DD/MM/YYYY (e.g. 20/05/1990)
        // Check if it matches regex roughly to avoid splitting other things
        if (dateStr.includes('/') && dateStr.length === 10) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                // Return YYYY-MM-DD
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        // If simple YYYY-MM-DD already
        return dateStr;
    }

    private formatDateForPayload(dateStr: string | null): string {
        if (!dateStr) return '';
        // Reutilizamos la lógica de input porque el backend espera YYYY-MM-DD
        // Si necesitamos lógica específica adicional, la agregamos aquí.
        return this.formatDateForInput(dateStr);
    }

}
