import { Component, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';
import { AuthService } from '../../../../core/services/auth.service';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

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
    status: 'Pendiente' | 'Anulado' | 'Aprobado' | 'PENDIENTE' | 'ANULADO' | 'APROBADA';
    document: string;
    email: string;
    ticketId: string;
    researcherReasonFull: string;
    originalId: number;
    researcherId: number;
    observacionAdmin?: string; // Added field
    fechaAtencion?: string;    // Added field
}

@Component({
    selector: 'app-researcher-management',
    standalone: true,
    imports: [CommonModule, FormsModule, FormModalComponent, IntroCardComponent, RouterModule, DateFormatPipe],
    providers: [DateFormatPipe],
    templateUrl: './researcher-management.component.html',
    styleUrls: ['./researcher-management.component.scss']
})
export class ResearcherManagementComponent {
    activeTab = 'directory'; // 'directory' | 'requests'
    searchTerm = '';
    appliedSearchTerm = '';

    // Pagination
    currentPage = 1;
    pageSize = 10;

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

    // Requests Data
    requests: DerecognitionRequest[] = [];

    constructor(
        private elementRef: ElementRef,
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
        private dateFormatPipe: DateFormatPipe
    ) { }

    // Computed Properties for View
    get filteredResearchers() {
        return this.researchers.filter(r =>
            this.activeTab === 'directory' &&
            (r.name.toLowerCase().includes(this.appliedSearchTerm.toLowerCase()) ||
                r.id.includes(this.appliedSearchTerm))
        );
    }

    get filteredRequests() {
        return this.requests.filter(r =>
            this.activeTab === 'requests' &&
            (r.researcherName.toLowerCase().includes(this.appliedSearchTerm.toLowerCase()) ||
                r.email.toLowerCase().includes(this.appliedSearchTerm.toLowerCase()) ||
                r.id.toString().includes(this.appliedSearchTerm))
        );
    }

    get paginatedResearchers(): Researcher[] {
        if (this.activeTab !== 'directory') return [];
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredResearchers.slice(start, start + this.pageSize);
    }

    get paginatedRequests(): DerecognitionRequest[] {
        if (this.activeTab !== 'requests') return [];
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredRequests.slice(start, start + this.pageSize);
    }

    get totalPages() {
        const source = this.activeTab === 'directory' ? this.filteredResearchers : this.filteredRequests;
        if (!source) return 1;
        return Math.ceil(source.length / this.pageSize) || 1;
    }

    get totalItemsDisplay() {
        if (this.activeTab === 'directory') return this.filteredResearchers.length;
        if (this.activeTab === 'requests') return this.filteredRequests.length;
        return 0;
    }

    get pagesArray() {
        const total = this.totalPages;
        // Simple range logic for the view
        return Array(total).fill(0).map((x, i) => i + 1);
    }

    // Handlers
    search() {
        this.appliedSearchTerm = this.searchTerm;
        this.currentPage = 1;
    }

    onSearchChange() {
        // user requested manual search trigger
    }

    setPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    toggleTab(tab: string) {
        this.activeTab = tab;
        this.currentPage = 1;
        this.searchTerm = '';
        this.appliedSearchTerm = '';
        if (tab === 'requests') {
            this.loadRequests();
        }
    }

