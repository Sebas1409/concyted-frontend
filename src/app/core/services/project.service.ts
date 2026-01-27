import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CollaboratorPayload {
    apellidoMaterno: string;
    apellidoPaterno: string;
    correoContacto: string;
    id: number;
    nombres: string;
}

export interface ProjectPayload {
    id?: number;
    active: boolean;
    areaId: number;
    colaboradores: CollaboratorPayload[];
    concursoSubvencionId: number;
    descripcion: string;
    disciplinaId: number;
    fechaFin: string; // YYYY-MM-DD
    fechaInicio: string; // YYYY-MM-DD
    financiadoraId: number;
    institucionColaboradoraId: string;
    institucionPrincipalId: string;
    investigadorId: number;
    investigadorPrincipal: string;
    isInvestigacionDesarrollo: boolean;
    montoFinanciado: number;
    nombreProyecto: string;
    numeroContrato: string;
    palabrasClave: string;
    regionId: number;
    rolDesempenadoId: string;
    subareaId: number;
    tematicaAmbientalId: string;
    tipoProyectoId: string;
    vinculacionAcademicaId: string;
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

    createProject(project: ProjectPayload): Observable<any> {
        return this.http.post(`${this.apiUrl}/proyecto-idi`, project);
    }

    updateProject(id: number, project: ProjectPayload): Observable<any> {
        return this.http.put(`${this.apiUrl}/proyecto-idi/${id}`, project);
    }

    deleteProject(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/proyecto-idi/${id}`);
    }
}
