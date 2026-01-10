import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CatalogService } from '../../../../../core/services/catalog.service';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';

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

    // Collaborators
    showCollaboratorModal = false;
    collaboratorForm: FormGroup;
    collaborators: Collaborator[] = [
        {
            id: 1,
            paternalSurname: 'Diciembre 2024',
            maternalSurname: 'Diciembre 2024',
            names: 'Diciembre 2024',
            email: 'Diciembre 2024'
        }
    ];

    isTableMaximized = false;

    toggleMaximize() {
        this.isTableMaximized = !this.isTableMaximized;
    }

    // Mock Data for "Proyectos" (Manual)
    manualProjects: Project[] = [
        {
            id: 1,
            code: '001',
            projectType: 'Investigación Aplicada',
            title: 'LICENCIADO / TÍTULO',
            description: 'INGENIERO DE SISTEMAS',
            institution: 'Universidad César Vallejo S.A.C.',
            startDate: 'Diciembre 2024',
            endDate: 'Diciembre 2024',
        }
    ];

    // Mock Data for "Proyectos Importados ORCID"
    orcidProjects: OrcidProject[] = [
        {
            id: 1,
            code: '001',
            fundingType: 'Financiamiento Propio',
            title: 'LICENCIADO / TÍTULO',
            description: 'INGENIERO DE SISTEMAS',
            institution: 'Universidad César Vallejo S.A.C.',
            startDate: 'Diciembre 2024',
            endDate: 'Diciembre 2024',
            source: 'SUNEDU'
        }
    ];

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService
    ) {
        this.projectForm = this.fb.group({
            projectName: ['', Validators.required],
            description: [''],
            keywords: [''],
            projectType: ['', Validators.required],
            executionRegion: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required],
            academicContext: ['', Validators.required],
            role: ['', Validators.required],
            principalInvestigator: [''],
            mainInstitution: ['', Validators.required],
            collaboratingInstitution: ['', Validators.required],
            fundedBy: ['', Validators.required],
            grantContest: ['', Validators.required],
            contractNumber: [''],
            financedAmount: ['0.00'],
            oecdArea: ['', Validators.required],
            oecdSubArea: ['', Validators.required],
            oecdDiscipline: ['', Validators.required],
            environmentalTheme: ['', Validators.required]
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
        const areaId = event.target.value;
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
        const subAreaId = event.target.value;
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
        if (this.projectForm.valid) {
            console.log('Project Data:', this.projectForm.value);
            // Logic to save would go here
            const newProject: Project = {
                id: this.manualProjects.length + 1,
                code: '00' + (this.manualProjects.length + 1),
                projectType: this.projectForm.get('projectType')?.value,
                title: this.projectForm.get('projectName')?.value,
                description: this.projectForm.get('description')?.value,
                institution: this.projectForm.get('mainInstitution')?.value,
                startDate: this.projectForm.get('startDate')?.value,
                endDate: this.projectForm.get('endDate')?.value
            };
            this.manualProjects.push(newProject);
            this.closeModal();
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
                id: this.collaborators.length + 1,
                ...this.collaboratorForm.value
            };
            this.collaborators.push(newCollab);
            this.collaboratorForm.reset();
        }
    }

    removeCollaborator(id: number) {
        this.collaborators = this.collaborators.filter(c => c.id !== id);
    }
}
