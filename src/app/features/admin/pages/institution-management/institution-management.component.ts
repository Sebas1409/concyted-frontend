import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { InstitutionSelectComponent } from '../../../../shared/components/institution-select/institution-select.component';
import { AlertService } from '../../../../core/services/alert.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NormalizationService, Institucion, CorregirRequest } from '../../../../core/services/normalization.service';

interface InstitutionUI {
    id: string; // RUC
    name: string; // Razon Social
    url: string;
    checked: boolean;
}

@Component({
    selector: 'app-institution-management',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, IntroCardComponent, FormModalComponent, InstitutionSelectComponent],
    templateUrl: './institution-management.component.html',
    styleUrls: ['./institution-management.component.scss']
})
export class InstitutionManagementComponent implements OnInit {
    // Search and Pagination
    searchTerm: string = '';
    appliedSearchTerm: string = '';
    pageSize: number = 10;
    currentPage: number = 1;
    
    // Core Data
    institutions: InstitutionUI[] = [];
    isLoading: boolean = false;
    
    // Linking / Normalization Modal State
    showLinkModal: boolean = false;
    isProcessingLink: boolean = false;
    normalizationData: Institucion[] = [];
    normalizationSearchTerm: string = '';
    principalInstitution: Institucion | null = null;
    institutionsToCorrect: Institucion[] = [];

    // Form Control for the reusable institution-select
    principalFormControl = new FormControl();

    // Sorting
    sortField: string = 'name';
    sortOrder: 'asc' | 'desc' = 'asc';

    constructor(
        private alertService: AlertService,
        private normalizationService: NormalizationService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        console.log('[DEBUG] InstitutionManagementComponent initialized');
        this.loadMainInstitutions();
    }

    loadMainInstitutions() {
        this.isLoading = true;
        console.log('[DEBUG] Calling getInstitucionesNormalizacion for main table');
        
        this.normalizationService.getInstitucionesNormalizacion()
            .pipe(finalize(() => {
                this.isLoading = false;
                console.log('[DEBUG] Loading state cleared');
            }))
            .subscribe({
                next: (res: any) => {
                    this.isLoading = false;
                    this.cdr.detectChanges();
                    console.log('[DEBUG] Response processed:', res);
                    
                    if (res && res.instituciones) {
                        this.institutions = res.instituciones.map((i: any) => ({
                            id: i.ruc || '[Sin RUC]',
                            name: i.razonSocial || '[Sin Razón Social]',
                            url: '---', 
                            checked: false
                        }));
                    } else {
                        this.institutions = [];
                    }
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isLoading = false;
                    this.cdr.detectChanges();
                    console.error('[DEBUG] Error fetching:', err);
                    this.alertService.error('Error', 'No se pudo cargar la lista de instituciones');
                }
            });
    }

    // Modal logic
    openLinkModal() {
        const selectedCount = this.institutions.filter(i => i.checked).length;
        
        if (selectedCount === 0) {
            this.alertService.warning(
                'Sin Selección', 
                'Debe seleccionar al menos una institución de la tabla para iniciar el proceso de vinculación.'
            );
            return;
        }

        this.showLinkModal = true;
        this.principalInstitution = null;
        this.normalizationSearchTerm = '';
        this.isProcessingLink = false;
        this.principalFormControl.reset('', { emitEvent: false });
        
        // Auto-select duplicate records from checkboxes
        this.institutionsToCorrect = this.institutions
            .filter(i => i.checked)
            .map(i => ({
                ruc: i.id === '[Sin RUC]' ? '' : i.id,
                razonSocial: i.name === '[Sin Razón Social]' ? '' : i.name
            }));

        this.loadNormalizationData();
    }

    loadNormalizationData() {
        this.normalizationService.getInstitucionesNormalizacion().subscribe({
            next: (res) => {
                this.normalizationData = res.instituciones || [];
            },
            error: (err) => {
                console.error('[DEBUG] Error loading normalization data for modal:', err);
            }
        });
    }

    setAsPrincipal(inst: any) {
        // Adaptation for both current list items and master catalog items
        const mapping: Institucion = {
            ruc: inst.ruc || inst.codigo || '',
            razonSocial: inst.razonSocial || inst.nombre || ''
        };

        this.principalInstitution = mapping;
        this.normalizationSearchTerm = ''; 
        this.principalFormControl.setValue(mapping.razonSocial, { emitEvent: false });

        // User requested to keep all selected items even if picked as principal
    }

    removeFromCorrection(index: number) {
        this.institutionsToCorrect.splice(index, 1);
    }

