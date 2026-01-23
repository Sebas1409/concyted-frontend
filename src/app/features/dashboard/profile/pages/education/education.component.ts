import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { FormModalComponent } from '../../../../../shared/components/form-modal/form-modal.component';
import { InstitutionSelectComponent } from '../../../../../shared/components/institution-select/institution-select.component';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { FileViewerModalComponent, ViewerFile, ViewerFileType } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { FileService } from '../../../../../core/services/file.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { CatalogService } from '../../../../../core/services/catalog.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { EducationService } from '../../../../../core/services/education.service';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

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
        FileViewerModalComponent
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

    // Lists
    educationList: EducationEntry[] = [];
    technicalList: TechnicalEntry[] = [];
    inProgressList: InProgressEntry[] = [];
    complementaryList: ComplementaryEntry[] = [];

    // Catalogs
    countries: any[] = [];
    academicLevels: any[] = [];

    suneduList: SuneduEntry[] = [
        { id: 1, selected: true, institution: 'Univ. César Vallejo', degree: 'Bachiller en Ingenieria de Sistemas', date: '15/05/2021' },
        { id: 2, selected: true, institution: 'Univ. César Vallejo', degree: 'Ingeniero de Sistemas', date: '20/12/2022' }
    ];

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
            studyType: ['', Validators.required],
            courseName: ['', Validators.required],
            startDate: ['', Validators.required],
        });

        this.complementaryForm = this.fb.group({
            institution: ['', Validators.required],
            courseName: ['', Validators.required],
            country: ['', Validators.required],
            measureUnit: ['', Validators.required],
            totalHours: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
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
                    isSunedu: item.esSunedu, // NOTE: Check if esSunedu is in response. If not, default false.
                    institution: item.institucionNombre, // Updated from screenshot schema
                    degreeType: item.nivelAcademicoNombre, // Updated from screenshot schema
                    titleName: item.nombreTituloGrado, // Updated from screenshot schema
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
        this.educationService.getTechnicalByInvestigator(userId).subscribe({
            next: (data: any[]) => {
                this.technicalList = data.map(item => ({
                    id: item.id,
                    code: item.id.toString(),
                    institution: item.institucion,
                    career: item.carrera,
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
        this.educationService.getInProgressByInvestigator(userId).subscribe({
            next: (data: any[]) => {
                this.inProgressList = data.map(item => ({
                    id: item.id,
                    code: item.id.toString(),
                    institution: item.institucion,
                    courseName: item.nombreCurso,
                    studyType: item.tipoEstudio,
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
                    institution: item.institucion,
                    courseName: item.nombreCurso,
                    country: item.pais,
                    measureUnit: item.unidadMedida,
                    totalHours: item.horasTotales,
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
                next: (files) => this.educationFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
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
            countryId: 0,
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
                next: (files) => this.technicalFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
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
        this.isEditing = false;
        this.currentEditId = null;
        this.inProgressFiles = [];
        this.inProgressForm.reset();
    }

    editInProgress(item: InProgressEntry) {
        this.showInProgressModal = true;
        this.isEditing = true;
        this.currentEditId = item.id;
        const raw = item.originalItem || item;

        this.inProgressForm.patchValue({
            institution: raw.institucion || item.institution,
            studyType: raw.tipoEstudio || item.studyType,
            courseName: raw.nombreCurso || item.courseName,
            startDate: item.startDate
        });

        this.inProgressFiles = [];
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.IN_PROGRESS_SECTION, item.id)
            .subscribe({
                next: (files) => this.inProgressFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
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
            institucion: val.institution,
            tipoEstudio: val.studyType,
            nombreCurso: val.courseName,
            fechaInicio: val.startDate
        };

        this.alertService.confirm('Confirmación', '¿Guardar estudio en curso?').then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.inProgressFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.IN_PROGRESS_SECTION)
                    .subscribe(uploaded => {
                        const tokens = uploaded.map(u => u.token);
                        const finalPayload = { ...payload, tokens };

                        const action$ = this.isEditing && this.currentEditId
                            ? this.educationService.updateInProgress(this.currentEditId, finalPayload)
                            : this.educationService.createInProgress(finalPayload);

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
        this.complementaryForm.reset();
    }

    editComplementary(item: ComplementaryEntry) {
        this.showComplementaryModal = true;
        this.isEditing = true;
        this.currentEditId = item.id;
        const raw = item.originalItem || item;

        this.complementaryForm.patchValue({
            institution: raw.institucion || item.institution,
            courseName: raw.nombreCurso || item.courseName,
            country: raw.pais || item.country,
            measureUnit: raw.unidadMedida || item.measureUnit,
            totalHours: raw.horasTotales || item.totalHours,
            startDate: item.startDate,
            endDate: item.endDate
        });

        this.complementaryFiles = [];
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.COMPLEMENTARY_SECTION, item.id)
            .subscribe({
                next: (files) => this.complementaryFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
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
            institucion: val.institution,
            nombreCurso: val.courseName,
            pais: val.country,
            unidadMedida: val.measureUnit,
            horasTotales: val.totalHours,
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
        const id = item.id;
        if (id) {
            this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, section, id)
                .subscribe({
                    next: (files) => {
                        this.viewerFiles = files.map(f => ({
                            id: 0,
                            name: f.nombre,
                            url: '',
                            type: this.getFileType(f.nombre),
                            token: f.token
                        }));
                        this.showFileViewer = true;
                    },
                    error: () => {
                        this.viewerFiles = [];
                        this.showFileViewer = true;
                    }
                });
        }
    }

    getFileType(filename: string): ViewerFileType {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'PDF';
        if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'IMAGE';
        return 'PDF';
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
                this.educationService.deleteInProgress(id).subscribe({
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
        this.inProgressForm.patchValue({ institution: item.nombre });
    }
    selectComplementaryInstitution(item: any) {
        this.complementaryForm.patchValue({ institution: item.nombre });
    }

    // --- Sunedu Import (Mock for now, or use service if available) ---
    openImportModal() {
        this.showImportModal = true;
    }

    closeImportModal() {
        this.showImportModal = false;
    }

    importSelected() {
        const selected = this.suneduList.filter(x => x.selected);
        // Implement backend import logic if API exists for it.
        // For now, leave as is or basic mock adds to list but list is now driven by backend.
        // Usually import means "fetch from Sunedu and save to DB".
        // I will assume for now we just show a message or call a bulk create endpoint if it existed.
        this.alertService.info('Importar', 'Funcionalidad de importación en desarrollo (conectando con backend).');
        this.closeImportModal();
    }
}
