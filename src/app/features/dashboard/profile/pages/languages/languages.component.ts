import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CatalogService } from '../../../../../core/services/catalog.service';
import { LanguageService } from '../../../../../core/services/language.service';
import { LanguageItem } from '../../../../../core/models/language.models';
import { AuthService } from '../../../../../core/services/auth.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { LanguageFormComponent } from './components/language-form/language-form.component';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';

@Component({
    selector: 'app-languages',
    standalone: true,
    imports: [CommonModule, LanguageFormComponent, ActionButtonsComponent],
    templateUrl: './languages.component.html',
    styleUrl: './languages.component.scss'
})
export class LanguagesComponent implements OnInit {
    showModal = false;
    isSaving = false;
    userId: number = 0;

    selectedLanguage: LanguageItem | null = null;

    languagesOptions: any[] = [];
    learningMethodsOptions: any[] = [];
    levelsOptions: any[] = [];

    // Data from API
    languagesList: LanguageItem[] = [];

    constructor(
        private catalogService: CatalogService,
        private languageService: LanguageService,
        private authService: AuthService,
        private alertService: AlertService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.userId = user.id;
                this.loadUserLanguages();
            }
        });
        this.loadCatalogs();
    }

    loadCatalogs() {
        this.catalogService.getMasterDetailsByCode('IDIOMA').subscribe({
            next: (data) => this.languagesOptions = data,
            error: (err: any) => console.error('Error loading languages options:', err)
        });

        this.catalogService.getMasterDetailsByCode('APRIDI').subscribe({
            next: (data) => this.learningMethodsOptions = data,
            error: (err: any) => console.error('Error loading learning methods:', err)
        });

        this.catalogService.getMasterDetailsByCode('NIVIDI').subscribe({
            next: (data) => this.levelsOptions = data,
            error: (err: any) => console.error('Error loading levels options:', err)
        });
    }

    loadUserLanguages() {
        // Relying on token
        this.languageService.getLanguages().subscribe({
            next: (data) => {
                console.log('API Response Raw:', data);
                if (Array.isArray(data)) {
                    this.languagesList = data;
                } else {
                    this.languagesList = (data as any).data || [];
                }
                this.cdr.detectChanges();
            },
            error: (err: any) => console.error('Error loading user languages:', err)
        });
    }

    // Modal Actions
    openModal(language?: LanguageItem) {
        this.selectedLanguage = language || null;
        this.showModal = true;
    }

    closeModal() {
        this.showModal = false;
        this.selectedLanguage = null;
    }

    handleCreateLanguage(payload: any) {
        this.isSaving = true;
        this.languageService.createLanguage(payload).subscribe({
            next: (res) => {
                this.isSaving = false;
                this.alertService.success('Éxito', 'Idioma registrado correctamente.');
                this.closeModal();
                this.cdr.detectChanges(); // Force UI update immediately
                this.loadUserLanguages();
            },
            error: (err: any) => {
                this.isSaving = false;
                console.error('Error creating language:', err);
                this.alertService.error('Error', 'No se pudo registrar el idioma.');
            }
        });
    }

    handleUpdateLanguage(event: { id: number, payload: any }) {
        // Added confirmation as requested
        this.alertService.confirm('Actualizar Idioma', '¿Estás seguro de actualizar la información de este idioma?').then((confirmed) => {
            if (confirmed) {
                this.isSaving = true;
                this.languageService.updateLanguage(event.id, event.payload).subscribe({
                    next: (res) => {
                        this.isSaving = false;
                        this.alertService.success('Actualizado', 'Idioma actualizado correctamente.');
                        this.closeModal();
                        this.cdr.detectChanges(); // Force UI update immediately
                        this.loadUserLanguages();
                    },
                    error: (err: any) => {
                        this.isSaving = false;
                        console.error('Error updating language:', err);
                        this.alertService.error('Error', 'No se pudo actualizar el idioma.');
                    }
                });
            }
        });
    }

    deleteLanguage(language: LanguageItem) {
        this.alertService.confirm('Eliminar Idioma', '¿Estás seguro de eliminar este idioma?').then((confirmed) => {
            if (confirmed) {
                this.languageService.deleteLanguage(language.id).subscribe({
                    next: () => {
                        this.alertService.success('Eliminado', 'Idioma eliminado correctamente.');
                        this.loadUserLanguages();
                    },
                    error: (err: any) => {
                        console.error('Error deleting language:', err);
                        this.alertService.error('Error', 'No se pudo eliminar el idioma.');
                    }
                });
            }
        });
    }
}
