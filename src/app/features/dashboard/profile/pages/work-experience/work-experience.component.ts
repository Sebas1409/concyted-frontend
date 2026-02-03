import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { FormModalComponent } from '../../../../../shared/components/form-modal/form-modal.component';
import { InstitutionSelectComponent } from '../../../../../shared/components/institution-select/institution-select.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';

import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { FileViewerModalComponent, ViewerFile } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { DateDisplayPipe } from '../../../../../shared/pipes/date-display.pipe';
import { FileService } from '../../../../../core/services/file.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';
import { CatalogService } from '../../../../../core/services/catalog.service';
import { WorkExperienceService } from '../../../../../core/services/work-experience.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';

interface ProjectEntry {
    code: string;
    role: string;
    projectType: string;
    financingEntity: string;
    contestName: string;
    country: string;
    executionYear: string;
    amount: number;
    url: string;
}

interface ThesisAdvisorEntry {
    code: string;
    university: string;
    academicLevel: string;
    thesis: string;
    students: string;
    acceptanceDate: string;
    enlaceRepositorio: string;
}

interface DocentEntry {
    code: string;
    institution: string;
    institutionType: string;
    docentType: string;
    startDate: string;
    endDate: string;
    currentlyTeaching: boolean;
    courses: string;
    ruc?: string;
    id: string;
}

interface WorkExperienceEntry {
    id: string; // Keep as string for now if UI expects it, but API sends number. Will toString().
    isPrincipal: boolean;
    institution: string;
    position: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description?: string;
    roleIdi?: string;
    ruc?: string;
}

@Component({
    selector: 'app-work-experience',
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
        IntroCardComponent
    ],
    templateUrl: './work-experience.component.html',
    styleUrl: './work-experience.component.scss'
})
export class WorkExperienceComponent implements OnInit {
    showModal = false; // Work Experience Modal
    showThesisAdvisorModal = false;
    showDocentModal = false;
    showProjectModal = false;

    // File Viewer
    showFileViewer = false;
    viewerFiles: ViewerFile[] = [];

    activeTab: 'all' | 'work' | 'thesis' | 'docent' | 'project' = 'all';

    workForm: FormGroup;
    thesisAdvisorForm: FormGroup;
    docentForm: FormGroup;
    projectForm: FormGroup;

    // Files arrays
    workFiles: any[] = [];
    thesisFiles: any[] = [];
    docentFiles: any[] = [];
    projectFiles: any[] = [];

    // Catalog Data
    researchRoles: any[] = []; // TIPCAR
    institutionResults: any[] = []; // UNIVER search results
    isLoadingInstitutions = false;
    // Docent Catalog Data
    docentTypes: any[] = []; // TIPDOC
    institutionTypes: any[] = []; // TIPINS
    docentInstitutionResults: any[] = []; // UNIVER search results for Docent Modal
    isLoadingDocentInstitutions = false;


    institutionSearch$ = new Subject<string>();

    // Upload error state
    hasUploadError = false;

    // Lists
    workList: WorkExperienceEntry[] = [];
    thesisAdvisorList: ThesisAdvisorEntry[] = [];
    docentList: DocentEntry[] = [];
    projectList: ProjectEntry[] = [];
    selectedWorkInstitutionRuc: string = ''; // Store selected RUC
    selectedDocentInstitutionRuc: string = '';
    currentDocentId: number | null = null;

    // Project Data
    projectRoles: any[] = [];
    projectTypes: any[] = [];
    countries: any[] = [];
    projectEntityResults: any[] = [];
    isLoadingProjectEntities = false;
    selectedProjectEntityCode = '';
    executionYears: number[] = [];

    constructor(
        private fb: FormBuilder,
        private fileService: FileService,
        private alertService: AlertService,
        private catalogService: CatalogService,
        private workExperienceService: WorkExperienceService,
        private authService: AuthService,
        private ubigeoService: UbigeoService,
        private cd: ChangeDetectorRef
    ) {
        this.workForm = this.fb.group({
            position: ['', Validators.required],
            roleIdi: [''],
            institution: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: [''],
            isCurrent: [false],
            isPrincipal: [false],
            description: ['']
        });

        this.docentForm = this.fb.group({
            institution: ['', Validators.required],
            institutionType: ['', Validators.required],
            docentType: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: [''],
            currentlyTeaching: [false],
            courses: ['']
        });

        this.projectForm = this.fb.group({
            role: ['', Validators.required],
            projectType: ['', Validators.required],
            financingEntity: ['', Validators.required],
            contestName: ['', Validators.required],
            country: ['', Validators.required],
            executionYear: ['', Validators.required],
            amount: ['', Validators.required],
            url: ['', Validators.required]
        });

        this.thesisAdvisorForm = this.fb.group({
            institution: ['', Validators.required],
            academicLevel: ['', Validators.required],
            title: ['', Validators.required],
            acceptanceDate: ['', Validators.required],
            students: ['', Validators.required],
            repositoryUrl: ['', Validators.required],
            file: [null]
        });
    }

