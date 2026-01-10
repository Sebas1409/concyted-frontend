import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';

interface NewsItem {
    id: string;
    imageName: string;
    title: string;
    description: string;
    validityDate: string;
    startDate?: string;
    endDate?: string;
    ctaText?: string;
    ctaLink?: string;
    published: boolean;
}

@Component({
    selector: 'app-portal-config',
    standalone: true,
    imports: [CommonModule, FormsModule, IntroCardComponent, FormModalComponent],
    templateUrl: './portal-config.component.html',
    styleUrl: './portal-config.component.scss'
})
export class PortalConfigComponent {
    activeTab: 'content' | 'integrations' = 'content';

    // Content Tab State
    newsList: NewsItem[] = [
        { id: '01', imageName: 'File name.png', title: 'Convocatoria 2025', description: 'Conoce la lista de proyectos...', validityDate: '31/01/2026', published: true },
        // ... more items
    ];

    pageSize: number = 10;
    showNewsModal: boolean = false;
    newsForm: any = {
        id: '',
        title: '',
        description: '',
        image: null,
        ctaText: '',
        ctaLink: '',
        startDate: '',
        endDate: '',
        published: true
    };

    // Integrations Tab State
    scopusConfig = {
        source: 'api' // 'api' or 'batch'
    };

    reniecConfig = {
        enabled: true
    };

    reniecConfig2 = { // Placeholder for the 2nd RENIEC/Service item
        enabled: true
    };


    toggleTab(tab: 'content' | 'integrations') {
        this.activeTab = tab;
    }

    /* News Methods */
    openNewsModal(item?: NewsItem) {
        if (item) {
            this.newsForm = {
                ...item,
                image: null,
                startDate: '2025-01-01', // Mock
                endDate: '2026-01-31'   // Mock
            };
        } else {
            this.newsForm = {
                id: '',
                title: '',
                description: '',
                image: null,
                ctaText: '',
                ctaLink: '',
                startDate: '',
                endDate: '',
                published: true
            };
        }
        this.showNewsModal = true;
    }

    saveNews() {
        console.log('Saving news:', this.newsForm);
        this.showNewsModal = false;
    }

    deleteNews(id: string) {
        if (confirm('¿Eliminar novedad?')) {
            this.newsList = this.newsList.filter(n => n.id !== id);
        }
    }

    /* Integration Methods */
    saveScopusConfig() {
        console.log('Scopus config:', this.scopusConfig);
        alert('Configuración de Scopus guardada');
    }
}
