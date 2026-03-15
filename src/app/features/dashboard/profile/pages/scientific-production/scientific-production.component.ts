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
import { AlertService } from '../../../../../core/services/alert.service';
import { FileService } from '../../../../../core/services/file.service';
import { FileModule, FileCategory, FileSection } from '../../../../../core/constants/file-upload.constants';
import { forkJoin, of, Observable } from 'rxjs';

interface Author {
    id: number;
    paternalSurname: string;
    maternalSurname: string;
    names: string;
    email: string;
}

@Component({
    selector: 'app-scientific-production',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ActionButtonsComponent, IntroCardComponent, FileUploaderComponent],
    templateUrl: './scientific-production.component.html',
    styleUrls: ['./scientific-production.component.scss']
})
export class ScientificProductionComponent implements OnInit {
    activeTab: 'all' | 'imported' | 'manual' = 'all';
    currentProductionId: number | null = null;

    // File lists
    publicationFiles: any[] = [];
    publicationSustentoFiles: any[] = [];
    congressFiles: any[] = [];
    congressSustentoFiles: any[] = [];
    otherFiles: any[] = [];
    otherSustentoFiles: any[] = [];
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

    // Data for Tables
    importedList: any[] = [];
    manualList: any[] = [];

    // Add Publication Modal State
    showAddModal = false;
    publicationForm: FormGroup;

    // Dropdown Options
    indexedInOptions: CatalogItem[] = [];
    indexedInOtherOptions: CatalogItem[] = [];
    workCategoryOptions: CatalogItem[] = [];
    workTypeOptions: CatalogItem[] = [];
    journalOptions = ['Revista Cielo', 'Revista IEEE'];
    countryOptions: any[] = [];
    roleOptions = ['Autor Principal', 'Co-Autor'];
    authorshipOrderOptions: CatalogItem[] = [];
    functionOptions: CatalogItem[] = [];
    identificationTypeOptions: CatalogItem[] = [];

    // Add Other Production Modal State
    showAddOtherModal = false;
    otherProductionForm: FormGroup;

    // Add Congress Modal State
    showAddCongressModal = false;
    congressForm: FormGroup;

