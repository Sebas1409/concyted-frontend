import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { FormModalComponent } from '../../../../../shared/components/form-modal/form-modal.component';
import { InstitutionSelectComponent } from '../../../../../shared/components/institution-select/institution-select.component';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { FileViewerModalComponent, ViewerFile, ViewerFileType } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { QualificationBadgeComponent } from '../../../../../shared/components/qualification-badge/qualification-badge.component';
import { FileService } from '../../../../../core/services/file.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { CatalogService } from '../../../../../core/services/catalog.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { EducationService } from '../../../../../core/services/education.service';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { DateDisplayPipe } from '../../../../../shared/pipes/date-display.pipe';

interface EducationEntry {
    id: number;
    code?: string;
    isSunedu: boolean;
    institution: string;
    degreeType: string;
    titleName: string;
    startDate: string;
    endDate: string;
    tokens?: string[];
    originalItem?: any;
}

interface ComplementaryEntry {
    id: number;
    code?: string;
    institution: string;
    courseName: string;
    country: string;
    measureUnit: string;
    totalHours: number;
    startDate: string;
    endDate: string;
    tokens?: string[];
    originalItem?: any;
}

interface InProgressEntry {
    id: number;
    code?: string;
    institution: string;
    courseName: string;
    studyType: string;
    startDate: string;
    endDate?: string;
    tokens?: string[];
    originalItem?: any;
}

interface TechnicalEntry {
    id: number;
    code?: string;
    institution: string;
    career: string;
    startDate: string;
    endDate: string;
    tokens?: string[];
    originalItem?: any;
}

interface SuneduEntry {
    id: number;
    selected: boolean;
    institution: string;
    degree: string;
    date: string;
}

@Component({
    selector: 'app-education',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        ActionButtonsComponent,
        FormModalComponent,
        InstitutionSelectComponent,
        FileUploaderComponent,
        FileViewerModalComponent,
        DateDisplayPipe,
        QualificationBadgeComponent
    ],
    templateUrl: './education.component.html',
    styleUrl: './education.component.scss'
})
export class EducationComponent implements OnInit {
    showModal = false;       // Manual Entry Modal
    showImportModal = false; // Sunedu Import Modal
    showTechnicalModal = false; // Technical Entry Modal
    showInProgressModal = false; // In Progress Entry Modal
    showComplementaryModal = false; // Complementary Entry Modal
    activeTab: 'all' | 'education' | 'technical' | 'inProgress' | 'complementary' = 'all';

    educationForm: FormGroup;
    technicalForm: FormGroup;
    inProgressForm: FormGroup;
    complementaryForm: FormGroup;

    // File Arrays for Uploaders
    educationFiles: any[] = [];
    technicalFiles: any[] = [];
    inProgressFiles: any[] = [];
    complementaryFiles: any[] = [];

    // Constants for File Service
    readonly INVESTIGATOR_MODULE = FileModule.INVESTIGATOR;
    readonly EDUCATION_CATEGORY = 'FORACA';
    readonly ACADEMIC_SECTION = 'FORA01';
    readonly TECHNICAL_SECTION = 'FORA02';
    readonly IN_PROGRESS_SECTION = 'FORA03';
    readonly COMPLEMENTARY_SECTION = 'FORA04';

    // File Viewer State
    showFileViewer = false;
    viewerFiles: ViewerFile[] = [];
    isEditing = false;
    currentEditId: number | null = null;
    today: string = new Date().toISOString().split('T')[0];

    // Lists
    educationList: EducationEntry[] = [];
    technicalList: TechnicalEntry[] = [];
    inProgressList: InProgressEntry[] = [];
    complementaryList: ComplementaryEntry[] = [];

    // Catalogs
    countries: any[] = [];
    academicLevels: any[] = [];
    measureUnits: any[] = [];

    suneduList: any[] = [];

    // User Info
    fullName: string = '';
    dni: string = '';

