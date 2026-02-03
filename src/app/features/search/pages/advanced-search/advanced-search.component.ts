import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../landing/components/header/header.component';
import { FooterComponent } from '../../../landing/components/footer/footer.component';
import { UbigeoService } from '../../../../core/services/ubigeo.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { RecaptchaService } from '../../../../core/services/recaptcha.service';
import { ResearcherService, PublicResearcher } from '../../../../core/services/researcher.service';
import { ChangeDetectorRef } from '@angular/core';

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
    genders: any[] = [];
    countries: any[] = [];

    // Results
    researchers: any[] = [];
    hasSearched = false; // To track if a search has been performed
    isLoading = false;

    // Sorting
    sortField = 'fechaCreacion';
    sortOrder = 'desc';

    constructor(
        private fb: FormBuilder,
        private ubigeoService: UbigeoService,
        private catalogService: CatalogService,
        private recaptchaService: RecaptchaService,
        private researcherService: ResearcherService,
        private cdr: ChangeDetectorRef,
        private route: ActivatedRoute
    ) {
        this.filterForm = this.fb.group({
            searchText: [''],
            residence: [''],
            ocdeArea: [''],
            isDoctor: [false],
            isMaestro: [false],
            isPeruvian: [false],
            isForeignNat: [false]
        });
    }

    ngOnInit(): void {
        this.loadCatalogData();
        this.handleQueryParams();
    }

    private handleQueryParams() {
        this.route.queryParams.subscribe(params => {
            const query = params['q'];
            if (query) {
                this.filterForm.patchValue({ searchText: query });
                this.search();
            }
        });
    }

    loadCatalogData() {
        // Load Areas
        this.catalogService.getAreas().subscribe({
            next: (data) => this.areas = data,
            error: (err) => console.error('Error loading areas', err)
        });

        // Load Genders
        this.catalogService.getMasterDetails(2).subscribe({
            next: (data) => this.genders = data,
            error: (err) => console.error('Error loading genders', err)
        });

        // Load Departments (Peru)
        this.ubigeoService.getCountries().subscribe({
            next: (countries) => {
                this.countries = countries;
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
        this.hasSearched = true;
        this.researchers = []; // Clear current results to show skeleton immediately
        const form = this.filterForm.value;

        const params: any = {
            page: this.currentPage - 1,
            size: this.pageSize,
            pageNumber: this.currentPage - 1,
            pageSize: this.pageSize,
            sort: `${this.sortField},${this.sortOrder}`
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
        if (form.residence) {
            params.departamentoId = form.residence;
        }

        if (form.ocdeArea) {
            params.areaId = form.ocdeArea;
        }

        if (form.isPeruvian && !form.isForeignNat) {
            params.nacionalidad = 'PERUANA';
        } else if (!form.isPeruvian && form.isForeignNat) {
            params.nacionalidad = 'EXTRANJERA';
        }
        // If both are checked or none are checked, we don't send nacionalidad to show all

        this.researcherService.getPublicResearchers(params).subscribe({
            next: (resp) => {
                const results = [...(resp.content || []).map(item => this.mapToViewModel(item))];
                this.totalElements = resp.totalElements || 0;

                setTimeout(() => {
                    this.researchers = results;
                    console.log(this.researchers);
                    this.isLoading = false;
                    this.cdr.detectChanges();
                }, 1000);
            },
            error: () => {
                this.isLoading = false;
                this.researchers = [];
                this.cdr.detectChanges();
            }
        });
    }

    mapToViewModel(item: PublicResearcher): any {
        let genderMapped: 'M' | 'F' = 'M';
        if (item.sexo) {
            if (item.sexo === 'M' || item.sexo === 'SEX001') genderMapped = 'M';
            else if (item.sexo === 'F' || item.sexo === 'SEX002') genderMapped = 'F';
        }

        const sexName = this.genders.find(g => g.codigo === item.sexo)?.nombre || item.sexo || '';
        const deptName = this.departments.find(d => d.id === item.departamentoId)?.nombre || '';
        const countryName = this.countries.find(c => c.id === item.paisResidenciaId)?.nombre || '';

        let nationalityLabel = '';
        if (item.nacionalidad === 'PERUANA') {
            nationalityLabel = genderMapped === 'M' ? 'PERUANO' : 'PERUANA';
        } else {
            nationalityLabel = genderMapped === 'M' ? 'EXTRANJERO' : 'EXTRANJERA';
        }

        return {
            id: item.id,
            name: `${item.nombres || ''} ${item.apellidoPaterno || ''} ${item.apellidoMaterno || ''}`.trim().toUpperCase(),
            institution: 'Sin institución registrada',
            region: (item.nacionalidad === 'PERUANA' ? (deptName ? `PERÚ - ${deptName}` : 'PERÚ') : (countryName || 'EXTRANJERO')).toUpperCase(),
            nationality: nationalityLabel.toUpperCase(),
            summary: (item.resumenEjecutivo || 'Sin resumen profesional.').substring(0, 300),
            gender: genderMapped,
            sexName: sexName,
            degree: item.estadoRenacyt,
            usuarioId: item.usuarioId
        };
    }

    padNumber(num: number): string {
        return num.toString().padStart(2, '0');
    }

    get totalPages() {
        return Math.ceil(this.totalElements / this.pageSize) || 1;
    }

    get pagesArray() {
        const total = this.totalPages;
        const current = this.currentPage;
        const max = 5;

        if (total <= max) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        let start = Math.max(current - 2, 1);
        let end = start + max - 1;

        if (end > total) {
            end = total;
            start = Math.max(end - max + 1, 1);
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    search() {
        this.currentPage = 1;
        this.isLoading = true;
        this.hasSearched = true;
        this.researchers = [];
        this.cdr.detectChanges();

        this.recaptchaService.execute('search_action').subscribe(token => {
            this.loadResearchers();
        });
    }

    toggleSort(field: string) {
        if (this.sortField === field) {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortOrder = 'asc';
        }
        this.currentPage = 1;
        this.loadResearchers();
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
            isDoctor: false,
            isMaestro: false,
            isPeruvian: false,
            isForeignNat: false,
            residence: '',
            ocdeArea: '',
            searchText: ''
        });
        this.currentPage = 1;
        this.hasSearched = false;
        this.researchers = [];
        this.totalElements = 0;
        this.cdr.detectChanges();
    }
}
