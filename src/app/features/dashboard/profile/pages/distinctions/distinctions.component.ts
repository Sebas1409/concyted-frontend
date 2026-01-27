import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CatalogService, CatalogItem } from '../../../../../core/services/catalog.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { FileService } from '../../../../../core/services/file.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { DistinctionService, Distinction, DistinctionFile } from '../../../../../core/services/distinction.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { FileViewerModalComponent, ViewerFileType, ViewerFile } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { FormModalComponent } from '../../../../../shared/components/form-modal/form-modal.component';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';
import { forkJoin, Observable, of } from 'rxjs';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';

@Component({
    selector: 'app-distinctions',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FileViewerModalComponent, ActionButtonsComponent, FormModalComponent, FileUploaderComponent, IntroCardComponent],
    templateUrl: './distinctions.component.html',
    styleUrls: ['./distinctions.component.scss']
})
export class DistinctionsComponent implements OnInit {
    showAddModal = false;
    distinctionForm: FormGroup;

    // File Upload
    uploaderFiles: { code: string; name: string; file?: File }[] = []; // Adapted for FileUploaderComponent
    selectedFiles: File[] = []; // Kept for service compatibility if needed, but primary source will be uploaderFiles
    fileError: string = '';
    existingFiles: DistinctionFile[] = [];
    readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    // State
    distinctionsList: Distinction[] = [];
    currentDistinctionId: number | null = null; // For Edit Mode
    userId: number = 0;
    selectedInstitutionRuc: string = '';

    // File Viewer
    showFileViewer = false;
    viewerFiles: ViewerFile[] = [];

    institutionOptions = ['Universidad César Vallejo S.A.C.', 'CONCYTEC', 'SUNEDU'];
    countries: any[] = [];

    institutionResults: CatalogItem[] = [];
    searchSubject = new Subject<string>();
    showInstitutionDropdown = false;
    private searchSubscription: Subscription | undefined;

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private ubigeoService: UbigeoService,
        private fileService: FileService,
        private alertService: AlertService,
        private distinctionService: DistinctionService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {
        this.distinctionForm = this.fb.group({
            institution: ['', Validators.required],
            name: ['', Validators.required],
            description: [''],
            country: ['', Validators.required],
            date: ['', Validators.required],
            url: ['']
        });
    }

    ngOnInit(): void {
        this.setupSearch();
        this.loadCountries();

        // Load User ID (assuming synchronous or promise - mimicking ResearchLines logic)
        // Adjust based on actual AuthService. For now relying on direct access or simple fetch.
        // If authService.getCurrentUser() returns an observable, subscribing would be better.
        // Assuming synchronous getters or simplified flow for this context.
        const user = this.authService.getCurrentUser();
        if (user && user.id) {
            this.userId = user.id;
            this.loadDistinctions();
        } else {
            // Fallback or retry if auth not ready
            console.warn('User ID not available for Distinctions');
        }
    }

