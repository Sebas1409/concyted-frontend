import { Injectable, Injector } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin, of, throwError, firstValueFrom } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

// Services
import { EducationService } from './education.service';
import { WorkExperienceService } from './work-experience.service';
import { LanguageService } from './language.service';
import { IntellectualPropertyService } from './intellectual-property.service';
import { DistinctionService } from './distinction.service';
import { CatalogService } from './catalog.service';
import { UbigeoService } from './ubigeo.service';

export interface ExportData {
    researcher: any;
    generalData: any;
    academicFormation: any[];
    technicalFormation: any[];
    workExperience: any[];
    docenteExperience: any[];
    ctiManagementExperience: any[];
    projects: any[];
    scientificProduction: any[];
    languages: any[];
    thesisAdvisory: any[];
}

@Injectable({
    providedIn: 'root'
})
export class CvExportService {
    // Catalogs cache
    private projectRoles: any[] = [];
    private projectTypes: any[] = [];
    private institutionTypes: any[] = [];
    private docentTypes: any[] = [];
    private genders: any[] = [];

    constructor(
        private educationService: EducationService,
        private workExperienceService: WorkExperienceService,
        private languageService: LanguageService,
        private ipService: IntellectualPropertyService,
        private distinctionService: DistinctionService,
        private catalogService: CatalogService,
        private ubigeoService: UbigeoService
    ) { }

    /**
     * Facade method to fetch all data and generate PDF.
     * @param investigatorId The researcher ID
     * @param userData Basic user object (AuthResponse) for header info
     */
    async generateFullCV(investigatorId: number, userData: any): Promise<void> {
        try {
            // 1. Ensure catalogs are loaded
            await this.loadCatalogs();

            // 2. Fetch all sections
            const sections = await firstValueFrom(this.fetchAllSections(investigatorId));

            // 3. Resolve Location Name
            let locationName = userData.nacionalidad || 'Perú';
            if (userData.paisResidenciaId) {
                try {
                    const reqs: any = {
                        c: this.ubigeoService.getCountries()
                    };
                    if (userData.departamentoId) {
                        reqs.d = this.ubigeoService.getDepartments(userData.paisResidenciaId);
                    }

                    const res = await firstValueFrom(forkJoin(reqs)) as any;

                    const country = res.c.find((x: any) => x.id === userData.paisResidenciaId);
                    const cName = country ? country.nombre.toUpperCase() : (userData.nacionalidad || 'PERÚ');

                    if (userData.departamentoId && res.d) {
                        const dep = res.d.find((x: any) => x.id === userData.departamentoId);
                        locationName = dep ? `${cName} - ${dep.nombre.toUpperCase()}` : cName;
                    } else {
                        locationName = cName;
                    }
                } catch (e) { console.warn('Location fetch failed', e); }
            }

            // 4. Map to ExportData
            const exportData = this.mapToExportData(userData, sections, locationName);

            // 5. Generate PDF
            await this.exportCV(exportData);
        } catch (error) {
            console.error('Error handling Full CV generation', error);
            throw error;
        }
    }

    private fetchAllSections(invId: number) {
        return forkJoin({
            academic: this.educationService.getAcademicByInvestigator(invId).pipe(catchError(() => of([]))),
            technical: this.educationService.getTechnicalByInvestigator(invId, false).pipe(catchError(() => of([]))),
            work: this.workExperienceService.getWorkExperiences(invId).pipe(catchError(() => of([]))),
            docente: this.workExperienceService.getDocentExperiences(invId).pipe(catchError(() => of([]))),
            languages: this.languageService.getLanguagesByInvestigator(invId).pipe(catchError(() => of([]))),
            projects: this.workExperienceService.getProjects(invId).pipe(catchError(() => of([]))),
            thesis: this.workExperienceService.getThesisAdvisors(invId).pipe(catchError(() => of([]))),
            ip: this.ipService.getIntellectualPropertiesByInvestigator(invId).pipe(catchError(() => of([]))),
            distinctions: this.distinctionService.getDistinctions(invId).pipe(catchError(() => of([])))
        });
    }

    private async loadCatalogs() {
        if (this.projectRoles.length > 0) return; // Already loaded

        const reqs = {
            roles: this.catalogService.getMasterDetailsByCode('TIPEXP'),
            types: this.catalogService.getMasterDetailsByCode('TIPPRO'),
            instTypes: this.catalogService.getMasterDetailsByCode('TIPINS'),
            docTypes: this.catalogService.getMasterDetailsByCode('TIPDOC'),
            genders: this.catalogService.getMasterDetails(2)
        };

        const res = await firstValueFrom(forkJoin(reqs));
        this.projectRoles = res.roles;
        this.projectTypes = res.types;
        this.institutionTypes = res.instTypes;
        this.docentTypes = res.docTypes;
        this.genders = res.genders;
    }

