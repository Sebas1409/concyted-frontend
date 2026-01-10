import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../landing/components/header/header.component';
import { FooterComponent } from '../../../landing/components/footer/footer.component';
import { ResearcherCvComponent } from '../../../../shared/components/researcher-cv/researcher-cv.component';

@Component({
    selector: 'app-researcher-profile',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent, ResearcherCvComponent],
    templateUrl: './researcher-profile.component.html',
    styleUrls: ['./researcher-profile.component.scss']
})
export class ResearcherPublicProfileComponent implements OnInit {
    researcherId: string | null = null;

    // --- MOCK DATA ---
    researcher = {
        name: 'More Valencia Rubén Alexander',
        lastUpdate: '14/10/2025',
        bio: 'Ingeniería de Sistemas e Informática, Inteligencia Artificial. Gestión del Conocimiento. Tecnologías Data Mining administración áreas comerciales. Administrador bases de datos, Consultor para Balanced Scorecard. Asesoría Sistémica y Sistemas Blandos. Analista y Desarrollador de Sistemas de Información. Docencia Universitaria.',
        photo: 'assets/images/landing/investigador-nivel2.png',
        renacytCode: 'P0019183',
        orcidId: '0000-0002-7496-3702',
        scopusId: '572172...',
        conductDate: '02/10/2017'
    };

    generalData = {
        residence: 'Perú / Lima',
        nationality: 'Peruana',
        gender: 'Masculino',
        nativeCountry: 'Perú',
        website: 'http://morevalencia.blogspot.com/',
        email: 'r...o@gmail.com'
    };

    academicFormation = [
        {
            institution: 'Univ. Nac. De Educ. Enrique Guzman Y Valle',
            degree: 'MAESTRO',
            title: 'MAESTRO EN CIENCIAS',
            endDate: 'Diciembre 2024',
            source: 'SUNEDU'
        },
        {
            institution: 'Universidad César Vallejo',
            degree: 'BACHILLER',
            title: 'BACHILLER EN INGENIERÍA DE SISTEMAS',
            endDate: '2008',
            source: 'SUNEDU'
        }
    ];

    technicalFormation = [
        {
            institution: 'Cibertec',
            career: 'Computación e Informática',
            startDate: '2000',
            endDate: '2003'
        }
    ];

    workExperience = [
        {
            institution: 'UNIVERSIDAD NACIONAL DE PIURA',
            position: 'DOCENTE ORDINARIO AUXILIAR',
            description: 'Docente Departamento de Investigación de Operaciones',
            startDate: 'Octubre 2021',
            endDate: 'Actualidad'
        },
        {
            institution: 'MINISTERIO DE EDUCACIÓN',
            position: 'ESPECIALISTA EN TI',
            description: 'Especialista en Tecnologías de la Información',
            startDate: '2015',
            endDate: '2020'
        }
    ];

    docenteExperience = [
        {
            institution: 'UNIVERSIDAD CÉSAR VALLEJO S.A.C.',
            type: 'Privada',
            docenteType: 'Contratado',
            description: 'Docente de Pregrado',
            startDate: 'Marzo 2011',
            endDate: 'Actualidad'
        }
    ];

    ctiManagementExperience = [
        {
            institution: 'CONCYTEC',
            position: 'Evaluador Externo',
            period: '2019 - 2023'
        }
    ];

    boardExperience = [
        {
            institution: 'Colegio de Ingenieros del Perú',
            councilType: 'Directivo',
            position: 'Vocal Capítulo Ingeniería de Sistemas',
            period: '2020 - 2021'
        }
    ];

    projects = [
        {
            title: 'IMPLEMENTACIÓN DE UN SISTEMA DE GESTIÓN BASADO EN DATA MINING',
            type: 'INVESTIGACIÓN APLICADA',
            role: 'INVESTIGADOR PRINCIPAL',
            status: 'EN EJECUCIÓN'
        }
    ];

    scientificProduction = [
        {
            type: 'ARTÍCULO EN REVISTA',
            title: 'Big Data y la toma de decisiones en el sector educativo peruano',
            year: '2023',
            details: 'Revista: Cátedra Villarreal. Vol 10'
        },
        {
            type: 'LIBRO',
            title: 'Fundamentos de Inteligencia Artificial',
            year: '2022',
            details: 'Editorial Académica'
        }
    ];

    languages = [
        {
            language: 'INGLÉS',
            level: 'INTERMEDIO',
            reading: 'AVANZADO',
            writing: 'INTERMEDIO',
            speaking: 'INTERMEDIO'
        },
        {
            language: 'PORTUGUÉS',
            level: 'BÁSICO',
            reading: 'INTERMEDIO',
            writing: 'BÁSICO',
            speaking: 'BÁSICO'
        }
    ];

    thesisAdvisory = [
        {
            student: 'Gomez, J.',
            thesis: 'Sistema de Control de Inventarios',
            university: 'Universidad César Vallejo',
            year: '2022'
        }
    ];

    thesisJury = [
        {
            student: 'Perez, A.',
            thesis: 'Algoritmos Genéticos en Logística',
            university: 'Universidad Nacional Mayor de San Marcos',
            year: '2023'
        }
    ];

    constructor(private route: ActivatedRoute) { }

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.researcherId = params.get('id');
        });
    }
}
