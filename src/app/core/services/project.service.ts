import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CollaboratorPayload {
    apellidoMaterno: string;
    apellidoPaterno: string;
    correoContacto: string;
    id: number | null;
    nombres: string;
}

export interface ProjectPayload {
    id?: number;
    active: boolean;
    areaId: string;
    colaboradores: CollaboratorPayload[];
    concursoSubvencionId: string;
    descripcion: string;
    disciplinaId: string;
    fechaFin: string; // YYYY-MM-DD
    fechaInicio: string; // YYYY-MM-DD
    financiadoraId: string;
    institucionColaboradoraId: string;
    institucionColaboradoraNombre?: string;
    institucionPrincipalId: string;
    institucionPrincipalNombre?: string;
    investigadorId: number;
    investigadorPrincipal: string;
    isInvestigacionDesarrollo: boolean;
    montoFinanciado: number;
    nombreProyecto: string;
    numeroContrato: string;
    palabrasClave: string;
    regionId: number;
    rolDesempenadoId: string;
    subareaId: string;
    tematicaAmbientalId: string;
    tipoProyectoId: string;
    vinculacionAcademicaId: string;
    tokens?: string[];
    tipoProyectoIdiIds?: number[];
    gradoTesis?: string | null;
    orcid?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ProjectService {
    private apiUrl = environment.userServiceUrl;

    constructor(private http: HttpClient) { }

    getProjectsByInvestigator(investigatorId: number, isInvestigacionDesarrollo: boolean): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/proyecto-idi/investigador/${investigatorId}`, {
            params: { isInvestigacionDesarrollo: isInvestigacionDesarrollo.toString() }
        });
    }

    getProjectsWithCollaborators(investigatorId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/proyecto-idi/investigador/${investigatorId}/con-colaboradores`);
    }

    createProject(project: ProjectPayload): Observable<any> {
        return this.http.post(`${this.apiUrl}/proyecto-idi`, project);
    }

    updateProject(id: number, project: ProjectPayload): Observable<any> {
        return this.http.put(`${this.apiUrl}/proyecto-idi/${id}`, project);
    }

    deleteProject(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/proyecto-idi/${id}`);
    }

    importOrcidWorks(orcidId: string): Observable<any> {
        return this.http.post(`${environment.interopServiceUrl}/auth/orcid/works/import`, { orcidId });
    }
}
