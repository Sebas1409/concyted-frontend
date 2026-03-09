import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { CatalogService, CatalogItem } from '../../../../../core/services/catalog.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ScientificProductionService, AliciaRequest } from '../../../../../core/services/scientific-production.service';

@Component({
    selector: 'app-scientific-production',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ActionButtonsComponent, IntroCardComponent, FileUploaderComponent],
    templateUrl: './scientific-production.component.html',
    styleUrls: ['./scientific-production.component.scss']
})
export class ScientificProductionComponent implements OnInit {
    activeTab: 'all' | 'imported' | 'manual' = 'all';

    // File lists
    publicationFiles: any[] = [];
    congressFiles: any[] = [];
    otherFiles: any[] = [];
    hasUploadError = false;
    currentUserDni = '';

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
    rawAliciaResults: any[] = [];
    filteredResults: any[] = [];
    pagedResults: any[] = [];
    selectedItems: Set<any> = new Set();

    // Pagination Alicia
    currentPageAlicia = 1;
    itemsPerPageAlicia = 10;
    isLoadingAlicia = false;

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

    // Dropdown Options
    indexedInOptions: CatalogItem[] = [];
    workCategoryOptions: CatalogItem[] = [];
    workTypeOptions: CatalogItem[] = [];
    journalOptions = ['Revista Cielo', 'Revista IEEE'];
    countryOptions: any[] = [];
    roleOptions = ['Autor Principal', 'Co-Autor'];
    authorshipOrderOptions: CatalogItem[] = [];

    // Add Other Production Modal State
    showAddOtherModal = false;
    otherProductionForm: FormGroup;

