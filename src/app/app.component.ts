import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { VersionCheckService } from './core/services/version-check.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
    private versionCheckService = inject(VersionCheckService);

    constructor() { }

    ngOnInit() {
        // Iniciar verificación de versión (1 min en dev, 5 min en prod)
        this.versionCheckService.initVersionCheck();
    }
}
