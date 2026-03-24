import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, catchError, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { FileViewerModalComponent, ViewerFile } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { CatalogService, CatalogItem } from '../../../../../core/services/catalog.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ScientificProductionService, AliciaRequest } from '../../../../../core/services/scientific-production.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { FileService } from '../../../../../core/services/file.service';
import { WosService } from '../../../../../core/services/wos.service';
import { OrcidService } from '../../../../../core/services/orcid.service';
import { FileModule, FileCategory, FileSection } from '../../../../../core/constants/file-upload.constants';
import { forkJoin, of, Observable } from 'rxjs';
import { QualificationBadgeComponent } from '../../../../../shared/components/qualification-badge/qualification-badge.component';

interface Author {
    id: number | null;
    paternalSurname: string;
    maternalSurname: string;
    names: string;
    email: string;
    tipoRegistro?: string;
    _tempId?: number; // Temporary local ID for tracking
}

import { DateDisplayPipe } from '../../../../../shared/pipes/date-display.pipe';

@Component({
    selector: 'app-scientific-production',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ActionButtonsComponent, IntroCardComponent, FileUploaderComponent, FileViewerModalComponent, DateDisplayPipe, QualificationBadgeComponent],
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
    hasSearchedInternational = false;
    hasSearchedAlicia = false;

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
    citationTypeOptions: CatalogItem[] = [];
    congressTypeOptions: CatalogItem[] = [];

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
    selectedAuthorType: 'ORAU01' | 'ORAU02' = 'ORAU01';

    // File Viewer
    showFileViewer = false;
    viewerFiles: ViewerFile[] = [];

    get currentUserFullName(): string {
        const user = this.authService.getCurrentUser();
        if (!user) return 'Cargando...';
        return `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`.trim();
    }

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private ubigeoService: UbigeoService,
        private authService: AuthService,
        private spService: ScientificProductionService,
        private alertService: AlertService,
        private fileService: FileService,
        private wosService: WosService,
        private orcidService: OrcidService,
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
            category: ['Otro', Validators.required],
            workType: ['', Validators.required],
            country: [''],
            title: ['', Validators.required],
            subtitle: [''],
            summary: [''],
            date: ['', Validators.required],
            journal: [''],
            doi: [''],
            volume: [''],
            issue: [''],
            pageRange: [''],
            url: [''],
            mainAuthor: [''],
            authorshipOrder: [''],
            function: [''],
            identificationType: [''],
            identification: [''],
            citationType: [''],
            citation: ['']
        });

        // Auto-populate Main Author for Other Production
        this.otherProductionForm.get('authorshipOrder')?.valueChanges.subscribe(value => {
            this.handleAuthorshipChange(value, this.otherProductionForm);
        });

        this.congressForm = this.fb.group({
            congressType: ['Nacional', Validators.required],
            country: [''],
            presentationDate: ['', Validators.required],
            title: ['', Validators.required],
            subtitle: [''],
            summary: [''],
            presentationType: ['', Validators.required],
            doi: [''],
            url: [''],
            authorshipOrder: [''],
            function: [''],
            mainAuthor: [''],
            category: ['', Validators.required],
            identificationType: [''],
            identification: ['']
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
        this.loadProductions();
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

        // Tipo Cita: TIPCIT
        this.catalogService.getMasterDetailsByCode('TIPCIT').subscribe(data => {
            this.citationTypeOptions = data;
        });

        // Tipo Congreso: TIPCON
        this.catalogService.getMasterDetailsByCode('TIPCON').subscribe(data => {
            this.congressTypeOptions = data;
        });
    }

    savePublication() {
        this.saveManualProduction('publication');
    }

    saveOtherProduction() {
        this.saveManualProduction('other');
    }

    saveCongress() {
        this.saveManualProduction('congress');
    }

    private saveManualProduction(type: 'publication' | 'other' | 'congress') {
        let form: FormGroup;
        let files: File[] = [];
        let sustentoFiles: File[] = [];
        let closeFn: () => void;
        let prefix: string;

        if (type === 'publication') {
            form = this.publicationForm;
            files = this.publicationFiles;
            sustentoFiles = this.publicationSustentoFiles;
            closeFn = () => this.closeAddModal();
            prefix = 'PUB';
        } else if (type === 'other') {
            form = this.otherProductionForm;
            files = this.otherFiles;
            sustentoFiles = this.otherSustentoFiles;
            closeFn = () => this.closeAddOtherModal();
            prefix = 'OTHER';
        } else {
            form = this.congressForm;
            files = this.congressFiles;
            sustentoFiles = this.congressSustentoFiles;
            closeFn = () => this.closeAddCongressModal();
            prefix = 'CONGRESS';
        }

        if (form.invalid || this.hasUploadError) {
            form.markAllAsTouched();
            return;
        }

        const user = this.authService.getCurrentUser();
        const formValues = form.getRawValue();

        // 1. Campos Comunes
        const payload: any = {
            investigadorId: user?.id || 0,
            fuente: 'MANUAL',
            externalId: `MANUAL-${prefix}-${Date.now()}`,
            fechaImportacion: new Date().toISOString(),
            metadataImportacion: JSON.stringify({ origen: 'MANUAL', version: '1.0' }),
            titulo: formValues.title,
            subTitulo: formValues.subtitle,
            paisId: parseInt(formValues.country) || 0,
            url: formValues.url,
            autorPrincipal: formValues.mainAuthor,
            ordenAutoriaCodigo: formValues.authorshipOrder,
            doi: formValues.doi,
            active: true,
            autores: this.authorsList.map((a, index) => ({
                id: a.id,
                tipoRegistro: a.tipoRegistro || (type === 'publication' ? 'ORAU01' : 'ORAU02'),
                nombres: a.names,
                apellidoPaterno: a.paternalSurname,
                apellidoMaterno: a.maternalSurname,
                correoContacto: a.email,
                ordenAutoria: index + 1,
                active: true
            }))
        };

        // 2. Mapeo Específico por Tipo
        if (type === 'publication') {
            payload.categoriaTrabajo = formValues.category;
            payload.tipoObra = formValues.workType;
            payload.funcion = formValues.function;
            payload.indexadoEn = formValues.indexedIn;
            payload.tipoIdentificacion = formValues.identificationType;
            payload.identificacion = formValues.doi; // En publicación, identificación suele ser el DOI
            payload.descripcion = formValues.description;
            payload.revista = formValues.journal;
            payload.volumen = formValues.volume;
            payload.fasciculo = formValues.issue;
            payload.rangoPaginas = formValues.pageRange;
            payload.editorial = formValues.publisher;
            payload.fechaPublicacion = formValues.date;
        } else if (type === 'other') {
            payload.categoriaTrabajo = formValues.category;
            payload.tipoObra = formValues.workType;
            payload.funcion = formValues.function;
            payload.indexadoEn = formValues.indexedIn;
            payload.tipoIdentificacion = formValues.identificationType;
            payload.identificacion = formValues.identification;
            payload.descripcion = formValues.summary;
            payload.revista = formValues.journal;
            payload.fechaPublicacion = formValues.date;
            payload.tipoCita = formValues.citationType;
            payload.cita = formValues.citation;
            payload.volumen = formValues.volume;
            payload.fasciculo = formValues.issue;
            payload.rangoPaginas = formValues.pageRange;
        } else if (type === 'congress') {
            payload.tipoCongreso = formValues.congressType;
            payload.categoriaTrabajo = formValues.category;
            payload.tipoObra = formValues.presentationType;
            payload.funcion = formValues.function;
            payload.tipoIdentificacion = formValues.identificationType;
            payload.identificacion = formValues.identification;
            payload.descripcion = formValues.summary;
            payload.fechaPublicacion = formValues.presentationDate;
        }

        const cleanedPayload = Object.fromEntries(
            Object.entries(payload).filter(([_, v]) => v !== null && v !== undefined && v !== '')
        );

        forkJoin({
            archivos: this.uploadFilesCombined(files, FileSection.PROC01),
            sustento: this.uploadFilesCombined(sustentoFiles, FileSection.PROC02)
        }).subscribe({
            next: (tokens) => {
                const payloadWithFiles = {
                    ...cleanedPayload as any,
                    archivoTokens: tokens.archivos,
                    sustentoTokens: tokens.sustento
                };

                const saveObservable = this.currentProductionId
                    ? this.spService.updatePublication(this.currentProductionId, payloadWithFiles)
                    : this.spService.createPublication(payloadWithFiles);

                saveObservable.subscribe({
                    next: (res) => {
                        this.alertService.success('Éxito', this.currentProductionId ? 'El registro ha sido actualizado.' : 'El registro ha sido guardado correctamente.');
                        closeFn();
                        setTimeout(() => this.loadProductions(), 500);
                    },
                    error: (err) => {
                        console.error('Error saving production:', err);
                        this.alertService.error('Error', 'No se pudo guardar el registro.');
                    }
                });
            },
            error: (err) => {
                console.error('Error uploading files:', err);
                this.alertService.error('Error', 'No se pudieron subir los archivos.');
            }
        });
    }


    openAuthorsModal(type: 'ORAU01' | 'ORAU02' = 'ORAU01') {
        console.log('[ScientificProduction] Opening authors modal with type:', type);
        this.selectedAuthorType = type;
        this.showAuthorsModal = true;
        this.cdr.detectChanges();
    }

    closeAuthorsModal() {
        this.showAuthorsModal = false;
        // Do not reset authorsList here as it's shared across modals but filtered by type in view
        this.authorsForm.reset();
        this.cdr.detectChanges();
    }

    addAuthorToList() {
        if (this.authorsForm.valid) {
            const author: Author = {
                id: null,
                _tempId: Date.now(),
                tipoRegistro: this.selectedAuthorType,
                ...this.authorsForm.value
            };
            this.authorsList.push(author);
            this.authorsForm.reset();
        }
    }

    removeAuthor(author: Author) {
        if (author.id) {
            this.authorsList = this.authorsList.filter(a => a.id !== author.id);
        } else if (author._tempId) {
            this.authorsList = this.authorsList.filter(a => a._tempId !== author._tempId);
        }
    }

    getFilteredAuthors(): Author[] {
        return this.authorsList.filter(a => a.tipoRegistro === this.selectedAuthorType);
    }

    getAuthorsByType(type: string): Author[] {
        return this.authorsList.filter(a => a.tipoRegistro === type);
    }

    confirmAuthors() {
        this.closeAuthorsModal();
    }

    onFileSelect(event: any, type: string) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        const f = files[0];
        const fileObj = {
            code: (this.congressSustentoFiles.length + 1).toString().padStart(2, '0'),
            name: f.name,
            file: f
        };

        if (type === 'sustento') {
            this.congressSustentoFiles = [fileObj];
        }
        this.cdr.detectChanges();
    }

    getWorkTypeName(code: string | undefined): string {
        if (!code) return 'N/A';
        const item = this.workTypeOptions.find(opt => opt.codigo === code);
        return item ? item.nombre : code;
    }

    getFunctionName(code: string | undefined): string {
        if (!code) return 'N/A';
        const item = this.functionOptions.find(opt => opt.codigo === code);
        return item ? item.nombre : code;
    }

    openAddModal() {
        this.currentProductionId = null;
        this.showAddModal = true;
        this.authorsList = []; // Reset authors for new entry
        this.publicationForm.enable(); // Ensure enabled for new
        this.setFixedCategory(this.publicationForm, 'Publicación');
        this.cdr.detectChanges();
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
        this.setFixedCategory(this.otherProductionForm, 'Otro');
        this.cdr.detectChanges();
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
        this.setFixedCategory(this.congressForm, 'Conferencia');
        this.cdr.detectChanges();
    }

    private setFixedCategory(form: FormGroup, label: string) {
        if (!this.workCategoryOptions || this.workCategoryOptions.length === 0) {
            // If catalogs not loaded yet, retry in short time or rely on ngOnInit loading 
            // Usually they are already there.
            const sub = this.catalogService.getMasterDetailsByCode('CATTRA').subscribe(data => {
                this.workCategoryOptions = data;
                this.applyCategory(form, label);
                sub.unsubscribe();
            });
            return;
        }
        this.applyCategory(form, label);
    }

    private applyCategory(form: FormGroup, label: string) {
        const cat = this.workCategoryOptions.find(o => 
            o.nombre.toLowerCase().trim() === label.toLowerCase().trim()
        );
        if (cat) {
            form.get('category')?.setValue(cat.codigo);
            form.get('category')?.disable();
            this.cdr.detectChanges();
        }
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
        this.hasSearchedInternational = false;
        this.hasSearchedAlicia = false;
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
        const user = this.authService.getCurrentUser();
        if (!user) return;

        // One at a time: clear others if selecting a new one
        const isCurrentActive = this.syncStatus[service];
        
        // Reset all
        this.syncStatus.orcid = false;
        this.syncStatus.scopus = false;
        this.syncStatus.profile = false;
        this.rawAliciaResults = [];
        this.applyAliciaFilters();

        if (!isCurrentActive) {
            this.syncStatus[service] = true;
            if (service === 'profile') {
                const wosId = (user as any).researcherId || user.researcherId;
                if (wosId) {
                    this.fetchWosPublications(wosId);
                } else {
                    this.syncStatus.profile = false;
                    this.alertService.warning('ResearcherID no vinculado', 'Por favor, vincule su cuenta de Web of Science en la sección de otros identificadores.');
                }
            } else if (service === 'orcid') {
                const orcidId = user.orcid;
                if (orcidId) {
                    this.fetchOrcidPublications(orcidId);
                } else {
                    this.syncStatus.orcid = false;
                    this.alertService.warning('ORCID no vinculado', 'Por favor, vincule su cuenta de ORCID en la sección de otros identificadores.');
                }
            } else {
                // Scopus mock or other logic
                this.syncStatus[service] = true;
            }
        }
    }

    private fetchOrcidPublications(orcidId: string) {
        this.isLoadingAlicia = true;
        this.orcidService.importOrcidWorks(orcidId).pipe(
            finalize(() => {
                this.isLoadingAlicia = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (res: any) => {
                const results = res?.data?.publications || [];
                console.log('[ORCID] Works received:', results);
                
                this.rawAliciaResults = results.map((item: any) => ({
                    id: item.putCode || Math.random().toString(36).substr(2, 9),
                    title: item.title || 'Sin título',
                    date: item.year || 'N/A',
                    url: item.url || (item.doi ? `https://doi.org/${item.doi}` : '#'),
                    type: item.type || 'Publicación',
                    source: 'ORCID',
                    journal: 'ORCID',
                    apiSource: 'ORCID',
                    alreadyImported: this.manualList.concat(this.importedList).some((p: any) => {
                         const pTitle = (p.title || p.titulo || '').toString().toLowerCase().trim();
                         const pExternalId = (p.externalId || '').toString().toLowerCase().trim();
                         const itemId = (item.putCode || '').toString().toLowerCase().trim();
                         const itemTitle = (item.title || '').toString().toLowerCase().trim();
                         return (pExternalId !== '' && pExternalId === itemId) || (pTitle !== '' && pTitle === itemTitle);
                    })
                }));
                this.hasSearchedInternational = true;
                this.applyAliciaFilters();
            },
            error: (err) => {
                console.error('Error al sincronizar ORCID:', err);
                this.alertService.error('Error', 'No se pudieron obtener las publicaciones de ORCID.');
                this.syncStatus.orcid = false;
                this.hasSearchedInternational = true;
            }
        });
    }

    private fetchWosPublications(wosId: string) {
        this.isLoadingAlicia = true;
        this.wosService.getWosPublications(wosId).pipe(
            finalize(() => {
                this.isLoadingAlicia = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (res: any) => {
                const results = res?.data?.publications || [];
                console.log('[WoS] Publications received:', results);
                
                this.rawAliciaResults = results.map((item: any) => ({
                    id: item.uid || Math.random().toString(36).substr(2, 9),
                    title: item.title || 'Sin título',
                    date: item.publishYear || 'N/A',
                    url: item.doi ? `https://doi.org/${item.doi}` : '#',
                    type: 'Publicación',
                    source: item.source || 'WOS',
                    journal: item.source || '',
                    apiSource: 'Web of Science',
                    alreadyImported: this.manualList.concat(this.importedList).some((p: any) => {
                         const pTitle = (p.title || p.titulo || '').toString().toLowerCase().trim();
                         const itemId = (item.uid || '').toString().toLowerCase().trim();
                         const pExternalId = (p.externalId || '').toString().toLowerCase().trim();
                         const itemTitle = (item.title || '').toString().toLowerCase().trim();
                         return (pExternalId !== '' && (pExternalId === itemId || pExternalId.includes(itemId))) || (pTitle !== '' && pTitle === itemTitle);
                    })
                }));
                this.hasSearchedInternational = true;
                this.applyAliciaFilters();
            },
            error: (err) => {
                console.error('Error al sincronizar WoS:', err);
                this.alertService.error('Error', 'No se pudieron obtener las publicaciones de Web of Science.');
                this.syncStatus.profile = false;
                this.hasSearchedInternational = true;
            }
        });
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
                        this.hasSearchedAlicia = true;
                        this.applyAliciaFilters();
                    }
                } catch (e) {
                    console.error('[Alicia] Error processing results:', e);
                    this.hasSearchedAlicia = true;
                }
            },
            error: (err) => {
                console.error('[Alicia] Error searching in Alicia:', err);
                this.rawAliciaResults = [];
                this.hasSearchedAlicia = true;
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

    editManualProduction(item: any) {
        this.currentProductionId = item.id;
        this.authorsList = item.autores ? item.autores.map((a: any) => ({
            id: a.id,
            names: a.nombres,
            paternalSurname: a.apellidoPaterno,
            maternalSurname: a.apellidoMaterno,
            email: a.correoContacto,
            tipoRegistro: a.tipoRegistro,
            functionId: a.funcionId
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
                authorshipOrder: item.ordenAutoriaCodigo,
                category: item.categoriaTrabajo,
                function: item.funcion,
                identificationType: item.tipoIdentificacion,
                identification: item.identificacion
            }, { emitEvent: false });
            this.congressForm.get('category')?.disable();
            
            // Explicitly set state of mainAuthor
            const orderVal = item.ordenAutoriaCodigo;
            const selectedOpt = this.authorshipOrderOptions.find(opt => opt.codigo === orderVal);
            if (selectedOpt && selectedOpt.nombre.toLowerCase().trim() === 'autor') {
                this.congressForm.get('mainAuthor')?.disable();
            } else {
                this.congressForm.get('mainAuthor')?.enable();
            }
            this.loadExistingProductionFiles(item.id, 'congress');
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
                    journal: item.revista,
                    doi: item.doi,
                    volume: item.volumen,
                    issue: item.fasciculo,
                    pageRange: item.rangoPaginas,
                    url: item.url,
                    mainAuthor: item.autorPrincipal,
                    authorshipOrder: item.ordenAutoriaCodigo,
                    function: item.funcion,
                    identificationType: item.tipoIdentificacion,
                    identification: item.identificacion,
                    citationType: item.tipoCita,
                    citation: item.cita
                }, { emitEvent: false });
                this.otherProductionForm.get('category')?.disable();

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
                this.publicationForm.get('category')?.disable();

                const orderVal = item.ordenAutoriaCodigo;
                const selectedOpt = this.authorshipOrderOptions.find(opt => opt.codigo === orderVal);
                if (selectedOpt && selectedOpt.nombre.toLowerCase().trim() === 'autor') {
                    this.publicationForm.get('mainAuthor')?.disable();
                } else {
                    this.publicationForm.get('mainAuthor')?.enable();
                }
            }
            this.loadExistingProductionFiles(item.id, isOther ? 'other' : 'publication');
        }
    }

    deleteManualProduction(item: any) {
        if (!item?.id) return;
        this.alertService.confirm('Eliminar Registro', '¿Estás seguro de que deseas eliminar este registro?').then(res => {
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

    deleteImportedProduction(item: any) {
        if (!item?.id) return;
        this.alertService.confirm('Eliminar Producción Importada', '¿Estás seguro de que deseas eliminar este registro importado?').then(res => {
            if (res) {
                this.spService.deleteProduction(item.id).subscribe({
                    next: () => {
                        this.alertService.success('Eliminado', 'El registro importado ha sido eliminado de tu lista.');
                        this.loadProductions();
                    },
                    error: (err) => {
                        console.error('Error deleting imported production:', err);
                        this.alertService.error('Error', 'No se pudo eliminar el registro.');
                    }
                });
            }
        });
    }

    private loadExistingProductionFiles(parentId: number, type: 'publication' | 'other' | 'congress') {
        console.log(`[ScientificProduction] Loading files for ${type} with parentId:`, parentId);
        
        // Reset only the relevant arrays for this modal
        if (type === 'publication') {
            this.publicationFiles = [];
            this.publicationSustentoFiles = [];
        } else if (type === 'other') {
            this.otherFiles = [];
            this.otherSustentoFiles = [];
        } else if (type === 'congress') {
            this.congressFiles = [];
            this.congressSustentoFiles = [];
        }

        // Files (PROC01)
        this.fileService.listFilesMetadata(FileModule.INVESTIGATOR, FileCategory.PROCIE, FileSection.PROC01, parentId).subscribe({
            next: (files) => {
                const mapped = (files || []).map((f: any, index: number) => ({
                    code: (index + 1).toString().padStart(2, '0'),
                    name: f.nombre || f.fileName || f.name || 'Archivo',
                    token: f.token,
                    file: null
                }));
                
                if (type === 'publication') this.publicationFiles = mapped;
                else if (type === 'other') this.otherFiles = mapped;
                else if (type === 'congress') this.congressFiles = mapped;
                
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading files PROC01:', err)
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
                
                if (type === 'publication') this.publicationSustentoFiles = mapped;
                else if (type === 'other') this.otherSustentoFiles = mapped;
                else if (type === 'congress') this.congressSustentoFiles = mapped;
                
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading files PROC02:', err)
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
    viewAttachments(item: any, section: string = 'PROC01') {
        const module = FileModule.INVESTIGATOR;
        const category = FileCategory.PROCIE;

        this.fileService.fetchFilesForViewer(module, category, section, item.id).subscribe({
            next: (files) => {
                if (files && files.length > 0) {
                    this.viewerFiles = files;
                    this.showFileViewer = true;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error('Error fetching viewer files:', err);
            }
        });
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
