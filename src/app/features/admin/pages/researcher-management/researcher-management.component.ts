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
import { ResearcherService, PublicResearcher } from '../../../../core/services/researcher.service';
import { FileViewerModalComponent, ViewerFile } from '../../../../shared/components/file-viewer-modal/file-viewer-modal.component';
import { FileModule, FileType } from '../../../../core/constants/file-upload.constants';
import { FileService } from '../../../../core/services/file.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { AlertService } from '../../../../core/services/alert.service';
import { UbigeoService } from '../../../../core/services/ubigeo.service';
import { UserService, UserProfileApi } from '../../../../core/services/user.service';
import { CapitalizePipe } from '../../../../shared/pipes/capitalize.pipe';
import { environment } from '../../../../../environments/environment';

interface Researcher {
    id: string;
    gender: string | null;
    name: string;
    degree: string;
    region: string;
    institution: string;
    regina: string;
    status: string;
    userId: string;
    email?: string;
    sexName?: string;
    selected?: boolean;
    idInvestigador?: number | string;
    docToken?: string | null;
    raw?: any;
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
    imports: [CommonModule, FormsModule, FormModalComponent, IntroCardComponent, RouterModule, DateFormatPipe, FileViewerModalComponent, CapitalizePipe],
    providers: [DateFormatPipe],
    templateUrl: './researcher-management.component.html',
    styleUrls: ['./researcher-management.component.scss']
})
export class ResearcherManagementComponent {
    activeTab = 'directory'; // 'directory' | 'requests'
    searchTerm = '';
    appliedSearchTerm = '';

    // Sorting
    sortField: string = 'name';
    sortOrder: 'asc' | 'desc' = 'asc';

    // Pagination
    currentPage = 1;
    pageSize = 10;

    // Data
    researchers: Researcher[] = [];
    totalElements = 0;

    // Filters
    filterGeneric = '';
    filterArea = '';
    filterRegion = '';
    filterNationality = 'peruana';
    filterSunedu = '';

    // Catalogs
    areas: any[] = [];
    departments: any[] = [];
    genders: any[] = [];