    ngOnInit() {
        // Ensure all modals are closed on init to prevent overlay issues
        this.showModal = false;
        this.showThesisAdvisorModal = false;
        this.showDocentModal = false;
        this.showProjectModal = false;
        this.showFileViewer = false;

        this.loadCatalogs();
        this.setupInstitutionSearch();
        this.setupDocentInstitutionSearch();
        this.setupThesisInstitutionSearch();
        this.loadWorkExperiences();
        this.loadDocentExperiences();
        this.loadThesisAdvisors();
        this.loadProjects();
        this.setupWorkValidators();

        this.setupDocentValidators();
        this.setupProjectEntitySearch();
        this.generateExecutionYears();
    }

    viewFiles(item: any, category: string, section: string) {
        if (!item || !item.id) return;

        this.fileService.listFilesMetadata(FileModule.INVESTIGATOR, category, section, Number(item.id)).subscribe({
            next: (files) => {
                if (!files || files.length === 0) {
                    this.alertService.warning('Aviso', 'No hay archivos adjuntos para este registro.');
                    return;
                }

                this.viewerFiles = files.map((f: any) => {
                    const displayName = f.nombre || f.fileName || f.name || 'Archivo';
                    return {
                        url: '',
                        token: f.token,
                        name: displayName,
                        type: displayName.toLowerCase().endsWith('.pdf') ? 'PDF' :
                            (displayName.match(/\.(jpg|jpeg|png|gif)$/i) ? 'IMAGE' : 'OFFICE')
                    };
                });

                this.showFileViewer = true;
                this.cd.detectChanges();
            },
            error: (err) => {
                console.error('Error fetching files for viewer', err);
                this.alertService.error('Error', 'No se pudieron cargar los archivos.');
            }
        });
    }

    closeFileViewer() {
        this.showFileViewer = false;
        this.viewerFiles = [];
    }

    generateExecutionYears() {
        const currentYear = new Date().getFullYear();
        for (let i = currentYear + 1; i >= 1950; i--) {
            this.executionYears.push(i);
        }
    }

    private loadCatalogs() {
        // Research Roles (TIPCAR)
        this.catalogService.getMasterDetailsByCode('TIPCAR').subscribe(data => this.researchRoles = data);

        // Institution Types (TIPINS)
        this.catalogService.getMasterDetailsByCode('TIPINS').subscribe(data => this.institutionTypes = data);

        // Docent Types (TIPDOC)
        this.catalogService.getMasterDetailsByCode('TIPDOC').subscribe(data => this.docentTypes = data);

        // Academic Levels (GRADOS)
        this.catalogService.getMasterDetailsByCode('GRADOS').subscribe(data => this.academicLevels = data);

        // Project Catalogs
        this.catalogService.getMasterDetailsByCode('TIPEXP').subscribe(data => this.projectRoles = data);
        this.catalogService.getMasterDetailsByCode('TIPPRO').subscribe(data => this.projectTypes = data);
        this.ubigeoService.getCountries().subscribe(data => this.countries = data);
    }

