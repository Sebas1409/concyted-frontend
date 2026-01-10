import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ResearcherTabsComponent } from '../../../../shared/components/researcher-tabs/researcher-tabs.component';

@Component({
    selector: 'app-admin-researcher-profile',
    standalone: true,
    imports: [CommonModule, ResearcherTabsComponent],
    templateUrl: './admin-researcher-profile.component.html',
    styleUrls: ['./admin-researcher-profile.component.scss']
})
export class AdminResearcherProfileComponent implements OnInit {
    researcherId: string | null = null;

    // Header Data (Mock)
    researcherHeader = {
        initials: 'JA',
        name: 'Joseph Alex',
        email: 'josep@gmail.com',
        renacytLevel: 'NIVEL I',
        fichaUrl: '#',
        dni: '736251729',
        location: 'La Huaca, Piura',
        orcid: '0000-0002-1825-0097'
    };

    // Content Data (Mock - similar to ResearcherCvComponent)
    workExperience = [
        { institution: 'Universidad Nacional Mayor de San Marcos', position: 'Docente Investigador', description: 'Investigación en Biología Molecular', startDate: '2018', endDate: 'Presente' },
        { institution: 'Instituto Nacional de Salud', position: 'Investigador Asociado', description: 'Proyecto de Enfermedades Tropicales', startDate: '2015', endDate: '2018' }
    ];

    academicFormation = [
        { institution: 'Universidad Peruana Cayetano Heredia', degree: 'Doctorado', title: 'Ciencias Biológicas', endDate: '2018', source: 'SUNEDU' },
        { institution: 'Universidad Nacional Mayor de San Marcos', degree: 'Maestría', title: 'Biología Molecular', endDate: '2014', source: 'SUNEDU' }
    ];

    scientificProduction = [
        { type: 'Artículo Científico', title: 'Molecular characterization of Dengue virus', details: 'Revista Peruana de Medicina Experimental', year: '2023' },
        { type: 'Libro', title: 'Manual de Biología Molecular', details: 'Editorial Universitaria', year: '2021' }
    ];

    projects = [
        { title: 'Estudio genómico de vectores de Dengue', type: 'Proyecto de Investigación Básica', role: 'Investigador Principal', status: 'En Ejecución' }
    ];

    languages = [
        { language: 'Inglés', level: 'Avanzado', reading: 'Avanzado', writing: 'Avanzado', speaking: 'Avanzado' },
        { language: 'Portugués', level: 'Intermedio', reading: 'Avanzado', writing: 'Intermedio', speaking: 'Intermedio' }
    ];

    constructor(private route: ActivatedRoute, private router: Router) { }

    ngOnInit(): void {
        this.researcherId = this.route.snapshot.paramMap.get('id');
        // In a real app, fetch data by ID here
    }

    goBack() {
        this.router.navigate(['/admin/researchers']);
    }
}