    // For the active menu dropdown
    selectedItemForMenu: Researcher | null = null;

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
        gender: '' as string
    };
    currentResearcherProfile: any = null;

    reviewForm = {
        adminObservation: ''
    };

    selectedResearcher: Researcher | null = null;
    selectedRequest: DerecognitionRequest | null = null;

    // Requests Data
    requests: DerecognitionRequest[] = [];

    // File Viewer
    showFileViewer = false;
    viewerFiles: ViewerFile[] = [];

    constructor(
        private elementRef: ElementRef,
        private authService: AuthService,
        private researcherService: ResearcherService,
        private catalogService: CatalogService,
        private ubigeoService: UbigeoService,
        private alertService: AlertService,
        private userService: UserService,
        private fileService: FileService,
        private cdr: ChangeDetectorRef,
        private dateFormatPipe: DateFormatPipe
    ) { }

    get isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    get isSuperAdmin(): boolean {
        return this.authService.isSuperAdmin();
    }

    get canEdit(): boolean {
        return this.isAdmin || this.isSuperAdmin;
    }

    ngOnInit() {
        this.loadCatalogs();
        this.loadResearchers();
    }

    loadCatalogs() {
        this.catalogService.getAreas().subscribe(data => this.areas = data);
        this.ubigeoService.getCountries().subscribe(countries => {
            const peru = countries.find(c => c.nombre.toUpperCase() === 'PERÚ' || c.nombre.toUpperCase() === 'PERU');
            if (peru) {
                this.ubigeoService.getDepartments(peru.id).subscribe(deps => this.departments = deps);
            }
        });
        this.catalogService.getMasterDetails(2).subscribe(data => {
            this.genders = data;
        });
    }

    loadResearchers() {
        if (this.activeTab !== 'directory') return;

        console.log('Fetching all users for front-end pagination and local filtering');

        this.userService.getOnlyUsers(false, 0, 9999, '').subscribe({
            next: (data) => {
                console.log('API Response received (Researchers):', data);

                const usersList = Array.isArray(data) ? data : (data.content || []);
                this.totalElements = Array.isArray(data) ? data.length : (data.totalElements || 0);

                const mapped = usersList.map((item: UserProfileApi) => this.mapUserToViewModel(item));
                this.researchers = [...mapped];
                this.cdr.detectChanges();
                console.log('Mapped researchers from users:', this.researchers.length);
            },
            error: (err) => {
                console.error('Error loading researchers from users API', err);
                this.alertService.error('Error', 'No se pudieron cargar los datos de los investigadores');
            }
        });
    }

    mapUserToViewModel(u: UserProfileApi): Researcher {
        const fullName = `${u.nombres || ''} ${u.apellidoPaterno || ''} ${u.apellidoMaterno || ''}`.trim();

        // 1. Buscar coincidencia en el catálogo del sistema
        const catalogItem = this.genders.find(g => g.codigo === u.sexo);

        // 2. Determinar el nombre a mostrar (Nombre del catálogo > código original > guiones)
        // Eliminamos suposiciones, usamos estrictamente lo que diga el sistema
        let sexName = catalogItem ? catalogItem.nombre : (u.sexo || '---');

        // 3. Determinar icono dinámicamente basado en la DESCRIPCIÓN del catálogo
        // Esto desacopla la UI de códigos específicos como SEX001 si el catálogo cambia
        let genderIcon: 'M' | 'F' | null = null;

        if (catalogItem) {
            const nameUpper = catalogItem.nombre.toUpperCase();
            if (nameUpper.includes('MASCULINO')) {
                genderIcon = 'M';
            } else if (nameUpper.includes('FEMENINO')) {
                genderIcon = 'F';
            }
        }
        // Fallback solo si el valor crudo ya es explícitamente M o F (legacy data)
        else if (u.sexo === 'M') {
            genderIcon = 'M';
        } else if (u.sexo === 'F') {
            genderIcon = 'F';
        }

        return {
            id: u.id?.toString(),
            gender: genderIcon,
            name: fullName || u.username || 'Sin registro',
            degree: '---',
            region: '---',
            institution: 'Sin asignar',
            regina: '---',
            status: (u.active ?? u.activo) ? 'Activo' : 'Inactivo',
            userId: u.username || '',
            email: u.email || '',
            sexName: sexName,
            selected: false,
            idInvestigador: u.idInvestigador || u.id,
            docToken: u.docToken || null,
            raw: u
        };
    }

    clearFilters() {
        this.filterGeneric = '';
        this.filterArea = '';
        this.filterRegion = '';
        this.filterNationality = 'peruana';
        this.filterSunedu = '';
        this.currentPage = 1;
        this.loadResearchers();
    }

    mapToViewModel(item: PublicResearcher): Researcher {
        // Find gender for icon logic
        let genderMapped: 'M' | 'F' = 'M';
        if (item.sexo) {
            if (item.sexo === 'M' || item.sexo === 'SEX001') genderMapped = 'M';
            else if (item.sexo === 'F' || item.sexo === 'SEX002') genderMapped = 'F';
        }

        const sexName = this.genders.find(g => g.codigo === item.sexo)?.nombre || item.sexo || '';

        return {
            id: item.id?.toString() || '',
            gender: genderMapped,
            name: `${item.nombres || ''} ${item.apellidoPaterno || ''} ${item.apellidoMaterno || ''}`.trim(),
            degree: item.estadoRenacyt || '',
            region: item.departamentoId?.toString() || '',
            institution: '',
            regina: item.codigoUnico || '',
            status: item.activo ? 'Activo' : 'Inactivo',
            userId: item.usuarioId?.toString() || '',
            email: (item.resumenEjecutivo || item.estado || '').substring(0, 300),
            sexName: sexName,
            idInvestigador: item.id,
            docToken: item.docToken
        };
    }

    get filteredRequests() {
        return this.requests.filter(r =>
            this.activeTab === 'requests' &&
            (r.researcherName.toLowerCase().includes(this.appliedSearchTerm.toLowerCase()) ||
                r.email.toLowerCase().includes(this.appliedSearchTerm.toLowerCase()) ||
                r.id.toString().includes(this.appliedSearchTerm))
        ).sort((a, b) => Number(a.id) - Number(b.id));
    }

    get filteredResearchers(): Researcher[] {
        let result = this.researchers;

        if (this.appliedSearchTerm) {
            const term = this.appliedSearchTerm.toLowerCase();
            result = result.filter(r =>
                r.name.toLowerCase().includes(term) ||
                (r.email && r.email.toLowerCase().includes(term)) ||
                r.id.toLowerCase().includes(term) ||
                (r.userId && r.userId.toLowerCase().includes(term))
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

    get paginatedResearchers(): Researcher[] {
        if (this.activeTab !== 'directory') return [];
        const filtered = this.filteredResearchers;
        const start = (this.currentPage - 1) * this.pageSize;
        return filtered.slice(start, start + this.pageSize);
    }

    get paginatedRequests(): DerecognitionRequest[] {
        if (this.activeTab !== 'requests') return [];
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredRequests.slice(start, start + this.pageSize);
    }

    get totalPages() {
        if (this.activeTab === 'directory') {
            return Math.ceil(this.totalElements / this.pageSize) || 1;
        }
        const source = this.filteredRequests;
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
        const current = this.currentPage;
        const maxVisible = 5;

        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = Math.min(total, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        const pages = [];
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    }

    // Handlers
    search() {
        console.log('Search triggered via button/enter');
        this.appliedSearchTerm = this.filterGeneric;
        this.currentPage = 1;
        if (this.activeTab === 'directory' && this.researchers.length === 0) {
            this.loadResearchers();
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

    onSearchChange() {
        // user requested manual search trigger
    }

    setPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    toggleTab(tab: string) {
        if (tab === 'requests' && !this.canEdit) {
            return;
        }
        this.activeTab = tab;
        this.currentPage = 1;
        this.searchTerm = '';
        this.filterGeneric = '';
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

    // (Old method removed)

    openAccessModal(researcher: Researcher) {
        this.selectedResearcher = researcher;
        this.selectedItemForMenu = null;
        this.currentResearcherProfile = null;

        this.accessForm = {
            username: researcher.userId,
            email: researcher.email || '',
            fullName: researcher.name,
            forceChange: false,
            active: (researcher.raw as UserProfileApi)?.active ?? (researcher.raw as UserProfileApi)?.activo ?? (researcher.status !== 'Inactivo')
        };

        this.currentResearcherProfile = researcher.raw;
        this.showAccessModal = true;
    }

    openEditModal(researcher: Researcher) {
        this.selectedResearcher = researcher;
        this.selectedItemForMenu = null;
        this.currentResearcherProfile = null;

        // Initialize with basic data from researcher directory row
        this.editForm = {
            fullName: researcher.name,
            email: researcher.email || '',
            birthDate: '', // To be filled from researcher profile
            gender: (researcher.raw?.sexo || '') as string
        };

        this.showEditModal = true;

        if (researcher.idInvestigador) {
            // Fetch the detailed researcher profile to get birthDate, etc.
            this.authService.getInvestigatorById(Number(researcher.idInvestigador)).subscribe({
                next: (res) => {
                    const data = res.data || res;
                    if (data) {
                        this.currentResearcherProfile = data;


                        const birthDateVal = data.fechaNacimiento || null;

                        // Reemplazamos el objeto completo para garantizar que
                        // Angular detecte el cambio (evita problema de mutación)
                        this.editForm = {
                            fullName: this.editForm.fullName,
                            email: data.email || this.editForm.email,
                            birthDate: birthDateVal ? birthDateVal.split('T')[0] : '',
                            gender: data.sexo || this.editForm.gender
                        };

                        this.cdr.detectChanges();
                    }
                },
                error: (err) => console.error('Error fetching researcher profile', err)
            });
        }
    }

    openReviewModal(request: DerecognitionRequest) {
        this.selectedRequest = request;
        this.reviewForm = {
            adminObservation: request.observacionAdmin || ''
        };
        this.showReviewModal = true;
    }

    saveAccess() {
        if (!this.currentResearcherProfile?.id) {
            this.alertService.error('Error', 'No se ha cargado el perfil del investigador para actualizar el acceso');
            return;
        }

        const updateId = this.currentResearcherProfile.usuarioId || this.currentResearcherProfile.id;
        const action = this.accessForm.active ?
            this.userService.activateUser(updateId) :
            this.userService.deactivateUser(updateId);

        this.alertService.loading('Actualizando estado de cuenta...');

        action.subscribe({
            next: () => {
                this.alertService.close();
                this.alertService.success('Éxito', `Cuenta ${this.accessForm.active ? 'activada' : 'desactivada'} correctamente`);
                this.showAccessModal = false;

                // Optimistic update
                if (this.selectedResearcher) {
                    this.selectedResearcher.status = this.accessForm.active ? 'Activo' : 'Inactivo';
                    if (this.selectedResearcher.raw) {
                        this.selectedResearcher.raw.active = this.accessForm.active;
                        this.selectedResearcher.raw.activo = this.accessForm.active;
                    }
                }

                // Refresh from server with a small delay
                setTimeout(() => this.loadResearchers(), 300);
            },
            error: (err) => {
                console.error('Error updating account state via researcher API', err);
                this.alertService.close();
                this.alertService.error('Error', 'No se pudo actualizar el estado de la cuenta');
            }
        });
    }

    saveEdit() {
        const investigatorId = this.currentResearcherProfile?.id || this.selectedResearcher?.idInvestigador;

        if (!investigatorId || !this.currentResearcherProfile) {
            this.alertService.error('Error', 'No se pudieron cargar los datos necesarios para actualizar el perfil');
            return;
        }

        const p = this.currentResearcherProfile;
        const raw = this.selectedResearcher?.raw || {};

        // Explicitly construct payload according to the required structure in the provided example
        const payload = {
            activo: raw.active,
            apellidoMaterno: p.apellidoMaterno,
            apellidoPaterno: p.apellidoPaterno,
            celular: p.celular,
            codigoUnico: p.codigoUnico,
            departamentoId: p.departamentoId,
            direccion: p.direccion,
            distritoId: p.distritoId,
            docToken: p.docToken,
            email: this.editForm.email,
            emailPublico: p.emailPublico, // Syncing with email as they usually match in the directory
            estado: p.estado,
            estadoRenacyt: p.estadoRenacyt,
            fechaNacimiento: this.editForm.birthDate,
            fechaValidacion: p.fechaValidacion,
            fotoToken: p.fotoToken,
            googleScholarId: p.googleScholarId,
            nacionalidad: p.nacionalidad,
            nombres: p.nombres,
            numDoc: p.numDoc,
            orcid: p.orcid,
            paisNacimientoId: p.paisNacimientoId,
            paisResidenciaId: p.paisResidenciaId,
            // password: p.password,
            provinciaId: p.provinciaId,
            researcherId: p.researcherId,
            resumenEjecutivo: p.resumenEjecutivo,
            scopusAuthorId: p.scopusAuthorId,
            sexo: this.editForm.gender,
            telefono: p.telefono,
            telefonoAlternativo: p.telefonoAlternativo,
            tipoDoc: p.tipoDoc,
            ubigeo: p.ubigeo,
            usuarioId: p.usuarioId,
            validado: p.validado,
            validadoPor: p.validadoPor,
            webPersonal: p.webPersonal
        };

        const idForUrl = Number(investigatorId);

        this.alertService.loading('Guardando cambios...');

        this.researcherService.updateResearcher(idForUrl, payload).subscribe({
            next: () => {
                this.finishEdit('Cambios guardados correctamente');
                this.loadResearchers(); // Refresh the list to show new data
            },
            error: (err) => {
                console.error('Error updating researcher profile', err);
                this.alertService.close();
                this.alertService.error('Error', 'No se pudieron guardar los cambios en el perfil. Verifica los datos ingresados.');
            }
        });
    }

    private finishEdit(message: string) {
        this.alertService.close();
        this.alertService.success('Éxito', message);
        this.showEditModal = false;
        this.loadResearchers();
    }

    viewDocument(item: Researcher) {
        if (!item.docToken) return;

        this.viewerFiles = [{
            name: 'Documento de Identidad',
            url: '',
            type: 'PDF', // Default to PDF, getFileType could refine this
            token: item.docToken
        }];
        this.showFileViewer = true;
    }

    toggleDropdown(event: Event, item: Researcher) {
        event.stopPropagation();
        this.selectedItemForMenu = this.selectedItemForMenu === item ? null : item;
    }

    viewPublicProfile(item: Researcher) {
        this.selectedItemForMenu = null;
        // Usar baseHref del environment para construir la URL correcta
        const baseHref = environment.baseHref || '/';
        const url = `${window.location.origin}${baseHref}search/researcher/${item.raw.id}`;
        window.open(url, '_blank');
    }

    downloadResearcherPDF(item: Researcher) {
        this.selectedItemForMenu = null;
        console.log('Downloading PDF for researcher:', item.name);
        const data = [this.mapToSpanish(item)];
        const doc = new jsPDF();
        autoTable(doc, {
            head: [Object.keys(data[0])],
            body: data.map(obj => Object.values(obj).map(String)),
            theme: 'grid'
        });
        doc.save(`Ficha_${item.name.replace(/\s+/g, '_')}.pdf`);
    }

    downloadResearcherExcel(item: Researcher) {
        this.selectedItemForMenu = null;
        const data = [this.mapToSpanish(item)];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Datos');
        XLSX.writeFile(wb, `Datos_${item.name.replace(/\s+/g, '_')}.xlsx`);
    }

    manageAccess(item: Researcher) {
        this.selectedItemForMenu = null;
        this.openAccessModal(item);
    }

    editResearcher(item: Researcher) {
        this.selectedItemForMenu = null;
        this.openEditModal(item);
    }

    cancelAccount(item: Researcher) {
        this.selectedItemForMenu = null;
        this.alertService.warning('Anular Cuenta', `¿Está seguro que desea anular la cuenta de ${item.name}?`);
    }

    approveDerecognition(isValid: boolean = true) {
        if (!isValid) return;
        if (!this.selectedRequest) return;
        if (!this.reviewForm.adminObservation) return;

        const payload = {
            id: this.selectedRequest.originalId,
            estado: 'APROBADA',
            observacionAdmin: this.reviewForm.adminObservation,
            adminId: this.selectedRequest.researcherId
        };

        this.authService.processAccountDeletion(payload).subscribe({
            next: () => {
                this.showReviewModal = false;
                this.loadRequests();
            },
            error: (err) => console.error('Error processing request', err)
        });
    }

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

        return `Export_${day}${month}${year}_${hours}${minutes}`;
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
            headStyles: { fillColor: [0, 84, 112] }
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
        const target = event.target as HTMLElement;
        const isMenuTrigger = target.closest('.btn-more');
        const isInsideMenu = target.closest('.dropdown-menu-modern');

        if (!isMenuTrigger && !isInsideMenu) {
            this.selectedItemForMenu = null;
        }
    }
}
