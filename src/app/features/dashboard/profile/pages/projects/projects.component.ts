import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';
import { ProjectService, ProjectPayload, CollaboratorPayload } from '../../../../../core/services/project.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { CatalogService } from '../../../../../core/services/catalog.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { FileService } from '../../../../../core/services/file.service';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { FileViewerModalComponent, ViewerFile } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { InstitutionSelectComponent } from '../../../../../shared/components/institution-select/institution-select.component';
import { QualificationBadgeComponent } from '../../../../../shared/components/qualification-badge/qualification-badge.component';
import { DateDisplayPipe } from '../../../../../shared/pipes/date-display.pipe';
import { forkJoin, of, from, Observable } from 'rxjs';
import { catchError, concatMap, toArray, map } from 'rxjs/operators';

interface Project {
    id: number;
    code: string;
    projectType: string;
    title: string;
    description: string;
    institution: string;
    startDate: string;
    endDate: string;
    attachments?: string;
    isOrcid?: boolean;
}

interface OrcidProject {
    id: number;
    code: string;
    fundingType: string; // Tipo financiamiento
    title: string;
    description: string;
    institution: string;
    startDate: string;
    endDate: string;
    source: string; // e.g. Sunedu logo or text
    url?: string;
}

interface Collaborator {
    id: number;
    paternalSurname: string;
    maternalSurname: string;
    names: string;
    email: string;
}

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ActionButtonsComponent, IntroCardComponent, FileUploaderComponent, FileViewerModalComponent, InstitutionSelectComponent, QualificationBadgeComponent, DateDisplayPipe],
    templateUrl: './projects.component.html',
    styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
    activeTab: 'all' | 'manual' | 'orcid' = 'all';
    showModal = false;
    modalType: 'research' | 'innovation' = 'research';
    projectForm: FormGroup;

    // Catalog Data
    areas: any[] = [];
    subAreas: any[] = [];
    disciplines: any[] = [];
    environmentalThemes: any[] = [];
    departments: any[] = [];
    projectTypes: any[] = [];
    academicContexts: any[] = [];
    projectRoles: any[] = [];
    thesisDegrees: any[] = []; // GRADOS catalog for thesis degree
    fundingAgencies: any[] = []; // SUBVEN catalog
    grantContests: any[] = []; // Dependent sub-details

    // Collaborators
    showCollaboratorModal = false;
    collaboratorForm: FormGroup;
    collaborators: Collaborator[] = [];

    isTableMaximized = false;
    currentProjectId: number | null = null;
    projectFiles: any[] = [];
    hasUploadError = false;

    // File Viewer
    showFileViewer = false;
    viewerFiles: ViewerFile[] = [];
    currentUserFullName: string = '';

    toggleMaximize() {
        this.isTableMaximized = !this.isTableMaximized;
    }

    // Mock Data for "Proyectos" (Manual)
    manualProjects: Project[] = [];
    rawProjects: any[] = [];

    // Mock Data for "Proyectos Importados ORCID"
    orcidProjects: OrcidProject[] = [];

    // Institutions
    selectedMainInstitutionCode: string = '';
    selectedMainInstitutionName: string = '';
    selectedCollaboratingInstitutionCode: string = '';
    selectedCollaboratingInstitutionName: string = '';

    onMainInstitutionSelect(item: any) {
        this.selectedMainInstitutionCode = item.codigo || '';
        this.selectedMainInstitutionName = item.nombre || '';
    }

    onCollaboratingInstitutionSelect(item: any) {
        this.selectedCollaboratingInstitutionCode = item.codigo || '';
        this.selectedCollaboratingInstitutionName = item.nombre || '';
    }

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private projectService: ProjectService,
        private authService: AuthService,
        private alertService: AlertService,
        private ubigeoService: UbigeoService,
        private fileService: FileService,
        private cdr: ChangeDetectorRef
    ) {
        this.projectForm = this.fb.group({
            projectName: ['', Validators.required],
            description: [''],
            keywords: ['', Validators.required],
            projectType: ['', Validators.required],
            executionRegion: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
            academicContext: ['', Validators.required], // vinculacionAcademicaId
            role: ['', Validators.required], // rolDesempenadoId
            principalInvestigator: ['', Validators.required],
            mainInstitution: ['', Validators.required],
            collaboratingInstitution: [''], // Optional
            fundedBy: ['', Validators.required], // financiadoraId
            grantContest: ['', Validators.required], // concursoSubvencionId
            contractNumber: ['', Validators.required],
            oecdArea: ['', Validators.required],
            oecdSubArea: ['', Validators.required],
            oecdDiscipline: ['', Validators.required],
            environmentalTheme: [''], // Optional
            thesisDegreeId: [''], // Grado de Tesis (visible when Tesis selected)
            financedAmount: ['', Validators.required] 
        });

        // OECD Cascade Subscriptions
        this.projectForm.get('oecdArea')?.valueChanges.subscribe(code => {
            this.handleAreaChange(code);
        });

        this.projectForm.get('oecdSubArea')?.valueChanges.subscribe(code => {
            this.handleSubAreaChange(code);
        });

        this.collaboratorForm = this.fb.group({
            paternalSurname: ['', Validators.required],
            maternalSurname: ['', Validators.required],
            names: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]]
        });
    }

    ngOnInit(): void {
        this.loadAreas();
        this.loadEnvironmentalThemes();
        this.loadProjects();
        this.loadDepartments();
        this.loadProjectTypes();
        this.loadAcademicContexts();
        this.loadProjectRoles();
        this.loadThesisDegrees();
        this.loadFundingAgencies();
        this.setCurrentUserFullName();
    }

    setCurrentUserFullName() {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.currentUserFullName = `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
        }
    }

    loadProjectRoles() {
        this.catalogService.getMasterDetailsByCode('ROLDES').subscribe({
            next: (data) => {
                this.projectRoles = data;
            },
            error: (err) => console.error('Failed to load project roles', err)
        });
    }

    loadFundingAgencies() {
        this.catalogService.getMasterDetailsByCode('SUBVEN').subscribe({
            next: (data) => {
                this.fundingAgencies = data;
            },
            error: (err) => console.error('Failed to load funding agencies (SUBVEN)', err)
        });
    }

    onFundingAgencyChange() {
        const agencyCode = this.projectForm.get('fundedBy')?.value;
        if (agencyCode) {
            this.catalogService.getMasterSubDetails('SUBVEN', agencyCode).subscribe({
                next: (data) => {
                    this.grantContests = data;
                },
                error: (err) => {
                    console.error('Failed to load grant contests', err);
                    this.grantContests = [];
                }
            });
        } else {
            this.grantContests = [];
        }
        this.projectForm.get('grantContest')?.setValue('');
    }

    loadThesisDegrees() {
        this.catalogService.getMasterDetailsByCode('GRADOS').subscribe({
            next: (data) => {
                this.thesisDegrees = data;
            },
            error: (err) => console.error('Failed to load thesis degrees (GRADOS)', err)
        });
    }

    get isThesisDegreeVisible(): boolean {
        const val = this.projectForm.get('academicContext')?.value;
        if (!val) return false;
        const selected = this.academicContexts.find(c => c.codigo === val);
        const name = selected?.nombre?.toUpperCase() || '';
        // Only Doctorado (excluding Post-Doctorado)
        return name.includes('DOCTORADO') && !name.includes('POST');
    }




    loadAcademicContexts() {
        this.catalogService.getMasterDetailsByCode('VINACP').subscribe({
            next: (data) => {
                this.academicContexts = data;
            },
            error: (err) => console.error('Failed to load academic contexts', err)
        });
    }

    loadProjectTypes() {
        this.catalogService.getMasterDetailsByCode('TIPROY').subscribe({
            next: (data) => {
                this.projectTypes = data;
            },
            error: (err) => console.error('Failed to load project types', err)
        });
    }

    loadDepartments() {
        this.ubigeoService.getCountries().subscribe({
            next: (countries) => {
                const peru = countries.find(c => c.nombre && c.nombre.toUpperCase().includes('PER'));
                if (peru) {
                    this.ubigeoService.getDepartments(peru.id).subscribe({
                        next: (depts) => {
                            this.departments = depts;
                        },
                        error: (err) => console.error('Failed to load departments', err)
                    });
                }
            },
            error: (err) => console.error('Failed to load countries', err)
        });
    }

    loadProjects() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.projectService.getProjectsWithCollaborators(currentUser.id).subscribe({
                next: (items) => {
                    console.log('Projects loaded:', items);

                    const normalize = (data: any) => {
                        if (!data) return [];
                        if (Array.isArray(data)) return data;
                        if (typeof data === 'object') return [data];
                        return [];
                    };

                    const projs = normalize(items);
                    this.rawProjects = projs;

                    // Map to "Proyectos" (Manual)
                    this.manualProjects = projs.map((p: any) => ({
                        id: p.id,
                        code: p.id ? p.id.toString().padStart(3, '0') : '000',
                        projectType: p.isInvestigacionDesarrollo ? 'Proyectos de investigación' : 'Proyectos de innovación',
                        title: p.nombreProyecto,
                        description: p.descripcion || '',
                        institution: p.institucionPrincipalNombre || (p.institucionPrincipalId ? `Institución (RUC: ${p.institucionPrincipalId})` : 'No registrada'),
                        startDate: p.fechaInicio ? p.fechaInicio.split('T')[0] : '',
                        endDate: p.fechaFin ? p.fechaFin.split('T')[0] : ''
                    }));

                    // Load ORCID projects if orcidId is available
                    if (currentUser.orcid) {
                        this.loadOrcidProjects(currentUser.orcid);
                    } else {
                        this.orcidProjects = [];
                    }

                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error loading projects', err);
                    this.manualProjects = [];
                    this.orcidProjects = [];
                    this.cdr.detectChanges();
                }
            });
        }
    }

    loadOrcidProjects(orcidId: string) {
        this.projectService.importOrcidWorks(orcidId).subscribe({
            next: (resp) => {
                if (resp && resp.data && resp.data.publications) {
                    this.orcidProjects = resp.data.publications.map((p: any) => ({
                        id: p.putCode || 0,
                        code: (p.putCode || '').toString(),
                        fundingType: p.type || 'Publicación',
                        title: p.title || 'Sin título',
                        description: '',
                        institution: 'ORCID',
                        startDate: p.year ? p.year.toString() : '---',
                        endDate: p.year ? p.year.toString() : '---',
                        source: 'ORCID',
                        url: p.url || ''
                    }));
                } else {
                    this.orcidProjects = [];
                }
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error importing ORCID works', err);
                this.orcidProjects = [];
                this.cdr.detectChanges();
            }
        });
    }

    loadAreas() {
        this.catalogService.getAreas().subscribe({
            next: (data: any) => {
                this.areas = Array.isArray(data) ? data : (data?.data || []);
            },
            error: (err) => console.error('Failed to load areas', err)
        });
    }

    loadEnvironmentalThemes() {
        this.catalogService.getMasterDetails(7).subscribe({
            next: (data: any) => {
                this.environmentalThemes = Array.isArray(data) ? data : (data?.data || []);
            },
            error: (err) => console.error('Failed to load environmental themes', err)
        });
    }

    handleAreaChange(areaId: any) {
        this.subAreas = [];
        this.disciplines = [];

        if (areaId) {
            this.catalogService.getSubAreas(Number(areaId)).subscribe({
                next: (data: any) => {
                    this.subAreas = Array.isArray(data) ? data : (data?.data || []);
                },
                error: (err) => console.error('Failed to load sub-areas', err)
            });
        }
    }

    handleSubAreaChange(subAreaId: any) {
        this.disciplines = [];

        if (subAreaId) {
            this.catalogService.getDisciplines(Number(subAreaId)).subscribe({
                next: (data: any) => {
                    this.disciplines = Array.isArray(data) ? data : (data?.data || []);
                },
                error: (err) => console.error('Failed to load disciplines', err)
            });
        }
    }

    onAreaChange(event?: any) {
        // Handled by valueChanges, but keep for template compatibility if needed
        this.projectForm.get('oecdSubArea')?.setValue('');
        this.projectForm.get('oecdDiscipline')?.setValue('');
    }

    onSubAreaChange(event?: any) {
        // Handled by valueChanges
        this.projectForm.get('oecdDiscipline')?.setValue('');
    }

    setActiveTab(tab: 'all' | 'manual' | 'orcid') {
        this.activeTab = tab;
    }

    openModal(type: 'research' | 'innovation' = 'research') {
        this.modalType = type;
        this.showModal = true;
        this.currentProjectId = null;
        this.resetProjectForm(); // Helper to reliably clear to empty strings
        this.collaborators = []; // Clear collaborators for new project
        this.projectFiles = []; // Clear files for new project
        this.hasUploadError = false;

        // Handle dynamic validators
        const collabInstControl = this.projectForm.get('collaboratingInstitution');
        if (this.modalType === 'innovation') {
            collabInstControl?.setValidators([Validators.required]);
        } else {
            collabInstControl?.clearValidators();
        }
        collabInstControl?.updateValueAndValidity();

        const user = this.authService.getCurrentUser();
        if (user) {
            // Format: Surnames Names
            const fullName = `${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''} ${user.nombres || ''}`.trim().replace(/\s+/g, ' ');
            this.projectForm.patchValue({
                principalInvestigator: fullName
            });
            // Optional: Disable the field if it shouldn't be edited
            this.projectForm.get('principalInvestigator')?.disable();
        }
    }

    get modalTitle(): string {
        const action = this.currentProjectId ? 'Editar' : 'Agregar';
        return this.modalType === 'research'
            ? `${action} Proyecto de Investigación y Desarrollo`
            : `${action} Proyecto de Innovación`;
    }

    get modalDescription(): string {
        return this.modalType === 'research'
            ? 'Registra y actualiza proyectos científicos, definiendo su vinculación académica y equipo de trabajo.'
            : 'Registra y actualiza proyectos orientados a la creación o mejora significativa de productos, procesos o servicios (I+D+i empresarial).';
    }


    get nameLabel(): string {
        return this.modalType === 'research'
            ? 'Proyecto de Investigación y Desarrollo'
            : 'Título del Proyecto de Innovación';
    }

    closeModal() {
        this.showModal = false;
        this.currentProjectId = null;
        this.resetProjectForm();
        this.subAreas = [];
        this.disciplines = [];
    }

    private resetProjectForm() {
        this.projectForm.reset({
            projectName: '',
            description: '',
            keywords: '',
            projectType: '',
            executionRegion: '',
            startDate: '',
            endDate: '',
            academicContext: '',
            role: '',
            mainInstitution: '',
            collaboratingInstitution: '',
            fundedBy: '',
            grantContest: '',
            contractNumber: '',
            financedAmount: '',
            oecdArea: '',
            oecdSubArea: '',
            oecdDiscipline: '',
            environmentalTheme: '',
            thesisDegreeId: ''
        });
        this.selectedMainInstitutionName = '';
        this.selectedCollaboratingInstitutionName = '';
    }

    saveProject() {
        if (this.projectForm.invalid) {
            this.projectForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        const investigatorId = currentUser?.id || 0;
        const formVal = this.projectForm.getRawValue();

        const colaboradoresPayload: CollaboratorPayload[] = this.collaborators.map(c => ({
            id: c.id > 1000000 ? null : c.id, // If ID is large (temp), send null for creation; else send existing ID
            nombres: c.names,
            apellidoPaterno: c.paternalSurname,
            apellidoMaterno: c.maternalSurname,
            correoContacto: c.email
        }));
        console.log('Sending Collaborators:', colaboradoresPayload);

        const payload: ProjectPayload = {
            active: true,
            areaId: formVal.oecdArea,
            colaboradores: colaboradoresPayload,
            concursoSubvencionId: formVal.grantContest,
            descripcion: formVal.description,
            disciplinaId: formVal.oecdDiscipline,
            fechaFin: formVal.endDate,
            fechaInicio: formVal.startDate,
            financiadoraId: formVal.fundedBy,
            institucionColaboradoraId: this.selectedCollaboratingInstitutionCode || formVal.collaboratingInstitution,
            institucionColaboradoraNombre: this.selectedCollaboratingInstitutionName,
            institucionPrincipalId: this.selectedMainInstitutionCode || formVal.mainInstitution,
            institucionPrincipalNombre: this.selectedMainInstitutionName,
            investigadorId: currentUser ? currentUser.id : 0,
            investigadorPrincipal: formVal.principalInvestigator,
            isInvestigacionDesarrollo: this.modalType === 'research',
            montoFinanciado: formVal.financedAmount,
            nombreProyecto: formVal.projectName,
            numeroContrato: formVal.contractNumber,
            palabrasClave: formVal.keywords,
            regionId: formVal.executionRegion ? Number(formVal.executionRegion) : 0,
            rolDesempenadoId: formVal.role,
            subareaId: formVal.oecdSubArea,
            tematicaAmbientalId: formVal.environmentalTheme,
            tipoProyectoId: formVal.projectType,
            vinculacionAcademicaId: formVal.academicContext,
            gradoTesis: formVal.thesisDegreeId || null,
            orcid: false
        };

        // Sequential process: Upload files, get tokens, then save project (like WorkExperience)
        this.uploadFilesBeforeSave(this.projectFiles).subscribe({
            next: (uploadedTokens: string[]) => {
                payload.tokens = uploadedTokens;
                if (this.currentProjectId) {
                    this.projectService.updateProject(this.currentProjectId, payload).subscribe({
                        next: () => this.handleProjectSaveSuccess(true),
                        error: (err: any) => this.handleProjectSaveError(err)
                    });
                } else {
                    this.projectService.createProject(payload).subscribe({
                        next: () => this.handleProjectSaveSuccess(false),
                        error: (err: any) => this.handleProjectSaveError(err)
                    });
                }
            },
            error: (err: any) => {
                console.error('File upload failed during project save', err);
                this.alertService.error('Error', 'No se pudieron subir los archivos.');
            }
        });
    }

    private uploadFilesBeforeSave(files: any[]): Observable<string[]> {
        if (!files || files.length === 0) return of([]);

        const module = 'INVESTIGATOR';
        const category = 'PROYID';
        const section = 'PROY01';

        const observables = files.map(fileObj => {
            if (fileObj.file instanceof File) {
                return this.fileService.uploadFile(fileObj.file, module, 'DOCUMENT', category, section, false).pipe(
                    map((resp: any) => resp.token || resp.data?.token || ''),
                    catchError(() => of(''))
                );
            } else {
                return of(fileObj.token || '');
            }
        });

        return forkJoin(observables).pipe(
            map((tokens: string[]) => tokens.filter((t: string) => t !== ''))
        );
    }

    private handleProjectSaveSuccess(isUpdate: boolean) {
        this.alertService.success('Éxito', isUpdate ? 'Proyecto actualizado correctamente.' : 'Proyecto registrado correctamente.');
        this.closeModal();
        this.loadProjects();
    }

    private handleProjectSaveError(err: any) {
        console.error('Error saving project:', err);
        this.alertService.error('Error', 'No se pudo guardar el proyecto.');
    }

    private loadExistingFiles(parentId: number) {
        // "Module": INVESTIGATOR, "Category": PROYID, "Section": PROY01
        this.fileService.listFilesMetadata('INVESTIGATOR', 'PROYID', 'PROY01', parentId).subscribe({
            next: (files) => {
                this.projectFiles = (files || []).map((f: any, index: number) => ({
                    code: (index + 1).toString().padStart(2, '0'),
                    name: f.nombre || f.fileName || f.name || 'Archivo',
                    token: f.token,
                    file: null
                }));
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading project files', err)
        });
    }

    onUploadError(error: boolean) {
        this.hasUploadError = error;
    }

    viewFiles(item: any) {
        if (!item || !item.id) return;

        this.fileService.fetchFilesForViewer('INVESTIGATOR', 'PROYID', 'PROY01', Number(item.id))
            .subscribe({
                next: (files) => {
                    if (files && files.length > 0) {
                        this.viewerFiles = files;
                        this.showFileViewer = true;
                        this.cdr.detectChanges();
                    }
                },
                error: (err) => {
                    console.error('Error fetching files', err);
                }
            });
    }

    closeFileViewer() {
        this.showFileViewer = false;
        this.viewerFiles = [];
    }

    openCollaboratorModal() {
        this.showCollaboratorModal = true;
    }

    closeCollaboratorModal() {
        this.showCollaboratorModal = false;
        this.collaboratorForm.reset();
        this.cdr.detectChanges();
    }

    confirmCollaborators() {
        // If the form has data and is valid, add it before closing
        if (this.collaboratorForm.valid && this.collaboratorForm.dirty) {
            this.addCollaboratorToList();
        }
        this.closeCollaboratorModal();
    }

    addCollaboratorToList() {
        if (this.collaboratorForm.valid) {
            const newCollab: Collaborator = {
                id: Date.now(), // Use a temporary large ID for frontend-only
                ...this.collaboratorForm.value
            };
            this.collaborators = [...this.collaborators, newCollab];
            this.collaboratorForm.reset();
            this.cdr.detectChanges();
        } else {
            this.collaboratorForm.markAllAsTouched();
        }
    }

    removeCollaborator(id: number) {
        this.collaborators = this.collaborators.filter(c => c.id !== id);
        this.cdr.detectChanges();
    }

    editProject(id: number) {
        const project = this.rawProjects.find(p => p.id === id);
        if (project) {
            this.currentProjectId = project.id;
            this.modalType = project.isInvestigacionDesarrollo ? 'research' : 'innovation';
            this.showModal = true;

            this.projectForm.patchValue({
                projectName: project.nombreProyecto,
                description: project.descripcion,
                keywords: project.palabrasClave,
                projectType: project.tipoProyectoId ? project.tipoProyectoId.toString() : '',
                executionRegion: project.regionId ? project.regionId.toString() : '',
                startDate: project.fechaInicio ? project.fechaInicio.split('T')[0] : '',
                endDate: project.fechaFin ? project.fechaFin.split('T')[0] : '',
                academicContext: project.vinculacionAcademicaId ? project.vinculacionAcademicaId.toString() : '',
                role: project.rolDesempenadoId ? project.rolDesempenadoId.toString() : '',
                principalInvestigator: project.investigadorPrincipal,
                mainInstitution: project.institucionPrincipalNombre || '',
                collaboratingInstitution: project.institucionColaboradoraNombre || '',
                fundedBy: project.financiadoraId ? project.financiadoraId.toString() : '',
                contractNumber: project.numeroContrato,
                financedAmount: project.montoFinanciado,
                oecdArea: project.areaId ? project.areaId.toString() : '',
                environmentalTheme: project.tematicaAmbientalId ? project.tematicaAmbientalId.toString() : '',
                thesisDegreeId: (project.gradoTesis || project.gradoTesisId) ? (project.gradoTesis || project.gradoTesisId).toString() : ''
            });

            // Trigger cascading loads and re-patch dependent values
            if (project.areaId) {
                this.catalogService.getSubAreas(project.areaId).subscribe((data: any) => {
                    this.subAreas = Array.isArray(data) ? data : (data?.data || []);
                    if (project.subareaId) {
                        this.projectForm.get('oecdSubArea')?.setValue(project.subareaId.toString(), { emitEvent: false });
                        this.catalogService.getDisciplines(project.subareaId).subscribe((discData: any) => {
                            this.disciplines = Array.isArray(discData) ? discData : (discData?.data || []);
                            if (project.disciplinaId) {
                                this.projectForm.get('oecdDiscipline')?.setValue(project.disciplinaId.toString(), { emitEvent: false });
                            }
                        });
                    }
                });
            }

            if (project.financiadoraId) {
                this.catalogService.getMasterSubDetails('SUBVEN', project.financiadoraId.toString()).subscribe({
                    next: (data) => {
                        this.grantContests = data;
                        this.projectForm.patchValue({
                            grantContest: project.concursoSubvencionId ? project.concursoSubvencionId.toString() : ''
                        });
                    }
                });
            }

            this.selectedMainInstitutionCode = project.institucionPrincipalId || '';
            this.selectedMainInstitutionName = project.institucionPrincipalNombre || '';
            this.selectedCollaboratingInstitutionCode = project.institucionColaboradoraId || '';
            this.selectedCollaboratingInstitutionName = project.institucionColaboradoraNombre || '';

            if (project.colaboradores && Array.isArray(project.colaboradores)) {
                console.log('Project Collaborators Found:', project.colaboradores);
                this.collaborators = project.colaboradores.map((c: any) => ({
                    id: c.id,
                    paternalSurname: c.apellidoPaterno,
                    maternalSurname: c.apellidoMaterno,
                    names: c.nombres,
                    email: c.correoContacto
                }));
            } else {
                console.log('No collaborators found in project data');
                this.collaborators = [];
            }

            // Principal investigator is usually disabled in edit mode if it's the current user
            this.projectForm.get('principalInvestigator')?.disable();

            this.cdr.detectChanges();

            if (this.currentProjectId) {
                this.loadExistingFiles(this.currentProjectId);
            }
        }
    }

    deleteProject(id: number) {
        if (confirm('¿Estás seguro de eliminar este proyecto?')) {
            this.projectService.deleteProject(id).subscribe({
                next: () => {
                    this.alertService.success('Eliminado', 'Proyecto eliminado correctamente');
                    this.loadProjects();
                },
                error: (err) => console.error('Error deleting', err)
            });
        }
    }
}