    // Final Action (PUT)
    confirmLink() {
        // Relax check: Principal must have at least a Name
        if (!this.principalInstitution || (!this.principalInstitution.ruc?.trim() && !this.principalInstitution.razonSocial?.trim())) {
            this.alertService.warning('Paso 1 Incompleto', 'Seleccione una institución maestra válida');
            return;
        }
        
        // Final validation of corrections list: must have at least one record (with ruc or name)
        const validCorrections = this.institutionsToCorrect.filter(i => i.ruc?.trim() || i.razonSocial?.trim());
        if (validCorrections.length === 0) {
            this.alertService.warning('Paso 2 Incompleto', 'Seleccione al menos una institución para ser reemplazada');
            return;
        }

        const principalRuc = this.principalInstitution.ruc?.trim() || '';
        // Conflict check removed by user request: Allow linking even if principal is in corrections list

        const request: CorregirRequest = {
            institucionPrincipal: { ...this.principalInstitution, ruc: principalRuc },
            institucionesPorCorregir: validCorrections.map(i => ({ ...i, ruc: i.ruc?.trim() || '' }))
        };

        this.isProcessingLink = true;
        console.log('[DEBUG] Sending Correction Request:', JSON.stringify(request, null, 2));

        this.normalizationService.corregirInstituciones(request)
            .pipe(finalize(() => {
                this.isProcessingLink = false;
                this.cdr.detectChanges();
            }))
            .subscribe({
                next: (res) => {
                    this.isProcessingLink = false;
                    
                    const count = validCorrections.length;
                    const msg = count === 1 
                        ? `Se ha vinculado 1 institución correctamente a la entidad maestra.`
                        : `Se han vinculado ${count} instituciones correctamente a la entidad maestra.`;
                    
                    this.alertService.success('Vinculación Exitosa', msg);
                    
                    this.showLinkModal = false;
                    this.institutions.forEach(i => i.checked = false);
                    this.loadMainInstitutions();
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    this.isProcessingLink = false;
                    console.error('[DEBUG] Full error object from API:', err);
                    const errorMsg = err.error?.message || 'Error inesperado al procesar la vinculación. Por favor, reintente.';
                    this.alertService.error('Error de Servidor', errorMsg);
                    this.cdr.detectChanges();
                }
            });
    }

    // Getters for table display
    get filteredNormalizationData(): Institucion[] {
        if (!this.normalizationSearchTerm) return this.normalizationData;
        const term = this.normalizationSearchTerm.toLowerCase();
        return this.normalizationData.filter(i =>
            (i.ruc && i.ruc.toLowerCase().includes(term)) ||
            (i.razonSocial && i.razonSocial.toLowerCase().includes(term))
        );
    }

    get filteredInstitutions(): InstitutionUI[] {
        let result = this.institutions;
        if (this.appliedSearchTerm) {
            const term = this.appliedSearchTerm.toLowerCase();
            result = result.filter(i =>
                i.id.toLowerCase().includes(term) ||
                i.name.toLowerCase().includes(term)
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

    get paginatedInstitutions(): InstitutionUI[] {
        const filtered = this.filteredInstitutions;
        const start = (this.currentPage - 1) * this.pageSize;
        return filtered.slice(start, start + this.pageSize);
    }

    get totalPages() {
        return Math.ceil(this.filteredInstitutions.length / this.pageSize) || 1;
    }

    get pagesArray(): number[] {
        const total = this.totalPages;
        const pages = [];
        for (let i = 1; i <= total; i++) {
            pages.push(i);
        }
        return pages;
    }

    // Controls
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

    search() {
        this.appliedSearchTerm = this.searchTerm;
        this.currentPage = 1;
    }

    clearSearch() {
        this.searchTerm = '';
        this.appliedSearchTerm = '';
        this.currentPage = 1;
    }

    toggleSelectAll(checked: boolean) {
        this.filteredInstitutions.forEach(i => i.checked = checked);
    }

    get isAllSelected(): boolean {
        const visible = this.filteredInstitutions;
        return visible.length > 0 && visible.every(i => i.checked);
    }

    deleteInstitution(id: string) {
        if (confirm('¿Desea desvincular esta institución permanentemente?')) {
            this.institutions = this.institutions.filter(i => i.id !== id);
        }
    }

    // Export Utils
    private getSelectedDataForExport() {
        const selected = this.institutions.filter(i => i.checked);
        // If nothing is explicitly selected via checkbox, export all that match the CURRENT FILTER
        const source = selected.length > 0 ? selected : this.filteredInstitutions;
        return source.map((i, index) => ({ 
            'N°': index + 1,
            RUC: i.id, 
            RazónSocial: i.name 
        }));
    }

    copyToClipboard() {
        const data = this.getSelectedDataForExport();
        if (data.length === 0) return;
        const text = data.map(obj => Object.values(obj).join('\t')).join('\n');
        navigator.clipboard.writeText(text).then(() => this.alertService.success('Portapapeles', 'Copiado con éxito'));
    }

    downloadExcel() {
        const data = this.getSelectedDataForExport();
        if (data.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Instituciones');
        XLSX.writeFile(wb, `Instituciones_${Date.now()}.xlsx`);
    }

    downloadCSV() {
        const data = this.getSelectedDataForExport();
        if (data.length === 0) return;
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Instituciones_${Date.now()}.csv`;
        link.click();
    }

    printPDF() {
        const data = this.getSelectedDataForExport();
        if (data.length === 0) return;
        const doc = new jsPDF();
        autoTable(doc, {
            head: [['N°', 'RUC', 'Razón Social']],
            body: data.map(i => [i['N°'], i.RUC, i.RazónSocial]),
            headStyles: { fillColor: [0, 84, 112] }
        });
        doc.save(`Instituciones_${Date.now()}.pdf`);
    }
}
