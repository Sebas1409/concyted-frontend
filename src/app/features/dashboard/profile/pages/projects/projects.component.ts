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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
    imports: [CommonModule, ReactiveFormsModule, ActionButtonsComponent, IntroCardComponent],
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

    // Collaborators
    showCollaboratorModal = false;
    collaboratorForm: FormGroup;
    collaborators: Collaborator[] = [];

    isTableMaximized = false;
    currentProjectId: number | null = null;

    toggleMaximize() {
        this.isTableMaximized = !this.isTableMaximized;
    }

    // Mock Data for "Proyectos" (Manual)
    manualProjects: Project[] = [];
    rawProjects: any[] = [];

    // Mock Data for "Proyectos Importados ORCID"
    orcidProjects: OrcidProject[] = [];

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private projectService: ProjectService,
        private authService: AuthService,
        private alertService: AlertService,
        private ubigeoService: UbigeoService,
        private cdr: ChangeDetectorRef
    ) {
        this.projectForm = this.fb.group({
            projectName: ['', Validators.required],
            description: [''],
            keywords: [''],
            projectType: ['', Validators.required],
            executionRegion: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
            academicContext: ['', Validators.required], // vinculacionAcademicaId
            role: ['', Validators.required], // rolDesempenadoId
            principalInvestigator: [''],
            mainInstitution: ['', Validators.required],
            collaboratingInstitution: [''], // Optional
            fundedBy: ['', Validators.required], // financiadoraId
            grantContest: ['', Validators.required], // concursoSubvencionId
            contractNumber: [''],
            financedAmount: [0],
            oecdArea: ['', Validators.required],
            oecdSubArea: ['', Validators.required],
            oecdDiscipline: ['', Validators.required],
            environmentalTheme: [''] // Optional
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
    }

    loadProjectRoles() {
        this.catalogService.getMasterDetailsByCode('ROLDES').subscribe({
            next: (data) => {
                this.projectRoles = data;
            },
            error: (err) => console.error('Failed to load project roles', err)
        });
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
            forkJoin([
                this.projectService.getProjectsByInvestigator(currentUser.id, true).pipe(catchError(() => of([]))),
                this.projectService.getProjectsByInvestigator(currentUser.id, false).pipe(catchError(() => of([])))
            ]).subscribe({
                next: ([researchProjects, innovationProjects]) => {
                    console.log('Raw Research Projects:', researchProjects);
                    console.log('Raw Innovation Projects (mapped to ORCID for now):', innovationProjects);

                    const normalize = (data: any) => {
                        if (!data) return [];
                        if (Array.isArray(data)) return data;
                        if (typeof data === 'object') return [data];
                        return [];
                    };

                    const rProjs = normalize(researchProjects);
                    const iProjs = normalize(innovationProjects);

                    this.rawProjects = [...rProjs, ...iProjs];

                    // Map Research Projects to "Proyectos" (Manual)
                    this.manualProjects = rProjs.map((p: any) => ({
                        id: p.id,
                        code: p.id ? p.id.toString().padStart(3, '0') : '000',
                        projectType: 'Investigación y Desarrollo',
                        title: p.nombreProyecto,
                        description: p.descripcion || '',
                        institution: p.institucionPrincipalId,
                        startDate: p.fechaInicio ? p.fechaInicio.split('T')[0] : '',
                        endDate: p.fechaFin ? p.fechaFin.split('T')[0] : ''
                    }));

                    // Map Innovation Projects to "Proyectos importados de ORCID" (as requested)
                    this.orcidProjects = iProjs.map((p: any) => ({
                        id: p.id,
                        code: p.id ? p.id.toString().padStart(3, '0') : '000',
                        fundingType: 'Innovación', // Mapped from project type
                        title: p.nombreProyecto,
                        description: p.descripcion || '',
                        institution: p.institucionPrincipalId,
                        startDate: p.fechaInicio ? p.fechaInicio.split('T')[0] : '',
                        endDate: p.fechaFin ? p.fechaFin.split('T')[0] : '',
                        source: 'ORCID' // Static or derived
                    }));

                    this.cdr.detectChanges();
                },
                error: (err) => console.error('Error loading projects', err)
            });
        }
    }

    loadAreas() {
        this.catalogService.getAreas().subscribe({
            next: (data) => {
                this.areas = data;
            },
            error: (err) => console.error('Failed to load areas', err)
        });
    }

    loadEnvironmentalThemes() {
        this.catalogService.getMasterDetails(7).subscribe({
            next: (data) => {
                this.environmentalThemes = data;
            },
            error: (err) => console.error('Failed to load environmental themes', err)
        });
    }

    onAreaChange(event: any) {
        const areaId = this.projectForm.get('oecdArea')?.value;
        this.subAreas = [];
        this.disciplines = [];
        this.projectForm.get('oecdSubArea')?.reset('');
        this.projectForm.get('oecdDiscipline')?.reset('');

        if (areaId) {
            this.catalogService.getSubAreas(areaId).subscribe({
                next: (data) => {
                    this.subAreas = data;
                },
                error: (err) => console.error('Failed to load sub-areas', err)
            });
        }
    }

    onSubAreaChange(event: any) {
        const subAreaId = this.projectForm.get('oecdSubArea')?.value;
        this.disciplines = [];
        this.projectForm.get('oecdDiscipline')?.reset('');

        if (subAreaId) {
            this.catalogService.getDisciplines(subAreaId).subscribe({
                next: (data) => {
                    this.disciplines = data;
                },
                error: (err) => console.error('Failed to load disciplines', err)
            });
        }
    }

    setActiveTab(tab: 'all' | 'manual' | 'orcid') {
        this.activeTab = tab;
    }

    openModal(type: 'research' | 'innovation' = 'research') {
        this.modalType = type;
        this.showModal = true;
        this.currentProjectId = null;
        this.projectForm.reset();
        this.collaborators = []; // Clear collaborators for new project

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
        return this.modalType === 'research'
            ? 'Agregar Proyecto de Investigación y Desarrollo'
            : 'Agregar Proyecto de Innovación';
    }

    get modalDescription(): string {
        return this.modalType === 'research'
            ? 'Registra proyectos científicos, definiendo su vinculación académica y equipo de trabajo.'
            : 'Registra proyectos orientados a la creación o mejora significativa de productos, procesos o servicios (I+D+i empresarial).';
    }

    get nameLabel(): string {
        return this.modalType === 'research'
            ? 'Proyecto de Investigación y Desarrollo'
            : 'Título del Proyecto de Innovación';
    }

    closeModal() {
        this.showModal = false;
        this.currentProjectId = null;
        this.projectForm.reset({
            financedAmount: '0.00',
            oecdArea: '',
            oecdSubArea: '',
            oecdDiscipline: '',
            environmentalTheme: '',
            academicContext: '',
            role: '',
            projectType: '',
            executionRegion: '',
            mainInstitution: '',
            collaboratingInstitution: '',
            fundedBy: '',
            grantContest: ''
        });
        this.subAreas = [];
        this.disciplines = [];
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
            id: c.id > 1000000 ? 0 : c.id, // If ID is large (temp), send 0 for creation; else send existing ID
            nombres: c.names,
            apellidoPaterno: c.paternalSurname,
            apellidoMaterno: c.maternalSurname,
            correoContacto: c.email
        }));
        console.log('Sending Collaborators:', colaboradoresPayload);

        const isInvDes = this.modalType === 'research';

        const payload: ProjectPayload = {
            active: true,
            isInvestigacionDesarrollo: isInvDes,
            nombreProyecto: formVal.projectName,
            descripcion: formVal.description,
            palabrasClave: formVal.keywords,
            areaId: Number(formVal.oecdArea) || 0,
            subareaId: Number(formVal.oecdSubArea) || 0,
            disciplinaId: Number(formVal.oecdDiscipline) || 0,
            tematicaAmbientalId: formVal.environmentalTheme,
            tipoProyectoId: formVal.projectType,
            regionId: Number(formVal.executionRegion) || 0,
            fechaInicio: formVal.startDate,
            fechaFin: formVal.endDate,
            montoFinanciado: Number(formVal.financedAmount) || 0,
            numeroContrato: formVal.contractNumber,
            concursoSubvencionId: !isNaN(Number(formVal.grantContest)) ? Number(formVal.grantContest) : 0,
            financiadoraId: !isNaN(Number(formVal.fundedBy)) ? Number(formVal.fundedBy) : 0,
            vinculacionAcademicaId: formVal.academicContext,
            rolDesempenadoId: formVal.role,
            investigadorId: investigatorId,
            investigadorPrincipal: formVal.principalInvestigator,
            institucionPrincipalId: formVal.mainInstitution,
            institucionColaboradoraId: formVal.collaboratingInstitution,
            colaboradores: colaboradoresPayload
        };

        if (this.currentProjectId) {
            this.projectService.updateProject(this.currentProjectId, payload).subscribe({
                next: (resp) => {
                    this.alertService.success('Éxito', 'Proyecto actualizado correctamente.');
                    this.closeModal();
                    this.loadProjects();
                },
                error: (err) => {
                    console.error('Error updating project:', err);
                    this.alertService.error('Error', 'No se pudo actualizar el proyecto.');
                }
            });
        } else {
            this.projectService.createProject(payload).subscribe({
                next: (resp) => {
                    this.alertService.success('Éxito', 'Proyecto registrado correctamente.');
                    this.closeModal();
                    this.loadProjects();
                },
                error: (err) => {
                    console.error('Error saving project:', err);
                    this.alertService.error('Error', 'No se pudo guardar el proyecto.');
                }
            });
        }
    }

    openCollaboratorModal() {
        this.showCollaboratorModal = true;
    }

    closeCollaboratorModal() {
        this.showCollaboratorModal = false;
        this.collaboratorForm.reset();
    }

    addCollaboratorToList() {
        if (this.collaboratorForm.valid) {
            const newCollab: Collaborator = {
                id: Date.now(), // Use a temporary large ID for frontend-only
                ...this.collaboratorForm.value
            };
            this.collaborators.push(newCollab);
            this.collaboratorForm.reset();
        }
    }

    removeCollaborator(id: number) {
        this.collaborators = this.collaborators.filter(c => c.id !== id);
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
                mainInstitution: project.institucionPrincipalId,
                collaboratingInstitution: project.institucionColaboradoraId,
                fundedBy: project.financiadoraId ? project.financiadoraId.toString() : '',
                grantContest: project.concursoSubvencionId ? project.concursoSubvencionId.toString() : '',
                contractNumber: project.numeroContrato,
                financedAmount: project.montoFinanciado,
                oecdArea: project.areaId ? project.areaId.toString() : '',
                oecdSubArea: project.subareaId ? project.subareaId.toString() : '',
                oecdDiscipline: project.disciplinaId ? project.disciplinaId.toString() : '',
                environmentalTheme: project.tematicaAmbientalId ? project.tematicaAmbientalId.toString() : ''
            });

            if (project.colaboradores && Array.isArray(project.colaboradores)) {
                this.collaborators = project.colaboradores.map((c: any) => ({
                    id: c.id,
                    paternalSurname: c.apellidoPaterno,
                    maternalSurname: c.apellidoMaterno,
                    names: c.nombres,
                    email: c.correoContacto
                }));
            } else {
                this.collaborators = [];
            }

            if (project.areaId) {
                this.catalogService.getSubAreas(project.areaId).subscribe(data => this.subAreas = data);
            }
            if (project.subareaId) {
                this.catalogService.getDisciplines(project.subareaId).subscribe(data => this.disciplines = data);
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