    private mapToExportData(user: any, results: any, locationName: string): ExportData {
        // Map Gender Name from Catalog
        let genderName = user.sexo || '---';
        const g = this.genders.find(gen => gen.codigo === user.sexo || gen.id === user.sexo);
        if (g) genderName = g.nombre;

        const researcher = {
            name: `${user.nombres || ''} ${user.apellidoPaterno || ''} ${user.apellidoMaterno || ''}`.trim().toUpperCase(),
            bio: user.resumenEjecutivo || 'Sin resumen profesional registrado.',
            photo: null,
            renacytCode: user.codigoUnico || '---',
            scopusId: user.scopusAuthorId || '---',
            orcidId: user.orcid || '---',
            conductDate: user.fechaValidacion || '---',
            lastUpdate: user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : '---'
        };

        const generalData = {
            gender: genderName,
            nationality: user.nacionalidad || '---',
            email: user.emailPublico || user.email || '---',
            phone: user.celular || user.telefono || '---',
            residence: locationName
        };

        const academicFormation = results.academic.map((item: any) => ({
            institution: item.institucionNombre,
            degree: item.nivelAcademicoNombre,
            title: item.nombreTituloGrado,
            endDate: item.fechaFin,
            source: item.esSunedu ? 'SUNEDU' : 'MANUAL'
        }));

        const technicalFormation = results.technical.map((item: any) => ({
            institution: item.institucionNombre,
            career: item.carreraTecnica,
            startDate: item.fechaInicio,
            endDate: item.fechaFin
        }));

        const workExperience = results.work.map((item: any) => ({
            institution: item.nombreInstitucion,
            position: item.cargo,
            description: item.descripcion,
            startDate: item.fechaInicio,
            endDate: item.actualmenteTrabaja ? 'Actualidad' : item.fechaFin
        }));

        const docenteExperience = results.docente.map((item: any) => {
            const instType = this.institutionTypes.find(t => t.codigo === item.tipoInstitucion);
            const docType = this.docentTypes.find(t => t.codigo === item.tipoDocente);
            return {
                institution: item.nombreInstitucion,
                type: instType ? instType.nombre : item.tipoInstitucion,
                docenteType: docType ? docType.nombre : item.tipoDocente,
                description: item.cargo || '---',
                startDate: item.fechaInicio,
                endDate: item.actualmenteDicta ? 'Actualidad' : item.fechaFin
            };
        });

        const projects = results.projects.map((item: any) => {
            const roleCode = item.rolDesempenado || item.rol;
            const typeCode = item.tipoProyectoCti || item.tipoProyecto;
            const role = this.projectRoles.find(r => r.codigo === roleCode);
            const type = this.projectTypes.find(t => t.codigo === typeCode);
            return {
                title: item.nombreConcurso || '---',
                type: type ? type.nombre : (typeCode || '---'),
                role: role ? role.nombre : (roleCode || '---'),
                amount: item.montoUsd || 0,
                status: 'Activo'
            };
        });

        const languages = results.languages.map((item: any) => ({
            language: item.idiomaNombre,
            level: item.nivelConversacionNombre,
            reading: item.nivelLecturaNombre,
            writing: item.nivelEscrituraNombre,
            speaking: item.nivelConversacionNombre
        }));

        const thesisAdvisory = results.thesis.map((item: any) => ({
            student: item.tesistas || '---',
            thesis: item.titulo || '---',
            university: item.nombreInstitucion || '---',
            year: item.fechaAceptacion ? new Date(item.fechaAceptacion).getFullYear() : '---'
        }));

        const ipItems = results.ip.map((item: any) => ({
            type: item.tipoPropiedadNombre || 'Propiedad Intelectual',
            title: item.titulo,
            details: `${item.entidadRegistroNombre || ''} - ${item.numeroRegistro || ''}`,
            year: item.createdAt ? new Date(item.createdAt).getFullYear() : '---'
        }));

        const distinctionItems = results.distinctions.map((item: any) => ({
            type: 'Distinción / Premio',
            title: item.nombre,
            details: item.nombreInstitucion,
            year: item.fechaReconocimiento ? new Date(item.fechaReconocimiento).getFullYear() : '---'
        }));

        const scientificProduction = [...ipItems, ...distinctionItems];

        return {
            researcher,
            generalData,
            academicFormation,
            technicalFormation,
            workExperience,
            docenteExperience,
            ctiManagementExperience: [],
            projects,
            scientificProduction,
            languages,
            thesisAdvisory
        };
    }

