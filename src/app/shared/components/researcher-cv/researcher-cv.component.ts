import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResearcherTabsComponent } from '../researcher-tabs/researcher-tabs.component';

export interface SectionData {
    title: string;
    data: any[];
    columns: { key: string; label: string }[];
}

@Component({
    selector: 'app-researcher-cv',
    standalone: true,
    imports: [CommonModule, ResearcherTabsComponent],
    templateUrl: './researcher-cv.component.html',
    styleUrls: ['./researcher-cv.component.scss']
})
export class ResearcherCvComponent implements OnInit {
    @Input() researcher: any; // Header info
    @Input() generalData: any;

    // Data Sections (passed through to tabs)
    @Input() workExperience: any[] = [];
    @Input() docenteExperience: any[] = [];
    @Input() ctiManagementExperience: any[] = [];
    @Input() boardExperience: any[] = [];

    @Input() academicFormation: any[] = [];
    @Input() technicalFormation: any[] = [];

    @Input() projects: any[] = [];

    @Input() scientificProduction: any[] = [];

    @Input() languages: any[] = [];

    @Input() thesisAdvisory: any[] = []; // Unified or separate
    @Input() thesisJury: any[] = [];

    // Active Tab
    activeTab = 'experience';

    constructor() { }

    ngOnInit(): void {
    }

    setActiveTab(tab: string) {
        this.activeTab = tab;
    }
}
