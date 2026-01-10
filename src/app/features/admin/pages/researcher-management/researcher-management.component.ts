import { Component, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';

interface Researcher {
    id: string;
    gender: 'M' | 'F';
    name: string;
    degree: string;
    region: string;
    institution: string;
    regina: string;
    status: string;
    userId: string;
}

interface DerecognitionRequest {
    id: string;
    date: string;
    researcherName: string;
    reason: string;
    status: 'Pendiente' | 'Anulado';
    document: string;
    email: string;
    ticketId: string;
    researcherReasonFull: string;
}

@Component({
    selector: 'app-researcher-management',
    standalone: true,
    imports: [CommonModule, FormsModule, FormModalComponent, IntroCardComponent, RouterModule],
    templateUrl: './researcher-management.component.html',
    styleUrls: ['./researcher-management.component.scss']
})
export class ResearcherManagementComponent {
    activeTab = 'directory'; // 'directory' | 'requests'
    searchTerm = '';

    // Pagination
    currentPage = 1;
    pageSize = 10;
    totalItems = 50;

    researchers: Researcher[] = [
        {
            id: '1231231212',
            gender: 'M',
            name: 'López Martínez, Juan Carlos',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '12345678'
        },
        {
            id: '1231231212',
            gender: 'F',
            name: 'García Pérez, María Fernanda',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '12345678'
        },
        {
            id: '1231231212',
            gender: 'M',
            name: 'Rodríguez Sánchez, Andrés Felipe',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '12345678'
        },
        {
            id: '1231231212',
            gender: 'F',
            name: 'Torres Gómez, Laura Isabel',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '12345678'
        },
        {
            id: '1231231212',
            gender: 'M',
            name: 'Hernández Ruiz, Santiago Alejandro',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '12345678'
        },
        {
            id: '1231231212',
            gender: 'F',
            name: 'Jiménez Castro, Paula Andrea',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '12345678'
        },
        {
            id: '1231231212',
            gender: 'M',
            name: 'Mendoza Romero, Javier Antonio',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '12345678'
        },
        {
            id: '1231231212',
            gender: 'F',
            name: 'Rojas Salazar, Camila Estefania',
            degree: 'Tesis',
            region: 'Tesis',
            institution: 'Bachiller en Ingeniería de Sistemas',
            regina: 'Tesis',
            status: 'Tesis',
            userId: '89012345'
        }
    ];

    // For the active menu dropdown
    activeMenuId: string | null = null;

    // Modal State
    showAccessModal = false;
    showEditModal = false;
    showReviewModal = false;

    // Form Data
    accessForm = {
        username: '',
        email: '',
        fullName: '',
        forceChange: false,
        active: true
    };

    editForm = {
        fullName: '',
        email: '',
        birthDate: '',
        gender: 'M'
    };

    reviewForm = {
        adminObservation: ''
    };

    selectedResearcher: Researcher | null = null;
    selectedRequest: DerecognitionRequest | null = null;

    // Mock Data for Requests
    requests: DerecognitionRequest[] = [
        {
            id: '1231231212',
            date: '12/10/2025',
            researcherName: 'López Martínez, Juan Carlos',
            reason: '"Retiro voluntario..."',
            status: 'Anulado',
            document: '47631224',
            email: 'juan.lopez@gmail.com',
            ticketId: '#8921',
            researcherReasonFull: 'Motivos estrictamente de tiempo y cese de actividades académicas.'
        },
        {
            id: '1231231212',
            date: '10/10/2025',
            researcherName: 'García Pérez, María Fernanda',
            reason: '"Duplicidad..."',
            status: 'Pendiente',
            document: '47631224',
            email: 'maria.garcia@gmail.com',
            ticketId: '#8922',
            researcherReasonFull: 'Se creó una cuenta duplicada por error y deseo mantener solo la principal.'
        },
        {
            id: '1231231212',
            date: 'Tesis',
            researcherName: 'Rodríguez Sánchez, Andrés Felipe',
            reason: 'Tesis',
            status: 'Pendiente',
            document: '12345678',
            email: 'email@example.com',
            ticketId: '#8923',
            researcherReasonFull: 'Tesis'
        },
        {
            id: '1231231212',
            date: 'Tesis',
            researcherName: 'Torres Gómez, Laura Isabel',
            reason: 'Tesis',
            status: 'Pendiente',
            document: '12345678',
            email: 'email@example.com',
            ticketId: '#8924',
            researcherReasonFull: 'Tesis'
        },
        {
            id: '1231231212',
            date: 'Tesis',
            researcherName: 'Hernández Ruiz, Santiago Alejandro',
            reason: 'Tesis',
            status: 'Pendiente',
            document: '12345678',
            email: 'email@example.com',
            ticketId: '#8925',
            researcherReasonFull: 'Tesis'
        },
        {
            id: '1231231212',
            date: 'Tesis',
            researcherName: 'Jiménez Castro, Paula Andrea',
            reason: 'Tesis',
            status: 'Pendiente',
            document: '12345678',
            email: 'email@example.com',
            ticketId: '#8926',
            researcherReasonFull: 'Tesis'
        },
        {
            id: '1231231212',
            date: 'Tesis',
            researcherName: 'Mendoza Romero, Javier Antonio',
            reason: 'Tesis',
            status: 'Pendiente',
            document: '12345678',
            email: 'email@example.com',
            ticketId: '#8927',
            researcherReasonFull: 'Tesis'
        },
        {
            id: '1231231212',
            date: 'Tesis',
            researcherName: 'Rojas Salazar, Camila Estefania',
            reason: 'Tesis',
            status: 'Pendiente',
            document: '12345678',
            email: 'email@example.com',
            ticketId: '#8928',
            researcherReasonFull: 'Tesis'
        }
    ];

    constructor(private elementRef: ElementRef) { }

    toggleTab(tab: string) {
        this.activeTab = tab;
    }

    toggleMenu(researcher: Researcher, index: number, event: Event) {
        event.stopPropagation();
        const uniqueId = researcher.id + '-' + index;
        if (this.activeMenuId === uniqueId) {
            this.activeMenuId = null;
        } else {
            this.activeMenuId = uniqueId;
        }
    }

    openAccessModal(researcher: Researcher) {
        this.selectedResearcher = researcher;
        this.activeMenuId = null; // Close menu

        // Mock data population
        this.accessForm = {
            username: researcher.id, // Using ID as username for demo
            email: 'student@university.edu.pe', // Mock email
            fullName: researcher.name,
            forceChange: false,
            active: researcher.status !== 'Inactivo' // Mock logic
        };

        this.showAccessModal = true;
    }

    openEditModal(researcher: Researcher) {
        this.selectedResearcher = researcher;
        this.activeMenuId = null; // Close menu

        // Mock data population
        this.editForm = {
            fullName: researcher.name,
            email: 'researcher@institution.gob.pe',
            birthDate: '1980-05-15',
            gender: researcher.gender
        };

        this.showEditModal = true;
    }

    openReviewModal(request: DerecognitionRequest) {
        this.selectedRequest = request;
        this.reviewForm = {
            adminObservation: ''
        };
        this.showReviewModal = true;
    }

    saveAccess() {
        console.log('Saving Access:', this.accessForm);
        this.showAccessModal = false;
    }

    saveEdit() {
        console.log('Saving Edit:', this.editForm);
        this.showEditModal = false;
    }

    approveDerecognition() {
        console.log('Approving Derecognition:', this.reviewForm);
        this.showReviewModal = false;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.activeMenuId = null;
        }
    }
}
