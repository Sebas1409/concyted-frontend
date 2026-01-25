import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../landing/components/header/header.component';
import { FooterComponent } from '../../../landing/components/footer/footer.component';
import { UbigeoService } from '../../../../core/services/ubigeo.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { RecaptchaService } from '../../../../core/services/recaptcha.service';

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
    totalResults = 0;
    Math = Math; // For use in template

    // Catalogs
    departments: any[] = [];
    areas: any[] = [];

    // Mock Results (Expanded)
    allResults = Array.from({ length: 45 }, (_, i) => ({
        id: i + 1,
        name: `INVESTIGADOR ${i + 1} (PERÚ)`,
        institution: i % 2 === 0 ? 'Univ.Nac.De Educ. Enrique Guzman Y Valle' : 'Universidad Nacional Mayor de San Marcos',
        location: i % 3 === 0 ? 'PERÚ - LIMA' : 'PERÚ - AREQUIPA',
        summary: 'Docente universitario con amplia experiencia en investigación científica...',
        sex: i % 2 === 0 ? 'male' : 'female'
    }));

    constructor(
        private fb: FormBuilder,
        private ubigeoService: UbigeoService,
        private catalogService: CatalogService,
        private recaptchaService: RecaptchaService
    ) {
        this.filterForm = this.fb.group({
            searchText: [''],
            residence: [''],
            ocdeArea: [''],
            suneduGrade: ['Doctor'],
            nationality: ['Peruana'],
            isForeigner: [false]
        });

        this.totalResults = this.allResults.length;
    }

    ngOnInit(): void {
        this.loadCatalogData();
        // Initialize Recaptcha v3 on view load
        this.recaptchaService.execute('search_view').subscribe(token => {
            console.log('Search View Recaptcha Token initialized');
        });
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

    get results() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.allResults.slice(start, start + this.pageSize);
    }

    get totalPages() {
        return Math.ceil(this.totalResults / this.pageSize);
    }

    get pagesArray() {
        return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    search() {
        console.log('Searching with filters:', this.filterForm.value);
        // Refresh token on search action
        this.recaptchaService.execute('search_action').subscribe(token => {
            console.log('Search Action Token:', token);
            // Ensure pagination reset
            this.currentPage = 1;
        });
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            window.scrollTo(0, 0);
        }
    }

    onPageSizeChange(event: any) {
        this.pageSize = +event.target.value;
        this.currentPage = 1;
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
    }
}