    constructor(
        private fb: FormBuilder,
        private fileService: FileService,
        private authService: AuthService,
        private alertService: AlertService,
        private educationService: EducationService,
        private ubigeoService: UbigeoService,
        private catalogService: CatalogService,
        private cdr: ChangeDetectorRef
    ) {
        this.educationForm = this.fb.group({
            academicLevelId: ['', Validators.required], // ID for payload
            countryId: [0, Validators.required],       // ID for payload
            degreeName: ['', Validators.required],
            faculty: [''],
            institution: ['', Validators.required],    // Display name
            institutionId: ['', Validators.required],  // ID for payload
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
        });

        this.technicalForm = this.fb.group({
            academicLevelId: [''],
            countryId: [0],
            institution: ['', Validators.required],
            institutionId: [''],
            careerName: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
        });

        this.inProgressForm = this.fb.group({
            institution: ['', Validators.required],
            institutionId: [''],
            studyType: ['', Validators.required],
            courseName: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: [''],
        });

        this.complementaryForm = this.fb.group({
            institution: ['', Validators.required],
            institutionId: [''],
            courseName: ['', Validators.required],
            countryId: ['', Validators.required],
            measureUnitId: ['', Validators.required],
            totalHours: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
        });
        this.setupValidators();
    }

    private setupValidators() {
        // Education Form
        this.educationForm.get('startDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.educationForm.get('startDate')?.setErrors({ futureDate: true });
        });
        this.educationForm.get('endDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.educationForm.get('endDate')?.setErrors({ futureDate: true });
        });

        // Technical Form
        this.technicalForm.get('startDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.technicalForm.get('startDate')?.setErrors({ futureDate: true });
        });
        this.technicalForm.get('endDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.technicalForm.get('endDate')?.setErrors({ futureDate: true });
        });

        // In Progress Form
        this.inProgressForm.get('startDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.inProgressForm.get('startDate')?.setErrors({ futureDate: true });
        });
        this.inProgressForm.get('endDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.inProgressForm.get('endDate')?.setErrors({ futureDate: true });
        });

        // Complementary Form
        this.complementaryForm.get('startDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.complementaryForm.get('startDate')?.setErrors({ futureDate: true });
        });
        this.complementaryForm.get('endDate')?.valueChanges.subscribe(val => {
            if (val > this.today) this.complementaryForm.get('endDate')?.setErrors({ futureDate: true });
        });
    }

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.fullName = `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
                this.dni = user.numDoc || '';
                this.loadAllData();
            }
        });
    }

    loadAllData() {
        this.loadCountries();
        this.loadAcademicLevels();
        this.loadMeasureUnits();
        const user = this.authService.getCurrentUser();
        if (user && user.id) {
            this.loadEducation(user.id);
            this.loadTechnical(user.id);
            this.loadInProgress(user.id);
            this.loadComplementary(user.id);
        }
    }

    loadCountries() {
        this.ubigeoService.getCountries().subscribe({
            next: (data) => this.countries = data,
            error: (err) => console.error('Error loading countries', err)
        });
    }

    loadAcademicLevels() {
        this.catalogService.getMasterDetailsByCode('GRADOS').subscribe({
            next: (data) => this.academicLevels = data,
            error: (err) => console.error('Error loading academic levels', err)
        });
    }

    loadMeasureUnits() {
        this.catalogService.getMasterDetailsByCode('UNIMED').subscribe({
            next: (data) => this.measureUnits = data,
            error: (err) => console.error('Error loading measure units', err)
        });
    }

    setActiveTab(tab: 'all' | 'education' | 'technical' | 'inProgress' | 'complementary') {
        this.activeTab = tab;
    }

    // --- LOAD METHODS ---
    loadEducation(userId: number) {
        this.educationService.getAcademicByInvestigator(userId).subscribe({
            next: (data: any[]) => {
                this.educationList = data.map(item => ({
                    id: item.id,
                    code: item.id.toString(),
                    isSunedu: item.sunedu || false,
                    institution: item.institucionNombre,
                    degreeType: item.nivelAcademicoNombre,
                    titleName: item.nombreTituloGrado,
                    startDate: item.fechaInicio,
                    endDate: item.fechaFin,
                    originalItem: item
                }));
                this.cdr.markForCheck();
            },
            error: (err: any) => console.error('Error loading education', err)
        });
    }

    loadTechnical(userId: number) {
        this.educationService.getTechnicalByInvestigator(userId, false).subscribe({
            next: (data: any[]) => {
                this.technicalList = data.map(item => ({
                    id: item.id,
                    code: item.id.toString(),
                    institution: item.institucionNombre,
                    career: item.carreraTecnica,
                    startDate: item.fechaInicio,
                    endDate: item.fechaFin,
                    originalItem: item
                }));
                this.cdr.markForCheck();
            },
            error: (err: any) => console.error('Error loading technical', err)
        });
    }

    loadInProgress(userId: number) {
        this.educationService.getTechnicalByInvestigator(userId, true).subscribe({
            next: (data: any[]) => {
                this.inProgressList = data.map(item => ({
                    id: item.id,
                    code: item.id.toString(),
                    institution: item.institucionNombre,
                    courseName: item.carreraTecnica,
                    studyType: item.nivelAcademicoNombre || item.tipoEstudio,
                    startDate: item.fechaInicio,
                    originalItem: item
                }));
                this.cdr.markForCheck();
            },
            error: (err: any) => console.error('Error loading in progress', err)
        });
    }

    loadComplementary(userId: number) {
        this.educationService.getComplementaryByInvestigator(userId).subscribe({
            next: (data: any[]) => {
                this.complementaryList = data.map(item => ({
                    id: item.id,
                    code: item.id.toString(),
                    institution: item.institucionNombre,
                    courseName: item.nombreCurso,
                    country: item.paisNombre,
                    measureUnit: item.unidadMedidaNombre,
                    totalHours: item.cantidadTotal,
                    startDate: item.fechaInicio,
                    endDate: item.fechaFin,
                    originalItem: item
                }));
                this.cdr.markForCheck();
            },
            error: (err: any) => console.error('Error loading complementary', err)
        });
    }

    // --- Modal Logic ---
    // --- Modal Logic ---
    openModal() {
        this.showModal = true;
        this.isEditing = false;
        this.currentEditId = null;
        this.educationFiles = [];
        this.educationForm.reset({
            academicLevel: '',
            country: '',
            degreeName: '',
            faculty: '',
            institution: '',
            startDate: '',
            endDate: ''
        });

        this.educationForm.reset({
            academicLevelId: '',
            countryId: '', // Select placeholder often empty string
            degreeName: '',
            faculty: '',
            institution: '',
            institutionId: '',
            startDate: '',
            endDate: ''
        });
    }

    editEducation(item: EducationEntry) {
        this.showModal = true;
        this.isEditing = true;
        this.currentEditId = item.id;
        const raw = item.originalItem || item;

        this.educationForm.patchValue({
            academicLevelId: raw.nivelAcademicoId || item.degreeType,
            countryId: raw.paisId || 0,
            degreeName: raw.nombreTituloGrado || item.titleName,
            faculty: raw.facultad || '',
            institution: raw.institucionNombre || item.institution, // Display Name
            institutionId: raw.institucionId || '',                 // ID
            startDate: item.startDate,
            endDate: item.endDate
        });

        this.educationFiles = [];
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.ACADEMIC_SECTION, item.id)
            .subscribe({
                next: (files) => {
                    this.educationFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null }));
                    this.cdr.markForCheck();
                },
                error: (err: any) => console.error('Error loading files', err)
            });
    }

    closeModal() {
        this.showModal = false;
        this.educationFiles = [];
    }

    saveEducation() {
        if (this.educationForm.invalid) {
            this.educationForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) return;

        const val = this.educationForm.value;
        const payload = {
            active: true,
            facultad: val.faculty,
            fechaFin: val.endDate,
            fechaInicio: val.startDate,
            institucionId: val.institutionId,
            investigadorId: currentUser.id,
            nivelAcademicoId: val.academicLevelId,
            nombreTituloGrado: val.degreeName,
            paisId: Number(val.countryId),
            tokens: [] as string[]
        };

        const confirmMessage = this.isEditing
            ? '¿Está seguro de actualizar el registro?'
            : '¿Está seguro de guardar el registro?';

        this.alertService.confirm('Confirmación', confirmMessage).then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.educationFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.ACADEMIC_SECTION)
                    .subscribe(uploaded => {
                        const tokens = uploaded.map(u => u.token);
                        const finalPayload = { ...payload, tokens };

                        const action$ = this.isEditing && this.currentEditId
                            ? this.educationService.updateAcademic(this.currentEditId, finalPayload)
                            : this.educationService.createAcademic(finalPayload);

                        action$.subscribe({
                            next: () => {
                                this.alertService.success('Éxito', 'Registro guardado correctamente');
                                this.loadEducation(currentUser.id);
                                this.closeModal();
                            },
                            error: (err: any) => {
                                console.error('Error saving education', err);
                                this.alertService.error('Error', 'Error al guardar el registro');
                            }
                        });
                    });
            }
        });
    }

    deleteEducation(id: number | undefined) {
        if (!id) return;
        this.alertService.confirm('Eliminar', '¿Está seguro de eliminar este registro?').then(confirmed => {
            if (confirmed) {
                this.educationService.deleteAcademic(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado');
                        const user = this.authService.getCurrentUser();
                        if (user) this.loadEducation(user.id);
                    },
                    error: () => this.alertService.error('Error', 'Error al eliminar')
                });
            }
        });
    }

    // --- Technical Logic ---
    openTechnicalModal() {
        this.showTechnicalModal = true;
        this.isEditing = false;
        this.currentEditId = null;
        this.technicalFiles = [];
        this.technicalForm.reset({
            academicLevelId: '',
            countryId: '',
            institution: '',
            institutionId: '',
            careerName: '',
            startDate: '',
            endDate: ''
        });
    }

    editTechnical(item: TechnicalEntry) {
        this.showTechnicalModal = true;
        this.isEditing = true;
        this.currentEditId = item.id;
        const raw = item.originalItem || item;

        this.technicalForm.patchValue({
            academicLevelId: raw.nivelAcademicoId || '',
            countryId: raw.paisId || 0,
            institution: raw.institucion || item.institution,
            institutionId: raw.institucionId || '',
            careerName: raw.carrera || item.career,
            startDate: item.startDate,
            endDate: item.endDate
        });

        this.technicalFiles = [];
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.TECHNICAL_SECTION, item.id)
            .subscribe({
                next: (files) => {
                    this.technicalFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null }));
                    this.cdr.markForCheck();
                },
                error: (err: any) => console.error('Error loading files', err)
            });
    }

    closeTechnicalModal() {
        this.showTechnicalModal = false;
        this.technicalFiles = [];
    }

    saveTechnical() {
        if (this.technicalForm.invalid) {
            this.technicalForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) return;

        const val = this.technicalForm.value;

        // Construct payload as requested
        const payload = {
            active: true,
            carreraTecnica: val.careerName,
            enCurso: false,
            fechaFin: val.endDate,
            fechaInicio: val.startDate,
            institucionId: val.institutionId || '',
            investigadorId: currentUser.id,
            nivelAcademicoId: val.academicLevelId || '',
            paisId: val.countryId || 0,
            tokens: [] as string[]
        };

        const confirmMessage = this.isEditing
            ? '¿Está seguro de actualizar el registro técnico?'
            : '¿Está seguro de guardar el registro técnico?';

        this.alertService.confirm('Confirmación', confirmMessage).then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.technicalFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.TECHNICAL_SECTION)
                    .subscribe(uploaded => {
                        const tokens = uploaded.map(u => u.token);
                        const finalPayload = { ...payload, tokens };

                        const action$ = this.isEditing && this.currentEditId
                            ? this.educationService.updateTechnical(this.currentEditId, finalPayload)
                            : this.educationService.createTechnical(finalPayload);

                        action$.subscribe({
                            next: () => {
                                this.alertService.success('Éxito', 'Estudio técnico guardado');
                                this.loadTechnical(currentUser.id);
                                this.closeTechnicalModal();
                            },
                            error: (err: any) => {
                                console.error('Error saving technical', err);
                                this.alertService.error('Error', 'Error al guardar estudio técnico');
                            }
                        });
                    });
            }
        });
    }

    // --- In Progress Logic ---
    openInProgressModal() {
        this.showInProgressModal = true;
        this.inProgressForm.reset({
            institution: '',
            institutionId: '',
            studyType: '',
            courseName: '',
            startDate: ''
        });
    }

    editInProgress(item: InProgressEntry) {
        this.showInProgressModal = true;
        this.isEditing = true;
        this.currentEditId = item.id;
        const raw = item.originalItem || item;

        this.inProgressForm.patchValue({
            institution: raw.institucionNombre || item.institution,
            institutionId: raw.institucionId || '',
            studyType: raw.nivelAcademicoId || raw.tipoEstudio || item.studyType,
            courseName: raw.carreraTecnica || item.courseName,
            startDate: item.startDate
        });

        this.inProgressFiles = [];
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.IN_PROGRESS_SECTION, item.id)
            .subscribe({
                next: (files) => {
                    this.inProgressFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null }));
                    this.cdr.markForCheck();
                },
                error: (err: any) => console.error('Error loading files', err)
            });
    }

    closeInProgressModal() {
        this.showInProgressModal = false;
        this.inProgressFiles = [];
    }

    saveInProgress() {
        if (this.inProgressForm.invalid) {
            this.inProgressForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) return;

        const val = this.inProgressForm.value;
        const payload = {
            active: true,
            investigadorId: currentUser.id,
            institucionId: val.institutionId || '',
            carreraTecnica: val.courseName,
            nivelAcademicoId: val.studyType,
            fechaInicio: val.startDate,
            enCurso: true,
            paisId: 0,
            tokens: [] as string[]
        };

        this.alertService.confirm('Confirmación', '¿Guardar estudio en curso?').then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.inProgressFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.IN_PROGRESS_SECTION)
                    .subscribe(uploaded => {
                        const tokens = uploaded.map(u => u.token);
                        const finalPayload = { ...payload, tokens };

                        const action$ = this.isEditing && this.currentEditId
                            ? this.educationService.updateTechnical(this.currentEditId, finalPayload)
                            : this.educationService.createTechnical(finalPayload);

                        action$.subscribe({
                            next: () => {
                                this.alertService.success('Éxito', 'Estudio en curso guardado');
                                this.loadInProgress(currentUser.id);
                                this.closeInProgressModal();
                            },
                            error: (err: any) => this.alertService.error('Error', 'Error al guardar estudio en curso')
                        });
                    });
            }
        });
    }

    // --- Complementary Logic ---
    openComplementaryModal() {
        this.showComplementaryModal = true;
        this.isEditing = false;
        this.currentEditId = null;
        this.complementaryFiles = [];
        this.complementaryForm.reset({
            institution: '',
            institutionId: '',
            courseName: '',
            countryId: '',
            measureUnitId: '',
            totalHours: '',
            startDate: '',
            endDate: ''
        });
    }

    editComplementary(item: ComplementaryEntry) {
        this.showComplementaryModal = true;
        this.isEditing = true;
        this.currentEditId = item.id;
        const raw = item.originalItem || item;

        this.complementaryForm.patchValue({
            institution: raw.institucionNombre || item.institution,
            institutionId: raw.institucionId || '',
            courseName: raw.nombreCurso || item.courseName,
            countryId: raw.paisId || '',
            measureUnitId: raw.unidadMedidaId || '',
            totalHours: raw.cantidadTotal || item.totalHours,
            startDate: item.startDate,
            endDate: item.endDate
        });

        this.complementaryFiles = [];
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.COMPLEMENTARY_SECTION, item.id)
            .subscribe({
                next: (files) => {
                    this.complementaryFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null }));
                    this.cdr.markForCheck();
                },
                error: (err: any) => console.error('Error loading files', err)
            });
    }

    closeComplementaryModal() {
        this.showComplementaryModal = false;
        this.complementaryFiles = [];
    }

    saveComplementary() {
        if (this.complementaryForm.invalid) {
            this.complementaryForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) return;

        const val = this.complementaryForm.value;
        const payload = {
            active: true,
            investigadorId: currentUser.id,
            institucionId: val.institutionId,
            nombreCurso: val.courseName,
            paisId: Number(val.countryId),
            unidadMedidaId: val.measureUnitId,
            cantidadTotal: Number(val.totalHours),
            fechaInicio: val.startDate,
            fechaFin: val.endDate
        };

        this.alertService.confirm('Confirmación', '¿Guardar formación complementaria?').then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.complementaryFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.COMPLEMENTARY_SECTION)
                    .subscribe(uploaded => {
                        const tokens = uploaded.map(u => u.token);
                        const finalPayload = { ...payload, tokens };

                        const action$ = this.isEditing && this.currentEditId
                            ? this.educationService.updateComplementary(this.currentEditId, finalPayload)
                            : this.educationService.createComplementary(finalPayload);

                        action$.subscribe({
                            next: () => {
                                this.alertService.success('Éxito', 'Formación complementaria guardada');
                                this.loadComplementary(currentUser.id);
                                this.closeComplementaryModal();
                            },
                            error: (err: any) => this.alertService.error('Error', 'Error al guardar formación complementaria')
                        });
                    });
            }
        });
    }

    // --- Helpers ---
    uploadFiles(files: any[], module: string, type: string, category: string, section: string, isPublic: boolean = false): Observable<any[]> {
        if (!files || files.length === 0) return of([]);

        const uploadObservables = files.map(fileItem => {
            if (fileItem.token) {
                return of(fileItem);
            } else if (fileItem.file) {
                return this.fileService.uploadFile(fileItem.file, module, type, category, section, isPublic).pipe(
                    map(response => ({
                        ...response,
                        name: fileItem.file.name,
                        token: response.token || response
                    }))
                );
            }
            return of(null);
        });

        return forkJoin(uploadObservables).pipe(
            map(results => results.filter(r => r !== null))
        );
    }

    openFileViewer(item: any, section: string) {
        if (!item.id) return;
        this.fileService.fetchFilesForViewer(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, section, item.id)
            .subscribe(files => {
                if (files.length > 0) {
                    this.viewerFiles = files;
                    this.showFileViewer = true;
                    this.cdr.markForCheck();
                }
            });
    }

    deleteTechnical(id: number | undefined) {
        if (!id) return;
        this.alertService.confirm('Eliminar', '¿Está seguro de eliminar este registro técnico?').then(confirmed => {
            if (confirmed) {
                this.educationService.deleteTechnical(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro técnico eliminado');
                        const user = this.authService.getCurrentUser();
                        if (user) this.loadTechnical(user.id);
                    },
                    error: () => this.alertService.error('Error', 'Error al eliminar')
                });
            }
        });
    }

    deleteInProgress(id: number | undefined) {
        if (!id) return;
        this.alertService.confirm('Eliminar', '¿Está seguro de eliminar este estudio en curso?').then(confirmed => {
            if (confirmed) {
                this.educationService.deleteTechnical(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Estudio eliminado');
                        const user = this.authService.getCurrentUser();
                        if (user) this.loadInProgress(user.id);
                    },
                    error: () => this.alertService.error('Error', 'Error al eliminar')
                });
            }
        });
    }

    deleteComplementary(id: number | undefined) {
        if (!id) return;
        this.alertService.confirm('Eliminar', '¿Está seguro de eliminar esta formación complementaria?').then(confirmed => {
            if (confirmed) {
                this.educationService.deleteComplementary(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado');
                        const user = this.authService.getCurrentUser();
                        if (user) this.loadComplementary(user.id);
                    },
                    error: () => this.alertService.error('Error', 'Error al eliminar')
                });
            }
        });
    }

    // --- Select handlers ---
    selectEducationInstitution(item: any) {
        // Set display name
        this.educationForm.patchValue({
            institution: item.nombre,
            institutionId: item.codigo
        });
    }
    selectTechnicalInstitution(item: any) {
        console.log('Selected Technical Institution:', item);
        this.technicalForm.patchValue({
            institution: item.nombre,
            institutionId: item.codigo
        });
    }
    selectInProgressInstitution(item: any) {
        this.inProgressForm.patchValue({
            institution: item.nombre,
            institutionId: item.ruc || item.codigo
        });
    }
    selectComplementaryInstitution(item: any) {
        this.complementaryForm.patchValue({
            institution: item.nombre,
            institutionId: item.ruc || item.codigo
        });
    }

    // --- Sunedu Import (Mock for now, or use service if available) ---
    openImportModal() {
        if (!this.dni) {
            this.alertService.warning('Advertencia', 'No se encontró el DNI del investigador.');
            return;
        }

        this.alertService.loading('Cargando', 'Buscando registros en SUNEDU...');
        this.educationService.getSuneduDegrees(this.dni).subscribe({
            next: (data) => {
                this.alertService.close();
                if (data && data.gradosTitulos) {
                    this.suneduList = data.gradosTitulos.map((item: any, index: number) => {
                        return {
                            id: index + 1,
                            selected: true,
                            institution: item.universidad,
                            degree: item.tituloProfesional,
                            startDate: '', // User will fill this
                            endDate: '',   // User will fill this
                            paisId: item.paisId,
                            abreviaturaTitulo: item.abreviaturaTitulo,
                            originalItem: item
                        };
                    });
                    this.showImportModal = true;
                    this.cdr.markForCheck();
                } else {
                    this.alertService.info('Sin resultados', 'No se encontraron registros en SUNEDU para el DNI proporcionado.');
                }
            },
            error: (err) => {
                this.alertService.close();
                console.error('Error fetching SUNEDU degrees', err);
                this.alertService.error('Error', 'No se pudo conectar con el servicio de SUNEDU.');
            }
        });
    }

    private formatSuneduDateToIso(dateStr: string): string {
        // Assuming format YYYYMMDD from Swagger image 20260225 -> YYYY-MM-DD
        if (dateStr && dateStr.length === 8) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            return `${year}-${month}-${day}`;
        }
        return dateStr;
    }

    private formatSuneduDate(dateStr: string): string {
        // Assuming format YYYYMMDD from Swagger image 20260225
        if (dateStr && dateStr.length === 8) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            return `${day}/${month}/${year}`;
        }
        return dateStr;
    }

    closeImportModal() {
        this.showImportModal = false;
    }

    importSelected() {
        const selected = this.suneduList.filter(x => x.selected);
        if (selected.length === 0) {
            this.alertService.warning('Importar', 'Debe seleccionar al menos un registro.');
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) return;

        this.alertService.confirm('Confirmación', `¿Desea importar los ${selected.length} registros seleccionados?`).then(confirmed => {
            if (confirmed) {
                this.alertService.loading('Importando', 'Validando instituciones...');

                // Get unique university names to resolve IDs
                const uniNames = [...new Set(selected.map(x => x.institution))];
                const searchRequests = uniNames.map(name =>
                    this.catalogService.searchMasterDetails('UNIVER', name).pipe(
                        map(results => {
                            // Try to find exact match or first result
                            const match = results.find(r => r.nombre.toLowerCase() === name.toLowerCase()) || results[0];
                            return { name, id: match ? match.codigo : '' };
                        })
                    )
                );

                forkJoin(searchRequests).subscribe({
                    next: (resolutions) => {
                        const nameToIdMap = new Map(resolutions.map(r => [r.name, r.id]));

                        const payload = selected.map(item => ({
                            active: true,
                            facultad: '',
                            fechaFin: item.endDate,
                            fechaInicio: item.startDate || item.endDate,
                            institucionId: nameToIdMap.get(item.institution) || '',
                            investigadorId: Number(currentUser.id),
                            nivelAcademicoId: this.resolveAcademicLevel(item),
                            nombreTituloGrado: item.degree,
                            paisId: Number(item.paisId) || 179,
                            sunedu: true,
                            tokens: [] as string[]
                        }));

                        this.alertService.loading('Importando', 'Guardando registros seleccionados...');
                        this.educationService.createAcademicAll(payload).subscribe({
                            next: (res) => {
                                this.alertService.success('Éxito', `Se importaron ${res.success} registros correctamente.`);
                                this.loadEducation(currentUser.id);
                                this.closeImportModal();
                            },
                            error: (err) => {
                                this.alertService.close();
                                console.error('Error importing records', err);
                                this.alertService.error('Error', 'Ocurrió un error al importar los registros.');
                            }
                        });
                    },
                    error: (err) => {
                        this.alertService.close();
                        console.error('Error resolving institutions', err);
                        this.alertService.error('Error', 'No se pudieron validar las instituciones.');
                    }
                });
            }
        });
    }

    private resolveAcademicLevel(item: any): string {
        if (!this.academicLevels || this.academicLevels.length === 0) {
            return this.mapAbreviatura(item.originalItem?.abreviaturaTitulo || '');
        }

        const degreeName = item.degree.toLowerCase();

        // Priority mapping by keywords found in the degree name from SUNEDU
        // We look for the level name (e.g., "Bachiller") within the SUNEDU degree name
        const match = this.academicLevels.find(level => {
            const levelName = level.nombre.toLowerCase();
            return degreeName.includes(levelName);
        });

        if (match) return match.codigo;

        // Fallback to abbreviation mapping if no catalog match found
        return this.mapAbreviatura(item.originalItem?.abreviaturaTitulo || '');
    }

    private mapAbreviatura(abreviatura: string): string {
        // Map SUNEDU abbreviations to our catalog IDs as fallback
        if (abreviatura === 'GRAD03') return 'BACH';
        if (abreviatura === 'TITU01') return 'TITU';
        return abreviatura;
    }
}
