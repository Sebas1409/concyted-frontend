import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class EducationService {
    // Endpoints - adjust if actual API differs
    private academicUrl = environment.userServiceUrl + '/formacion-academica';
    private technicalUrl = environment.userServiceUrl + '/formacion-tecnica';
    private inProgressUrl = environment.userServiceUrl + '/formacion-academica';
    private complementaryUrl = environment.userServiceUrl + '/formacion-complementaria';
    private suneduUrl = environment.suneduApiUrl;

    constructor(private http: HttpClient) { }

    // --- SUNEDU ---
    getSuneduDegrees(dni: string): Observable<any> {
        return this.http.post(`${this.suneduUrl}/${dni}`, {});
    }

    // --- Formación Académica ---
    getAcademicByInvestigator(investigatorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.academicUrl}/investigador/${investigatorId}`);
    }

    createAcademic(payload: any): Observable<any> {
        return this.http.post(this.academicUrl, payload);
    }

    createAcademicAll(payload: any[]): Observable<any> {
        return this.http.post(`${this.academicUrl}/all`, payload);
    }

    updateAcademic(id: number, payload: any): Observable<any> {
        return this.http.put(`${this.academicUrl}/${id}`, payload);
    }

    deleteAcademic(id: number): Observable<any> {
        return this.http.delete(`${this.academicUrl}/${id}`);
    }

    // --- Estudios Técnicos ---
    getTechnicalByInvestigator(investigatorId: number, enCurso?: boolean): Observable<any[]> {
        let params: any = {};
        if (enCurso !== undefined) {
            params.enCurso = enCurso;
        }
        return this.http.get<any[]>(`${this.technicalUrl}/investigador/${investigatorId}`, { params });
    }

    createTechnical(payload: any): Observable<any> {
        return this.http.post(this.technicalUrl, payload);
    }

    updateTechnical(id: number, payload: any): Observable<any> {
        return this.http.put(`${this.technicalUrl}/${id}`, payload);
    }

    deleteTechnical(id: number): Observable<any> {
        return this.http.delete(`${this.technicalUrl}/${id}`);
    }

    // --- Estudios en Curso ---
    getInProgressByInvestigator(investigatorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.inProgressUrl}/investigador/${investigatorId}`);
    }

    createInProgress(payload: any): Observable<any> {
        return this.http.post(this.inProgressUrl, payload);
    }

    updateInProgress(id: number, payload: any): Observable<any> {
        return this.http.put(`${this.inProgressUrl}/${id}`, payload);
    }

    deleteInProgress(id: number): Observable<any> {
        return this.http.delete(`${this.inProgressUrl}/${id}`);
    }

    // --- Formación Complementaria ---
    getComplementaryByInvestigator(investigatorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.complementaryUrl}/investigador/${investigatorId}`);
    }

    createComplementary(payload: any): Observable<any> {
        return this.http.post(this.complementaryUrl, payload);
    }

    updateComplementary(id: number, payload: any): Observable<any> {
        return this.http.put(`${this.complementaryUrl}/${id}`, payload);
    }

    deleteComplementary(id: number): Observable<any> {
        return this.http.delete(`${this.complementaryUrl}/${id}`);
    }
}
