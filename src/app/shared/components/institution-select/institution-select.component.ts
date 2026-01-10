import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CatalogService } from '../../../core/services/catalog.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, finalize, switchMap, tap } from 'rxjs/operators';

@Component({
    selector: 'app-institution-select',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './institution-select.component.html',
    styleUrls: ['./institution-select.component.scss']
})
export class InstitutionSelectComponent implements OnInit, OnDestroy {
    @Input() control: FormControl = new FormControl();
    @Input() label: string = 'Instituto / Centro de Estudios *';
    @Input() placeholder: string = 'Buscar instituto...';
    @Output() selectionChange = new EventEmitter<any>();

    results: any[] = [];
    isLoading = false;
    showDropdown = false;

    private sub: Subscription | null = null;

    constructor(private catalogService: CatalogService) { }

    ngOnInit() {
        this.sub = this.control.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            filter(term => {
                if (!term || typeof term !== 'string' || term.length < 3) {
                    this.results = [];
                    this.showDropdown = false;
                    return false;
                }
                return true;
            }),
            tap(() => this.isLoading = true),
            switchMap(term => this.catalogService.searchMasterDetails('UNIVER', term).pipe(
                finalize(() => this.isLoading = false)
            ))
        ).subscribe({
            next: (results) => {
                this.results = results;
                this.showDropdown = results.length > 0;
            },
            error: (err) => {
                console.error('Error searching institutions', err);
                this.results = [];
                this.showDropdown = false;
            }
        });
    }

    ngOnDestroy() {
        if (this.sub) this.sub.unsubscribe();
    }

    selectItem(item: any) {
        // Update control value with name, prevent re-triggering search loop handled by distinctUntilChanged usually, 
        // but if name is same as partial search it acts weird. 
        // Usually we want to emit event false but we can't easily on 'control' input.
        // We will just patch it.
        this.control.setValue(item.nombre, { emitEvent: false });
        this.results = [];
        this.showDropdown = false;
        this.selectionChange.emit(item);
    }

    onBlur() {
        // Delay hide to allow click
        setTimeout(() => {
            this.showDropdown = false;
        }, 200);
    }

    onFocus() {
        if (this.results.length > 0) {
            this.showDropdown = true;
        }
    }
}