    // Authors Team Modal
    showAuthorsModal = false;
    authorsForm: FormGroup;
    authorsList: Author[] = [];
    currentUserFullName = '';

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private ubigeoService: UbigeoService,
        private authService: AuthService,
        private spService: ScientificProductionService,
        private alertService: AlertService,
        private fileService: FileService,
        private cdr: ChangeDetectorRef
    ) {
        this.publicationForm = this.fb.group({
            indexedIn: [''],
            doi: [''],
            category: ['', Validators.required],
            workType: ['', Validators.required],
            title: ['', Validators.required],
            url: [''],
            journal: [''],
            country: [''],
            date: ['', Validators.required],
            volume: [''],
            issue: [''],
            pageRange: [''],
            authorshipOrder: [''],
            function: [''],
            subtitle: [''],
            identificationType: [''],
            publisher: [''],
            description: [''],
            mainAuthor: ['']
        });

        // Auto-populate Main Author for Scientific Publication
        this.publicationForm.get('authorshipOrder')?.valueChanges.subscribe(value => {
            this.handleAuthorshipChange(value, this.publicationForm);
        });

        this.otherProductionForm = this.fb.group({
            indexedIn: [''],
            category: ['', Validators.required],
            workType: ['', Validators.required],
            country: [''],
            title: ['', Validators.required],
            subtitle: [''],
            summary: [''],
            date: ['', Validators.required],
            endDate: [''],
            institution: [''],
            journal: [''],
            doi: [''],
            volume: [''],
            issue: [''],
            pageRange: [''],
            url: [''],
            editorial: [''],
            mainAuthor: [''],
            authorshipOrder: ['']
        });

        // Auto-populate Main Author for Other Production
        this.otherProductionForm.get('authorshipOrder')?.valueChanges.subscribe(value => {
            this.handleAuthorshipChange(value, this.otherProductionForm);
        });

        this.congressForm = this.fb.group({
            congressType: ['Nacional', Validators.required],
            country: ['', Validators.required],
            presentationDate: ['', Validators.required],
            title: ['', Validators.required],
            subtitle: [''],
            summary: [''],
            presentationType: ['', Validators.required],
            doi: [''],
            url: [''],
            mainAuthor: [''],
            authorshipOrder: ['']
        });

        // Auto-populate Main Author for Congress
        this.congressForm.get('authorshipOrder')?.valueChanges.subscribe(value => {
            this.handleAuthorshipChange(value, this.congressForm);
        });

        this.authorsForm = this.fb.group({
            paternalSurname: ['', Validators.required],
            maternalSurname: ['', Validators.required],
            names: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]]
        });
    }

    ngOnInit() {
        this.loadCatalogs();
        this.updateUserDni();
        this.setCurrentUserFullName();
        this.loadProductions();
    }

    setCurrentUserFullName() {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.currentUserFullName = `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
        }
    }

    private updateUserDni() {
        const user = this.authService.getCurrentUser();
        if (user) {
            this.currentUserDni = user.numDoc || (user as any).dni || user.username || 'N/A';
        }
    }

    loadProductions() {
        const user = this.authService.getCurrentUser();
        if (!user || !user.id) return;

        this.spService.getProductionsByInvestigador(user.id).subscribe({
            next: (data) => {
                console.log('Producciones recibidas del API:', data);
                if (data && Array.isArray(data)) {
                    // Normalize and categorize
                    this.manualList = data.filter(p => {
                        const fuente = (p.fuente || '').toUpperCase().trim();
                        return fuente === 'MANUAL';
                    });
                    
                    this.importedList = data.filter(p => {
                        const fuente = (p.fuente || '').toUpperCase().trim();
                        return fuente !== 'MANUAL' && fuente !== '';
                    });
                } else {
                    this.manualList = [];
                    this.importedList = [];
                }
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error al cargar producciones:', err);
            }
        });
    }

    private handleAuthorshipChange(value: string, form: FormGroup) {
        const selectedOpt = this.authorshipOrderOptions.find(opt => opt.codigo === value);
        const mainAuthorCtrl = form.get('mainAuthor');

        if (!mainAuthorCtrl) return;

        // If "Autor" is selected, auto-populate with investigator's name and DISABLE
        if (selectedOpt && selectedOpt.nombre.toLowerCase().trim() === 'autor') {
            const user = this.authService.getCurrentUser();
            if (user) {
                const fullName = `${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''}, ${user.nombres || ''}`.trim().replace(/\s+/g, ' ');
                mainAuthorCtrl.setValue(fullName);
                mainAuthorCtrl.disable();
            }
        } else {
            // For other roles, let them type manually and ENABLE
            mainAuthorCtrl.setValue('');
            mainAuthorCtrl.enable();
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

        // Indexado en (Publicación Científica): INDX01
        this.catalogService.getMasterDetailsByCode('INDX01').subscribe(data => {
            this.indexedInOptions = data;
        });

        // Indexado en (Otros): INDX02
        this.catalogService.getMasterDetailsByCode('INDX02').subscribe(data => {
            this.indexedInOtherOptions = data;
        });

        // Orden autoría: ORDAUT
        this.catalogService.getMasterDetailsByCode('ORDAUT').subscribe(data => {
            this.authorshipOrderOptions = data;
        });

        // Función: FUNCIO
        this.catalogService.getMasterDetailsByCode('FUNCIO').subscribe(data => {
            this.functionOptions = data;
        });

        // Tipo Identificación: TIPIDE (Probable)
        this.catalogService.getMasterDetailsByCode('TIPIDE').subscribe(data => {
            this.identificationTypeOptions = data;
        });
    }

    savePublication() {
        if (this.publicationForm.invalid || this.hasUploadError) {
            this.publicationForm.markAllAsTouched();
            return;
        }

        const user = this.authService.getCurrentUser();
        const formValues = this.publicationForm.getRawValue();

        const payload = {
            investigadorId: user?.id || 0,
            fuente: 'MANUAL',
            externalId: `MANUAL-${Date.now()}`,
            fechaImportacion: new Date().toISOString(),
            metadataImportacion: JSON.stringify({ origen: 'MANUAL', version: '1.0' }),
            categoriaTrabajo: formValues.category,
            tipoObra: formValues.workType,
            funcion: formValues.function,
            ordenAutoriaCodigo: formValues.authorshipOrder,
            indexadoEn: formValues.indexedIn,
            tipoIdentificacion: formValues.identificationType,
            paisId: parseInt(formValues.country) || 0,
            descripcion: formValues.description,
            autorPrincipal: formValues.mainAuthor,
            titulo: formValues.title,
            subTitulo: formValues.subtitle,
            revista: formValues.journal,
            identificacion: formValues.doi,
            volumen: formValues.volume,
            fasciculo: formValues.issue,
            rangoPaginas: formValues.pageRange,
            editorial: formValues.publisher,
            doi: formValues.doi,
            url: formValues.url,
            fechaPublicacion: formValues.date,
            active: true,
            autores: this.authorsList.map(a => ({
                id: 0,
                nombres: a.names,
                apellidoPaterno: a.paternalSurname,
                apellidoMaterno: a.maternalSurname,
                correoContacto: a.email,
                active: true,
                tipoRegistro: 'MANUAL'
            }))
        };

        this.alertService.loading('Guardando', 'Procesando archivos y registro...');

        forkJoin({
            archivos: this.uploadFilesCombined(this.publicationFiles, FileSection.PROC01),
            sustento: this.uploadFilesCombined(this.publicationSustentoFiles, FileSection.PROC02)
        }).subscribe({
            next: (tokens) => {
                const payloadWithFiles = {
                    ...payload,
                    archivoTokens: tokens.archivos,
                    sustentoTokens: tokens.sustento
                };

                const saveObservable = this.currentProductionId
                    ? this.spService.updatePublication(this.currentProductionId, payloadWithFiles)
                    : this.spService.createPublication(payloadWithFiles);

                saveObservable.subscribe({
                    next: (res) => {
                        this.alertService.success('Éxito', this.currentProductionId ? 'La publicación ha sido actualizada.' : 'La publicación ha sido registrada correctamente.');
                        this.closeAddModal();
                        this.loadProductions();
                    },
                    error: (err) => {
                        console.error('Error saving publication:', err);
                        this.alertService.error('Error', 'No se pudo guardar la publicación.');
                    }
                });
            },
            error: (err) => {
                console.error('Error uploading publication files:', err);
                this.alertService.error('Error', 'No se pudieron subir los archivos.');
            }
        });
    }

    saveOtherProduction() {
        if (this.otherProductionForm.invalid || this.hasUploadError) {
            this.otherProductionForm.markAllAsTouched();
            return;
        }

        const user = this.authService.getCurrentUser();
        const formValues = this.otherProductionForm.getRawValue();

        const payload = {
            investigadorId: user?.id || 0,
            fuente: 'MANUAL',
            externalId: `MANUAL-OTHER-${Date.now()}`,
            fechaImportacion: new Date().toISOString(),
            metadataImportacion: JSON.stringify({ origen: 'MANUAL', version: '1.0' }),
            categoriaTrabajo: formValues.category,
            tipoObra: formValues.workType,
            ordenAutoriaCodigo: formValues.authorshipOrder,
            indexadoEn: formValues.indexedIn,
            paisId: parseInt(formValues.country) || 0,
            autorPrincipal: formValues.mainAuthor,
            descripcion: formValues.summary,
            titulo: formValues.title,
            subTitulo: formValues.subtitle,
            revista: formValues.journal,
            identificacion: formValues.doi,
            volumen: formValues.volume,
            fasciculo: formValues.issue,
            rangoPaginas: formValues.pageRange,
            editorial: formValues.editorial,
            doi: formValues.doi,
            url: formValues.url,
            fechaPublicacion: formValues.date,
            active: true,
            autores: this.authorsList.map(a => ({
                id: 0,
                nombres: a.names,
                apellidoPaterno: a.paternalSurname,
                apellidoMaterno: a.maternalSurname,
                correoContacto: a.email,
                active: true,
                tipoRegistro: 'MANUAL'
            }))
        };

        this.alertService.loading('Guardando', 'Procesando archivos y registro...');

        forkJoin({
            archivos: this.uploadFilesCombined(this.otherFiles, FileSection.PROC01),
            sustento: this.uploadFilesCombined(this.otherSustentoFiles, FileSection.PROC02)
        }).subscribe({
            next: (tokens) => {
                const payloadWithFiles = {
                    ...payload,
                    archivoTokens: tokens.archivos,
                    sustentoTokens: tokens.sustento
                };

                const saveObservable = this.currentProductionId
                    ? this.spService.updatePublication(this.currentProductionId, payloadWithFiles)
                    : this.spService.createPublication(payloadWithFiles);

                saveObservable.subscribe({
                    next: (res) => {
                        this.alertService.success('Éxito', this.currentProductionId ? 'El registro ha sido actualizado.' : 'El registro ha sido guardado correctamente.');
                        this.closeAddOtherModal();
                        this.loadProductions();
                    },
                    error: (err) => {
                        console.error('Error saving other production:', err);
                        this.alertService.error('Error', 'No se pudo guardar el registro.');
                    }
                });
            },
            error: (err) => {
                console.error('Error uploading other files:', err);
                this.alertService.error('Error', 'No se pudieron subir los archivos.');
            }
        });
    }

    saveCongress() {
        if (this.congressForm.invalid || this.hasUploadError) {
            this.congressForm.markAllAsTouched();
            return;
        }

        const user = this.authService.getCurrentUser();
        const formValues = this.congressForm.getRawValue();

        const payload = {
            investigadorId: user?.id || 0,
            fuente: 'MANUAL',
            externalId: `MANUAL-CONGRESS-${Date.now()}`,
            fechaImportacion: new Date().toISOString(),
            metadataImportacion: JSON.stringify({ origen: 'MANUAL', version: '1.0' }),
            tipoCongreso: formValues.congressType,
            paisId: parseInt(formValues.country) || 0,
            fechaPublicacion: formValues.presentationDate,
            autorPrincipal: formValues.mainAuthor,
            titulo: formValues.title,
            subTitulo: formValues.subtitle,
            descripcion: formValues.summary,
            tipoObra: formValues.presentationType,
            doi: formValues.doi,
            url: formValues.url,
            ordenAutoriaCodigo: formValues.authorshipOrder,
            active: true,
            autores: []
        };

        this.alertService.loading('Guardando', 'Procesando archivos y registro...');

        forkJoin({
            archivos: this.uploadFilesCombined(this.congressFiles, FileSection.PROC01),
            sustento: this.uploadFilesCombined(this.congressSustentoFiles, FileSection.PROC02)
        }).subscribe({
            next: (tokens) => {
                const payloadWithFiles = {
                    ...payload as any,
                    archivoTokens: tokens.archivos,
                    sustentoTokens: tokens.sustento
                };

                const saveObservable = this.currentProductionId
                    ? this.spService.updatePublication(this.currentProductionId, payloadWithFiles)
                    : this.spService.createPublication(payloadWithFiles);

                saveObservable.subscribe({
                    next: (res) => {
                        this.alertService.success('Éxito', this.currentProductionId ? 'La participación ha sido actualizada.' : 'La participación en congreso ha sido registrada.');
                        this.closeAddCongressModal();
                        this.loadProductions();
                    },
                    error: (err) => {
                        console.error('Error saving congress production:', err);
                        this.alertService.error('Error', 'No se pudo guardar el registro.');
                    }
                });
            },
            error: (err) => {
                console.error('Error uploading congress files:', err);
                this.alertService.error('Error', 'No se pudieron subir los archivos.');
            }
        });
    }

    openAuthorsModal() {
        this.showAuthorsModal = true;
    }

    closeAuthorsModal() {
        this.showAuthorsModal = false;
        this.authorsForm.reset();
    }

    addAuthorToList() {
        if (this.authorsForm.valid) {
            const author: Author = {
                id: Date.now(), // Temp ID
                ...this.authorsForm.value
            };
            this.authorsList.push(author);
            this.authorsForm.reset();
        }
    }

    removeAuthor(id: number) {
        this.authorsList = this.authorsList.filter(a => a.id !== id);
    }

    confirmAuthors() {
        this.closeAuthorsModal();
    }

    openAddModal() {
        this.currentProductionId = null;
        this.showAddModal = true;
        this.authorsList = []; // Reset authors for new entry
        this.publicationForm.enable(); // Ensure enabled for new
    }

    closeAddModal() {
        this.showAddModal = false;
        this.publicationForm.reset();
        this.publicationFiles = [];
        this.publicationSustentoFiles = [];
    }

    openAddOtherModal() {
        this.currentProductionId = null;
        this.showAddOtherModal = true;
        this.authorsList = []; // Reset
        this.otherProductionForm.enable();
    }

    closeAddOtherModal() {
        this.showAddOtherModal = false;
        this.otherProductionForm.reset();
        this.otherFiles = [];
        this.otherSustentoFiles = [];
    }

    openAddCongressModal() {
        this.currentProductionId = null;
        this.showAddCongressModal = true;
        this.authorsList = []; // Reset
        this.congressForm.enable();
    }

    closeAddCongressModal() {
        this.showAddCongressModal = false;
        this.congressForm.reset({ congressType: 'Nacional' }); // Reset with default
        this.congressFiles = [];
        this.congressSustentoFiles = [];
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
                            alreadyImported: this.importedList.some((p: any) => {
                                const pTitle = (p.title || p.titulo || '').toString().toLowerCase().trim();
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
            if (!this.importedList.some((p: any) => p.titulo === item.titulo || p.title === item.titulo)) {
                this.importedList.push({
                    id: this.importedList.length + 1,
                    tipoObra: item.type,
                    titulo: item.title,
                    autorPrincipal: item.author || item.coauthor,
                    fechaPublicacion: item.date,
                    doi: '', 
                    revista: item.institution,
                    fuente: item.source,
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

    openMoreOtherActions() {
        this.openAddOtherModal();
    }

    // Actions
    deleteImportedProduction(index: number) {
        if (confirm('¿Estás seguro de eliminar esta producción importada?')) {
            this.importedList.splice(index, 1);
        }
    }

    editManualProduction(item: any) {
        this.currentProductionId = item.id;
        this.authorsList = item.autores ? item.autores.map((a: any) => ({
            id: a.id,
            names: a.nombres,
            paternalSurname: a.apellidoPaterno,
            maternalSurname: a.apellidoMaterno,
            email: a.correoContacto
        })) : [];

        const dateFormatted = item.fechaPublicacion ? item.fechaPublicacion.split('T')[0] : '';

        if (item.tipoCongreso) {
            this.showAddCongressModal = true;
            this.congressForm.patchValue({
                congressType: item.tipoCongreso,
                country: item.paisId?.toString(),
                presentationDate: dateFormatted,
                title: item.titulo,
                subtitle: item.subTitulo,
                summary: item.descripcion,
                presentationType: item.tipoObra,
                doi: item.doi,
                url: item.url,
                mainAuthor: item.autorPrincipal,
                authorshipOrder: item.ordenAutoriaCodigo
            }, { emitEvent: false });
            
            // Explicitly set state of mainAuthor
            const orderVal = item.ordenAutoriaCodigo;
            const selectedOpt = this.authorshipOrderOptions.find(opt => opt.codigo === orderVal);
            if (selectedOpt && selectedOpt.nombre.toLowerCase().trim() === 'autor') {
                this.congressForm.get('mainAuthor')?.disable();
            } else {
                this.congressForm.get('mainAuthor')?.enable();
            }
            this.loadExistingProductionFiles(item.id);
        } else {
            const isOther = (item.externalId || '').includes('OTHER') || (!item.revista && !item.volumen && item.fuente === 'MANUAL');

            if (isOther) {
                this.showAddOtherModal = true;
                this.otherProductionForm.patchValue({
                    indexedIn: item.indexadoEn,
                    category: item.categoriaTrabajo,
                    workType: item.tipoObra,
                    country: item.paisId?.toString(),
                    title: item.titulo,
                    subtitle: item.subTitulo,
                    summary: item.descripcion,
                    date: dateFormatted,
                    institution: item.editorial,
                    journal: item.revista,
                    doi: item.doi,
                    volume: item.volumen,
                    issue: item.fasciculo,
                    pageRange: item.rangoPaginas,
                    url: item.url,
                    editorial: item.editorial,
                    mainAuthor: item.autorPrincipal,
                    authorshipOrder: item.ordenAutoriaCodigo
                }, { emitEvent: false });

                const orderVal = item.ordenAutoriaCodigo;
                const selectedOpt = this.authorshipOrderOptions.find(opt => opt.codigo === orderVal);
                if (selectedOpt && selectedOpt.nombre.toLowerCase().trim() === 'autor') {
                    this.otherProductionForm.get('mainAuthor')?.disable();
                } else {
                    this.otherProductionForm.get('mainAuthor')?.enable();
                }
            } else {
                this.showAddModal = true;
                this.publicationForm.patchValue({
                    indexedIn: item.indexadoEn,
                    doi: item.doi,
                    category: item.categoriaTrabajo,
                    workType: item.tipoObra,
                    title: item.titulo,
                    url: item.url,
                    journal: item.revista,
                    country: item.paisId?.toString(),
                    date: dateFormatted,
                    volume: item.volumen,
                    issue: item.fasciculo,
                    pageRange: item.rangoPaginas,
                    authorshipOrder: item.ordenAutoriaCodigo,
                    function: item.funcion,
                    subtitle: item.subTitulo,
                    identificationType: item.tipoIdentificacion,
                    publisher: item.editorial,
                    description: item.descripcion,
                    mainAuthor: item.autorPrincipal
                }, { emitEvent: false });

                const orderVal = item.ordenAutoriaCodigo;
                const selectedOpt = this.authorshipOrderOptions.find(opt => opt.codigo === orderVal);
                if (selectedOpt && selectedOpt.nombre.toLowerCase().trim() === 'autor') {
                    this.publicationForm.get('mainAuthor')?.disable();
                } else {
                    this.publicationForm.get('mainAuthor')?.enable();
                }
            }
            this.loadExistingProductionFiles(item.id);
        }
    }

    deleteManualProduction(item: any) {
        if (!item?.id) return;
        this.alertService.confirm('Eliminar Registro', '¿Estás seguro de que deseas eliminar este registro manualmente?').then(res => {
            if (res) {
                this.spService.deleteProduction(item.id).subscribe({
                    next: () => {
                        this.alertService.success('Eliminado', 'El registro ha sido eliminado correctamente.');
                        this.loadProductions();
                    },
                    error: (err) => {
                        console.error('Error deleting production:', err);
                        this.alertService.error('Error', 'No se pudo eliminar el registro.');
                    }
                });
            }
        });
    }

    private loadExistingProductionFiles(parentId: number) {
        // Reset local arrays before loading new ones
        this.publicationFiles = [];
        this.publicationSustentoFiles = [];
        this.otherFiles = [];
        this.otherSustentoFiles = [];
        this.congressFiles = [];
        this.congressSustentoFiles = [];

        // Files (PROC01)
        this.fileService.listFilesMetadata(FileModule.INVESTIGATOR, FileCategory.PROCIE, FileSection.PROC01, parentId).subscribe({
            next: (files) => {
                const mapped = (files || []).map((f: any, index: number) => ({
                    code: (index + 1).toString().padStart(2, '0'),
                    name: f.nombre || f.fileName || f.name || 'Archivo',
                    token: f.token,
                    file: null
                }));
                if (this.showAddModal) this.publicationFiles = mapped;
                else if (this.showAddOtherModal) this.otherFiles = mapped;
                else if (this.showAddCongressModal) this.congressFiles = mapped;
                this.cdr.detectChanges();
            }
        });

        // Sustento (PROC02)
        this.fileService.listFilesMetadata(FileModule.INVESTIGATOR, FileCategory.PROCIE, FileSection.PROC02, parentId).subscribe({
            next: (files) => {
                const mapped = (files || []).map((f: any, index: number) => ({
                    code: (index + 1).toString().padStart(2, '0'),
                    name: f.nombre || f.fileName || f.name || 'Archivo',
                    token: f.token,
                    file: null
                }));
                if (this.showAddModal) this.publicationSustentoFiles = mapped;
                else if (this.showAddOtherModal) this.otherSustentoFiles = mapped;
                else if (this.showAddCongressModal) this.congressSustentoFiles = mapped;
                this.cdr.detectChanges();
            }
        });
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

    private uploadFilesCombined(files: any[], section: FileSection): Observable<string[]> {
        if (!files || files.length === 0) return of([]);

        const module = FileModule.INVESTIGATOR;
        const category = FileCategory.PROCIE;

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
    viewAttachments(item: any) {
        this.alertService.info('Archivos', `Visualizando archivos para: ${item.titulo}`);
        // Implement logic to view files from the API if available
    }

    isValidatingDoi = false;
    onValidateDoi(formType: 'publication' | 'other' | 'congress' = 'publication') {
        let form: FormGroup;
        switch (formType) {
            case 'other': form = this.otherProductionForm; break;
            case 'congress': form = this.congressForm; break;
            default: form = this.publicationForm;
        }

        const doi = form.get('doi')?.value;
        if (!doi) {
            this.alertService.warning('Atención', 'Por favor ingrese un DOI o URL para validar.');
            return;
        }

        this.isValidatingDoi = true;
        this.alertService.loading('Validando DOI', 'Consultando servicio de interoperabilidad...');

        this.spService.validateDoi(doi).pipe(
            finalize(() => {
                this.isValidatingDoi = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (response) => {
                this.alertService.close();
                console.log('DOI Validation Response:', response);
                if (response && response.valid) {
                    this.alertService.success('Éxito', 'El DOI es válido y se ha verificado correctamente.');
                    if (response.titulo || response.title) {
                        form.patchValue({ title: response.titulo || response.title });
                    }
                } else {
                    this.alertService.error('DOI No Válido', 'El identificador ingresado no pudo ser validado por el servicio.');
                }
            },
            error: (err) => {
                this.alertService.close();
                console.error('DOI Validation Error:', err);
                this.alertService.error('Error de Validación', 'El DOI ingresado no es válido o el servicio no está disponible.');
            }
        });
    }
}