    async exportCV(data: ExportData) {
        if (!data.researcher) return;

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
            doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text(data.researcher.name || 'INVESTIGADOR', pageWidth / 2, 45, { align: 'center' });

            // Identifiers box
            let currentY = 55;
            doc.setFillColor(240, 240, 240).rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
            doc.setFontSize(10).text('Identificadores', pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 12;
            doc.setFontSize(9).setFont('helvetica', 'normal');
            doc.text(`Orcid: ${data.researcher.orcidId || '---'}`, pageWidth / 8, currentY);
            doc.text(`Scopus: ${data.researcher.scopusId || '---'}`, pageWidth / 2, currentY);
            doc.text(`Wos: ${data.researcher.wosId || '---'}`, (pageWidth / 8) * 6, currentY);

            // Contact info
            currentY += 10;
            doc.setFillColor(240, 240, 240).rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
            doc.setFont('helvetica', 'bold').text('Contacto', pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 12;
            doc.setFont('helvetica', 'normal');
            doc.text(`Teléfono: ${data.generalData?.phone || '---'}`, margin, currentY);
            doc.text(`Email: ${data.generalData?.email || '---'}`, pageWidth / 2, currentY);

            // Metadata
            currentY += 10;
            doc.setDrawColor(200, 200, 200).rect(margin, currentY, pageWidth - margin * 2, 25);
            doc.setFontSize(8);
            doc.text(`Actualización: ${data.researcher.lastUpdate || '---'}`, pageWidth / 2, currentY + 8, { align: 'center' });
            doc.text(`Código RENACYT: ${data.researcher.renacytCode || '---'}`, pageWidth / 2, currentY + 15, { align: 'center' });
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

            safeTable('Datos Personales', [['Campo', 'Valor']], [['Sexo', data.generalData?.gender || '---'], ['Nacionalidad', data.generalData?.nationality || '---'], ['Residencia', data.generalData?.residence || '---']], 'Sin datos.');
            safeTable('Experiencia Laboral', [['Cargo', 'Institución', 'Periodo']],
                data.workExperience.map(exp => [exp.position, exp.institution, `${this.formatDate(exp.startDate)} - ${this.formatDate(exp.endDate, exp.current)}`]), 'Sin registros.');
            safeTable('Experiencia Docente', [['Cargo', 'Institución', 'Periodo']],
                data.docenteExperience.map(exp => [exp.description, exp.institution, `${this.formatDate(exp.startDate)} - ${this.formatDate(exp.endDate, exp.currentlyTeaching)}`]), 'Sin registros.');
            safeTable('Gestión CTI', [['Cargo', 'Institución', 'Periodo']],
                data.ctiManagementExperience.map(exp => [exp.position, exp.institution, `${this.formatDate(exp.startDate)} - ${this.formatDate(exp.endDate)}`]), 'Sin registros.');
            safeTable('Formación Académica', [['Grado', 'Institución', 'Fecha']], data.academicFormation.map(edu => [edu.degree, edu.institution, this.formatDate(edu.endDate)]), 'Sin registros.');
            safeTable('Estudios Técnicos', [['Carrera', 'Institución', 'Periodo']],
                data.technicalFormation.map(tech => [tech.career, tech.institution, `${this.formatDate(tech.startDate)} - ${this.formatDate(tech.endDate)}`]), 'Sin registros.');
            safeTable('Proyectos', [['Título', 'Rol', 'Estado']], data.projects.map(p => [p.title, p.role, p.status]), 'Sin registros.');
            safeTable('Producción', [['Título', 'Tipo', 'Año']], data.scientificProduction.map(p => [p.title, p.type, p.year]), 'Sin registros.');
            safeTable('Idiomas', [['Idioma', 'Nivel', 'Habla']], data.languages.map(l => [l.language, l.level, l.speaking]), 'Sin registros.');
            safeTable('Asesorías de Tesis', [['Título', 'Estudiante', 'Grado']], data.thesisAdvisory.map(t => [t.title, t.studentName, t.degree]), 'Sin registros.');

            this.addPageNumbers(doc);
            doc.save(`Ficha_CTI_${data.researcher.name.replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error('Error exporting CV', e);
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
            // Handle ISO string
            if (date.includes('T')) {
                const d = new Date(date);
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
}
