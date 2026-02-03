import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface VersionInfo {
    version: string;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class VersionCheckService {
    private currentVersion: number | null = null;
    private checkSubscription: Subscription | null = null;
    private isDevelopment = !environment.production;

    constructor(private http: HttpClient) { }

    /**
     * Inicia la verificación periódica de versión
     * @param intervalMinutes Intervalo en minutos para verificar (default: 5 minutos en prod, 1 minuto en dev)
     */
    initVersionCheck(intervalMinutes?: number): void {
        // En desarrollo, verificar más frecuentemente (1 minuto)
        const defaultInterval = this.isDevelopment ? 1 : 5;
        const checkInterval = intervalMinutes || defaultInterval;

        // Cargar la versión actual al inicio
        this.loadCurrentVersion();

        // Verificar cada X minutos
        const intervalMs = checkInterval * 60 * 1000;
        this.checkSubscription = interval(intervalMs)
            .pipe(
                switchMap(() => this.checkVersion())
            )
            .subscribe();

        console.log(`Version check initialized. Checking every ${checkInterval} minute(s)`);
    }

    /**
     * Carga la versión actual desde version.json
     */
    private loadCurrentVersion(): void {
        if (this.isDevelopment) {
            // En desarrollo, usar timestamp actual como versión inicial
            this.currentVersion = Date.now();
            console.log('Development mode: Using current timestamp as version');
        } else {
            // En producción, cargar desde version.json
            const baseHref = environment.baseHref || '/';
            const cacheBuster = `?t=${Date.now()}`;
            this.http.get<VersionInfo>(`${baseHref}version.json${cacheBuster}`).subscribe({
                next: (versionInfo) => {
                    this.currentVersion = versionInfo.timestamp;
                    console.log('Current app version:', versionInfo.timestamp);
                },
                error: (err) => {
                    console.error('Error loading current version:', err);
                }
            });
        }
    }

    /**
     * Verifica si hay una nueva versión disponible
     */
    private checkVersion(): Promise<void> {
        return new Promise((resolve) => {
            if (this.isDevelopment) {
                // En desarrollo, verificar si los archivos han cambiado
                this.checkDevelopmentVersion(resolve);
            } else {
                // En producción, verificar version.json
                this.checkProductionVersion(resolve);
            }
        });
    }

    /**
     * Verifica versión en modo desarrollo
     * Detecta cambios en los archivos compilados
     */
    private checkDevelopmentVersion(resolve: () => void): void {
        // Intentar cargar el main.js con cache busting para ver si cambió
        const cacheBuster = `?t=${Date.now()}`;
        const baseHref = environment.baseHref || '/';

        // Hacer una petición HEAD para verificar si los archivos cambiaron
        // sin descargar todo el contenido
        fetch(`${baseHref}main.js${cacheBuster}`, { method: 'HEAD' })
            .then(response => {
                const lastModified = response.headers.get('last-modified');
                if (lastModified) {
                    const fileTimestamp = new Date(lastModified).getTime();

                    if (this.currentVersion && fileTimestamp > this.currentVersion) {
                        console.log('Development: New version detected!', {
                            current: new Date(this.currentVersion).toISOString(),
                            new: new Date(fileTimestamp).toISOString()
                        });
                        this.notifyNewVersion(true); // true = development mode
                    }
                }
                resolve();
            })
            .catch(err => {
                console.error('Error checking development version:', err);
                resolve();
            });
    }

    /**
     * Verifica versión en modo producción
     */
    private checkProductionVersion(resolve: () => void): void {
        const baseHref = environment.baseHref || '/';
        const cacheBuster = `?t=${Date.now()}`;
        this.http.get<VersionInfo>(`${baseHref}version.json${cacheBuster}`).subscribe({
            next: (versionInfo) => {
                if (this.currentVersion && versionInfo.timestamp > this.currentVersion) {
                    console.log('Production: New version detected!', {
                        current: this.currentVersion,
                        new: versionInfo.timestamp
                    });
                    this.notifyNewVersion(false); // false = production mode
                }
                resolve();
            },
            error: (err) => {
                console.error('Error checking production version:', err);
                resolve();
            }
        });
    }

    /**
     * Notifica al usuario sobre la nueva versión y recarga la página
     * @param isDev Si es modo desarrollo, recarga automáticamente sin preguntar
     */
    private notifyNewVersion(isDev: boolean = false): void {
        if (isDev) {
            // En desarrollo, recargar automáticamente sin preguntar
            console.log('Development mode: Auto-reloading...');
            setTimeout(() => {
                window.location.reload();
            }, 1000); // Esperar 1 segundo para que se vea el mensaje en consola
        } else {
            // En producción, preguntar al usuario
            const message = '¡Hay una nueva versión disponible! La página se recargará para aplicar las actualizaciones.';

            if (confirm(message)) {
                this.reloadApp();
            } else {
                // Si el usuario cancela, recordarle en 1 minuto
                setTimeout(() => {
                    if (confirm('Recordatorio: Hay una nueva versión disponible. ¿Desea recargar ahora?')) {
                        this.reloadApp();
                    }
                }, 60000); // 1 minuto
            }
        }
    }

    /**
     * Recarga la aplicación limpiando el cache
     */
    private reloadApp(): void {
        // Limpiar cache del service worker si existe
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((registration) => registration.unregister());
            });
        }

        // Limpiar cache del navegador
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => caches.delete(name));
            });
        }

        // Recargar la página forzando la descarga desde el servidor
        window.location.reload();
    }

    /**
     * Detiene la verificación de versión
     */
    stopVersionCheck(): void {
        if (this.checkSubscription) {
            this.checkSubscription.unsubscribe();
            this.checkSubscription = null;
        }
    }
}
