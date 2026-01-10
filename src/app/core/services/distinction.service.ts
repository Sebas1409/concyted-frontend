import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DistinctionFile {
    id: number;
    nombre: string;
    token: string;
}

export interface Distinction {
    id: number;
    investigadorId: number;
    nombre: string;
    descripcion: string;
    nombreInstitucion: string;
    rucInstitucion: string;
    paisId: number;
    fechaReconocimiento: string; // YYYY-MM-DD
    enlaceReferencia: string;
    archivos: DistinctionFile[];
    tokens?: string[];
}

@Injectable({
    providedIn: 'root'
})
export class DistinctionService {
    private apiUrl = `${environment.userServiceUrl}/distinciones-premios`;

    constructor(private http: HttpClient) { }

    getDistinctions(investigatorId: number): Observable<Distinction[]> {
        return this.http.get<Distinction[]>(`${this.apiUrl}/investigador/${investigatorId}`);
    }

    getDistinctionById(id: number): Observable<Distinction> {
        return this.http.get<Distinction>(`${this.apiUrl}/${id}`);
    }

    createDistinction(distinction: Partial<Distinction>): Observable<Distinction> {
        return this.http.post<Distinction>(this.apiUrl, distinction);
    }

    updateDistinction(id: number, distinction: Partial<Distinction>): Observable<Distinction> {
        return this.http.put<Distinction>(`${this.apiUrl}/${id}`, distinction);
    }

    deleteDistinction(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
