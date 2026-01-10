import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { FormModalComponent } from '../../../../../shared/components/form-modal/form-modal.component';
import { InstitutionSelectComponent } from '../../../../../shared/components/institution-select/institution-select.component';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { FileViewerModalComponent, ViewerFile, ViewerFileType } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { FileService } from '../../../../../core/services/file.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface EducationEntry {
    code: string;
    isSunedu: boolean;
    institution: string;
    degreeType: string;
    titleName: string;
    startDate: string;
    endDate: string;
    tokens?: string[];
}

interface ComplementaryEntry {
    code: string;
    institution: string;
    courseName: string;
    country: string;
    measureUnit: string;
    totalHours: number;
    startDate: string;
    endDate: string;
    tokens?: string[];
}

interface InProgressEntry {
    code: string;
    institution: string;
    courseName: string; // "Nombre de la Carrera Técnica" or "Carrera"
    studyType: string;  // "Tipo de Estudio"
    startDate: string;
    tokens?: string[];
}

interface TechnicalEntry {
    code: string;
    institution: string;
    career: string;
    startDate: string;
    endDate: string;
    tokens?: string[];
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
export class EducationComponent {
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
    currentEditCode: string | null = null;

    setActiveTab(tab: 'all' | 'education' | 'technical' | 'inProgress' | 'complementary') {
        this.activeTab = tab;
    }

    // Mock List (Main)
    educationList: EducationEntry[] = [
        {
            code: '001',
            isSunedu: true,
            institution: 'Universidad César Vallejo S.A.C.',
            degreeType: 'LICENCIADO / TÍTULO',
            titleName: 'INGENIERO DE SISTEMAS',
            startDate: 'Diciembre 2024',
            endDate: 'Diciembre 2024'
        }
    ];

    // Mock Technical List
    technicalList: TechnicalEntry[] = [
        {
            code: '001',
            institution: 'Diseñador de experiencia de usuario',
            career: 'Diseñador de experiencia de usuario', // Mock data from screenshot looks repetitive but matching it
            startDate: 'Diciembre 2024',
            endDate: 'Diciembre 2024'
        }
    ];

    // Mock In Progress List
    inProgressList: InProgressEntry[] = [];

    // Mock Complementary List
    complementaryList: ComplementaryEntry[] = [];