    loadRequests() {
        this.authService.getDerecognitionRequests().subscribe({
            next: (data) => {
                this.requests = data.map(item => ({
                    id: item.id.toString(),
                    originalId: item.id,
                    date: item.fechaRegistro || '',
                    researcherName: item.nombreCompleto,
                    reason: item.motivoInvestigador,
                    status: item.estado,
                    document: item.documento,
                    email: item.correo,
                    ticketId: '#' + item.id,
                    researcherReasonFull: item.motivoInvestigador,
                    researcherId: item.investigadorId, // Capture the ID
                    observacionAdmin: item.observacionAdmin,
                    fechaAtencion: item.fechaAtencion
                }));
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading requests', err)
        });
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
        this.activeMenuId = null;

        this.accessForm = {
            username: researcher.id,
            email: 'student@university.edu.pe',
            fullName: researcher.name,
            forceChange: false,
            active: researcher.status !== 'Inactivo'
        };

        this.showAccessModal = true;
    }

    openEditModal(researcher: Researcher) {
        this.selectedResearcher = researcher;
        this.activeMenuId = null;

        this.editForm = {
            fullName: researcher.name,
            email: 'researcher@institution.gob.pe',
            birthDate: '1980-05-15',
            gender: researcher.gender as 'M' | 'F'
        };

        this.showEditModal = true;
    }

    openReviewModal(request: DerecognitionRequest) {
        this.selectedRequest = request;
        this.reviewForm = {
            adminObservation: request.observacionAdmin || ''
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

    approveDerecognition(isValid: boolean = true) {
        if (!isValid) return;
        if (!this.selectedRequest) return;
        if (!this.reviewForm.adminObservation) return;

        const payload = {
            id: this.selectedRequest.originalId,
            estado: 'APROBADA',
            observacionAdmin: this.reviewForm.adminObservation,
            // Pass researcherId as adminId per user requirement
            adminId: this.selectedRequest.researcherId
        };

        console.log('Processing Derecognition:', payload);

        this.authService.processAccountDeletion(payload).subscribe({
            next: () => {
                this.showReviewModal = false;
                this.loadRequests(); // Reload list
            },
            error: (err) => console.error('Error processing request', err)
        });
    }

    // Export Logic
    copyToClipboard() {
        const data = this.activeTab === 'directory' ? this.filteredResearchers : this.filteredRequests;
        if (data.length === 0) return;

        const headers = Object.keys(data[0]).join('\t');
        const rows = data.map(obj => Object.values(obj).join('\t')).join('\n');
        const text = `${headers}\n${rows}`;

        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard');
        });
    }

    private getExportData(): any[] {
        if (this.activeTab === 'requests') {
            return this.filteredRequests.map((req, i) => ({
                '#Ticket': i + 1,
                'Fecha': this.dateFormatPipe.transform(req.date),
                'Motivo': req.reason,
                'Investigador': req.researcherName,
                'Documento': req.document,
                'Correo': req.email
            }));
        } else {
            return this.filteredResearchers.map(item => this.mapToSpanish(item));
        }
    }

    private getFileName(): string {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        return `Solicitudes_de_baja_${day}${month}${year}_${hours}${minutes}`;
    }

    downloadExcel() {
        const data = this.getExportData();
        if (data.length === 0) return;

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Datos');
        XLSX.writeFile(wb, this.getFileName() + '.xlsx');
    }

    downloadCSV() {
        const data = this.getExportData();
        if (data.length === 0) return;

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", this.getFileName() + '.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    downloadPDF() {
        const data = this.getExportData();
        if (data.length === 0) return;

        const doc = new jsPDF();
        const headers = [Object.keys(data[0])];
        const rows = data.map(obj => Object.values(obj).map(String));

        autoTable(doc, {
            head: headers,
            body: rows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 84, 112] } // #005470
        });

        doc.save(this.getFileName() + '.pdf');
    }

    printPDF() {
        this.downloadPDF();
    }

    private mapToSpanish(item: any): any {
        const dictionary: { [key: string]: string } = {
            'id': 'ID',
            'gender': 'Género',
            'name': 'Nombre Completo',
            'degree': 'Grado',
            'region': 'Región',
            'institution': 'Institución',
            'regina': 'Regina',
            'status': 'Estado',
            'userId': 'Usuario ID',
            'date': 'Fecha',
            'researcherName': 'Investigador',
            'reason': 'Motivo',
            'document': 'Documento',
            'email': 'Correo',
            'ticketId': 'Ticket',
            'researcherReasonFull': 'Motivo Completo',
            'originalId': 'ID Original'
        };

        const newItem: any = {};
        for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
                const newKey = dictionary[key] || key;
                newItem[newKey] = item[key];
            }
        }
        return newItem;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.activeMenuId = null;
        }
    }
}
