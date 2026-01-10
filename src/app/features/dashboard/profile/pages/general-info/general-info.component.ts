import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { CatalogService, CatalogItem } from '../../../../../core/services/catalog.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { FileService } from '../../../../../core/services/file.service';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';

@Component({
    selector: 'app-general-info',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './general-info.component.html',
    styleUrl: './general-info.component.scss'
})
export class GeneralInfoComponent implements OnInit {
    infoForm: FormGroup;
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
        this.infoForm = this.fb.group({
            active: [true],
            nombres: [''],
            apellidoPaterno: [''],
            apellidoMaterno: [''],
            sexo: [''],
            fechaNacimiento: [''],
            nacionalidad: [''],
            paisNacimiento: [''],
            tipoDocumento: ['', Validators.required],
            numeroDocumento: [''],
            codigoUnico: [''],
            estado: [''],
            estadoRenacyt: [''],
            fotoUrl: [''],
            cvUrl: [''],

            // Contact
            email: [''], // Readonly/Locked
            emailAlternativo: [''], // Public
            telefono: [''],
            celular: [''],
            telefonoAlternativo: [''],
            webPersonal: [''],

            // Location
            paisResidencia: [''],
            departamento: [''],
            provincia: [''],
            distrito: [''],
            direccion: [''],
            ubigeo: [''],

            // Identifiers / Academic
            orcid: [''],
            scopusAuthorId: [''],
            researcherId: [''],
            googleScholarId: [''],

            // Extra
            summary: [''],
            validado: [true]
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
        if (currentUser && currentUser.id) {
            console.log('Loading user data for ID:', currentUser.id);
            this.authService.getUserById(currentUser.id).subscribe({
                next: (res: any) => {
                    // Check if response has data property or is direct
                    const userData = res.data || res;
                    console.log('User Data Loaded:', userData);
                    this.currentUserData = userData; // Store for updates

                    this.infoForm.patchValue({
                        nombres: userData.nombres,
                        apellidoPaterno: userData.apellidoPaterno,
                        apellidoMaterno: userData.apellidoMaterno,
                        // sexo handled below
                        // Use helper to format date
                        fechaNacimiento: this.formatDateForInput(userData.fechaNacimiento),
                        numeroDocumento: userData.numDoc,
                        email: userData.email,
                        emailAlternativo: userData.emailPublico,
                        telefono: userData.telefono,
                        celular: userData.celular,
                        webPersonal: userData.webPersonal,
                        fotoUrl: userData.fotoToken, // Assuming token or URL is stored here

                        // Map location IDs if available
                        paisResidencia: userData.paisId,
                        departamento: userData.departamentoId,
                        provincia: userData.provinciaId,
                        distrito: userData.distritoId,

                        summary: userData.resumenEjecutivo
                    });

                    // Set preview if token exists
                    if (userData.fotoToken) {
                        this.photoPreview = this.fileService.getFileUrl(userData.fotoToken);
                    }

                    // Trigger location loading sequences if IDs exist
                    // ADDING Change Detection here is critical for the cascading selects to update visually
                    if (userData.paisId) {
                        this.ubigeoService.getDepartments(userData.paisId).subscribe(depts => {
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

                    // Handle Document Type
                    if (this.documentTypes.length > 0) {
                        this.setDocumentTypeValue(userData.tipoDoc || userData.tipoDocumento);
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
            this.infoForm.patchValue({ sexo: found.id });
        } else {
            // Fallback
            this.infoForm.patchValue({ sexo: incomingValue });
        }
    }

    setDocumentTypeValue(incomingValue: any) {
        if (!incomingValue) return;
        const found = this.documentTypes.find(opt => opt.id == incomingValue || opt.codigo === incomingValue || opt.nombre === incomingValue);

        console.log('Setting Doc Type:', incomingValue, 'Found:', found);

        if (found) {
            this.infoForm.patchValue({ tipoDocumento: found.id });
        } else {
            this.infoForm.patchValue({ tipoDocumento: incomingValue });
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
                if (this.currentUserData) {
                    this.setDocumentTypeValue(this.currentUserData.tipoDoc || this.currentUserData.tipoDocumento);
                }
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
        const countryId = this.infoForm.get('paisResidencia')?.value;

        this.departments = [];
        this.provinces = [];
        this.districts = [];
        this.infoForm.patchValue({ departamento: '', provincia: '', distrito: '' });

        if (countryId) {
            this.ubigeoService.getDepartments(countryId).subscribe(data => {
                this.departments = data;
                this.cdr.detectChanges();
            });
        }
    }

    onDepartmentChange(event: any) {
        const deptId = this.infoForm.get('departamento')?.value;
        this.provinces = [];
        this.districts = [];
        this.infoForm.patchValue({ provincia: '', distrito: '' });

        if (deptId) {
            this.ubigeoService.getProvinces(deptId).subscribe(data => {
                this.provinces = data;
                this.cdr.detectChanges();
            });
        }
    }

    onProvinceChange(event: any) {
        const provId = this.infoForm.get('provincia')?.value;
        this.districts = [];
        this.infoForm.patchValue({ distrito: '' });

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
                        this.infoForm.patchValue({ fotoUrl: token });
                        console.log('Photo Token Captured:', token);

                        // Update local tracking so saveProfile picks it up as fallback
                        if (this.currentUserData) {
                            this.currentUserData.fotoToken = token;
                        }

                        //this.alertService.success('Foto Subida', 'La fotografía se ha cargado correctamente. Recuerda guardar los cambios.');
                    } else {
                        console.warn('Token not found in response:', res);
                        // Still allow saving in case response structure is weird but upload worked
                    }
                },
                error: (err) => {
                    console.error('Upload failed:', err);
                    this.isUploadingPhoto = false;
                    this.alertService.error('Error', 'No se pudo subir la imagen.');
                }
            });
        }
    }

    savingSource: string | null = null;

    saveProfile(source: string) {
        if (this.savingSource) return; // Prevent concurrent saves
        if (this.infoForm.valid && this.currentUserData) {
            this.savingSource = source; // Start loading for specific button
            const formValue = this.infoForm.value;

            // Construct payload matching the requested structure
            // Merge existing data to preserve fields not in form (like password, username, photoToken)
            const payload = {
                ...this.currentUserData,

                // Update editable fields
                nombres: formValue.nombres,
                apellidoPaterno: formValue.apellidoPaterno,
                apellidoMaterno: formValue.apellidoMaterno,
                sexo: formValue.sexo, // Send as is (usually ID)
                fechaNacimiento: formValue.fechaNacimiento,
                tipoDoc: Number(formValue.tipoDocumento), // Corrected to tipoDoc
                numDoc: formValue.numeroDocumento,

                emailPublico: formValue.emailAlternativo,
                telefono: formValue.telefono,
                celular: formValue.celular,
                webPersonal: formValue.webPersonal,
                resumenEjecutivo: formValue.summary,

                // Ensure photo token is included if updated via upload
                // Priorities: 1. Form (New Upload) 2. CurrentUserData (Existing or newly set)
                fotoToken: formValue.fotoUrl || this.currentUserData.fotoToken,

                // Location IDs
                paisId: Number(formValue.paisResidencia) || 0,
                departamentoId: Number(formValue.departamento) || 0,
                provinciaId: Number(formValue.provincia) || 0,
                distritoId: Number(formValue.distrito) || 0,

                // Ensure required boolean flags are present
                accountNonExpired: this.currentUserData.accountNonExpired ?? true,
                accountNonLocked: this.currentUserData.accountNonLocked ?? true,
                credentialsNonExpired: this.currentUserData.credentialsNonExpired ?? true,
                enabled: this.currentUserData.enabled ?? true,
                active: this.currentUserData.active ?? true,

                updatedAt: new Date().toISOString()
            };

            console.log('Updating User Payload:', payload);

            this.authService.updateUser(this.currentUserData.id, payload).subscribe({
                next: (res) => {
                    this.savingSource = null; // Stop loading
                    console.log('Update successful', res);

                    // Refresh global user state immediately
                    this.authService.refreshCurrentUser().subscribe();

                    this.alertService.success(
                        '¡Actualizado!',
                        'Tu perfil ha sido actualizado correctamente.'
                    );
                    this.loadUserData();
                },
                error: (err) => {
                    this.savingSource = null; // Stop loading
                    console.error('Update failed', err);
                    this.alertService.error(
                        'Error',
                        'No se pudo actualizar el perfil: ' + (err.error?.message || err.message)
                    );
                }
            });
        } else {
            this.infoForm.markAllAsTouched();
            if (!this.currentUserData) {
                this.alertService.warning(
                    'Espera...',
                    'Los datos del usuario aún se están cargando.'
                );
            } else {
                this.alertService.warning(
                    'Formulario Inválido',
                    'Por favor, completa todos los campos requeridos correctamente.'
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

}
