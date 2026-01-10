import { Component, ChangeDetectorRef, OnInit } from '@angular/core'; // Update

import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService, CatalogItem } from '../../../../../core/services/catalog.service';
import { TechnologicalTransferService } from '../../../../../core/services/technological-transfer.service';
import { IndustrialDevelopmentService, IndustrialDevelopment } from '../../../../../core/services/industrial-development.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { UbigeoService } from '../../../../../core/services/ubigeo.service';
import { IntellectualPropertyService } from '../../../../../core/services/intellectual-property.service';
import { FileViewerModalComponent, ViewerFile, ViewerFileType } from '../../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { FileUploaderComponent } from '../../../../../shared/components/file-uploader/file-uploader.component';
import { FormModalComponent } from '../../../../../shared/components/form-modal/form-modal.component';
import { IntroCardComponent } from '../../../../../shared/components/intro-card/intro-card.component';
import { FileService } from '../../../../../core/services/file.service';
import { FileModule, FileType } from '../../../../../core/constants/file-upload.constants';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface TechnologicalTransferItem {
    id: number;
    title: string;
    description: string;
    oecdArea: string;       // Display
    oecdSubArea: string;    // Display
    type: string;           // Display
    trl: string;            // Display
    role: string;           // Display
    date: string;
    // Hidden fields for Edit
    areaId: number;
    subAreaId: number;
    typeCode: string;
    trlCode: string;
    roleCode: string;
}

@Component({
    selector: 'app-technological-production',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ActionButtonsComponent, FileUploaderComponent, FormModalComponent, IntroCardComponent, FileViewerModalComponent],
    templateUrl: './technological-production.component.html',
    styleUrls: ['./technological-production.component.scss']
})
export class TechnologicalProductionComponent implements OnInit {
    activeTab: 'all' | 'intellectual' | 'industrial' | 'transfer' = 'all';

    // Modal State
    showIntellectualModal = false;
    showIndustrialModal = false;
    showTransferModal = false;

    // Forms
    intellectualForm: FormGroup;
    industrialForm: FormGroup;
    transferForm: FormGroup;

    // List for Industrial Developments
    industrialDevelopments: any[] = [];

    // List for Intellectual Properties
    intellectualProperties: any[] = [];

    // Mock data for Transferencia Tecnológica
    technologicalTransfers: TechnologicalTransferItem[] = [];

    setActiveTab(tab: 'all' | 'intellectual' | 'industrial' | 'transfer') {
        this.activeTab = tab;
    }

    // Data sources
    areas: any[] = [];
    subAreas: any[] = [];
    technologyTypes: any[] = [];
    trlLevels: any[] = [];
    roles: any[] = [];

    // Industrial Development Catalogs
    industrialTypes: any[] = [];
    participationTypes: any[] = [];
    developmentScopes: any[] = [];
    developmentStatuses: any[] = [];
    industrialUseStatuses: any[] = [];

    // Intellectual Property Catalogs
    intellectualTypes: any[] = [];
    patentStatuses: any[] = [];
    registrationEntities: any[] = [];
    intellectualRoles: any[] = [];
    countries: any[] = [];

    // File Upload State
    industrialFiles: any[] = [];
    intellectualFiles: any[] = [];
    transferFiles: any[] = []; // Added for Transfer

    // File Viewer State
    showFileViewer = false;
    viewerFiles: ViewerFile[] = [];

    // Constants
    readonly INVESTIGATOR_MODULE = FileModule.INVESTIGATOR;
    readonly PROTEC_CATEGORY = 'PROTEC';
    readonly IP_SECTION = 'PROT01';
    readonly INDUSTRIAL_SECTION = 'PROT02';
    readonly TRANSFER_SECTION = 'PROT03';

