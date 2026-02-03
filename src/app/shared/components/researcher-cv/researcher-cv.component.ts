import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResearcherTabsComponent } from '../researcher-tabs/researcher-tabs.component';
import { CapitalizePipe } from '../../pipes/capitalize.pipe';
import { AuthService } from '../../../core/services/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
    selector: 'app-researcher-cv',
    standalone: true,
    imports: [CommonModule, ResearcherTabsComponent, CapitalizePipe],
    templateUrl: './researcher-cv.component.html',
    styleUrls: ['./researcher-cv.component.scss']
})
export class ResearcherCvComponent implements OnInit {
    @Input() researcher: any;
    @Input() generalData: any;
    @Input() workExperience: any[] = [];
    @Input() docenteExperience: any[] = [];
    @Input() ctiManagementExperience: any[] = [];
    @Input() boardExperience: any[] = [];
    @Input() academicFormation: any[] = [];
    @Input() technicalFormation: any[] = [];
    @Input() projects: any[] = [];
    @Input() scientificProduction: any[] = [];
    @Input() languages: any[] = [];
    @Input() thesisAdvisory: any[] = [];
    @Input() thesisJury: any[] = [];

    isLoggedIn = false;
    activeTab = 'experience';

    constructor(private authService: AuthService) { }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe((user: any) => {
            this.isLoggedIn = !!user;
        });
    }

    setActiveTab(tab: string) {
        this.activeTab = tab;
    }

    getInitials(name: string): string {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0]).toUpperCase();
    }

    private async getLogoBase64(): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = 'assets/images/landing/logo.png';
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject('No se pudo cargar el logo');
        });
    }

    async downloadCV() {
        if (!this.researcher) return;

        try {
            const logo = await this.getLogoBase64();
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 15;

            // Header
            doc.addImage(logo, 'PNG', margin, 10, 25, 18);
            doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(0, 78, 90).text('CONCYTEC', margin + 30, 18);
            doc.setFontSize(7).setFont('helvetica', 'normal').text('CONSEJO NACIONAL DE CIENCIA, TECNOLOGÍA E INNOVACIÓN TECNOLÓGICA', margin + 30, 23);
            doc.setDrawColor(0, 78, 90).line(margin, 30, pageWidth - margin, 30);

            // Identification
            doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text(this.researcher.name || 'INVESTIGADOR', pageWidth / 2, 45, { align: 'center' });

            // Identifiers box
            let currentY = 55;
            doc.setFillColor(240, 240, 240).rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
            doc.setFontSize(10).text('Identificadores', pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 12;
            doc.setFontSize(9).setFont('helvetica', 'normal');
            doc.text(`Orcid: ${this.researcher.orcidId || '---'}`, pageWidth / 8, currentY);
            doc.text(`Scopus: ${this.researcher.scopusId || '---'}`, pageWidth / 2, currentY);
            doc.text(`Wos: ${this.researcher.wosId || '---'}`, (pageWidth / 8) * 6, currentY);

            // Contact info
            currentY += 10;
            doc.setFillColor(240, 240, 240).rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
            doc.setFont('helvetica', 'bold').text('Contacto', pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 12;
            doc.setFont('helvetica', 'normal');
            doc.text(`Teléfono: ${this.generalData?.phone || '---'}`, margin, currentY);
            doc.text(`Email: ${this.generalData?.email || '---'}`, pageWidth / 2, currentY);

            // Metadata
            currentY += 10;
            doc.setDrawColor(200, 200, 200).rect(margin, currentY, pageWidth - margin * 2, 25);
            doc.setFontSize(8);
            doc.text(`Actualización: ${this.researcher.lastUpdate || '---'}`, pageWidth / 2, currentY + 8, { align: 'center' });
            doc.text(`Código RENACYT: ${this.researcher.renacytCode || '---'}`, pageWidth / 2, currentY + 15, { align: 'center' });
            doc.text(`Fecha Exportación: ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY + 22, { align: 'center' });

            currentY += 35;

            const safeTable = (title: string, head: string[][], body: any[][], emptyMsg: string) => {
                const pageHeight = doc.internal.pageSize.getHeight();
                // If title + header + 1-2 rows won't fit (approx 40 units), jump to next page
                if (currentY + 40 > pageHeight) {
                    doc.addPage();
                    currentY = 20; // Margin top on new page
                }

                doc.setFontSize(12).setFont('helvetica', 'bold').text(title, margin, currentY);
                currentY += 5;

                const finalBody = body.length === 0
                    ? [[{ content: emptyMsg, colSpan: head[0].length, styles: { halign: 'center', fontStyle: 'normal' } }]]
                    : body;

                autoTable(doc, {
                    startY: currentY,
                    head: head,
                    body: finalBody,
                    theme: 'grid',
                    headStyles: { fillColor: [0, 78, 90], textColor: [255, 255, 255] },
                    margin: { left: margin, right: margin }
                });

                currentY = (doc as any).lastAutoTable.finalY + 15;
                doc.setTextColor(0, 0, 0).setFont('helvetica', 'normal');
            };

            safeTable('Datos Personales', [['Campo', 'Valor']], [['Sexo', this.generalData?.gender || '---'], ['Nacionalidad', this.generalData?.nationality || '---'], ['Residencia', this.generalData?.residence || '---']], 'Sin datos.');
            safeTable('Experiencia Laboral', [['Cargo', 'Institución', 'Periodo']],
                this.workExperience.map(exp => [exp.position, exp.institution, `${this.formatDate(exp.startDate)} - ${this.formatDate(exp.endDate, exp.current)}`]), 'Sin registros.');
            safeTable('Experiencia Docente', [['Cargo', 'Institución', 'Periodo']],
                this.docenteExperience.map(exp => [exp.description, exp.institution, `${this.formatDate(exp.startDate)} - ${this.formatDate(exp.endDate, exp.currentlyTeaching)}`]), 'Sin registros.');
            safeTable('Gestión CTI', [['Cargo', 'Institución', 'Periodo']],
                this.ctiManagementExperience.map(exp => [exp.position, exp.institution, `${this.formatDate(exp.startDate)} - ${this.formatDate(exp.endDate)}`]), 'Sin registros.');
            safeTable('Formación Académica', [['Grado', 'Institución', 'Fecha']], this.academicFormation.map(edu => [edu.degree, edu.institution, this.formatDate(edu.endDate)]), 'Sin registros.');
            safeTable('Estudios Técnicos', [['Carrera', 'Institución', 'Periodo']],
                this.technicalFormation.map(tech => [tech.career, tech.institution, `${this.formatDate(tech.startDate)} - ${this.formatDate(tech.endDate)}`]), 'Sin registros.');
            safeTable('Proyectos', [['Título', 'Rol', 'Estado']], this.projects.map(p => [p.title, p.role, p.status]), 'Sin registros.');
            safeTable('Producción', [['Título', 'Tipo', 'Año']], this.scientificProduction.map(p => [p.title, p.type, p.year]), 'Sin registros.');
            safeTable('Idiomas', [['Idioma', 'Nivel', 'Habla']], this.languages.map(l => [l.language, l.level, l.speaking]), 'Sin registros.');
            safeTable('Asesorías de Tesis', [['Título', 'Estudiante', 'Grado']], this.thesisAdvisory.map(t => [t.title, t.studentName, t.degree]), 'Sin registros.');

            this.addPageNumbers(doc);
            doc.save(`Ficha_CTI_${this.researcher.name.replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error(e);
        }
    }

    private formatDate(date: string | null | undefined, isCurrent: boolean = false): string {
        if (isCurrent || date === 'Actualidad') return 'A la actualidad';
        if (!date || date === '---') return '---';

        try {
            // Handle YYYY-MM-DD
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = date.split('-').map(Number);
                const d = new Date(year, month - 1, day);
                const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
                const formatted = formatter.format(d);
                return formatted.charAt(0).toUpperCase() + formatted.slice(1);
            }
            // Handle DD/MM/YYYY
            if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = date.split('/').map(Number);
                const d = new Date(year, month - 1, day);
                const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
                const formatted = formatter.format(d);
                return formatted.charAt(0).toUpperCase() + formatted.slice(1);
            }
        } catch (e) {
            console.error('Error formatting date', e);
        }
        return date;
    }

    private addPageNumbers(doc: jsPDF) {
        const totalPages = (doc as any).internal.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);

            // Text for "Página X de Y"
            const text = `Página ${i} de ${totalPages}`;
            const textWidth = doc.getTextWidth(text);
            doc.text(text, pageWidth - textWidth - 15, pageHeight - 10);

            // Optional: Internal line separator for footer
            doc.setDrawColor(230, 230, 230);
            doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
        }
    }
}
