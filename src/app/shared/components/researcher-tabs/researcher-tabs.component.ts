import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-researcher-tabs',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './researcher-tabs.component.html',
    styleUrls: ['./researcher-tabs.component.scss']
})
export class ResearcherTabsComponent {
    // Data Sections
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

    // Active Tab
    activeTab = 'experience';

    setActiveTab(tab: string) {
        this.activeTab = tab;
    }
}