    // Add Congress Modal State
    showAddCongressModal = false;
    congressForm: FormGroup;

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private ubigeoService: UbigeoService,
        private authService: AuthService,
        private spService: ScientificProductionService,
        private cdr: ChangeDetectorRef
    ) {
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

    ngOnInit() {
        this.loadCatalogs();
        this.updateUserDni();
    }

    private updateUserDni() {
        const user = this.authService.getCurrentUser();
        if (user) {
            // Try numDoc first, then dni (if it exists on any variant), then username as fallback
            this.currentUserDni = user.numDoc || (user as any).dni || user.username || 'N/A';
        }
    }

    private loadCatalogs() {
        // CATTRA
        this.catalogService.getMasterDetailsByCode('CATTRA').subscribe(data => {
            this.workCategoryOptions = data;
        });

        // TIPOBR
        this.catalogService.getMasterDetailsByCode('TIPOBR').subscribe(data => {
            this.workTypeOptions = data;
        });

        // Countries
        this.ubigeoService.getCountries().subscribe(data => {
            this.countryOptions = data;
        });

        // Indexado en: INDXEN
        this.catalogService.getMasterDetailsByCode('INDXEN').subscribe(data => {
            this.indexedInOptions = data;
        });

        // Orden autoría: ORDAUT
        this.catalogService.getMasterDetailsByCode('ORDAUT').subscribe(data => {
            this.authorshipOrderOptions = data;
        });
    }

    savePublication() {
        if (this.publicationForm.invalid || this.hasUploadError) {
            this.publicationForm.markAllAsTouched();
            return;
        }
        console.log('Guardando Publicación...', this.publicationForm.value);
        console.log('Archivos adjuntos:', this.publicationFiles);
        this.closeAddModal();
    }

    saveOtherProduction() {
        if (this.otherProductionForm.invalid || this.hasUploadError) {
            this.otherProductionForm.markAllAsTouched();
            return;
        }
        console.log('Guardando Otros...', this.otherProductionForm.value);
        console.log('Archivos adjuntos:', this.otherFiles);
        this.closeAddOtherModal();
    }

    saveCongress() {
        if (this.congressForm.invalid || this.hasUploadError) {
            this.congressForm.markAllAsTouched();
            return;
        }
        console.log('Guardando Congreso...', this.congressForm.value);
        console.log('Archivos adjuntos:', this.congressFiles);
        this.closeAddCongressModal();
    }

    openAddModal() {
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
        this.publicationForm.reset();
        this.publicationFiles = [];
    }

    openAddOtherModal() {
        this.showAddOtherModal = true;
    }

    closeAddOtherModal() {
        this.showAddOtherModal = false;
        this.otherProductionForm.reset();
        this.otherFiles = [];
    }

    openAddCongressModal() {
        this.showAddCongressModal = true;
    }

    closeAddCongressModal() {
        this.showAddCongressModal = false;
        this.congressForm.reset({ congressType: 'Nacional' }); // Reset with default
        this.congressFiles = [];
    }

    setActiveTab(tab: 'all' | 'imported' | 'manual') {
        this.activeTab = tab;
    }

    // Import Modal Actions
    openImportModal() {
        this.showImportModal = true;
        this.updateUserDni();
        this.resetImportState();
    }

    closeImportModal() {
        this.showImportModal = false;
    }

    resetImportState() {
        this.searchQuery = '';
        this.rawAliciaResults = [];
        this.selectedItems.clear();
        this.activeImportTab = 'international';
    }

    setImportTab(tab: 'international' | 'alicia') {
        this.activeImportTab = tab;
        this.rawAliciaResults = [];
        this.filteredResults = [];
        this.pagedResults = [];
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
        this.rawAliciaResults = [
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
            }
        ];
        this.applyAliciaFilters();
    }

    searchAlicia() {
        const user = this.authService.getCurrentUser();
        if (!user) {
            console.warn('[Alicia] No user found for search');
            return;
        }

        const nombresArr = (user.nombres || '').trim().split(' ');
        const request: AliciaRequest = {
            primerNombre: nombresArr[0] || '',
            segundoNombre: nombresArr.slice(1).join(' ') || '',
            apellidoPaterno: user.apellidoPaterno || '',
            apellidoMaterno: user.apellidoMaterno || ''
        };

        console.log('[Alicia] Submitting request:', request);
        this.isLoadingAlicia = true;
        this.rawAliciaResults = [];
        this.filteredResults = [];
        this.pagedResults = [];

        this.spService.searchAlicia(request).pipe(
            finalize(() => {
                this.isLoadingAlicia = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (data) => {
                console.log('[Alicia] Received data:', data);
                try {
                    if (data && Array.isArray(data)) {
                        this.rawAliciaResults = data.map(item => ({
                            id: item.id || Math.random().toString(36).substr(2, 9),
                            title: item.titulo || 'Sin título',
                            date: this.formatAliciaDate(item.fechaPublicacion),
                            author: item.autor || 'N/A',
                            institution: item.institucion || 'N/A',
                            url: item.url || '#',
                            type: item.tipo || 'N/A',
                            coauthor: item.coautor || '',
                            source: 'ALICIA',
                            apiSource: 'Alicia',
                            alreadyImported: this.importedProductions.some(p => {
                                const pTitle = (p.title || '').toString().toLowerCase().trim();
                                const itemTitle = (item.titulo || '').toString().toLowerCase().trim();
                                return pTitle !== '' && pTitle === itemTitle;
                            })
                        }));
                        this.applyAliciaFilters();
                    }
                } catch (e) {
                    console.error('[Alicia] Error processing results:', e);
                }
            },
            error: (err) => {
                console.error('[Alicia] Error searching in Alicia:', err);
                this.rawAliciaResults = [];
                this.applyAliciaFilters();
            }
        });
    }

    private formatAliciaDate(dateStr: string): string {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        // Alicia returns YYYY-MM-DD
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    }

    applyAliciaFilters() {
        const query = (this.searchQuery || '').toLowerCase().trim();
        this.filteredResults = this.rawAliciaResults.filter(item =>
            !query ||
            item.title?.toLowerCase().includes(query) ||
            item.author?.toLowerCase().includes(query) ||
            item.id?.toString().toLowerCase().includes(query) ||
            item.institution?.toLowerCase().includes(query) ||
            item.date?.toLowerCase().includes(query)
        );
        this.currentPageAlicia = 1;
        this.updatePagedResults();
    }

    updatePagedResults() {
        const start = (this.currentPageAlicia - 1) * this.itemsPerPageAlicia;
        const end = start + this.itemsPerPageAlicia;
        this.pagedResults = this.filteredResults.slice(start, end);
        this.cdr.detectChanges();
    }

    setPageAlicia(page: number) {
        this.currentPageAlicia = page;
        this.updatePagedResults();
    }

    nextPageAlicia() {
        if (this.currentPageAlicia < this.totalAliciaPages) {
            this.currentPageAlicia++;
            this.updatePagedResults();
        }
    }

    prevPageAlicia() {
        if (this.currentPageAlicia > 1) {
            this.currentPageAlicia--;
            this.updatePagedResults();
        }
    }

    get totalAliciaPages(): number {
        return Math.ceil(this.filteredResults.length / this.itemsPerPageAlicia);
    }

    getAliciaPagesArray(): number[] {
        const total = this.totalAliciaPages;
        if (total <= 5) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }
        // Basic pagination logic if more than 5 pages
        if (this.currentPageAlicia <= 3) return [1, 2, 3, 4, 5];
        if (this.currentPageAlicia >= total - 2) return [total - 4, total - 3, total - 2, total - 1, total];
        return [this.currentPageAlicia - 2, this.currentPageAlicia - 1, this.currentPageAlicia, this.currentPageAlicia + 1, this.currentPageAlicia + 2];
    }

    toggleSelection(item: any) {
        if (item.alreadyImported) return;

        if (this.selectedItems.has(item.id)) {
            this.selectedItems.delete(item.id);
        } else {
            this.selectedItems.add(item.id);
        }
    }

    toggleAllAlicia() {
        const selectables = this.filteredResults.filter(item => !item.alreadyImported);
        if (this.isAllAliciaSelected()) {
            selectables.forEach(item => this.selectedItems.delete(item.id));
        } else {
            selectables.forEach(item => this.selectedItems.add(item.id));
        }
    }

    isAllAliciaSelected(): boolean {
        const selectables = this.filteredResults.filter(item => !item.alreadyImported);
        if (selectables.length === 0) return false;
        return selectables.every(item => this.selectedItems.has(item.id));
    }

    isSelected(item: any): boolean {
        return this.selectedItems.has(item.id);
    }

    importSelected() {
        const selectedResults = this.rawAliciaResults.filter(item => this.selectedItems.has(item.id));

        selectedResults.forEach(item => {
            if (!this.importedProductions.some(p => p.title === item.title)) {
                this.importedProductions.push({
                    id: this.importedProductions.length + 1,
                    type: item.type,
                    title: item.title,
                    author: item.author || item.coauthor,
                    year: item.date,
                    doi: '', // Alicia doesn't always provide DOI in this format
                    journal: item.institution,
                    source: item.source,
                    quartile: 'N/A'
                });
            }
        });

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

    onUploadError(error: boolean) {
        this.hasUploadError = error;
    }
}
