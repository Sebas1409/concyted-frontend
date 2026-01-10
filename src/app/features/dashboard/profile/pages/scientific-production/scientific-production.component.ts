import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';

@Component({
    selector: 'app-scientific-production',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ActionButtonsComponent, IntroCardComponent],
    templateUrl: './scientific-production.component.html',
    styleUrls: ['./scientific-production.component.scss']
})
export class ScientificProductionComponent {
    activeTab: 'all' | 'imported' | 'manual' = 'all';

    // Import Modal State
    showImportModal = false;
    activeImportTab: 'international' | 'alicia' = 'international';

    // Sync Status
    syncStatus = {
        orcid: false,
        scopus: false,
        profile: false
    };

    // Search & Results
    searchQuery = '';
    searchResults: any[] = [];
    selectedItems: Set<number> = new Set();

    // Pagination Mock
    currentPage = 1;
    totalPages = 5;

    // Mock data for Imported Productions
    importedProductions = [
        {
            id: 1,
            type: 'Universidad César Vallejo S.A.C.', // Mapping from image: "Tipo Producción" column seems to have entity name in example? Or maybe just bad mock data in image. I'll follow image text.
            title: 'INGENIERO DE SISTEMAS',
            author: 'LICENCIADO / TÍTULO',
            year: '2024',
            doi: '1232',
            journal: 'Diciembre 2024',
            source: 'SUNEDU', // Image has an icon, assuming source name for now
            quartile: 'Diciembre 2024'
        }
    ];

    // Mock data for Manual Productions
    manualProductions = [
        {
            id: 1,
            code: '001',
            type: 'Universidad César Vallejo S.A.C.',
            title: 'INGENIERO DE SISTEMAS',
            date: '2024',
            attachments: 'Ver archivos'
        }
    ];

    // Add Publication Modal State
    showAddModal = false;
    publicationForm: FormGroup;

    // Dropdown Options (Mock)
    indexedInOptions = ['Scopus', 'WOS', 'Scielo'];
    workCategoryOptions = ['Articulo Original', 'Review', 'Letter'];
    workTypeOptions = ['Paper', 'Book Chapter'];
    journalOptions = ['Revista Cielo', 'Revista IEEE'];
    countryOptions = ['Peru', 'USA', 'Brazil'];
    roleOptions = ['Autor Principal', 'Co-Autor'];
    authorshipOrderOptions = ['Primer Autor', 'Segundo Autor'];

    // Add Other Production Modal State
    showAddOtherModal = false;
    otherProductionForm: FormGroup;

    // Add Congress Modal State
    showAddCongressModal = false;
    congressForm: FormGroup;

    constructor(private fb: FormBuilder) {
        this.publicationForm = this.fb.group({
            indexedIn: [''],
            doi: [''],
            category: ['', Validators.required],
            workType: ['', Validators.required],
            title: [''],
            url: [''],
            journal: [''],
            country: [''],
            date: [''],
            volume: [''],
            issue: [''],
            pageRange: [''],
            role: [''],
            authorshipOrder: ['', Validators.required]
        });

        this.otherProductionForm = this.fb.group({
            workType: ['', Validators.required],
            country: [''],
            title: ['', Validators.required],
            subtitle: [''],
            summary: [''],
            date: [''],
            endDate: [''],
            institution: [''],
            doi: [''],
            url: [''],
            role: ['', Validators.required],
            authorshipOrder: ['', Validators.required]
        });

        this.congressForm = this.fb.group({
            congressType: ['Nacional', Validators.required],
            country: ['', Validators.required],
            presentationDate: [''],
            title: ['', Validators.required],
            subtitle: [''],
            summary: [''],
            presentationType: ['', Validators.required],
            doi: [''],
            certificateUrl: [''],
            role: ['', Validators.required],
            authorshipOrder: ['', Validators.required]
        });
    }

    openAddModal() {
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
        this.publicationForm.reset();
    }

    openAddOtherModal() {
        this.showAddOtherModal = true;
    }

    closeAddOtherModal() {
        this.showAddOtherModal = false;
        this.otherProductionForm.reset();
    }

