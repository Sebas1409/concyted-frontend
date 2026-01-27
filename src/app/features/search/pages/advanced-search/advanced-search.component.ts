import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../landing/components/header/header.component';
import { FooterComponent } from '../../../landing/components/footer/footer.component';
import { UbigeoService } from '../../../../core/services/ubigeo.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { RecaptchaService } from '../../../../core/services/recaptcha.service';
import { ResearcherService, PublicResearcher } from '../../../../core/services/researcher.service';

@Component({
    selector: 'app-advanced-search',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent, FooterComponent],
    templateUrl: './advanced-search.component.html',
    styleUrls: ['./advanced-search.component.scss']
})
export class AdvancedSearchComponent implements OnInit {
    filterForm: FormGroup;

    // Pagination
    currentPage = 1;
    pageSize = 10;
    totalElements = 0;
    Math = Math;

    // Catalogs
    departments: any[] = [];
    areas: any[] = [];

    // Results
    researchers: any[] = [];
    hasSearched = false; // To track if a search has been performed
    isLoading = false;

    constructor(
        private fb: FormBuilder,
        private ubigeoService: UbigeoService,
        private catalogService: CatalogService,
        private recaptchaService: RecaptchaService,
        private researcherService: ResearcherService
    ) {
        this.filterForm = this.fb.group({
            searchText: [''],
            residence: [''],
            ocdeArea: [''],
            suneduGrade: ['Doctor'],
            nationality: ['Peruana'],
            isForeigner: [false]
        });
    }

    ngOnInit(): void {
        this.loadCatalogData();
        // Initialize Recaptcha v3 on view load
        this.recaptchaService.execute('search_view').subscribe(token => {
            console.log('Search View Recaptcha Token initialized');
        });

        // Initial load
        this.loadResearchers();
    }

    loadCatalogData() {
        // Load Areas
        this.catalogService.getAreas().subscribe({
            next: (data) => this.areas = data,
            error: (err) => console.error('Error loading areas', err)
        });

        // Load Departments (Peru)
        this.ubigeoService.getCountries().subscribe({
            next: (countries) => {
                const peru = countries.find(c => c.nombre.toUpperCase() === 'PERÚ' || c.nombre.toUpperCase() === 'PERU');
                if (peru) {
                    this.ubigeoService.getDepartments(peru.id).subscribe({
                        next: (deps) => this.departments = deps,
                        error: (err) => console.error('Error loading departments', err)
                    });
                }
            },
            error: (err) => console.error('Error loading countries', err)
        });
    }

    loadResearchers() {
        this.isLoading = true;
        const form = this.filterForm.value;

        const params: any = {
            pageNumber: this.currentPage - 1,
            pageSize: this.pageSize,
            sort: 'fechaCreacion,desc'
        };

        const term = (form.searchText || '').trim();
        if (term) {
            if (/^\d+$/.test(term)) {
                if (term.length >= 8) params.numDoc = term;
                else params.codigoUnico = term;
            } else {
                // Using 'nombres' for generic text search as per available fields.
                // Ideal: split into nombres/apellidos if possible, but single field search is ambiguous.
                params.nombres = term;
            }
        }

        // Map filters
        if (!form.isForeigner && form.residence) {
            params.departamentoId = form.residence;
        }

        if (form.ocdeArea) {
            params.areaId = form.ocdeArea;
        }

        if (form.nationality) {
            // Mapping 'Peruana'/'Extranjera' to 'nacionalidad' param
            // Capitalizing as a safe default based on typical enum values
            params.nacionalidad = form.nationality.charAt(0).toUpperCase() + form.nationality.slice(1);
        }

        // Note: 'suneduGrade' (Doctor/Maestro) is NOT supported by the API based on provided spec.
        // It is omitted from params.

        console.log('Searching (Public) with params:', params);

        this.researcherService.getPublicResearchers(params).subscribe({
            next: (resp) => {
                this.totalElements = resp.totalElements || 0;
                this.researchers = (resp.content || []).map(item => this.mapToViewModel(item));
                this.hasSearched = true;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading researchers', err);
                this.isLoading = false;
                this.researchers = [];
            }
        });
    }

    mapToViewModel(item: PublicResearcher): any {
        return {
            id: item.id,
            name: `${item.nombres} ${item.apellidoPaterno} ${item.apellidoMaterno}`,
            institution: '', // Not in API, placeholder
            region: item.departamentoId ? 'PERÚ' : '', // Placeholder location logic
            // regionId: item.departamentoId, // Store id if needed
            summary: item.resumenEjecutivo || 'Sin resumen profesional.',
            gender: item.sexo,
            // Additional fields for display
            degree: item.estadoRenacyt
        };
    }

    get totalPages() {
        return Math.ceil(this.totalElements / this.pageSize) || 1;
    }

    get pagesArray() {
        const total = this.totalPages;
        const maxPages = Math.min(total, 5);
        // Simple pagination for now
        return Array.from({ length: maxPages }, (_, i) => i + 1);
    }

    search() {
        this.currentPage = 1;
        this.recaptchaService.execute('search_action').subscribe(token => {
            console.log('Search Action Token:', token);
            this.loadResearchers();
        });
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.loadResearchers();
            window.scrollTo(0, 0);
        }
    }

    onPageSizeChange(event: any) {
        this.pageSize = +event.target.value;
        this.currentPage = 1;
        this.loadResearchers();
    }

    clearFilters() {
        this.filterForm.reset({
            suneduGrade: 'Doctor',
            nationality: 'Peruana',
            residence: '',
            ocdeArea: '',
            searchText: '',
            isForeigner: false
        });
        this.currentPage = 1;
        this.loadResearchers();
    }
}