    private loadWorkExperiences() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.workExperienceService.getWorkExperiences(currentUser.id).subscribe({
                next: (items) => {
                    console.log('Work Experiences Loaded:', items);
                    this.workList = items.map(item => {
                        const roleIdiCode = (item as any).rolIDI || (item as any).rolIDi;
                        const role = (this.researchRoles || []).find(r => r.codigo === roleIdiCode);

                        return {
                            id: item.id.toString(),
                            isPrincipal: (item as any).esPrincipal || false,
                            institution: item.nombreInstitucion,
                            position: item.cargo,
                            startDate: item.fechaInicio,
                            endDate: item.fechaFin || '',
                            current: item.actualmenteTrabaja,
                            description: item.descripcion || '',
                            roleIdi: role ? role.nombre : roleIdiCode || '',
                            ruc: item.rucInstitucion || ''
                        };
                    });
                    this.cd.detectChanges();
                },
                error: (err) => console.error('Error loading work experiences', err)
            });
        }
    }

    private loadDocentExperiences() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.workExperienceService.getDocentExperiences(currentUser.id).subscribe({
                next: (items) => {
                    console.log('Docent Experiences Loaded:', items);
                    this.docentList = items.map((item, index) => {
                        const instType = (this.institutionTypes || []).find(t => t.codigo === item.tipoInstitucion);
                        const docType = (this.docentTypes || []).find(t => t.codigo === item.tipoDocente);

                        return {
                            id: item.id.toString(),
                            code: (index + 1).toString().padStart(3, '0'),
                            institution: item.nombreInstitucion,
                            institutionType: instType ? instType.nombre : item.tipoInstitucion,
                            docentType: docType ? docType.nombre : item.tipoDocente,
                            startDate: item.fechaInicio,
                            endDate: item.fechaFin || '',
                            currentlyTeaching: item.actualmenteDicta,
                            courses: item.cursosDictados || '',
                            ruc: item.rucInstitucion || ''
                        };
                    });

                    this.cd.detectChanges();
                },
                error: (err) => console.error('Error loading docent experiences', err)
            });
        }
    }

    private setupInstitutionSearch() {
        this.workForm.get('institution')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(term => {
                if (!term || term.length < 3) {
                    this.institutionResults = [];
                    return false;
                }
                return true;
            }),
            tap(() => this.isLoadingInstitutions = true),
            switchMap(term => this.catalogService.searchMasterDetails('UNIVER', term).pipe(
                finalize(() => this.isLoadingInstitutions = false)
            ))
        ).subscribe({
            next: (results) => {
                this.institutionResults = results;
            },
            error: (err) => {
                console.error('Error searching institutions', err);
                this.institutionResults = [];
            }
        });
    }

    private setupDocentInstitutionSearch() {
        this.docentForm.get('institution')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(term => {
                if (!term || term.length < 3) {
                    this.docentInstitutionResults = [];
                    return false;
                }
                return true;
            }),
            tap(() => this.isLoadingDocentInstitutions = true),
            switchMap(term => this.catalogService.searchMasterDetails('UNIVER', term).pipe(
                finalize(() => this.isLoadingDocentInstitutions = false)
            ))
        ).subscribe({
            next: (results) => {
                this.docentInstitutionResults = results;
            },
            error: (err) => {
                console.error('Error searching docent institutions', err);
                this.docentInstitutionResults = [];
            }
        });
    }

    private setupWorkValidators() {
        // startDate is now required by default in the group definition
    }

    private setupDocentValidators() {
        // startDate is now required by default in the group definition
    }

    selectInstitution(institution: any) {
        this.workForm.patchValue({ institution: institution.nombre });
        this.selectedWorkInstitutionRuc = institution.ruc || institution.codigo || '';
        this.institutionResults = []; // Clear results to hide dropdown
    }

    selectDocentInstitution(institution: any) {
        this.docentForm.patchValue({ institution: institution.nombre });
        this.selectedDocentInstitutionRuc = institution.ruc || institution.codigo || '';
        this.docentInstitutionResults = [];
    }

    private setupThesisInstitutionSearch() {
        this.thesisAdvisorForm.get('institution')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(term => {
                if (!term || term.length < 3) {
                    this.thesisInstitutionResults = [];
                    return false;
                }
                return true;
            }),
            tap(() => this.isLoadingThesisInstitutions = true),
            switchMap(term => this.catalogService.searchMasterDetails('UNIVER', term).pipe(
                finalize(() => this.isLoadingThesisInstitutions = false)
            ))
        ).subscribe(results => {
            this.thesisInstitutionResults = results;
        });
    }

    private setupProjectEntitySearch() {
        this.projectForm.get('financingEntity')?.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(term => {
                if (!term || term.length < 3) {
                    this.projectEntityResults = [];
                    return false;
                }
                return true;
            }),
            tap(() => this.isLoadingProjectEntities = true),
            switchMap(term => this.catalogService.searchMasterDetails('UNIVER', term).pipe(
                finalize(() => this.isLoadingProjectEntities = false)
            ))
        ).subscribe(results => {
            this.projectEntityResults = results;
        });
    }

    selectProjectEntity(item: any) {
        this.projectForm.patchValue({ financingEntity: item.nombre });
        this.selectedProjectEntityCode = item.codigo || '';
        this.projectEntityResults = [];
    }

    selectThesisInstitution(institution: any) {
        this.thesisAdvisorForm.patchValue({ institution: institution.nombre });
        this.selectedThesisInstitutionCode = institution.codigo || ''; // Use code for UNIVER
        this.thesisInstitutionResults = [];
    }



    // --- Helper for File Uploads ---
    private uploadFiles(files: any[], module: string, type: string, category: string, section: string): Observable<any[]> {
        if (!files || files.length === 0) {
            return of([]);
        }

        const observables = files.map(fileObj => {
            if (fileObj.file instanceof File) {
                // New file to upload
                return this.fileService.uploadFile(fileObj.file, module, type, category, section, false).pipe(
                    map(response => {
                        // Assuming response contains token, adjust based on actual API
                        return {
                            name: fileObj.name,
                            token: response.token || response.data?.token // Adjust based on FileService response
                        };
                    })
                );
            } else {
                // Existing file with token
                return of({
                    name: fileObj.name,
                    token: fileObj.token
                });
            }
        });

        return forkJoin(observables);
    }

    private loadFiles(parentId: number, category: string, section: string, target: 'work' | 'thesis' | 'docent' | 'project') {
        this.fileService.listFilesMetadata(FileModule.INVESTIGATOR, category, section, parentId).subscribe({
            next: (files) => {
                const mappedFiles = (files || []).map((f: any) => ({
                    name: f.nombre || f.fileName || f.name || 'Archivo',
                    token: f.token,
                    file: null
                }));

                if (target === 'work') this.workFiles = mappedFiles;
                if (target === 'thesis') this.thesisFiles = mappedFiles;
                if (target === 'docent') this.docentFiles = mappedFiles;
                if (target === 'project') this.projectFiles = mappedFiles;

                this.cd.detectChanges();
            },
            error: (err) => console.error('Error loading files', err)
        });
    }

    onUploadError(error: boolean) {
        this.hasUploadError = error;
    }


    // State for editing
    currentWorkId: number | null = null;

    // --- Work Experience Modal Logic ---
    openModal() {
        this.showModal = true;
        this.currentWorkId = null;
        this.workForm.reset({
            position: '',
            roleIdi: '',
            institution: '',
            startDate: '',
            endDate: '',
            isCurrent: false,
            description: ''
        });
        this.workFiles = [];
        this.institutionResults = [];
        this.selectedWorkInstitutionRuc = '';
    }

    closeModal() {
        this.showModal = false;
        this.currentWorkId = null;
        this.workForm.reset();
        this.workFiles = [];
        this.institutionResults = [];
        this.selectedWorkInstitutionRuc = '';
    }

    editWork(item: any) {
        if (!item) return;

        this.currentWorkId = Number(item.id);
        this.showModal = true;

        const role = (this.researchRoles || []).find(r => r?.nombre === item.roleIdi);

        this.selectedWorkInstitutionRuc = item.ruc || '';
        this.workForm.patchValue({
            position: item.position,
            institution: item.institution,
            startDate: item.startDate,
            endDate: item.endDate,
            isCurrent: item.current,
            isPrincipal: item.isPrincipal,
            description: item.description,
            roleIdi: role ? role.codigo : item.roleIdi || ''
        }, { emitEvent: false });

        if (this.currentWorkId) {
            this.loadFiles(this.currentWorkId, 'EXPLAB', 'EXPL02', 'work');
        }

        this.cd.detectChanges();
    }

    saveWork() {
        if (this.workForm.invalid) {
            this.workForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario.');
            return;
        }

        const val = this.workForm.value;
        // Capture the ID strictly as a number or null
        const workId: number | null = (this.currentWorkId !== null && this.currentWorkId !== undefined) ? Number(this.currentWorkId) : null;
        // isEditing is true IF and ONLY IF we have a valid numeric ID (including 0)
        const isEditing = workId !== null && !isNaN(workId);

        // Date Range Validation
        if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
            this.alertService.error('Error', 'La fecha de inicio no puede ser mayor a la fecha de fin.');
            return;
        }

        const payload = {
            investigadorId: currentUser.id,
            actualmenteTrabaja: val.isCurrent,
            cargo: val.position,
            descripcion: val.description || '',
            fechaInicio: val.startDate || null,
            fechaFin: val.endDate || null,
            nombreInstitucion: val.institution,
            rolIDi: val.roleIdi,
            rucInstitucion: this.selectedWorkInstitutionRuc || '',
            esPrincipal: val.isPrincipal
        };

        const confirmMessage = isEditing
            ? '¿Está seguro de actualizar el registro de experiencia laboral?'
            : '¿Está seguro de registrar la experiencia laboral?';

        this.alertService.confirm('Confirmación', confirmMessage).then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.workFiles, FileModule.INVESTIGATOR, FileType.PDF, 'EXPLAB', 'EXPL02')
                    .subscribe({
                        next: (uploadedFiles) => {
                            const tokens = uploadedFiles
                                .filter((f: any) => f && f.token)
                                .map((f: any) => f.token);

                            const finalPayload = { ...payload, tokens };

                            if (isEditing && workId !== null) {
                                // UPDATE (PUT)
                                (finalPayload as any).id = workId;
                                this.workExperienceService.updateWorkExperience(workId, finalPayload).subscribe({
                                    next: () => this.handleSaveSuccess(true),
                                    error: (err) => this.handleSaveError(err)
                                });
                            } else {
                                // CREATE (POST)
                                this.workExperienceService.createWorkExperience(finalPayload).subscribe({
                                    next: () => this.handleSaveSuccess(false),
                                    error: (err) => this.handleSaveError(err)
                                });
                            }
                        },
                        error: () => this.alertService.error('Error', 'Error al subir archivos.')
                    });
            }
        });
    }

    private handleSaveSuccess(isUpdate: boolean) {
        this.alertService.success('Éxito', isUpdate ? 'Experiencia actualizada.' : 'Experiencia registrada.');
        setTimeout(() => this.loadWorkExperiences(), 1500);
        this.closeModal();
    }

    private handleSaveError(err: any) {
        console.error('Error saving experience', err);
    }

    deleteWork(index: number) {
        const item = this.workList[index];
        if (!item) return;

        this.alertService.confirm('Confirmación', '¿Estás seguro de eliminar este registro?').then(confirm => {
            if (confirm) {
                const id = Number(item.id);
                if (isNaN(id)) {
                    this.workList.splice(index, 1);
                    return;
                }

                this.workExperienceService.deleteWorkExperience(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado correctamente.');
                        this.loadWorkExperiences();
                    },
                    error: (err) => {
                        console.error('Error deleting work experience', err);
                        this.alertService.error('Error', 'No se pudo eliminar el registro.');
                    }
                });
            }
        });
    }



    // --- Thesis Advisor Modal Logic ---
    currentThesisId: number | null = null;


    openThesisAdvisorModal() {
        this.showThesisAdvisorModal = true;
        this.selectedThesisInstitutionCode = '';
        this.currentThesisId = null;
        this.thesisAdvisorForm.reset({
            institution: '',
            academicLevel: '',
            acceptanceDate: '',
            students: '',
            repositoryUrl: '',
            title: ''
        });
        this.thesisFiles = [];
        this.thesisInstitutionResults = [];
    }

    closeThesisAdvisorModal() {
        this.showThesisAdvisorModal = false;
        this.thesisAdvisorForm.reset();
        this.thesisFiles = [];
        this.thesisInstitutionResults = [];
        this.selectedThesisInstitutionCode = '';
        this.currentThesisId = null;
    }

    saveThesisAdvisor() {
        if (this.thesisAdvisorForm.invalid) {
            this.thesisAdvisorForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario.');
            return;
        }

        const val = this.thesisAdvisorForm.value;
        const thesisId = (this.currentThesisId !== null && this.currentThesisId !== undefined) ? Number(this.currentThesisId) : null;
        const isEditing = thesisId !== null && !isNaN(thesisId);

        const payload = {
            activo: true,
            enlaceRepositorio: val.repositoryUrl,
            fechaAceptacion: val.acceptanceDate,
            investigadorId: currentUser.id,
            nivelAcademico: val.academicLevel,
            nombreInstitucion: val.institution,
            rucInstitucion: this.selectedThesisInstitutionCode || '',
            tesistas: val.students,
            titulo: val.title
        };

        this.alertService.confirm('Confirmación', isEditing ? '¿Actualizar registro?' : '¿Registrar asesoría?').then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.thesisFiles, FileModule.INVESTIGATOR, FileType.PDF, 'EXPLAB', 'EXPL01')
                    .subscribe({
                        next: (uploadedFiles) => {
                            const tokens = uploadedFiles
                                .filter((f: any) => f && f.token)
                                .map((f: any) => f.token);

                            const finalPayload = { ...payload, tokens };

                            if (isEditing && thesisId !== null && !isNaN(thesisId)) {
                                (finalPayload as any).id = thesisId;
                                this.workExperienceService.updateThesisAdvisor(thesisId, finalPayload).subscribe({
                                    next: () => this.handleThesisSaveSuccess(true),
                                    error: (err) => this.handleSaveError(err)
                                });
                            } else {
                                this.workExperienceService.createThesisAdvisor(finalPayload).subscribe({
                                    next: () => this.handleThesisSaveSuccess(false),
                                    error: (err) => this.handleSaveError(err)
                                });
                            }
                        },
                        error: () => this.alertService.error('Error', 'Error al subir archivos.')
                    });
            }
        });
    }

    private handleThesisSaveSuccess(isUpdate: boolean) {
        this.alertService.success('Éxito', isUpdate ? 'Asesoría actualizada.' : 'Asesoría registrada.');
        setTimeout(() => this.loadThesisAdvisors(), 1500);
        this.closeThesisAdvisorModal();
    }

    deleteThesisAdvisor(index: number) {
        const item: any = this.thesisAdvisorList[index];
        if (!item) return;

        this.alertService.confirm('Confirmación', '¿Estás seguro de eliminar este registro?').then(confirm => {
            if (confirm) {
                const id = Number(item.id);
                if (isNaN(id)) {
                    this.thesisAdvisorList.splice(index, 1);
                    return;
                }
                this.workExperienceService.deleteThesisAdvisor(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado.');
                        this.loadThesisAdvisors();
                    },
                    error: () => this.alertService.error('Error', 'Error al eliminar.')
                });
            }
        });
    }

    editThesisAdvisor(item: any) {
        if (!item) return;

        this.currentThesisId = Number(item.id);
        this.showThesisAdvisorModal = true;
        this.selectedThesisInstitutionCode = item.institutionCode || '';

        // Determine academic level code if only name is available, or use stored code
        let levelCode = item.academicLevelCode;
        if (!levelCode && item.academicLevel) {
            const level = this.academicLevels.find(l => l.nombre === item.academicLevel);
            if (level) levelCode = level.codigo;
        }

        this.thesisAdvisorForm.patchValue({
            institution: item.university || item.nombreInstitucion,
            academicLevel: levelCode || item.nivelAcademico || '',
            acceptanceDate: item.acceptanceDate || item.fechaAceptacion,
            students: item.students || item.tesistas,
            repositoryUrl: item.enlaceRepositorio || item.repositoryUrl,
            title: item.thesis || item.titulo
        }, { emitEvent: false });

        if (this.currentThesisId) {
            this.loadFiles(this.currentThesisId, 'EXPLAB', 'EXPL01', 'thesis');
        }

        this.cd.detectChanges();
    }

    getExternalLink(url: string | undefined | null): string {
        if (!url) return '#';
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        return 'https://' + url;
    }

    loadThesisAdvisors() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.workExperienceService.getThesisAdvisors(currentUser.id).subscribe({
                next: (items) => {
                    console.log('Thesis Advisors Loaded:', items);
                    this.thesisAdvisorList = items.map(item => ({
                        id: item.id,
                        code: item.id.toString(),
                        university: item.nombreInstitucion,
                        institutionCode: item.rucInstitucion,
                        academicLevel: item.nivelAcademico,
                        academicLevelCode: item.nivelAcademico,
                        thesis: item.titulo,
                        students: item.tesistas,
                        acceptanceDate: item.fechaAceptacion,
                        enlaceRepositorio: item.enlaceRepositorio
                    }));
                    this.cd.detectChanges();
                },
                error: (err) => console.error('Error loading thesis', err)
            });
        }
    }

    // --- Docent Modal Logic ---
    openDocentModal() {
        this.showDocentModal = true;
        this.currentDocentId = null;
        this.selectedDocentInstitutionRuc = '';
        this.docentForm.reset({
            institution: '',
            institutionType: '',
            docentType: '',
            startDate: '',
            endDate: '',
            currentlyTeaching: false,
            courses: ''
        });
        this.docentFiles = [];
        this.docentInstitutionResults = [];
    }

    closeDocentModal() {
        this.showDocentModal = false;
        this.docentForm.reset();
        this.docentFiles = [];
        this.docentInstitutionResults = [];
        this.currentDocentId = null;
        this.selectedDocentInstitutionRuc = '';
    }

    // Thesis Advisor Data
    academicLevels: any[] = [];
    thesisInstitutionResults: any[] = [];
    isLoadingThesisInstitutions = false;
    selectedThesisInstitutionCode = '';

    editDocent(item: any) {
        if (!item) return;

        this.currentDocentId = Number(item.id);
        this.showDocentModal = true;
        this.selectedDocentInstitutionRuc = item.ruc || '';

        // Find IDs from names for editing
        const instType = (this.institutionTypes || []).find(t => t?.nombre === item.institutionType);
        const docType = (this.docentTypes || []).find(t => t?.nombre === item.docentType);

        this.docentForm.patchValue({
            institution: item.institution,
            institutionType: instType?.codigo || '',
            docentType: docType?.codigo || '',
            startDate: item.startDate,
            endDate: item.endDate,
            currentlyTeaching: item.currentlyTeaching,
            courses: item.courses
        }, { emitEvent: false }); // Also add emitEvent:false here for consistency!

        if (this.currentDocentId) {
            this.loadFiles(this.currentDocentId, 'EXPLAB', 'EXPL03', 'docent');
        }

        this.cd.detectChanges();
    }

    saveDocent() {
        if (this.docentForm.invalid) {
            this.docentForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario.');
            return;
        }

        const val = this.docentForm.value;
        const docentId = (this.currentDocentId !== null && this.currentDocentId !== undefined) ? Number(this.currentDocentId) : null;
        const isEditing = docentId !== null && !isNaN(docentId);

        // Date Range Validation
        if (val.startDate && val.endDate && new Date(val.startDate) > new Date(val.endDate)) {
            this.alertService.error('Error', 'La fecha de inicio no puede ser mayor a la fecha de fin.');
            return;
        }

        const payload = {
            investigadorId: currentUser.id,
            actualmenteDicta: val.currentlyTeaching,
            cursosDictados: val.courses || '',
            fechaFin: val.endDate || null,
            fechaInicio: val.startDate || null,
            nombreInstitucion: val.institution,
            rucInstitucion: this.selectedDocentInstitutionRuc || '',
            tipoDocente: val.docentType,
            tipoInstitucion: val.institutionType
        };

        const confirmMessage = isEditing
            ? '¿Está seguro de actualizar el registro de experiencia docente?'
            : '¿Está seguro de registrar la experiencia docente?';

        this.alertService.confirm('Confirmación', confirmMessage).then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.docentFiles, FileModule.INVESTIGATOR, FileType.PDF, 'EXPLAB', 'EXPL03')
                    .subscribe({
                        next: (uploadedFiles) => {
                            const tokens = uploadedFiles
                                .filter((f: any) => f && f.token)
                                .map((f: any) => f.token);

                            const finalPayload = { ...payload, tokens };

                            if (isEditing && docentId !== null) {
                                (finalPayload as any).id = docentId;
                                this.workExperienceService.updateDocentExperience(docentId, finalPayload).subscribe({
                                    next: () => this.handleDocentSaveSuccess(true),
                                    error: (err) => this.handleSaveError(err)
                                });
                            } else {
                                this.workExperienceService.createDocentExperience(finalPayload).subscribe({
                                    next: () => this.handleDocentSaveSuccess(false),
                                    error: (err) => this.handleSaveError(err)
                                });
                            }
                        },
                        error: () => this.alertService.error('Error', 'Error al subir archivos.')
                    });
            }
        });
    }

    private handleDocentSaveSuccess(isUpdate: boolean) {
        this.alertService.success('Éxito', isUpdate ? 'Experiencia docente actualizada.' : 'Experiencia docente registrada.');
        setTimeout(() => this.loadDocentExperiences(), 1500);
        this.closeDocentModal();
    }

    deleteDocent(index: number) {
        const item = this.docentList[index];
        if (!item) return;

        this.alertService.confirm('Confirmación', '¿Estás seguro de eliminar este registro?').then(confirm => {
            if (confirm) {
                const id = Number(item.id);
                if (isNaN(id)) {
                    this.docentList.splice(index, 1);
                    return;
                }

                this.workExperienceService.deleteDocentExperience(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado correctamente.');
                        this.loadDocentExperiences();
                    },
                    error: (err) => {
                        console.error('Error deleting docent experience', err);
                        this.alertService.error('Error', 'No se pudo eliminar el registro.');
                    }
                });
            }
        });
    }

    // --- Project Modal Logic ---
    currentProjectId: number | null = null;

    openProjectModal() {
        this.showProjectModal = true;
        this.currentProjectId = null;
        this.projectForm.reset({
            role: '',
            projectType: '',
            financingEntity: '',
            contestName: '',
            country: '',
            executionYear: '',
            amount: '',
            url: ''
        });
        this.projectFiles = [];
    }

    closeProjectModal() {
        this.showProjectModal = false;
        this.projectForm.reset();
        this.projectFiles = [];
        this.currentProjectId = null;
    }

    saveProject() {
        if (this.projectForm.invalid) {
            this.projectForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario.');
            return;
        }

        const val = this.projectForm.value;
        const projectId = (this.currentProjectId !== null && this.currentProjectId !== undefined) ? Number(this.currentProjectId) : null;
        const isEditing = projectId !== null && !isNaN(projectId);

        const countryObj = (this.countries || []).find(c => c.codigo === val.country);

        const payload = {
            anioEjecucion: val.executionYear ? val.executionYear.toString() : null,
            enlaceConcurso: val.url,
            investigadorId: currentUser.id,
            montoUsd: val.amount,
            nombreConcurso: val.contestName,
            nombreInstitucion: val.financingEntity,
            paisId: countryObj ? countryObj.id : null,
            rolDesempenado: val.role,
            rucInstitucion: this.selectedProjectEntityCode || '',
            tipoProyectoCti: val.projectType,
            tokens: []
        };

        this.alertService.confirm('Confirmación', isEditing ? '¿Actualizar proyecto?' : '¿Registrar proyecto?').then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.projectFiles, FileModule.INVESTIGATOR, FileType.PDF, 'EXPLAB', 'EXPL04')
                    .subscribe({
                        next: (uploadedFiles) => {
                            const tokens = uploadedFiles
                                .filter((f: any) => f && f.token)
                                .map((f: any) => f.token);

                            const finalPayload = { ...payload, tokens };

                            if (isEditing && projectId !== null) {
                                (finalPayload as any).id = projectId;
                                this.workExperienceService.updateProject(projectId, finalPayload).subscribe({
                                    next: () => this.handleProjectSaveSuccess(true),
                                    error: (err) => this.handleSaveError(err)
                                });
                            } else {
                                this.workExperienceService.createProject(finalPayload).subscribe({
                                    next: () => this.handleProjectSaveSuccess(false),
                                    error: (err) => this.handleSaveError(err)
                                });
                            }
                        },
                        error: () => this.alertService.error('Error', 'Error al subir archivos.')
                    });
            }
        });
    }

    private handleProjectSaveSuccess(isUpdate: boolean) {
        this.alertService.success('Éxito', isUpdate ? 'Proyecto actualizado.' : 'Proyecto registrado.');
        setTimeout(() => this.loadProjects(), 1500);
        this.closeProjectModal();
    }

    deleteProject(index: number) {
        const item: any = this.projectList[index];
        if (!item) return;

        this.alertService.confirm('Confirmación', '¿Estás seguro de eliminar este registro?').then(confirm => {
            if (confirm) {
                const id = Number(item.id);
                if (isNaN(id)) {
                    this.projectList.splice(index, 1);
                    return;
                }
                this.workExperienceService.deleteProject(id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado.');
                        this.loadProjects();
                    },
                    error: () => this.alertService.error('Error', 'Error al eliminar.')
                });
            }
        });
    }

    editProject(item: any) {
        if (!item) return;

        this.currentProjectId = Number(item.id);
        this.showProjectModal = true;

        // Lookup Codes from Names if needed
        const role = (this.projectRoles || []).find(r => r?.nombre === item.role);
        const type = (this.projectTypes || []).find(t => t?.nombre === item.projectType);
        const country = (this.countries || []).find(c => c?.nombre === item.country);

        this.projectForm.patchValue({
            role: role?.codigo || item.role || '',
            projectType: type?.codigo || item.projectType || '',
            financingEntity: item.financingEntity,
            contestName: item.contestName,
            country: country?.codigo || item.country || '',
            executionYear: item.executionYear,
            amount: item.amount,
            url: item.url
        }, { emitEvent: false });

        if (this.currentProjectId) {
            this.loadFiles(this.currentProjectId, 'EXPLAB', 'EXPL04', 'project');
        }

        this.cd.detectChanges();
    }

    loadProjects() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.workExperienceService.getProjects(currentUser.id).subscribe({
                next: (items) => {
                    this.projectList = items.map((item, index) => {
                        const roleCode = item.rolDesempenado || item.rol;
                        const typeCode = item.tipoProyectoCti || item.tipoProyecto;

                        // Country lookup: Try ID first, then Code
                        let country = undefined;
                        if (item.paisId) {
                            country = (this.countries || []).find(c => c.id === item.paisId);
                        } else if (item.pais) {
                            country = (this.countries || []).find(c => c.codigo === item.pais);
                        }

                        const role = (this.projectRoles || []).find(r => r.codigo === roleCode);
                        const type = (this.projectTypes || []).find(t => t.codigo === typeCode);

                        return {
                            id: item.id,
                            code: item.id.toString(),
                            role: role ? role.nombre : roleCode,
                            projectType: type ? type.nombre : typeCode,
                            financingEntity: item.nombreInstitucion || item.entidadFinanciadora,
                            contestName: item.nombreConcurso,
                            country: country ? country.nombre : item.pais || '',
                            executionYear: item.anioEjecucion || item.executionYear,
                            amount: item.montoUsd || item.monto,
                            url: item.enlaceConcurso || item.url
                        };
                    });
                    this.cd.detectChanges();
                },
                error: (err) => console.error('Error loading projects', err)
            });
        }
    }

    setActiveTab(tab: 'all' | 'work' | 'thesis' | 'docent' | 'project') {
        this.activeTab = tab;
    }

    get totalProjectAmount(): number {
        return this.projectList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    }
}
