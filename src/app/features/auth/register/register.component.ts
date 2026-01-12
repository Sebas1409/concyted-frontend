import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthBrandingComponent } from '../../../shared/components/auth-branding/auth-branding.component';
import { AuthService } from '../../../core/services/auth.service';
import { RecaptchaService } from '../../../core/services/recaptcha.service';
import { UbigeoService } from '../../../core/services/ubigeo.service';
import { CatalogService } from '../../../core/services/catalog.service';

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

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private recaptchaService: RecaptchaService,
        private ubigeoService: UbigeoService,
        private catalogService: CatalogService,
        private cdr: ChangeDetectorRef
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
        }, { validators: [this.checkPasswords, this.checkEmails] });
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
        // Country -> Dept
        this.step1Form.get('country')?.valueChanges.subscribe(countryId => {
            this.departments = [];
            this.provinces = [];
            this.districts = [];
            this.step1Form.patchValue({ department: '', province: '', district: '' }, { emitEvent: false });

            if (countryId) {
                this.ubigeoService.getDepartments(countryId).subscribe(data => this.departments = data);
            }
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
        const countryId = this.step1Form.get('country')?.value;
        // Find country by ID to check if it represents Peru.
        // Assuming API returns { id: number, nombre: string, ... }
        const countryObj = this.countries.find(c => c.id === countryId);
        // Robust check for Peru:
        const isPeru = countryObj ? (countryObj.nombre?.toUpperCase() === 'PERU' || countryObj.nombre?.toUpperCase() === 'PERÚ') : false;

        const locationFields = ['department', 'province', 'district'];
        const dniFileControl = this.step1Form.get('dniFile');

        if (this.isForeignDocument) {
            // Foreign doc: Hide location and file
            locationFields.forEach(field => {
                this.step1Form.get(field)?.clearValidators();
                this.step1Form.get(field)?.updateValueAndValidity();
            });
            dniFileControl?.clearValidators();
            dniFileControl?.updateValueAndValidity();
        } else {
            // DNI: Require File
            dniFileControl?.setValidators(Validators.required);
            dniFileControl?.updateValueAndValidity();

            // Location based on Country
            locationFields.forEach(field => {
                const control = this.step1Form.get(field);
                if (isPeru) {
                    control?.setValidators(Validators.required);
                } else {
                    control?.clearValidators();
                }
                control?.updateValueAndValidity();
            });
        }
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
        this.currentStep = step;
        // Scroll to top
        window.scrollTo(0, 0);
    }

    onStep0Submit() {
        if (this.step0Form.valid) {
            this.recaptchaService.execute('step0').subscribe({
                next: (token: string) => {
                    console.log('Recaptcha V3 Token:', token);
                    // Apply validator logic based on doc type
                    this.updateStep1Validators();
                    this.goToStep(1);
                },
                error: (error: any) => {
                    console.error('Recaptcha V3 Error:', error);
                    alert('Validación de seguridad fallida. Por favor intente nuevamente.');
                }
            });
        } else {
            this.step0Form.markAllAsTouched();
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

            const step0 = this.step0Form.value;
            const step1 = this.step1Form.value;
            const step2 = this.step2Form.value;

            // Resolve Names from IDs
            const countryName = this.getName(this.countries, step1.country);
            const deptName = this.getName(this.departments, step1.department);
            const provName = this.getName(this.provinces, step1.province);
            const distName = this.getName(this.districts, step1.district);

            // Locate District object to get Ubigeo code if available
            let ubigeoCode = null;
            if (step1.district) {
                const distObj = this.districts.find(d => d.id === step1.district);
                if (distObj && distObj.ubigeo) {
                    ubigeoCode = distObj.ubigeo;
                }
            }

            const researcherPayload = {
                apellidoMaterno: step0.maternalSurname || "",
                apellidoPaterno: step0.paternalSurname || "",
                celular: step2.phone || "",
                codigoUnico: "",
                departamentoId: Number(step1.department) || 0,
                direccion: "",
                distritoId: Number(step1.district) || 0,
                email: step2.email || "",
                emailPublico: step2.email || "", // Defaulting public email to same as email
                estado: "ACTIVO",
                estadoRenacyt: "",
                fechaNacimiento: step1.birthDate || "",
                fechaValidacion: new Date().toISOString(),
                fotoToken: "",
                googleScholarId: "",
                nacionalidad: countryName || "",
                nombres: step0.names || "",
                numDoc: step0.documentNumber || "",
                orcid: "",
                paisNacimientoId: Number(step1.country) || 0,
                paisResidenciaId: Number(step1.country) || 0, // Assuming residence same as selection
                password: step2.password || "",
                provinciaId: Number(step1.province) || 0,
                researcherId: "",
                scopusAuthorId: "",
                sexo: step1.gender || "",
                telefono: step2.phone || "",
                telefonoAlternativo: "",
                tipoDoc: step0.documentType || "",
                ubigeo: ubigeoCode || "",
                usuarioId: 0,
                validado: false,
                validadoPor: 0,
                activo: true
            };

            this.authService.registerResearcher(researcherPayload).subscribe({
                next: (response) => {
                    console.log('Researcher registered successfully', response);
                    alert('Usuario registrado exitosamente');
                    this.router.navigate(['/auth/login']);
                },
                error: (error) => {
                    console.error('Registration failed', error);
                    alert('Error al registrar usuario');
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
