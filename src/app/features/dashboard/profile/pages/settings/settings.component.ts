import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
    selector: 'app-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    activeTab: 'settings' | 'export' = 'settings';

    // Forms
    passwordForm: FormGroup;
    contactForm: FormGroup;
    deleteAccountForm: FormGroup;

    // Export Options State
    exportSections = {
        identity: {
            all: true,
            options: [
                { label: 'Datos Personales', checked: true },
                { label: 'Datos Actuales', checked: true },
                { label: 'Otros Identificadores', checked: true }
            ]
        },
        trajectory: {
            all: true,
            options: [
                { label: 'Experiencia Laboral General', checked: true },
                { label: 'Experiencia Docente', checked: true },
                { label: 'Experiencia como Asesor de Tesis', checked: true },
                { label: 'Experiencia como Evaluador de Proyectos', checked: true }
            ]
        },
        formation: {
            all: true,
            options: [
                { label: 'Formación Académica (Fuente SUNEDU)', checked: true },
                { label: 'Formación Académica (Fuente Manual)', checked: true },
                { label: 'Estudios Técnicos', checked: true },
                { label: 'Estudios Académicos y/o Técnicos Superiores en curso', checked: true },
                { label: 'Formación Complementaria', checked: true },
                { label: 'Conocimiento de Idiomas', checked: true }
            ]
        },
        production: {
            all: true,
            options: [
                { label: 'Línea de Investigación', checked: true },
                { label: 'Proyectos', checked: true },
                { label: 'Proyectos Importados de ORCID', checked: true },
                { label: 'Derechos de Propiedad Intelectual', checked: true },
                { label: 'Productos de Desarrollo Industrial', checked: true },
                { label: 'Producción Científica (Importadas de Scopus, Web Of Science,etc)', checked: true },
                { label: 'Otras Producciones (Ingreso Manual)', checked: true },
                { label: 'Distinciones y Premios', checked: true }
            ]
        }
    };

    constructor(private fb: FormBuilder) {
        this.passwordForm = this.fb.group({
            password: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        });

        this.contactForm = this.fb.group({
            phone: ['+51 9876543121', Validators.required],
            email: ['josephalex@gmail.com', [Validators.required, Validators.email]],
            message: ['']
        });

        this.deleteAccountForm = this.fb.group({
            reason: ['']
        });
    }

    ngOnInit(): void { }

    setActiveTab(tab: 'settings' | 'export') {
        this.activeTab = tab;
    }

    toggleSection(sectionKey: keyof typeof this.exportSections) {
        const section = this.exportSections[sectionKey];
        section.all = !section.all;
        section.options.forEach(opt => opt.checked = section.all);
    }

    toggleOption(sectionKey: keyof typeof this.exportSections, index: number) {
        const section = this.exportSections[sectionKey];
        section.options[index].checked = !section.options[index].checked;
        section.all = section.options.every(opt => opt.checked);
    }

    updatePassword() {
        if (this.passwordForm.valid) {
            console.log('Update password', this.passwordForm.value);
            // Mock API call
            this.passwordForm.reset();
        }
    }

    sendMessage() {
        if (this.contactForm.valid) {
            console.log('Send message', this.contactForm.value);
            // Mock API call
        }
    }

    requestDelete() {
        console.log('Request delete account', this.deleteAccountForm.value);
        // Mock API call
    }

    exportPdf() {
        console.log('Exporting PDF with selected options:', this.exportSections);
        // Mock export logic
    }
}