    // Mock Sunedu List
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
        private cdr: ChangeDetectorRef
    ) {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.fullName = `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
                this.dni = user.dni || '';
            }
        });

        this.educationForm = this.fb.group({
            academicLevel: ['', Validators.required],
            country: ['', Validators.required],
            degreeName: ['', Validators.required],
            faculty: [''],
            institution: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
        });

        this.technicalForm = this.fb.group({
            institution: ['', Validators.required],
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

    // --- Modal Logic ---
    // --- Modal Logic ---
    openModal() {
        this.showModal = true;
        this.isEditing = false;
        this.currentEditCode = null;
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
    }

    editEducation(item: EducationEntry) {
        this.showModal = true;
        this.isEditing = true;
        this.currentEditCode = item.code;
        this.educationForm.patchValue({
            academicLevel: item.degreeType,
            country: 'Perú',
            degreeName: item.titleName,
            faculty: '',
            institution: item.institution,
            startDate: item.startDate,
            endDate: item.endDate
        });

        this.educationFiles = [];
        const id = Number(item.code);
        if (!isNaN(id)) {
            this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.ACADEMIC_SECTION, id)
                .subscribe({
                    next: (files) => this.educationFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
                    error: () => {
                        if (item.tokens) this.educationFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
                    }
                });
        } else if (item.tokens) {
            this.educationFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
        }
    }

    closeModal() {
        this.showModal = false;
        this.educationFiles = [];
    }

    // --- Sunedu Import Logic ---
    openImportModal() {
        this.showImportModal = true;
    }

    closeImportModal() {
        this.showImportModal = false;
    }

    importSelected() {
        const selected = this.suneduList.filter(x => x.selected);
        selected.forEach(item => {
            this.educationList.push({
                code: this.generateCode(),
                isSunedu: true,
                institution: item.institution,
                degreeType: 'TÍTULO / GRADO',
                titleName: item.degree,
                startDate: item.date,
                endDate: item.date
            });
        });
        this.closeImportModal();
    }

    // --- Technical Modal Logic ---
    openTechnicalModal() {
        this.showTechnicalModal = true;
        this.isEditing = false;
        this.currentEditCode = null;
        this.technicalFiles = [];
        this.technicalForm.reset({
            institution: '',
            careerName: '',
            startDate: '',
            endDate: ''
        });
    }

    editTechnical(item: TechnicalEntry) {
        this.showTechnicalModal = true;
        this.isEditing = true;
        this.currentEditCode = item.code;
        this.technicalForm.patchValue({
            institution: item.institution,
            careerName: item.career,
            startDate: item.startDate,
            endDate: item.endDate
        });

        this.technicalFiles = [];
        const id = Number(item.code);
        if (!isNaN(id)) {
            this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.TECHNICAL_SECTION, id)
                .subscribe({
                    next: (files) => this.technicalFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
                    error: () => {
                        if (item.tokens) this.technicalFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
                    }
                });
        } else if (item.tokens) {
            this.technicalFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
        }
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

        this.uploadFiles(this.technicalFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.TECHNICAL_SECTION)
            .subscribe(uploaded => {
                const tokens = uploaded.map(u => u.token);
                const val = this.technicalForm.value;

                if (this.isEditing && this.currentEditCode) {
                    const idx = this.technicalList.findIndex(x => x.code === this.currentEditCode);
                    if (idx !== -1) {
                        this.technicalList[idx] = { ...this.technicalList[idx], institution: val.institution, career: val.careerName, startDate: val.startDate, endDate: val.endDate, tokens };
                    }
                } else {
                    this.technicalList.push({
                        code: this.generateTechnicalCode(),
                        institution: val.institution,
                        career: val.careerName,
                        startDate: val.startDate,
                        endDate: val.endDate,
                        tokens
                    });
                }
                this.closeTechnicalModal();
            });
    }

    generateTechnicalCode(): string {
        const nextId = this.technicalList.length + 1;
        return nextId.toString().padStart(3, '0');
    }

    // --- In Progress Modal Logic ---
    openInProgressModal() {
        this.showInProgressModal = true;
        this.isEditing = false;
        this.currentEditCode = null;
        this.inProgressFiles = [];
        this.inProgressForm.reset({
            institution: '',
            studyType: '',
            courseName: '',
            startDate: ''
        });
    }

    editInProgress(item: InProgressEntry) {
        this.showInProgressModal = true;
        this.isEditing = true;
        this.currentEditCode = item.code;
        this.inProgressForm.patchValue({
            institution: item.institution,
            studyType: item.studyType,
            courseName: item.courseName,
            startDate: item.startDate
        });

        this.inProgressFiles = [];
        const id = Number(item.code);
        if (!isNaN(id)) {
            this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.IN_PROGRESS_SECTION, id)
                .subscribe({
                    next: (files) => this.inProgressFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
                    error: () => {
                        if (item.tokens) this.inProgressFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
                    }
                });
        } else if (item.tokens) {
            this.inProgressFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
        }
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

        this.uploadFiles(this.inProgressFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.IN_PROGRESS_SECTION)
            .subscribe(uploaded => {
                const tokens = uploaded.map(u => u.token);
                const val = this.inProgressForm.value;

                if (this.isEditing && this.currentEditCode) {
                    const idx = this.inProgressList.findIndex(x => x.code === this.currentEditCode);
                    if (idx !== -1) {
                        this.inProgressList[idx] = { ...this.inProgressList[idx], institution: val.institution, courseName: val.courseName, studyType: val.studyType, startDate: val.startDate, tokens };
                    }
                } else {
                    this.inProgressList.push({
                        code: this.generateInProgressCode(),
                        institution: val.institution,
                        courseName: val.courseName,
                        studyType: val.studyType,
                        startDate: val.startDate,
                        tokens
                    });
                }
                this.closeInProgressModal();
            });
    }

    generateInProgressCode(): string {
        const nextId = this.inProgressList.length + 1;
        return nextId.toString().padStart(3, '0');
    }

    // --- Complementary Modal Logic ---
    openComplementaryModal() {
        this.showComplementaryModal = true;
        this.isEditing = false;
        this.currentEditCode = null;
        this.complementaryFiles = [];
        this.complementaryForm.reset({
            institution: '',
            courseName: '',
            country: '',
            measureUnit: '',
            totalHours: '',
            startDate: '',
            endDate: ''
        });
    }

    editComplementary(item: ComplementaryEntry) {
        this.showComplementaryModal = true;
        this.isEditing = true;
        this.currentEditCode = item.code;
        this.complementaryForm.patchValue({
            institution: item.institution,
            courseName: item.courseName,
            country: item.country,
            measureUnit: item.measureUnit,
            totalHours: item.totalHours,
            startDate: item.startDate,
            endDate: item.endDate
        });

        this.complementaryFiles = [];
        const id = Number(item.code);
        if (!isNaN(id)) {
            this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.EDUCATION_CATEGORY, this.COMPLEMENTARY_SECTION, id)
                .subscribe({
                    next: (files) => this.complementaryFiles = files.map(f => ({ name: f.nombre, token: f.token, file: null })),
                    error: () => {
                        if (item.tokens) this.complementaryFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
                    }
                });
        } else if (item.tokens) {
            this.complementaryFiles = item.tokens.map(t => ({ name: 'Archivo Adjunto', token: t, file: null }));
        }
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

        this.uploadFiles(this.complementaryFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.COMPLEMENTARY_SECTION)
            .subscribe(uploaded => {
                const tokens = uploaded.map(u => u.token);
                const val = this.complementaryForm.value;
                if (this.isEditing && this.currentEditCode) {
                    const idx = this.complementaryList.findIndex(x => x.code === this.currentEditCode);
                    if (idx !== -1) {
                        this.complementaryList[idx] = { ...this.complementaryList[idx], ...val, tokens };
                    }
                } else {
                    this.complementaryList.push({
                        code: this.generateComplementaryCode(),
                        ...val,
                        tokens
                    });
                }
                this.closeComplementaryModal();
            });
    }

    generateComplementaryCode(): string {
        const nextId = this.complementaryList.length + 1;
        return nextId.toString().padStart(3, '0');
    }

    saveEducation() {
        if (this.educationForm.invalid) {
            this.educationForm.markAllAsTouched();
            return;
        }

        this.uploadFiles(this.educationFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.EDUCATION_CATEGORY, this.ACADEMIC_SECTION)
            .subscribe(uploaded => {
                const tokens = uploaded.map(u => u.token);
                const val = this.educationForm.value;

                if (this.isEditing && this.currentEditCode) {
                    const idx = this.educationList.findIndex(e => e.code === this.currentEditCode);
                    if (idx !== -1) {
                        this.educationList[idx] = { ...this.educationList[idx], institution: val.institution, degreeType: val.academicLevel, titleName: val.degreeName, startDate: val.startDate, endDate: val.endDate, tokens };
                    }
                } else {
                    this.educationList.push({
                        code: this.generateCode(),
                        isSunedu: false,
                        institution: val.institution,
                        degreeType: val.academicLevel,
                        titleName: val.degreeName,
                        startDate: val.startDate, // In real app format date
                        endDate: val.endDate,
                        tokens
                    });
                }
                this.closeModal();
            });
    }

    generateCode(): string {
        const nextId = this.educationList.length + 1;
        return nextId.toString().padStart(3, '0');
    }

    deleteEducation(index: number) {
        this.educationList.splice(index, 1);
    }

    // --- Helper Methods ---

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
                        token: response.token || response // Adjust based on actual API
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
        const id = Number(item.code);

        if (!isNaN(id)) {
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
                    error: (err) => {
                        if (item.tokens) {
                            this.viewerFiles = item.tokens.map((t: string) => ({
                                id: 0,
                                name: 'Archivo Adjunto', // Name lost if not saved to metadata
                                url: '',
                                type: 'PDF',
                                token: t
                            }));
                            this.showFileViewer = true;
                        } else {
                            this.viewerFiles = [];
                            this.showFileViewer = true;
                        }
                    }
                });
        } else if (item.tokens) {
            this.viewerFiles = item.tokens.map((t: string) => ({
                id: 0,
                name: 'Archivo Adjunto',
                url: '',
                type: 'PDF',
                token: t
            }));
            this.showFileViewer = true;
        } else {
            this.viewerFiles = [];
            this.showFileViewer = true;
        }
    }

    getFileType(filename: string): ViewerFileType {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return 'PDF';
        if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'IMAGE';
        return 'PDF';
    }

    selectEducationInstitution(item: any) {
        this.educationForm.patchValue({ institution: item.nombre });
    }

    selectTechnicalInstitution(item: any) {
        this.technicalForm.patchValue({ institution: item.nombre });
    }

    selectInProgressInstitution(item: any) {
        this.inProgressForm.patchValue({ institution: item.nombre });
    }

    selectComplementaryInstitution(item: any) {
        this.complementaryForm.patchValue({ institution: item.nombre });
    }
}
