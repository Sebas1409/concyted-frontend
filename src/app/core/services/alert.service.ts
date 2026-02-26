import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
    providedIn: 'root'
})
export class AlertService {

    constructor() { }

    success(title: string, text: string) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'success',
            confirmButtonColor: '#005470', // Primary-600 (Teal)
            confirmButtonText: 'Aceptar'
        });
    }

    error(title: string, text: string) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'error',
            confirmButtonColor: '#DC2626', // Red-600
            confirmButtonText: 'Cerrar'
        });
    }

    warning(title: string, text: string) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            iconColor: '#005470', // Match icon with button color
            confirmButtonColor: '#005470',
            confirmButtonText: 'Entendido'
        });
    }

    info(title: string, text: string) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'info',
            confirmButtonColor: '#005470',
            confirmButtonText: 'Ok'
        });
    }

    noFilesFound() {
        return Swal.fire({
            title: 'Información',
            text: 'No se encontraron archivos adjuntos para este registro.',
            icon: 'info',
            iconColor: '#005470',
            confirmButtonColor: '#005470',
            confirmButtonText: 'Entendido'
        });
    }

    confirm(title: string, text: string, confirmButtonText: string = 'Sí, continuar'): Promise<boolean> {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#005470',
            cancelButtonColor: '#6B7280',
            confirmButtonText: confirmButtonText,
            cancelButtonText: 'Cancelar'
        }).then((result: any) => {
            return result.isConfirmed;
        });
    }

    loading(title: string, text: string = 'Por favor espere...') {
        return Swal.fire({
            title: title,
            text: text,
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
    }

    close() {
        Swal.close();
    }
}
