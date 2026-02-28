import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { AlertService } from '../../../../core/services/alert.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Institution {
    id: string; // RUC
    name: string; // Razon Social
    url: string;
    checked: boolean;
}

@Component({
    selector: 'app-institution-management',
    standalone: true,
    imports: [CommonModule, FormsModule, IntroCardComponent, FormModalComponent],
    templateUrl: './institution-management.component.html',
    styleUrls: ['./institution-management.component.scss']
})
export class InstitutionManagementComponent {
    searchTerm: string = '';
    appliedSearchTerm: string = '';
    pageSize: number = 10;
    currentPage: number = 1;
    showLinkModal: boolean = false;

    // Sorting
    sortField: string = 'name';
    sortOrder: 'asc' | 'desc' = 'asc';

    linkForm = {
        ruc: '',
        socialReason: '',
        accessUrl: ''
    };

    institutions: Institution[] = [
        { id: '20123456789', name: 'A Universidad', url: 'https://dina.concytec.gob.pe/universidad-nacional-de-ingenie...', checked: true },
        { id: '20234567890', name: 'B Universitaria', url: 'https://dina.concytec.gob.pe/universidad-nacional-agraria-la-molina', checked: true },
        { id: '20345678901', name: 'C Centro Académico', url: 'https://dina.concytec.gob.pe/universidad-de-san-marcos', checked: true },
        { id: '20456789012', name: 'D Instituto de Estudios', url: 'https://dina.concytec.gob.pe/universidad-nacional-de-san-antonio-abad...', checked: true },
        { id: '20567890123', name: 'E Facultad de Ciencias', url: 'https://dina.concytec.gob.pe/universidad-nacional-de-trujillo', checked: true },
        { id: '20678901234', name: 'F Escuela Técnica', url: 'https://dina.concytec.gob.pe/universidad-catolica-de-santa-maria', checked: true },
        { id: '20789012345', name: 'G Universidad Politécnica', url: 'https://dina.concytec.gob.pe/universidad-de-piura', checked: true },
        { id: '20890123456', name: 'H Academia Superior', url: 'https://dina.concytec.gob.pe/universidad-nacional-de-cajamarca', checked: true },
    ];

    constructor(private alertService: AlertService) { }

    get filteredInstitutions(): Institution[] {
        let result = this.institutions;

        if (this.appliedSearchTerm) {
            const term = this.appliedSearchTerm.toLowerCase();
            result = result.filter(i =>
                i.id.toLowerCase().includes(term) ||
                i.name.toLowerCase().includes(term) ||
                i.url.toLowerCase().includes(term)
            );
        }

        if (this.sortField) {
            result = [...result].sort((a: any, b: any) => {
                const valA = a[this.sortField]?.toString().toLowerCase() || '';
                const valB = b[this.sortField]?.toString().toLowerCase() || '';

                if (valA < valB) return this.sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }

    get paginatedInstitutions(): Institution[] {
        const filtered = this.filteredInstitutions;
        const start = (this.currentPage - 1) * this.pageSize;
        return filtered.slice(start, start + this.pageSize);
    }

    get totalPages() {
        return Math.ceil(this.filteredInstitutions.length / this.pageSize) || 1;
    }

    get pagesArray() {
        const total = this.totalPages;
        const pages = [];
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
        return pages;
    }

    setPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    toggleSort(field: string) {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortOrder = 'asc';
        }
    }

    openLinkModal() {
        this.linkForm = {
            ruc: '',
            socialReason: '(Se llena automáticamente)',
            accessUrl: '(Generación automática)'
        };
        this.showLinkModal = true;
    }

    deleteInstitution(id: string) {
        if (confirm('¿Estás seguro de eliminar esta institución?')) {
            this.institutions = this.institutions.filter(i => i.id !== id);
        }
    }

    search() {
        this.appliedSearchTerm = this.searchTerm;
        this.currentPage = 1;
    }

    private getSelectedData() {
        const selected = this.filteredInstitutions.filter(i => i.checked);
        const dataToExport = selected.length > 0 ? selected : this.filteredInstitutions;

        return dataToExport.map(i => ({
            'RUC': i.id,
            'Razón Social': i.name,
            'URL': i.url
        }));
    }

    copyToClipboard() {
        const data = this.getSelectedData();
        if (data.length === 0) return;

        const headers = Object.keys(data[0]).join('\t');
        const rows = data.map(obj => Object.values(obj).join('\t')).join('\n');
        const text = `${headers}\n${rows}`;

        navigator.clipboard.writeText(text).then(() => {
            this.alertService.success('Copiado', 'Datos copiados al portapapeles');
        });
    }

    downloadExcel() {
        const data = this.getSelectedData();
        if (data.length === 0) return;

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Instituciones');
        XLSX.writeFile(wb, `Instituciones_${new Date().getTime()}.xlsx`);
    }

    downloadCSV() {
        const data = this.getSelectedData();
        if (data.length === 0) return;

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Instituciones_${new Date().getTime()}.csv`;
        link.click();
    }

    printPDF() {
        const data = this.getSelectedData();
        if (data.length === 0) return;

        const doc = new jsPDF();
        const headers = [Object.keys(data[0])];
        const rows = data.map(obj => Object.values(obj).map(String));

        autoTable(doc, {
            head: headers,
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [0, 84, 112] }
        });

        doc.save(`Instituciones_${new Date().getTime()}.pdf`);
    }

    confirmLink() {
        if (this.linkForm.ruc) {
            this.institutions.push({
                id: this.linkForm.ruc,
                name: this.linkForm.socialReason || 'Nueva Institución',
                url: 'https://dina.concytec.gob.pe/...',
                checked: true
            });
        }
        this.showLinkModal = false;
    }
}
