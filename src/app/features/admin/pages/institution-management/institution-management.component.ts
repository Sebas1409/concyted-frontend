import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';

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
    pageSize: number = 10;
    showLinkModal: boolean = false;

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
        console.log('Searching for:', this.searchTerm);
        // Implement filtering logic here
    }

    copyToClipboard() {
        console.log('Copying to clipboard');
    }

    downloadExcel() {
        console.log('Downloading Excel');
    }

    downloadCSV() {
        console.log('Downloading CSV');
    }

    printPDF() {
        console.log('Printing PDF');
    }

    confirmLink() {
        console.log('Linking institution:', this.linkForm);
        this.showLinkModal = false;
    }
}
