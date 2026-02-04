import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResearcherTabsComponent } from '../researcher-tabs/researcher-tabs.component';
import { CapitalizePipe } from '../../pipes/capitalize.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { CvExportService, ExportData } from '../../../core/services/cv-export.service';

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

    constructor(private authService: AuthService, private cvExportService: CvExportService) { }

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

    async downloadCV() {
        if (!this.researcher) return;

        const data: ExportData = {
            researcher: this.researcher,
            generalData: this.generalData,
            workExperience: this.workExperience,
            docenteExperience: this.docenteExperience,
            ctiManagementExperience: this.ctiManagementExperience,
            academicFormation: this.academicFormation,
            technicalFormation: this.technicalFormation,
            projects: this.projects,
            scientificProduction: this.scientificProduction,
            languages: this.languages,
            thesisAdvisory: this.thesisAdvisory
        };

        this.cvExportService.exportCV(data);
    }
}
