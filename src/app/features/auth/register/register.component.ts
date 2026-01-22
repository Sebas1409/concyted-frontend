import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthBrandingComponent } from '../../../shared/components/auth-branding/auth-branding.component';
import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { UbigeoService } from '../../../core/services/ubigeo.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { AlertService } from '../../../core/services/alert.service';
import { ReniecService } from '../../../core/services/reniec.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, RouterLink, ReactiveFormsModule, AuthBrandingComponent],
    templateUrl: './register.component.html',
    styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
    currentStep = 0;

    step0Form: FormGroup;
    step1Form: FormGroup;
    step2Form: FormGroup;

    documentTypes: any[] = [];
    countries: any[] = [];
    departments: any[] = [];
    provinces: any[] = [];
    districts: any[] = [];

    // RENIEC validation state
    reniecValidated = false;
    reniecValidating = false;
    reniecServiceAvailable = true;
    reniecError: string | null = null;
    isLoading: boolean = false;
    reniecSuccessMessage: string | null = null;

    // Datos capturados de RENIEC internamente
    reniecAddress: string = '';
    reniecNames: string = '';
    reniecPaternalSurname: string = '';
    reniecMaternalSurname: string = '';
    reniecDni: string = '';

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private recaptchaService: RecaptchaService,
        private ubigeoService: UbigeoService,
        private catalogService: CatalogService,
        private cdr: ChangeDetectorRef,
        private alertService: AlertService,
        private reniecService: ReniecService
    ) {
        // Step 0: Validation
        this.step0Form = this.fb.group({
            documentType: ['DNI', Validators.required],
            documentNumber: ['', [Validators.required, Validators.minLength(8)]],
            paternalSurname: ['', Validators.required],
            maternalSurname: ['', Validators.required],
            names: ['', Validators.required]
        });

        // Step 1: Personal Data
        this.step1Form = this.fb.group({
            birthDate: ['', Validators.required],
            gender: ['M', Validators.required],
            country: ['', Validators.required],
            department: ['', Validators.required],
            province: ['', Validators.required],
            district: ['', Validators.required],
            dniFile: [null, Validators.required]
        });

        // Step 2: Credentials
        this.step2Form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            confirmEmail: ['', [Validators.required, Validators.email]],
            phone: ['', Validators.required],
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required],
            terms: [false, Validators.requiredTrue]
        }, { validators: [this.checkPasswords.bind(this), this.checkEmails.bind(this)] });
    }

    ngOnInit() {
        this.loadDocumentTypes();
        this.loadCountries();
        this.setupCascadingDropdowns();
        this.setupDocumentTypeValidation();
    }

    setupDocumentTypeValidation() {
        const docTypeControl = this.step0Form.get('documentType');
        const docNumControl = this.step0Form.get('documentNumber');

        // Initial check
        this.updateDocumentValidators(docTypeControl?.value);

        docTypeControl?.valueChanges.subscribe(type => {
            // Clear value when type changes to avoid invalid format staying
            docNumControl?.setValue('');
            this.updateDocumentValidators(type);
        });
    }

    updateDocumentValidators(type: string) {
        const docNumControl = this.step0Form.get('documentNumber');
        docNumControl?.clearValidators();

        // Base validator
        const validators = [Validators.required];

        if (type === 'DNI') {
            // DNI: Exactly 8 digits, numeric
            validators.push(Validators.pattern(/^[0-9]{8}$/));
            validators.push(Validators.minLength(8));
            validators.push(Validators.maxLength(8));
        } else if (type === 'Carnet de Extranjería' || type === 'CARNET EXT') {
            // CE: 9 to 12 chars (usually numeric but can be alphanumeric in legacy)
            validators.push(Validators.minLength(9));
            validators.push(Validators.maxLength(12));
        } else if (type === 'Pasaporte' || type === 'PASAPORTE') {
            // PAS: 6 to 12 chars
            validators.push(Validators.minLength(6));
            validators.push(Validators.maxLength(12));
        } else {
            // Default fallback
            validators.push(Validators.minLength(8));
        }

        docNumControl?.setValidators(validators);
        docNumControl?.updateValueAndValidity();
    }

    loadDocumentTypes() {
        // Master ID 1 as requested
        this.catalogService.getMasterDetails(1).subscribe({
            next: (data) => {
                const desiredCodes = ['DOC001', 'DOC002', 'DOC003'];
                this.documentTypes = data
                    .filter(d => desiredCodes.includes(d.codigo))
                    .sort((a, b) => desiredCodes.indexOf(a.codigo) - desiredCodes.indexOf(b.codigo));

                console.log('Document Types Sorted:', this.documentTypes);
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Failed to load document types', err)
        });
    }

    loadCountries() {
        this.ubigeoService.getCountries().subscribe(data => {
            this.countries = data;
        });
    }

    setupCascadingDropdowns() {
        // Document Type Changes -> Reset SENSITIVE and PERSONAL fields comprehensively
        this.step0Form.get('documentType')?.valueChanges.subscribe(() => {
            console.log('Cambio de tipo de documento detectado: Limpiando formulario...');

            // 1. Limpiar campos del Paso 0 (Identidad)
            this.step0Form.patchValue({
                documentNumber: '',
                names: '',
                paternalSurname: '',
                maternalSurname: ''
            });

            // Marcar como NO tocados para ocultar errores rojos
            ['documentNumber', 'names', 'paternalSurname', 'maternalSurname'].forEach(field => {
                const control = this.step0Form.get(field);
                control?.markAsUntouched();
                control?.markAsPristine();
                control?.setErrors(null); // Limpiar errores específicos previos
            });

            // 2. Limpiar campos del Paso 1 (Datos Personales y Ubicación)
            // Se limpia País, lo que a su vez disparará la limpieza de Dep/Prov/Dist por el otro suscriptor
            this.step1Form.patchValue({
                birthDate: '',
                gender: '',
                country: '', // Al limpiar esto, se dispara la limpieza de ubicación en cascada
                department: '',
                province: '',
                district: '',
                dniFile: null
            });

            // Marcar como NO tocados para ocultar errores rojos en Paso 1
            ['birthDate', 'gender', 'country', 'department', 'province', 'district', 'dniFile'].forEach(field => {
                const control = this.step1Form.get(field);
                control?.markAsUntouched();
                control?.markAsPristine();
                control?.setErrors(null);
            });

            // 3. Resetear estados internos y validación RENIEC
            this.reniecValidated = false;
            this.reniecError = null;
            this.reniecValidating = false;

            // Limpiar datos capturados internamente
            this.reniecAddress = '';
            this.reniecNames = '';
            this.reniecPaternalSurname = '';
            this.reniecMaternalSurname = '';
            this.reniecDni = '';
        });

        // Country -> Dept
        this.step1Form.get('country')?.valueChanges.subscribe(countryId => {
            this.departments = [];
            this.provinces = [];
            this.districts = [];

            // SIEMPRE limpiar los valores al cambiar de país
            this.step1Form.patchValue({
                department: '',
                province: '',
                district: ''
            }, { emitEvent: false });

            if (countryId) {
                // Solo cargar departamentos si es necesario (generalmente para Perú o si el backend lo soporta)
                this.ubigeoService.getDepartments(countryId).subscribe(data => this.departments = data);
            }

            // Actualizar validadores inmediatamente
            this.updateStep1Validators();
        });

        // Department -> Province
        this.step1Form.get('department')?.valueChanges.subscribe(deptId => {
            this.provinces = [];
            this.districts = [];
            this.step1Form.patchValue({ province: '', district: '' }, { emitEvent: false });

            if (deptId) {
                this.ubigeoService.getProvinces(deptId).subscribe(data => this.provinces = data);
            }
        });

        // Province -> District
        this.step1Form.get('province')?.valueChanges.subscribe(provId => {
            this.districts = [];
            this.step1Form.patchValue({ district: '' }, { emitEvent: false });

            if (provId) {
                this.ubigeoService.getDistricts(provId).subscribe(data => this.districts = data);
            }
        });
    }

    get isForeignDocument(): boolean {
        const type = this.step0Form.get('documentType')?.value;
        const selected = this.documentTypes.find(t => t.nombre === type);

        if (selected) {
            // Check specific codes: DOC002 (CE), DOC003 (PAS)
            // Or if explicit "PASAPORTE"/"CARNET EXT" strings
            return ['DOC002', 'DOC003'].includes(selected.codigo);
        }

        // Fallback for legacy literals if list not loaded yet or manual entry
        return type === 'CE' || type === 'PAS' || type === 'DNI_MENOR' || type === 'CARNET EXT' || type === 'PASAPORTE';
    }

    get documentNumberPlaceholder(): string {
        const type = this.step0Form.get('documentType')?.value;
        if (type === 'DNI') return 'ej. 12345678';
        if (type === 'Carnet de Extranjería' || type === 'CARNET EXT') return 'ej. 000012345';
        if (type === 'Pasaporte' || type === 'PASAPORTE' || type === 'PAS') return 'ej. A1234567';
        return 'ej. 123456789';
    }

    get documentMaxLength(): number {
        const type = this.step0Form.get('documentType')?.value;
        if (type === 'DNI') return 8;
        return 12; // Max for CE (12) and Passport (12)
    }

    onDocumentInput(event: any) {
        const type = this.step0Form.get('documentType')?.value;
        const input = event.target;
        let value = input.value;

        if (type === 'DNI') {
            // Remove non-numeric characters for DNI
            value = value.replace(/[^0-9]/g, '');
        }

        // Apply strict length limit manually if binding fails or for extra safety
        if (value.length > this.documentMaxLength) {
            value = value.slice(0, this.documentMaxLength);
        }

        if (input.value !== value) {
            input.value = value;
            this.step0Form.get('documentNumber')?.setValue(value);
        }
    }

    updateStep1Validators() {
        const countryCtrl = this.step1Form.get('country');
        const deptCtrl = this.step1Form.get('department');
        const provCtrl = this.step1Form.get('province');
        const distCtrl = this.step1Form.get('district');
        const dniFileCtrl = this.step1Form.get('dniFile');

        const countryId = countryCtrl?.value;
        const selectedCountry = this.countries.find(c => c.id === countryId);
        const isPeru = selectedCountry && (selectedCountry.nombre.toUpperCase() === 'PERU' || selectedCountry.nombre.toUpperCase() === 'PERÚ');

        if (isPeru) {
            deptCtrl?.setValidators([Validators.required]);
            provCtrl?.setValidators([Validators.required]);
            distCtrl?.setValidators([Validators.required]);
        } else {
            deptCtrl?.clearValidators();
            provCtrl?.clearValidators();
            distCtrl?.clearValidators();
            deptCtrl?.setValue('');
            provCtrl?.setValue('');
            distCtrl?.setValue('');
        }

        deptCtrl?.updateValueAndValidity();
        provCtrl?.updateValueAndValidity();
        distCtrl?.updateValueAndValidity();

        // Validar lógica de archivo:
        const isReniecSuccess = this.reniecValidated && this.reniecServiceAvailable && !this.reniecError;

        if (!isReniecSuccess || this.isForeignDocument) {
            dniFileCtrl?.setValidators([Validators.required]);
        } else {
            dniFileCtrl?.clearValidators();
        }
        dniFileCtrl?.updateValueAndValidity();
    }

    get isPeruSelected(): boolean {
        const countryId = this.step1Form.get('country')?.value;
        const selectedCountry = this.countries.find(c => c.id === countryId);
        return !!selectedCountry && (selectedCountry.nombre.toUpperCase() === 'PERU' || selectedCountry.nombre.toUpperCase() === 'PERÚ');
    }

    showPassword = false;
    showConfirmPassword = false;

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPasswordVisibility() {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    checkPasswords(group: FormGroup) {
        const pass = group.get('password')?.value;
        const confirmPass = group.get('confirmPassword')?.value;
        return pass === confirmPass ? null : { notSame: true };
    }

    checkEmails(group: FormGroup) {
        const email = group.get('email')?.value;
        const confirmEmail = group.get('confirmEmail')?.value;
        return email === confirmEmail ? null : { emailsNotSame: true };
    }

    goToStep(step: number) {
        console.log(`Changing step to ${step}`);
        this.currentStep = step;
        this.cdr.detectChanges(); // Forzar actualización de vista
        window.scrollTo(0, 0);
    }

    onStep0Submit() {
        console.log('--- onStep0Submit Iniciado ---');
        console.log('Formulario válido:', this.step0Form.valid);
        console.log('Valores:', this.step0Form.value);
        console.log('Document Type:', this.step0Form.get('documentType')?.value);
        console.log('RENIEC Service Available:', this.reniecServiceAvailable);

        if (this.step0Form.valid) {
            const documentType = this.step0Form.get('documentType')?.value;

            // If DNI, validate with RENIEC only if service is available
            if (documentType === 'DNI' && this.reniecServiceAvailable) {
                console.log('Intentando validar con RENIEC...');
                this.validateWithReniec();
            } else {
                console.log('Saltando RENIEC (Servicio no disponible o no es DNI), avanzando...');
                // For other document types or if RENIEC is down, proceed directly
                this.proceedToNextStep();
            }
        } else {
            console.log('Formulario inválido, marcando campos...');
            this.step0Form.markAllAsTouched();
        }
    }

    validateWithReniec() {
        if (this.reniecValidating) return;

        this.reniecValidating = true;
        this.reniecError = null;
        this.reniecSuccessMessage = null;

        const reniecData = {
            dni: this.step0Form.get('documentNumber')?.value,
            nombres: this.step0Form.get('names')?.value,
            apellido_paterno: this.step0Form.get('paternalSurname')?.value,
            apellido_materno: this.step0Form.get('maternalSurname')?.value
        };

        this.reniecService.validate(reniecData).subscribe({
            next: (response) => this.handleReniecResponse(response),
            error: (error) => this.handleReniecError(error)
        });
    }

    private handleReniecResponse(response: any) {
        setTimeout(() => {
            if (response && typeof response.validado === 'boolean') {
                if (response.validado) {
                    this.handleReniecSuccess(response);
                } else {
                    this.reniecValidating = false;
                    this.handleReniecFailure();
                }
            } else {
                this.reniecValidating = false;
                this.handleUnexpectedResponse(response?.validado);
            }
            this.cdr.detectChanges();
        }, 0);
    }

    private autoFillUbigeo(ids: any) {
        if (!ids) return;
        console.log('Autorellenando Ubigeo (IDs):', ids);

        if (ids.paisId) {
            this.step1Form.patchValue({ country: ids.paisId }, { emitEvent: false });

            // Manually load departments cascade
            this.ubigeoService.getDepartments(ids.paisId).subscribe(depts => {
                this.departments = depts;
                this.cdr.detectChanges();

                if (ids.departamentoId) {
                    setTimeout(() => {
                        this.step1Form.patchValue({ department: ids.departamentoId }, { emitEvent: false });

                        this.ubigeoService.getProvinces(ids.departamentoId).subscribe(provs => {
                            this.provinces = provs;
                            this.cdr.detectChanges();

                            if (ids.provinciaId) {
                                // Aumentamos timeout a 300ms para asegurar renderizado de lista grande de provincias
                                setTimeout(() => {
                                    console.log('Setting province to:', ids.provinciaId);
                                    this.step1Form.patchValue({ province: ids.provinciaId }, { emitEvent: false });

                                    this.ubigeoService.getDistricts(ids.provinciaId).subscribe(dists => {
                                        this.districts = dists;
                                        this.cdr.detectChanges();

                                        if (ids.distritoId) {
                                            setTimeout(() => {
                                                console.log('Setting district to:', ids.distritoId);
                                                this.step1Form.patchValue({ district: ids.distritoId }, { emitEvent: false });
                                                this.cdr.detectChanges();
                                            }, 150);
                                        }
                                    });
                                }, 300);
                            }
                        });
                    }, 100);
                }
            });
        }
    }

    private handleReniecSuccess(response?: any) {
        this.reniecValidated = true;
        this.reniecServiceAvailable = true;
        this.reniecError = null;

        // Capturar datos oficiales "por lo bajo"
        let ubicacionPayload = null;

        if (response) {
            if (response.direccion) this.reniecAddress = response.direccion;
            if (response.nombres) this.reniecNames = response.nombres;
            if (response.apellido_paterno) this.reniecPaternalSurname = response.apellido_paterno;
            if (response.apellido_materno) this.reniecMaternalSurname = response.apellido_materno;
            if (response.dni) this.reniecDni = response.dni;

            // Preparar payload para reverse lookup de Ubigeo
            if (response.departamento && response.provincia && response.distrito) {
                ubicacionPayload = {
                    pais: 'PERU',
                    departamento: response.departamento,
                    provincia: response.provincia,
                    distrito: response.distrito
                };
            }

            console.log('Datos RENIEC capturados internamente:', {
                nombres: this.reniecNames,
                paterno: this.reniecPaternalSurname,
                materno: this.reniecMaternalSurname,
                dni: this.reniecDni,
                direccion: this.reniecAddress
            });
        }

        // 1. Detener spinner INMEDIATAMENTE
        this.reniecValidating = false;

        // 2. Mostrar mensaje de éxito
        this.reniecSuccessMessage = '¡Datos validados correctamente! Redirigiendo...';
        this.cdr.detectChanges();

        const finish = () => {
            setTimeout(() => {
                console.log('Avanzando al siguiente paso...');
                this.reniecSuccessMessage = null;
                this.proceedToNextStep();
            }, 1000);
        };

        // 3. Autocompletar Ubigeo si es posible
        if (ubicacionPayload) {
            this.ubigeoService.getIdsByNames(ubicacionPayload).subscribe({
                next: (ids) => {
                    this.autoFillUbigeo(ids);
                    finish();
                },
                error: (err) => {
                    console.error('Error obteniendo IDs de ubigeo', err);
                    finish();
                }
            });
        } else {
            finish();
        }
    }

    private handleReniecFailure() {
        console.log('RENIEC: Datos no coinciden (validado = false)');
        this.reniecValidated = false;
        this.reniecServiceAvailable = true;
        this.reniecError = 'Los datos ingresados no coinciden con los registrados en RENIEC. Por favor, verifica la información.';
    }

    private handleReniecServiceDown() {
        console.log('RENIEC: Servicio caído (respuesta vacía o validado null)');
        this.reniecServiceAvailable = false;
        this.reniecValidated = false;
        this.reniecError = 'El servicio de validación de RENIEC no está disponible en este momento. Podrás continuar con el registro, pero deberás subir una foto de tu DNI en el siguiente paso.';
    }

    private handleUnexpectedResponse(validadoValue: any) {
        console.log('RENIEC: Caso no manejado, validado =', validadoValue);
        this.reniecServiceAvailable = false;
        this.reniecValidated = false;
        this.reniecError = 'Respuesta inesperada del servicio RENIEC. Por favor, intenta nuevamente.';
    }

    private handleReniecError(error: any) {
        console.error('RENIEC validation error:', error);

        // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
            this.reniecValidating = false;
            this.reniecServiceAvailable = false;
            this.reniecValidated = false;

            // Mostrar mensaje en línea (recuadro rojo) en lugar de popup
            this.reniecError = 'El servicio de validación de RENIEC no está disponible en este momento. Podrás continuar con el registro, pero deberás subir una foto de tu DNI en el siguiente paso.';

            // Forzar actualización de la vista INMEDIATAMENTE
            this.cdr.detectChanges();
        }, 0);
    }

    proceedToNextStep() {
        console.log('Ejecutando proceedToNextStep...');

        try {
            // Si es DNI, SIEMPRE seleccionamos Perú por defecto, SALVO que RENIEC ya haya rellenado el formulario.
            const isDni = this.step0Form.get('documentType')?.value === 'DNI';

            if (isDni && !this.reniecValidated) {
                this.setPeruAsDefault();
            }

            // Aplicar validadores
            this.updateStep1Validators();
        } catch (error) {
            console.error('Error en configuración previa al siguiente paso:', error);
        }

        // Navegar SIEMPRE, incluso si hubo error arriba
        console.log('Llamando a goToStep(1)');
        this.goToStep(1);
    }

    setPeruAsDefault() {
        // Find Peru in countries list
        const peru = this.countries.find(c =>
            c.nombre?.toUpperCase() === 'PERU' || c.nombre?.toUpperCase() === 'PERÚ'
        );

        if (peru) {
            this.step1Form.patchValue({ country: peru.id });
            // Trigger the cascade to load departments
            this.ubigeoService.getDepartments(peru.id).subscribe(data => {
                this.departments = data;
            });
        }
    }

    onStep1Submit() {
        if (this.step1Form.valid) {
            console.log('Step 1 Validated', this.step1Form.value);
            this.goToStep(2);
        } else {
            this.step1Form.markAllAsTouched();
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            // Validate file size (5MB = 5 * 1024 * 1024 bytes)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                this.step1Form.patchValue({ dniFile: null });
                this.step1Form.get('dniFile')?.setErrors({ maxSize: true });
                this.step1Form.get('dniFile')?.markAsTouched();
            } else {
                this.step1Form.patchValue({ dniFile: file });
                this.step1Form.get('dniFile')?.setErrors(null);
                this.step1Form.get('dniFile')?.markAsTouched();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
        }
    }

    onSubmit() {
        if (this.step2Form.valid) {
            console.log('Registration Complete');
            this.isLoading = true; // Activar spinner del botón registrar

            const step0 = this.step0Form.value;
            const step1 = this.step1Form.value;
            const step2 = this.step2Form.value;

            // Resolve Names from IDs
            const countryName = this.getName(this.countries, step1.country);
            // ... (rest of resolution logic happens inside service or usually here but simplifying for brevity as getName handles nulls)

            // Determine active status: True ONLY if validated with RENIEC
            const isUserActive = this.reniecValidated;

            // Locate District object to get Ubigeo code if available
            let ubigeoCode = null;
            if (step1.district) {
                const distObj = this.districts.find(d => d.id === step1.district);
                if (distObj && distObj.ubigeo) {
                    ubigeoCode = distObj.ubigeo;
                }
            }

            // Lógica de preferencia de datos: Si RENIEC validó, usar datos capturados internamente
            const finalNames = (this.reniecValidated && this.reniecNames) ? this.reniecNames : (step0.names || "");
            const finalPaternal = (this.reniecValidated && this.reniecPaternalSurname) ? this.reniecPaternalSurname : (step0.paternalSurname || "");
            const finalMaternal = (this.reniecValidated && this.reniecMaternalSurname) ? this.reniecMaternalSurname : (step0.maternalSurname || "");
            const finalDni = (this.reniecValidated && this.reniecDni) ? this.reniecDni : (step0.documentNumber || "");

            const researcherPayload = {
                apellidoMaterno: finalMaternal,
                apellidoPaterno: finalPaternal,
                celular: step2.phone || "",
                codigoUnico: "",
                departamentoId: Number(step1.department) || 0,
                direccion: this.reniecAddress || "", // Dirección de RENIEC o vacía si no hay
                distritoId: Number(step1.district) || 0,
                email: step2.email || "",
                emailPublico: step2.email || "",
                estado: isUserActive,
                estadoRenacyt: "",
                fechaNacimiento: step1.birthDate || "",
                fechaValidacion: new Date().toISOString(),
                fotoToken: "",
                googleScholarId: "",
                nacionalidad: countryName || "",
                nombres: finalNames,
                numDoc: finalDni,
                orcid: "",
                paisNacimientoId: Number(step1.country) || 0,
                paisResidenciaId: Number(step1.country) || 0,
                password: step2.password || "",
                provinciaId: Number(step1.province) || 0,
                researcherId: "",
                scopusAuthorId: "",
                sexo: step1.gender || "",
                telefono: step2.phone || "",
                telefonoAlternativo: "",
                tipoDoc: this.documentTypes.find(d => d.nombre === step0.documentType)?.codigo || step0.documentType,
                ubigeo: ubigeoCode || "",
                usuarioId: 0,
                validado: this.reniecValidated,
                validadoPor: 0
            };

            this.authService.registerResearcher(researcherPayload).subscribe({
                next: (response) => {
                    console.log('Researcher registered successfully', response);
                    this.isLoading = false;

                    let title = '¡Registro exitoso!';
                    let message = 'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión con tus credenciales.';
                    let icon: 'success' | 'warning' = 'success';

                    if (!isUserActive) {
                        title = 'Registro en proceso';
                        message = 'Tu cuenta ha sido creada, pero requiere validación manual por un administrador. Te notificaremos por correo cuando tu cuenta sea activada.';
                        icon = 'warning';
                    }

                    if (icon === 'success') {
                        this.alertService.success(title, message).then(() => {
                            this.router.navigate(['/auth/login']);
                        });
                    } else {
                        this.alertService.warning(title, message).then(() => {
                            this.router.navigate(['/auth/login']);
                        });
                    }
                },
                error: (error) => {
                    this.isLoading = false;
                    console.error('Registration failed', error);

                    if (error.status === 409) {
                        const errorMessage = error.error?.message || error.error?.error || 'El usuario ya está registrado';
                        this.alertService.warning('Usuario duplicado', `${errorMessage}. Por favor, utiliza otro número de documento o correo electrónico.`);
                    } else if (error.status === 400) {
                        const errorMessage = error.error?.message || error.error?.error || 'Los datos ingresados no son válidos';
                        this.alertService.error('Error de validación', errorMessage);
                    } else if (error.status === 0) {
                        this.alertService.error('Error de conexión', 'No se pudo conectar con el servidor.');
                    } else {
                        this.alertService.error('Error al registrar', 'Ocurrió un error al registrar el usuario.');
                    }
                }
            });

        } else {
            this.step2Form.markAllAsTouched();
        }
    }

    getName(list: any[], id: any): string | null {
        if (!id) return null;
        const item = list.find(x => x.id === id);
        return item ? item.nombre : null;
    }

    isFieldInvalid(form: FormGroup, field: string): boolean {
        const control = form.get(field);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    // Password Validation Helpers
    hasLowerCase(str: string): boolean {
        return /[a-z]/.test(str);
    }

    hasUpperCase(str: string): boolean {
        return /[A-Z]/.test(str);
    }

    hasNumber(str: string): boolean {
        return /[0-9]/.test(str);
    }

    hasSpecialChar(str: string): boolean {
        return /[!@#$%^&*(),.?":{}|<>]/.test(str);
    }
}