    loadDistinctions() {
        if (!this.userId) return;
        this.distinctionService.getDistinctions(this.userId).subscribe({
            next: (data: any) => {
                const results = (Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
                this.distinctionsList = results || [];
                this.cdr.detectChanges();
            },
            error: (err) => console.error('Error loading distinctions', err)
        });
    }

    ngOnDestroy() {
        this.searchSubscription?.unsubscribe();
    }

    loadCountries() {
        this.ubigeoService.getCountries().subscribe({
            next: (data: any) => {
                this.countries = (Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
            },
            error: (err) => console.error('Failed to load countries', err)
        });
    }

    setupSearch() {
        this.searchSubscription = this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap((term: string) => {
                if (!term || term.length < 3) {
                    return [];
                }
                return this.catalogService.searchMasterDetails('UNIVER', term);
            })
        ).subscribe({
            next: (data: any) => {
                // Handle wrapped response if necessary, assuming direct array or data property
                const results = (Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
                this.institutionResults = results;
                this.showInstitutionDropdown = results.length > 0;
            },
            error: (err) => console.error('Search error', err)
        });
    }

    onSearchInstitution(event: any) {
        const term = event.target.value;
        this.showInstitutionDropdown = true;
        this.selectedInstitutionRuc = ''; // Clear RUC when user types/modifies input
        this.searchSubject.next(term);
    }

    selectInstitution(item: CatalogItem) {
        this.distinctionForm.patchValue({ institution: item.nombre });
        this.selectedInstitutionRuc = item.codigo; // Store RUC/Code
        this.showInstitutionDropdown = false;
    }

    // Hide dropdown when clicking outside (handled by overlay usually or blur with delay)
    onBlurInstitution() {
        setTimeout(() => {
            this.showInstitutionDropdown = false;
        }, 200);
    }

    triggerFileInput() {
        const fileInput = document.getElementById('distinctionFile') as HTMLInputElement;
        if (fileInput) {
            fileInput.click();
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            // Validation
            if (file.type !== 'application/pdf') {
                this.fileError = 'Solo se permiten archivos PDF.';
                return;
            }

            if (file.size > this.MAX_FILE_SIZE) {
                this.fileError = 'El archivo excede el límite de 5MB.';
                return;
            }

            // Check duplicate by name? Optional. 
            // For now just add.
            this.selectedFiles.push(file);
            this.fileError = '';

            // Clear input value to allow re-selecting same file if needed
            event.target.value = '';
        }
    }

    openAddModal() {
        console.log('Opening Add Modal...');
        this.showAddModal = true;
        this.currentDistinctionId = null;
        this.distinctionForm.reset();
        this.selectedInstitutionRuc = ''; // Reset RUC

        // Set Default Country with Safety Check
        if (this.countries && this.countries.length > 0) {
            const defaultCountry = this.countries.find(c => c.nombre && (c.nombre.toUpperCase() === 'PERÚ' || c.nombre.toUpperCase() === 'PERU'));
            if (defaultCountry) {
                this.distinctionForm.patchValue({ country: defaultCountry.nombre });
            }
        }

        this.clearFiles();
    }



    openEditModal(distinction: Distinction) {
        this.currentDistinctionId = distinction.id;
        this.showAddModal = true;

        // Find Country ID/Name match
        const countryName = this.countries.find(c => c.id === distinction.paisId)?.nombre || '';


        this.selectedInstitutionRuc = distinction.rucInstitucion || ''; // Restore RUC if available

        // Fetch existing files from metadata API
        this.existingFiles = [];
        if (distinction.id) {
            this.fileService.listFilesMetadata(FileModule.INVESTIGATOR, 'DISPRE', '', distinction.id).subscribe({
                next: (files: any[]) => {
                    this.existingFiles = (files || []).map(f => ({
                        id: f.id || 0,
                        nombre: f.nombre || f.fileName || f.name || 'Archivo',
                        token: f.token
                    }));
                    this.cdr.detectChanges();
                },
                error: (err) => console.error('Error loading file metadata', err)
            });
        }

        this.distinctionForm.patchValue({
            institution: distinction.nombreInstitucion,
            name: distinction.nombre,
            description: distinction.descripcion,
            country: countryName, // Ideally we change form to use ID
            date: distinction.fechaReconocimiento,
            url: distinction.enlaceReferencia
        });

        // Handle File
        // ... (Existing logic)
    }

    removeExistingFile(index: number) {
        this.alertService.confirm(
            '¿Eliminar archivo?',
            'El archivo será eliminado al guardar los cambios. ¿Continuar?',
            'Sí, eliminar'
        ).then((confirmed) => {
            if (confirmed) {
                this.existingFiles.splice(index, 1);
            }
        });
    }

    removeFile(index: number, silent: boolean = false) {
        if (silent) {
            this.selectedFiles = [];
            this.fileError = '';
            return;
        }

        this.alertService.confirm(
            '¿Eliminar archivo?',
            'Estás a punto de eliminar el archivo adjunto. ¿Deseas continuar?',
            'Sí, eliminar'
        ).then((confirmed) => {
            if (confirmed) {
                this.selectedFiles.splice(index, 1);
                this.cdr.detectChanges();
            }
        });
    }

    clearFiles() {
        this.selectedFiles = [];
        this.uploaderFiles = [];
        this.existingFiles = []; // Clear existing too
        this.fileError = '';
        const fileInput = document.getElementById('distinctionFile') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    closeAddModal() {
        this.showAddModal = false;
        this.distinctionForm.reset();
        this.clearFiles();
        this.currentDistinctionId = null;
    }

    saveDistinction() {
        if (this.distinctionForm.invalid) {
            this.distinctionForm.markAllAsTouched();
            return;
        }

        const formValues = this.distinctionForm.value;
        const rucVal = this.selectedInstitutionRuc || '';

        // Find country ID if possible
        const countryObj = this.countries.find(c => c.nombre === formValues.country);
        const paisId = countryObj ? countryObj.id : 0;

        // 1. Identify files to upload
        const filesToUpload = this.uploaderFiles
            .filter(f => f.file)
            .map(f => f.file!);

        // 2. Prepare Observable for uploads
        let uploadObs: Observable<any[]> = of([]);
        if (filesToUpload.length > 0) {
            const uploads = filesToUpload.map(file => {
                // Upload with empty section to get token. 
                // We use '' as section since we don't have ID yet.
                return this.fileService.uploadFile(
                    file,
                    FileModule.INVESTIGATOR,
                    FileType.DOCUMENT,
                    'DISPRE',
                    '',
                    true
                );
            });
            uploadObs = forkJoin(uploads);
        }

        // 3. Execute Uploads -> Then Save Distinction
        uploadObs.pipe(
            switchMap((responses: any[]) => {
                // Collect new tokens
                // Assuming response has .token property or IS the token string
                const newTokens = responses.map(res => res.token || (typeof res === 'string' ? res : ''));

                // Collect existing tokens
                const existingTokens = this.existingFiles.map(f => f.token);

                // Combine all tokens
                const allTokens = [...existingTokens, ...newTokens].filter(t => !!t);

                const distinctionData: any = {
                    id: this.currentDistinctionId ? this.currentDistinctionId : 0,
                    nombre: formValues.name,
                    descripcion: formValues.description,
                    nombreInstitucion: formValues.institution,
                    fechaReconocimiento: formValues.date,
                    enlaceReferencia: formValues.url,
                    rucInstitucion: rucVal,
                    investigadorId: this.userId || 0,
                    paisId: paisId,
                    tokens: allTokens
                };

                console.log('Distinction Payload:', distinctionData);

                if (this.currentDistinctionId) {
                    return this.distinctionService.updateDistinction(this.currentDistinctionId, distinctionData);
                } else {
                    return this.distinctionService.createDistinction(distinctionData);
                }
            })
        ).subscribe({
            next: () => {
                this.alertService.success('Guardado', 'La distinción se guardó correctamente.');
                this.closeAddModal();
                this.loadDistinctions();
            },
            error: (err) => {
                console.error('Save error', err);
                this.alertService.error('Error', 'No se pudo guardar la distinción.');
            }
        });
    }

    deleteDistinction(id: number) {
        this.alertService.confirm('¿Eliminar distinción?', 'Esta acción no se puede deshacer.')
            .then(confirm => {
                if (confirm) {
                    this.distinctionService.deleteDistinction(id).subscribe({
                        next: () => {
                            this.alertService.success('Eliminado', 'La distinción ha sido eliminada.');
                            this.loadDistinctions();
                        },
                        error: () => this.alertService.error('Error', 'No se pudo eliminar.')
                    });
                }
            });
    }

    viewFile(distinction: Distinction) {
        if (!distinction || !distinction.id) return;

        this.fileService.listFilesMetadata(FileModule.INVESTIGATOR, 'DISPRE', '', distinction.id).subscribe({
            next: (files) => {
                if (!files || files.length === 0) {
                    this.alertService.warning('Aviso', 'No hay archivos adjuntos para este registro.');
                    return;
                }

                this.viewerFiles = files.map((f: any) => {
                    const displayName = f.nombre || f.fileName || f.name || 'Archivo';
                    const ext = displayName.split('.').pop()?.toLowerCase() || '';
                    let type: ViewerFileType = 'PDF';

                    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
                        type = 'IMAGE';
                    } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext)) {
                        type = 'OFFICE';
                    }

                    return {
                        url: '',
                        token: f.token,
                        name: displayName,
                        type: type
                    };
                });

                this.showFileViewer = true;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error fetching files for viewer', err);
                this.alertService.error('Error', 'No se pudieron cargar los archivos.');
            }
        });
    }

    onUploaderFilesChange(event: any[]) {
        this.uploaderFiles = event;
        this.cdr.detectChanges();
    }

    removeNewFile(index: number) {
        this.uploaderFiles.splice(index, 1);
        this.cdr.detectChanges();
    }

    viewLocalFile(file: any) {
        if (!file || !file.token) return;

        const displayName = file.nombre || file.name || 'Archivo';
        const ext = displayName.split('.').pop()?.toLowerCase() || '';
        let type: ViewerFileType = 'PDF';

        if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
            type = 'IMAGE';
        } else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext)) {
            type = 'OFFICE';
        }

        this.viewerFiles = [{
            url: '', // Token based
            token: file.token,
            name: displayName,
            type: type
        }];

        this.showFileViewer = true;
    }

}