    openAddCongressModal() {
        this.showAddCongressModal = true;
    }

    closeAddCongressModal() {
        this.showAddCongressModal = false;
        this.congressForm.reset({ congressType: 'Nacional' }); // Reset with default
    }

    setActiveTab(tab: 'all' | 'imported' | 'manual') {
        this.activeTab = tab;
    }

    // Import Modal Actions
    openImportModal() {
        this.showImportModal = true;
        this.resetImportState();
    }

    closeImportModal() {
        this.showImportModal = false;
    }

    resetImportState() {
        this.searchQuery = '';
        this.searchResults = [];
        this.selectedItems.clear();
        this.activeImportTab = 'international';
    }

    setImportTab(tab: 'international' | 'alicia') {
        this.activeImportTab = tab;
        this.searchResults = []; // Clear previous results
        this.selectedItems.clear();

        if (tab === 'alicia') {
            this.searchAlicia();
        }
    }

    toggleSync(service: 'orcid' | 'scopus' | 'profile') {
        this.syncStatus[service] = !this.syncStatus[service];
        // In real app, this would trigger OAuth flow
    }

    searchInternational() {
        if (!this.searchQuery.trim()) return;

        // Mock Search Results for International
        this.searchResults = [
            {
                id: 101,
                title: 'Univ. César Vallejo',
                date: '15/05/2021',
                url: '#',
                type: 'Tesis',
                source: 'SUNEDU',
                journal: 'Bachiller en Ingeniería de Sistemas',
                apiSource: 'Scopus',
                alreadyImported: false
            },
            {
                id: 102,
                title: 'Univ. César Vallejo - Research',
                date: '15/05/2021',
                url: '#',
                type: 'Tesis',
                source: 'SUNEDU',
                journal: 'Bachiller en Ingeniería de Sistemas',
                apiSource: 'WOS',
                alreadyImported: true // Mock disabled row
            }
        ];
    }

    searchAlicia() {
        // Mock Automatic Search for Alicia
        this.searchResults = [
            {
                id: 201,
                title: 'Análisis diferenciado de la gestión de incidentes en áreas con tecnologías de la información de la Municipalidad Provincial de Sullana, 2023',
                date: '2023',
                author: 'Macalupu Herrera, Enzo Francisco',
                institution: 'UCV',
                url: '#',
                type: 'bachelorThesis',
                source: 'ALICIA',
                apiSource: 'Tesis',
                alreadyImported: false
            }
        ];
    }

    toggleSelection(item: any) {
        if (item.alreadyImported) return;

        if (this.selectedItems.has(item.id)) {
            this.selectedItems.delete(item.id);
        } else {
            this.selectedItems.add(item.id);
        }
    }

    isSelected(item: any): boolean {
        return this.selectedItems.has(item.id);
    }

    importSelected() {
        console.log('Importing IDs:', Array.from(this.selectedItems));
        // Add logic to save to main list
        this.closeImportModal();
    }

    // Placeholder methods for template bindings
    importPublications() {
        this.openImportModal();
    }

    addPublication() {
        this.openAddModal();
    }

    addCongress() {
        this.openAddCongressModal();
    }

    addOther() {
        this.openAddOtherModal();
    }

    // Actions
    deleteImportedProduction(index: number) {
        if (confirm('¿Estás seguro de eliminar esta producción importada?')) {
            this.importedProductions.splice(index, 1);
        }
    }

    editManualProduction(item: any) {
        // Find which type of modal to open based on item type or just open generic for now
        // For this example, I'll open the main publication modal and patch
        this.openAddModal();
        this.publicationForm.patchValue({
            title: item.title,
            date: item.date,
            // ... map other fields
        });
    }

    deleteManualProduction(item: any) {
        if (confirm('¿Estás seguro de eliminar esta producción manual?')) {
            this.manualProductions = this.manualProductions.filter(p => p.id !== item.id);
        }
    }

    // File Actions
    file: any = { name: 'Diciembre 2024', code: '01' }; // Mock file for display

    removeAttachment(file: any) {
        if (confirm('¿Estás seguro de eliminar este archivo?')) {
            this.file = null;
        }
    }
}
