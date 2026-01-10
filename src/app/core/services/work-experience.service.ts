import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WorkExperienceResponse {
    id: number;
    investigadorId?: number; // Though usually implied by context
    actualmenteTrabaja: boolean;
    cargo: string;
    descripcion: string;
    fechaInicio: string; // "YYYY-MM-DD"
    fechaFin?: string; // "YYYY-MM-DD"
    nombreInstitucion: string;
    rolIDI: string; // "rolIDI" in response JSON
    rucInstitucion?: string;
    // Files might be returned? The screenshot only shows basic fields but let's stick to screenshot
}

@Injectable({
    providedIn: 'root'
})
export class WorkExperienceService {
    private apiUrl = `${environment.userServiceUrl}/experiencia`;

    constructor(private http: HttpClient) { }

    getWorkExperiences(investigadorId: number): Observable<WorkExperienceResponse[]> {
        return this.http.get<WorkExperienceResponse[]>(`${this.apiUrl}/laboral/investigador/${investigadorId}`);
    }

    createWorkExperience(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/laboral`, data);
    }

    updateWorkExperience(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/laboral/${id}`, data);
    }

    deleteWorkExperience(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/laboral/${id}`);
    }

    // --- Docent Experience ---

    getDocentExperiences(investigadorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/docente/investigador/${investigadorId}`);
    }

    createDocentExperience(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/docente`, data);
    }

    updateDocentExperience(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/docente/${id}`, data);
    }

    deleteDocentExperience(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/docente/${id}`);
    }
    // --- Thesis Advisor ---

    getThesisAdvisors(investigadorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/asesor/investigador/${investigadorId}`);
    }

    createThesisAdvisor(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/asesor`, data);
    }

    updateThesisAdvisor(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/asesor/${id}`, data);
    }

    deleteThesisAdvisor(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/asesor/${id}`);
    }

    // --- Projects ---

    getProjects(investigadorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/proyecto-idi/investigador/${investigadorId}`);
    }

    createProject(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/proyecto-idi`, data);
    }

    updateProject(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/proyecto-idi/${id}`, data);
    }

    deleteProject(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/proyecto-idi/${id}`);
    }
}
