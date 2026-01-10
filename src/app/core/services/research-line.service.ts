import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ResearchLine {
    id: number;
    active: boolean;
    areaOcdeId: number;
    areaOcdeNombre?: string;
    comparteIns: boolean;
    comparteMinam: boolean;
    disciplinaOcdeId: number;
    disciplinaOcdeNombre?: string;
    investigadorId: number;
    principal: boolean;
    subareaOcdeId: number;
    subareaOcdeNombre?: string;
    tematicaAmbientalCodigo: string;
    tematicaAmbientalNombre?: string;
    tematicaSaludCodigo: string;
    tematicaSaludNombre?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ResearchLineService {
    private apiUrl = `${environment.userServiceUrl}/lineas-investigacion`;

    constructor(private http: HttpClient) { }

    getResearchLines(investigadorId?: number): Observable<ResearchLine[]> {
        if (investigadorId) {
            return this.http.get<ResearchLine[]>(`${this.apiUrl}/investigador/${investigadorId}`);
        }
        return this.http.get<ResearchLine[]>(this.apiUrl);
    }

    createResearchLine(researchLine: ResearchLine): Observable<ResearchLine> {
        return this.http.post<ResearchLine>(this.apiUrl, researchLine);
    }

    updateResearchLine(id: number, researchLine: ResearchLine): Observable<ResearchLine> {
        return this.http.put<ResearchLine>(`${this.apiUrl}/${id}`, researchLine);
    }

    deleteResearchLine(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