    // State
    isEditing = false;
    currentTransferId: number | null = null;
    currentFileId: number | null = null; // For file viewer
    hasUploadError = false;

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private fileService: FileService,
        private technologicalTransferService: TechnologicalTransferService,
        private authService: AuthService,
        private alertService: AlertService,
        private cdr: ChangeDetectorRef,
        private industrialDevelopmentService: IndustrialDevelopmentService,
        private ubigeoService: UbigeoService,
        private intellectualPropertyService: IntellectualPropertyService
    ) {
        // Initialize Intellectual Property Form
        this.intellectualForm = this.fb.group({
            title: ['', Validators.required],
            type: ['', Validators.required],
            status: ['', Validators.required],
            registrationNumber: [''],
            registrationCountry: ['', Validators.required],
            registrationEntity: ['', Validators.required],
            owner: [''],
            role: ['', Validators.required],
            rightsParticipation: [false],
            isPct: [false]
        });

        // Initialize Industrial Development Form
        this.industrialForm = this.fb.group({
            name: ['', Validators.required],
            productType: ['', Validators.required],
            noveltyLevel: [''], // Removed required
            developmentPhase: [''], // Removed required
            commercialStatus: ['', Validators.required],
            owner: [''],
            role: ['']
        });

        // Initialize Transfer Form
        this.transferForm = this.fb.group({
            technologyName: ['', Validators.required],
            description: [''],
            technologyType: ['', Validators.required],
            trlLevel: [''],
            oecdArea: [''],
            oecdSubArea: [''],
            role: [''],
            registrationDate: ['']
        });
    }

    ngOnInit() {
        this.loadAreas();
        this.loadTechnologyTypes();
        this.loadTrlLevels();
        this.loadRoles();
        this.loadIndustrialCatalogs();
        this.loadTransfers();
        this.loadIndustrialDevelopments();
        this.loadIntellectualCatalogs();
        this.loadIntellectualProperties();
    }

    loadIndustrialCatalogs() {
        this.catalogService.getMasterDetailsByCode('TIDEIN').subscribe(data => this.industrialTypes = data);
        this.catalogService.getMasterDetailsByCode('ALCDES').subscribe(data => this.developmentScopes = data);
        this.catalogService.getMasterDetailsByCode('ESDEIN').subscribe(data => this.developmentStatuses = data);
        this.catalogService.getMasterDetailsByCode('EDEINO').subscribe(data => this.industrialUseStatuses = data);
        this.catalogService.getMasterDetailsByCode('TIPAAC').subscribe(data => this.participationTypes = data);
    }

    loadIntellectualCatalogs() {
        this.catalogService.getMasterDetailsByCode('TPROIN').subscribe(data => this.intellectualTypes = data);
        this.catalogService.getMasterDetailsByCode('ESTPAT').subscribe(data => this.patentStatuses = data);
        this.catalogService.getMasterDetailsByCode('ENTRPI').subscribe(data => this.registrationEntities = data);
        this.catalogService.getMasterDetailsByCode('ROLPAR').subscribe(data => this.intellectualRoles = data);
        this.ubigeoService.getCountries().subscribe(data => this.countries = data);
    }

    loadIntellectualProperties() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.intellectualPropertyService.getIntellectualPropertiesByInvestigator(currentUser.id).subscribe({
                next: (data: any[]) => {
                    this.intellectualProperties = data.map((item: any) => ({
                        id: item.id,
                        title: item.titulo,
                        type: item.tipoPropiedadNombre,
                        status: item.estadoActualNombre,
                        role: item.rolParticipacionNombre,
                        country: item.paisRegistroNombre,
                        registrationNumber: item.numeroRegistro,
                        attachments: '1 archivo', // Mock attachment count
                        originalItem: item
                    }));
                    this.cdr.detectChanges();
                },
                error: (err: any) => console.error('Failed to load intellectual properties', err)
            });
        }
    }



    loadIndustrialDevelopments() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.industrialDevelopmentService.getIndustrialDevelopmentsByInvestigator(currentUser.id).subscribe({
                next: (data: any[]) => {
                    this.industrialDevelopments = data.map((item: any) => ({
                        id: item.id,
                        name: item.nombreDesarrollo,
                        productType: item.tipoProductoNombre,
                        participationType: item.rolParticipacionNombre,
                        status: item.faseDesarrolloNombre,
                        scope: item.createdAt,
                        attachments: '1 archivo', // Mock attachment count
                        originalItem: item
                    }));
                    this.cdr.detectChanges();
                },
                error: (err: any) => console.error('Failed to load industrial developments', err)
            });
        }
    }

    loadTransfers() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id) {
            this.technologicalTransferService.getTransfersByInvestigator(currentUser.id).subscribe({
                next: (data) => {
                    this.technologicalTransfers = data.map((item: any) => ({
                        id: item.id,
                        title: item.nombreTecnologia,
                        description: item.descripcion,
                        // Display Names
                        oecdArea: item.areaOcdeNombre,
                        oecdSubArea: item.subAreaOcdeNombre,
                        type: item.tipoTecnologiaNombre,
                        trl: item.nivelTrlNombre,
                        role: item.rolNombre,
                        date: item.fechaRegistro,
                        // Hidden IDs/Codes for Edit
                        areaId: item.areaOcdeId,
                        subAreaId: item.subAreaOcdeId,
                        typeCode: item.tipoTecnologiaCodigo,
                        trlCode: item.nivelTrlCodigo,
                        roleCode: item.rolCodigo
                    }));
                    this.cdr.detectChanges(); // Force view update
                },
                error: (err) => console.error('Failed to load transfers', err)
            });
        }
    }

    loadAreas() {
        this.catalogService.getAreas().subscribe({
            next: (data: any) => {
                this.areas = (data && Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
            },
            error: (err) => console.error('Failed to load areas', err)
        });
    }

    loadTechnologyTypes() {
        this.catalogService.getMasterDetailsByCode('TIPTEC').subscribe({
            next: (data) => {
                this.technologyTypes = (data && Array.isArray(data)) ? data : ((data && (data as any).data) ? (data as any).data : []);
            },
            error: (err) => console.error('Failed to load technology types', err)
        });
    }

    loadTrlLevels() {
        this.catalogService.getMasterDetailsByCode('NIVTRL').subscribe({
            next: (data) => {
                this.trlLevels = (data && Array.isArray(data)) ? data : ((data && (data as any).data) ? (data as any).data : []);
            },
            error: (err) => console.error('Failed to load TRL levels', err)
        });
    }

    loadRoles() {
        this.catalogService.getMasterDetailsByCode('ROTRTE').subscribe({
            next: (data) => {
                this.roles = (data && Array.isArray(data)) ? data : ((data && (data as any).data) ? (data as any).data : []);
            },
            error: (err) => console.error('Failed to load roles', err)
        });
    }

    onAreaChange(event: any) {
        const areaId = Number(event.target.value);
        this.subAreas = [];
        this.transferForm.get('oecdSubArea')?.reset('');

        if (areaId) {
            this.loadSubAreas(areaId);
        }
    }

    loadSubAreas(areaId: number) {
        this.catalogService.getSubAreas(areaId).subscribe({
            next: (data: any) => {
                this.subAreas = (data && Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
            },
            error: (err) => console.error('Failed to load sub-areas', err)
        });
    }

    // Modal Actions
    openIntellectualModal() {
        this.showIntellectualModal = true;
        this.isEditing = false;
        this.currentTransferId = null;
        this.intellectualForm.reset({
            title: '',
            type: '',
            status: '',
            registrationNumber: '',
            registrationCountry: '',
            registrationEntity: '',
            owner: '',
            role: '',
            rightsParticipation: false,
            isPct: false
        });
        this.intellectualFiles = [];
    }

    closeIntellectualModal() {
        this.showIntellectualModal = false;
        this.intellectualForm.reset({
            title: '',
            type: '',
            status: '',
            registrationNumber: '',
            registrationCountry: '',
            registrationEntity: '',
            owner: '',
            role: '',
            rightsParticipation: false,
            isPct: false
        });
        this.intellectualFiles = [];
        this.isEditing = false;
        this.currentTransferId = null;
    }



    saveIntellectualProperty() {
        if (this.intellectualForm.invalid) {
            this.intellectualForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario.');
            return;
        }

        const formValue = this.intellectualForm.value;

        // Map form values to API payload
        const payload = {
            active: true,
            investigadorId: currentUser.id,
            titulo: formValue.title,
            tipoPropiedadCodigo: this.findCodeById(this.intellectualTypes, formValue.type), // TPROIN code
            estadoActualCodigo: this.findCodeById(this.patentStatuses, formValue.status), // ESTPAT code
            numeroRegistro: formValue.registrationNumber,
            paisRegistroId: Number(formValue.registrationCountry),
            entidadRegistroCodigo: this.findCodeById(this.registrationEntities, formValue.registrationEntity), // ENTRPI code
            titular: formValue.owner,
            rolParticipacionCodigo: this.findCodeById(this.intellectualRoles, formValue.role), // ROLPAR code
            participaDerechos: formValue.rightsParticipation,
            tramitePct: formValue.isPct
        };

        const confirmMessage = this.isEditing
            ? '¿Está seguro de actualizar el registro de propiedad intelectual?'
            : '¿Está seguro de registrar la propiedad intelectual?';

        this.alertService.confirm('Confirmación', confirmMessage).then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.intellectualFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.PROTEC_CATEGORY, this.IP_SECTION)
                    .subscribe({
                        next: (uploadedFiles) => {
                            // Combine existing (if any logic needed) + new tokens
                            // For now assuming all files need to be sent or just new ones?
                            // Standard pattern: send all current files (including tokens of previously uploaded)
                            // intellectualFiles has both.
                            // But my uploadFiles helper needs to handle mixed content.
                            // Let's implement uploadFiles to handle this.

                            const tokensPayload = uploadedFiles
                                .filter((f: any) => f && f.token)
                                .map((f: any) => f.token);

                            const finalPayload = { ...payload, tokens: tokensPayload };

                            if (this.isEditing && this.currentTransferId) {
                                this.intellectualPropertyService.updateIntellectualProperty(this.currentTransferId, finalPayload).subscribe({
                                    next: () => {
                                        this.alertService.success('Éxito', 'Propiedad intelectual actualizada correctamente.');
                                        this.loadIntellectualProperties();
                                        this.closeIntellectualModal();
                                    },
                                    error: (err: any) => {
                                        console.error('Error updating IP', err);
                                        this.alertService.error('Error', 'Error al actualizar el registro.');
                                    }
                                });
                            } else {
                                this.intellectualPropertyService.createIntellectualProperty(finalPayload).subscribe({
                                    next: () => {
                                        this.alertService.success('Éxito', 'Propiedad intelectual registrada correctamente.');
                                        this.loadIntellectualProperties();
                                        this.closeIntellectualModal();
                                    },
                                    error: (err: any) => {
                                        console.error('Error creating IP', err);
                                        this.alertService.error('Error', 'Error al registrar la propiedad intelectual.');
                                    }
                                });
                            }
                        },
                        error: () => this.alertService.error('Error', 'Falló la subida de archivos.')
                    });
            }
        });
    }

    editIntellectualProperty(item: any) {
        this.isEditing = true;
        this.currentTransferId = item.id;
        this.showIntellectualModal = true;

        const raw = item.originalItem;
        if (raw) {
            this.intellectualForm.patchValue({
                title: raw.titulo || raw.title,
                type: this.findIdByCode(this.intellectualTypes, raw.tipoPropiedadCodigo || raw.propertyTypeId),
                status: this.findIdByCode(this.patentStatuses, raw.estadoActualCodigo || raw.estadoPatenteCodigo || raw.patentStatusId),
                registrationNumber: raw.numeroRegistro,
                registrationCountry: raw.paisRegistroId || raw.paisId || raw.countryId,
                registrationEntity: this.findIdByCode(this.registrationEntities, raw.entidadRegistroCodigo || raw.entidadTramiteCodigo || raw.registrationEntityId),
                owner: raw.titular || raw.owner,
                role: this.findIdByCode(this.intellectualRoles, raw.rolParticipacionCodigo || raw.roleId),
                rightsParticipation: raw.participaDerechos !== undefined ? raw.participaDerechos : raw.participacionDerechos,
                isPct: raw.tramitePct
            });

            // Load files from metadata service
            this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.PROTEC_CATEGORY, this.IP_SECTION, item.id)
                .subscribe({
                    next: (files: any[]) => {
                        this.intellectualFiles = files.map(f => ({
                            name: f.nombre,
                            token: f.token,
                            file: null // It's an existing file
                        }));
                    },
                    error: (err) => console.error('Error loading IP files', err)
                });
        }
    }

    onUploadError(error: boolean) {
        this.hasUploadError = error;
    }

    deleteIntellectualProperty(item: any) {
        this.alertService.confirm(
            'Confirmación',
            `¿Está seguro de eliminar el registro de propiedad intelectual "${item.title}" ? `
        ).then((confirmed) => {
            if (confirmed) {
                this.intellectualPropertyService.deleteIntellectualProperty(item.id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado correctamente.');
                        this.loadIntellectualProperties();
                    },
                    error: (err: any) => {
                        console.error('Error deleting IP', err);
                        this.alertService.error('Error', 'Error al eliminar el registro.');
                    }
                });
            }
        });
    }

    openIndustrialModal() {
        this.showIndustrialModal = true;
        this.isEditing = false;
        this.currentTransferId = null;
        this.industrialForm.reset({
            name: '',
            productType: '',
            noveltyLevel: '',
            developmentPhase: '',
            commercialStatus: '',
            owner: '',
            role: ''
        });
        this.industrialFiles = [];
    }

    closeIndustrialModal() {
        this.showIndustrialModal = false;
        this.industrialForm.reset({
            name: '',
            productType: '',
            noveltyLevel: '',
            developmentPhase: '',
            commercialStatus: '',
            owner: '',
            role: ''
        });
        this.industrialFiles = [];
        this.isEditing = false;
        this.currentTransferId = null;
    }

    saveIndustrialDevelopment() {
        if (this.industrialForm.invalid) {
            this.industrialForm.markAllAsTouched();
            return;
        }

        const currentUser = this.authService.getCurrentUser();
        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario.');
            return;
        }

        const formValue = this.industrialForm.value;

        const payload = {
            active: true,
            investigadorId: currentUser.id,
            nombreDesarrollo: formValue.name,
            tipoProductoCodigo: this.findCodeById(this.industrialTypes, formValue.productType),
            alcanceNovedadCodigo: this.findCodeById(this.developmentScopes, formValue.noveltyLevel),
            faseDesarrolloCodigo: this.findCodeById(this.developmentStatuses, formValue.developmentPhase),
            estadoComercialCodigo: this.findCodeById(this.industrialUseStatuses, formValue.commercialStatus),
            titular: formValue.owner,
            rolParticipacionCodigo: this.findCodeById(this.participationTypes, formValue.role)
        };

        const confirmMessage = this.isEditing
            ? '¿Está seguro de actualizar el desarrollo industrial?'
            : '¿Está seguro de registrar el desarrollo industrial?';

        this.alertService.confirm('Confirmación', confirmMessage).then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.industrialFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.PROTEC_CATEGORY, this.INDUSTRIAL_SECTION)
                    .subscribe({
                        next: (uploadedFiles) => {

                            const tokensPayload = uploadedFiles
                                .filter((f: any) => f && f.token)
                                .map((f: any) => f.token);

                            const finalPayload = { ...payload, tokens: tokensPayload };

                            if (this.isEditing && this.currentTransferId) {
                                this.industrialDevelopmentService.updateIndustrialDevelopment(this.currentTransferId, finalPayload).subscribe({
                                    next: () => {
                                        this.alertService.success('Éxito', 'Desarrollo industrial actualizado correctamente.');
                                        this.loadIndustrialDevelopments();
                                        this.closeIndustrialModal();
                                    },
                                    error: (err: any) => {
                                        console.error('Error updating industrial development', err);
                                        this.alertService.error('Error', 'Error al actualizar el desarrollo industrial.');
                                    }
                                });
                            } else {
                                this.industrialDevelopmentService.createIndustrialDevelopment(finalPayload).subscribe({
                                    next: () => {
                                        this.alertService.success('Éxito', 'Desarrollo industrial registrado correctamente.');
                                        this.loadIndustrialDevelopments();
                                        this.closeIndustrialModal();
                                    },
                                    error: (err: any) => {
                                        console.error('Error creating industrial development', err);
                                        this.alertService.error('Error', 'Error al registrar el desarrollo industrial.');
                                    }
                                });
                            }
                        },
                        error: () => this.alertService.error('Error', 'Falló la subida de archivos.')
                    });
            }
        });
    }



    editIndustrialDevelopment(item: any) {
        this.isEditing = true;
        this.currentTransferId = item.id; // Reusing currentTransferId for simplicity, or create currentIndustrialId
        this.showIndustrialModal = true;

        // Use originalItem to get raw codes if available, otherwise map from display properties?
        // In loadIndustrialDevelopments we mapped:
        // name: item.nombre, productType: item.productTypeNombre
        // We likely need the codes. The API response (GET) usually returns codes too.
        // Let's assume originalItem has the codes or the mapped object needs to store them.
        // For now, I will try to patch with the original item's codes.

        const raw = item.originalItem;
        if (raw) {
            this.industrialForm.patchValue({
                name: raw.nombreDesarrollo,
                productType: this.findIdByCode(this.industrialTypes, raw.tipoProductoCodigo),
                noveltyLevel: this.findIdByCode(this.developmentScopes, raw.alcanceNovedadCodigo),
                developmentPhase: this.findIdByCode(this.developmentStatuses, raw.faseDesarrolloCodigo),
                commercialStatus: this.findIdByCode(this.industrialUseStatuses, raw.estadoComercialCodigo),
                owner: raw.titular,
                role: this.findIdByCode(this.participationTypes, raw.rolParticipacionCodigo)
            });

            // Load files from metadata service
            this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.PROTEC_CATEGORY, this.INDUSTRIAL_SECTION, item.id)
                .subscribe({
                    next: (files: any[]) => {
                        this.industrialFiles = files.map(f => ({
                            name: f.nombre,
                            token: f.token,
                            file: null
                        }));
                    },
                    error: (err) => console.error('Error loading Industrial files', err)
                });
        }
    }

    deleteIndustrialDevelopment(item: any) {
        this.alertService.confirm(
            'Confirmación',
            `¿Está seguro de eliminar el desarrollo industrial "${item.name}" ? `
        ).then((confirmed) => {
            if (confirmed) {
                this.industrialDevelopmentService.deleteIndustrialDevelopment(item.id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Registro eliminado correctamente.');
                        this.loadIndustrialDevelopments();
                    },
                    error: (err) => {
                        console.error('Error deleting industrial development', err);
                        this.alertService.error('Error', 'Error al eliminar el registro.');
                    }
                });
            }
        });
    }

    openTransferModal() {
        this.showTransferModal = true;
        this.isEditing = false;
        this.currentTransferId = null;
        this.transferFiles = [];
    }

    closeTransferModal() {
        this.showTransferModal = false;
        this.isEditing = false;
        this.currentTransferId = null;
        this.transferFiles = []; // Reset files
        this.transferForm.reset({
            technologyName: '',
            description: '',
            technologyType: '',
            trlLevel: '',
            oecdArea: '',
            oecdSubArea: '',
            role: '',
            registrationDate: ''
        });
    }

    editTransfer(item: TechnologicalTransferItem) {
        this.isEditing = true;
        this.currentTransferId = item.id;
        this.showTransferModal = true;

        // Force load subareas if area is present
        if (item.areaId) {
            this.loadSubAreas(item.areaId);
        }

        // Map values. Note: API returns CODES/IDs in list, need to match with form
        // Find IDs for codes if necessary using hidden Code fields
        const typeId = this.findIdByCode(this.technologyTypes, item.typeCode);
        const trlId = this.findIdByCode(this.trlLevels, item.trlCode);
        const roleId = this.findIdByCode(this.roles, item.roleCode);

        this.transferForm.patchValue({
            technologyName: item.title,
            description: item.description,
            technologyType: typeId,
            trlLevel: trlId,
            oecdArea: item.areaId,
            oecdSubArea: item.subAreaId,
            role: roleId,
            registrationDate: item.date
        });

        // Load files from metadata service
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.PROTEC_CATEGORY, this.TRANSFER_SECTION, item.id)
            .subscribe({
                next: (files: any[]) => {
                    this.transferFiles = files.map(f => ({
                        name: f.nombre,
                        token: f.token,
                        file: null
                    }));
                },
                error: (err) => console.error('Error loading Transfer files', err)
            });
    }

    deleteTransfer(item: TechnologicalTransferItem) {
        this.alertService.confirm(
            'Confirmación',
            `¿Está seguro de eliminar la transferencia tecnológica "${item.title}" ? `
        ).then(confirmed => {
            if (confirmed) {
                this.technologicalTransferService.deleteTransfer(item.id).subscribe({
                    next: () => {
                        this.alertService.success('Éxito', 'Transferencia eliminada correctamente');
                        this.loadTransfers();
                    },
                    error: (err) => {
                        console.error('Delete error', err);
                        this.alertService.error('Error', 'No se pudo eliminar la transferencia');
                    }
                });
            }
        });
    }

    saveTransfer() {
        if (this.transferForm.invalid) {
            this.transferForm.markAllAsTouched();
            return;
        }

        const formValue = this.transferForm.value;
        const currentUser = this.authService.getCurrentUser();

        if (!currentUser?.id) {
            this.alertService.error('Error', 'No se pudo identificar al usuario actual');
            return;
        }

        // Dropdowns have IDs (from value="type.id").
        // API wants CODES for these 3 fields.
        const typeCode = this.findCodeById(this.technologyTypes, formValue.technologyType);
        const trlCode = this.findCodeById(this.trlLevels, formValue.trlLevel);
        const roleCode = this.findCodeById(this.roles, formValue.role);

        const payload = {
            active: true,
            investigadorId: currentUser.id,
            nombreTecnologia: formValue.technologyName,
            descripcion: formValue.description,
            fechaRegistro: formValue.registrationDate, // Assuming format matches YYYY-MM-DD or is handled
            areaOcdeId: Number(formValue.oecdArea) || 0,
            subAreaOcdeId: Number(formValue.oecdSubArea) || 0,
            tipoTecnologiaCodigo: typeCode,
            nivelTrlCodigo: trlCode,
            rolCodigo: roleCode
        };

        const confirmMessage = this.isEditing
            ? '¿Está seguro de actualizar esta transferencia tecnológica?'
            : '¿Está seguro de registrar esta transferencia tecnológica?';

        this.alertService.confirm('Confirmación', confirmMessage).then(confirmed => {
            if (confirmed) {
                this.uploadFiles(this.transferFiles, this.INVESTIGATOR_MODULE, FileType.DOCUMENT, this.PROTEC_CATEGORY, this.TRANSFER_SECTION)
                    .subscribe({
                        next: (uploadedFiles) => {
                            const tokensPayload = uploadedFiles
                                .filter((f: any) => f && f.token)
                                .map((f: any) => f.token);

                            const finalPayload = { ...payload, tokens: tokensPayload };

                            if (this.isEditing && this.currentTransferId) {
                                this.technologicalTransferService.updateTransfer(this.currentTransferId, finalPayload).subscribe({
                                    next: () => {
                                        this.alertService.success('Éxito', 'Transferencia actualizada correctamente');
                                        this.closeTransferModal();
                                        // Use setTimeout to ensure UI updates and avoid race conditions or zone issues
                                        setTimeout(() => {
                                            this.loadTransfers();
                                        }, 100);
                                    },
                                    error: (err) => {
                                        console.error('Update error', err);
                                        this.alertService.error('Error', 'No se pudo actualizar la transferencia');
                                    }
                                });
                            } else {
                                this.technologicalTransferService.createTransfer(finalPayload).subscribe({
                                    next: () => {
                                        this.alertService.success('Éxito', 'Transferencia registrada correctamente');
                                        this.closeTransferModal();
                                        // Use setTimeout to ensure UI updates
                                        setTimeout(() => {
                                            this.loadTransfers();
                                        }, 100);
                                    },
                                    error: (err) => {
                                        console.error('Create error', err);
                                        this.alertService.error('Error', 'No se pudo registrar la transferencia');
                                    }
                                });
                            }
                        },
                        error: () => this.alertService.error('Error', 'Falló la subida de archivos.')
                    });
            }
        });
    }

    // Helper to find ID by Code (for Edit)
    private findIdByCode(list: CatalogItem[], code: any): number | string {
        if (!list || !code) return '';

        const codeStr = String(code).trim();

        // 1. Precise Match
        let item = list.find(x => x.codigo === codeStr);
        if (item) return item.id;

        // 2. Loose Match (ignore leading zeros for numeric codes)
        const codeNum = parseInt(codeStr, 10);
        if (!isNaN(codeNum)) {
            item = list.find(x => parseInt(x.codigo, 10) === codeNum);
            if (item) return item.id;
        }

        // 3. Case Insensitive
        item = list.find(x => x.codigo.toLowerCase() === codeStr.toLowerCase());
        return item ? item.id : '';
    }

    // Helper to find Code by ID (for Save)
    private findCodeById(list: CatalogItem[], id: any): string {
        // ID could be number or string depending on form
        const item = list.find(x => x.id == id);
        return item ? item.codigo : '';
    }

    // New Helper for File Uploads
    private uploadFiles(files: any[], module: string, type: string, category: string, section: string): Observable<any[]> {
        if (!files || files.length === 0) {
            return of([]);
        }

        const observables = files.map(fileObj => {
            if (fileObj.file) {
                // It's a new file, upload it
                return this.fileService.uploadFile(fileObj.file, module, type, category, section, false).pipe(
                    map(response => ({
                        name: fileObj.name,
                        token: response.token || response.data?.token // Adjust based on API structure
                    }))
                );
            } else if (fileObj.token) {
                // Existing file with token
                return of({
                    name: fileObj.name,
                    token: fileObj.token
                });
            }
            return of(null);
        });

        return forkJoin(observables);
    }

    openFileViewer(item: any, section: string) {
        this.fileService.listFilesMetadata(this.INVESTIGATOR_MODULE, this.PROTEC_CATEGORY, section, item.id).subscribe({
            next: (files: any[]) => {
                if (files && files.length > 0) {
                    this.viewerFiles = files.map(f => ({
                        url: this.fileService.getFileUrl(f.token),
                        token: f.token,
                        name: f.nombre,
                        type: 'PDF' // Assuming PDF for now, or derive from name/mime
                    }));
                    this.showFileViewer = true;
                } else {
                    this.alertService.warning('Aviso', 'No hay archivos adjuntos para este registro.');
                }
            },
            error: (err) => {
                console.error('Error loading files for viewer', err);
                this.alertService.error('Error', 'No se pudieron cargar los archivos.');
            }
        });
    }
}
