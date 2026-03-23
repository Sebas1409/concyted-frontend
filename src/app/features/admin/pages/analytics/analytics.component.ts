import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { StatsCardComponent } from '../../components/stats-card/stats-card.component';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle, ApexStroke, ApexDataLabels, ApexYAxis, ApexLegend, ApexPlotOptions, ApexGrid } from "ng-apexcharts";
import { AdminDashboardService, DashboardData } from '../../../../core/services/admin-dashboard.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export type ChartOptions = {
    series: ApexAxisChartSeries | any;
    chart: ApexChart;
    xaxis: ApexXAxis;
    title: ApexTitleSubtitle;
    colors: string[];
    stroke: ApexStroke;
    dataLabels: ApexDataLabels;
    yaxis: ApexYAxis;
    legend: ApexLegend;
    labels: string[];
    plotOptions: ApexPlotOptions;
    grid: ApexGrid;
};

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [CommonModule, StatsCardComponent, NgApexchartsModule, ReactiveFormsModule],
    templateUrl: './analytics.component.html',
    styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
    private dashboardService = inject(AdminDashboardService);
    private cdr = inject(ChangeDetectorRef);
    private fb = inject(FormBuilder);

    isLoading = true;
    filterForm: FormGroup;
    filterMode: 'year' | 'range' | 'date' = 'range';

    constructor() {
        this.filterForm = this.fb.group({
            anio: [null],
            anioDesde: [null],
            anioHasta: [null],
            fechaDesde: [''],
            fechaHasta: ['']
        });
    }

    // Stats Data
    stats = [
        { title: 'Investigadores Registrados', value: '0', icon: 'users', type: 'info' },
        { title: 'Total de Instituciones', value: '0', icon: 'building', type: 'info' },
        { title: 'Investigadores Activos', value: '0', label: 'Renacyt', icon: 'check-circle', type: 'success' },
        { title: 'Publicaciones Indexadas', value: '0', icon: 'book', type: 'info' }
    ];

    // ... (Charts config remains same, skipping for brevity in replacement if not modifying logic) ...
    // Note: Since replace_file_content replaces blocks, I must be careful not to delete chart configs if I select a large range.
    // I will target the class header and the methods `loadDashboardData` and `updateStats`.

    // 1. Nivel Académico (Horizontal Bar)
    academicLevelChart: Partial<ChartOptions> | any = {
        series: [{
            name: 'Investigadores',
            data: []
        }],
        chart: { type: 'bar', height: 350, fontFamily: 'Inter, sans-serif' },
        plotOptions: {
            bar: { horizontal: true, borderRadius: 4, barHeight: '50%' }
        },
        dataLabels: { enabled: false },
        xaxis: { categories: [] },
        colors: ['#005470'],
        title: { text: undefined }
    };

    // ... other charts ...
    // To safely inject CDR and update methods without redeclaring all chart configs (which are huge), 
    // I will use multiple smaller replacements or one careful replacement.
    // The previous tool usage replaced the entire class except imports.
    // I will try to replace the top part (Imports -> Class Header) and then the methods.

    // Better approach: Replace imports to Inject CDR first.
    // Then replace methods `loadDashboardData` and `updateStats`.

    // 2. Distribución por Género (Donut)
    genderChart: Partial<ChartOptions> | any = {
        series: [],
        labels: ['Femenino', 'Masculino'],
        chart: { type: 'donut', height: 350, fontFamily: 'Inter, sans-serif' },
        colors: ['#EF4444', '#005470'], // Red, Primary Blue
        legend: { position: 'bottom' },
        plotOptions: { pie: { donut: { size: '65%', labels: { show: false } } } }
    };

    // 3. Rango de Edades (Vertical Bar)
    ageChart: Partial<ChartOptions> | any = {
        series: [{
            name: 'Investigadores',
            data: []
        }],
        chart: { type: 'bar', height: 350, fontFamily: 'Inter, sans-serif' },
        plotOptions: {
            bar: { borderRadius: 4, columnWidth: '60%' }
        },
        dataLabels: { enabled: false },
        xaxis: { categories: [] },
        colors: ['#38BDF8'],
        grid: { strokeDashArray: 4 }
    };

    // 4. Estado de Verificación (Pie with percentages)
    verificationChart: Partial<ChartOptions> | any = {
        series: [],
        labels: [],
        chart: { type: 'pie', height: 350, fontFamily: 'Inter, sans-serif' },
        colors: ['#10B981', '#EF4444', '#F59E0B'], // Green, Red, Orange
        legend: { position: 'bottom', offsetY: 8 },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val.toFixed(0)}%`,
            style: { fontFamily: 'Inter, sans-serif', fontWeight: 600 }
        }
    };

    // 5. Crecimiento de Registros (Line)
    growthChart: Partial<ChartOptions> | any = {
        series: [{
            name: 'Total Registros',
            data: []
        }],
        chart: { type: 'line', height: 350, fontFamily: 'Inter, sans-serif', zoom: { enabled: false } },
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: [] },
        colors: ['#005470'],
        markers: { size: 5, hover: { size: 7 } },
        grid: { strokeDashArray: 4 }
    };

    // 6. Producción Científica (Grouped Bar by Year)
    productionChart: Partial<ChartOptions> | any = {
        series: [],
        chart: { type: 'bar', height: 350, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
        plotOptions: {
            bar: { horizontal: false, columnWidth: '65%', borderRadius: 3 }
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: [] },
        colors: ['#005470', '#38BDF8', '#F59E0B', '#10B981', '#6366F1', '#EC4899'],
        legend: { position: 'bottom', offsetY: 8 },
        grid: { strokeDashArray: 4 }
    };

    ngOnInit() {
        this.loadDashboardData();

        // Mutually exclusive filters logic
        this.filterForm.get('anio')?.valueChanges.subscribe(val => {
            if (val) this.normalizeFilters('anio');
        });

        this.filterForm.get('anioDesde')?.valueChanges.subscribe(val => {
            if (val) this.normalizeFilters('range');
        });

        this.filterForm.get('anioHasta')?.valueChanges.subscribe(val => {
            if (val) this.normalizeFilters('range');
        });

        this.filterForm.get('fechaDesde')?.valueChanges.subscribe(val => {
            if (val) this.normalizeFilters('date');
        });

        this.filterForm.get('fechaHasta')?.valueChanges.subscribe(val => {
            if (val) this.normalizeFilters('date');
        });
    }

    setFilterMode(mode: 'year' | 'range' | 'date') {
        this.filterMode = mode;
        this.clearFilters();
    }

    private normalizeFilters(source: 'anio' | 'range' | 'date') {
        if (source === 'anio') {
            this.filterForm.patchValue({
                anioDesde: null, anioHasta: null,
                fechaDesde: '', fechaHasta: ''
            }, { emitEvent: false });
        } else if (source === 'range') {
            this.filterForm.patchValue({
                anio: null,
                fechaDesde: '', fechaHasta: ''
            }, { emitEvent: false });
        } else if (source === 'date') {
            this.filterForm.patchValue({
                anio: null,
                anioDesde: null, anioHasta: null
            }, { emitEvent: false });
        }
    }

    loadDashboardData(filters?: any) {
        this.isLoading = true;
        this.dashboardService.getDashboardStats(filters).subscribe({
            next: (data) => {
                console.log('Received Dashboard Data:', data);
                this.updateStats(data);
                this.updateCharts(data);
                this.isLoading = false;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading dashboard data', err);
                this.isLoading = false;
                this.cdr.markForCheck();
            }
        });
    }

    applyFilters() {
        this.loadDashboardData(this.filterForm.value);
    }

    clearFilters() {
        this.filterForm.reset();
        this.applyFilters();
    }

    hasNoData(chartId: string): boolean {
        switch (chartId) {
            case 'academic':
                return !this.academicLevelChart.series?.[0]?.data?.some((v: any) => v > 0);
            case 'gender':
                return !this.genderChart.series?.some((v: any) => v > 0);
            case 'age':
                return !this.ageChart.series?.[0]?.data?.some((v: any) => v > 0);
            case 'verification':
                return !this.verificationChart.series?.some((v: any) => v > 0);
            case 'growth':
                return !this.growthChart.series?.[0]?.data?.some((v: any) => v > 0);
            case 'production':
                return !this.productionChart.series?.some((s: any) => s.data?.some((v: any) => v > 0));
            default:
                return false;
        }
    }

    updateStats(data: DashboardData) {
        this.stats = [
            { title: 'Investigadores Registrados', value: (data.investigadoresRegistrados ?? 0).toLocaleString(), icon: 'users', type: 'info' },
            { title: 'Total de Instituciones', value: (data.totalInstituciones ?? 0).toLocaleString(), icon: 'building', type: 'info' },
            { title: 'Investigadores Activos', value: (data.investigadoresActivos ?? 0).toLocaleString(), label: 'Activos', icon: 'check-circle', type: 'success' },
            { title: 'Publicaciones Indexadas', value: (data.publicacionesIndexadas ?? 0).toLocaleString(), icon: 'book', type: 'info' }
        ];
    }

    updateCharts(data: DashboardData) {
        // 1. Academic Level
        if (data.nivelAcademico && data.nivelAcademico.length > 0) {
            const academic = data.nivelAcademico[0];
            const categories = ['Bachiller', 'Maestro', 'Doctor', 'Licenciado', '2da Especialidad'];
            const values = [
                academic.bachiller || 0,
                academic.maestro || 0,
                academic.doctor || 0,
                academic.licenciado || 0,
                academic.segundaEspecialidad || 0
            ];

            this.academicLevelChart = {
                ...this.academicLevelChart,
                series: [{ name: 'Investigadores', data: values }],
                xaxis: { ...this.academicLevelChart.xaxis, categories: categories }
            };
        }

        // 6. Production (Grouped by Year, Series by Type)
        if (data.produccionCientifica && data.produccionCientifica.length > 0) {
            const types = [...new Set(data.produccionCientifica.map(p => p.tipo))].sort();
            const years = [...new Set(data.produccionCientifica.map(p => p.anio))].sort((a, b) => a - b);

            const series = types.map(t => ({
                name: t,
                data: years.map(y => {
                    const found = data.produccionCientifica.find(p => p.tipo === t && p.anio === y);
                    return found ? found.conteo || 0 : 0;
                })
            }));

            this.productionChart = {
                ...this.productionChart,
                series: series,
                xaxis: { ...this.productionChart.xaxis, categories: years.map(y => y.toString()) }
            };
        } else {
            this.productionChart = { ...this.productionChart, series: [], xaxis: { ...this.productionChart.xaxis, categories: [] } };
        }

        // 2. Gender
        if (data.distribucionGenero && data.distribucionGenero.length > 0) {
            const gender = data.distribucionGenero[0];
            this.genderChart = {
                ...this.genderChart,
                series: [gender.femenino || 0, gender.masculino || 0]
            };
        } else {
            this.genderChart = { ...this.genderChart, series: [] };
        }

        // 3. Age Ranges
        if (data.rangoEdades && data.rangoEdades.length > 0) {
            const ages = data.rangoEdades[0];
            const order = ['20-30', '31-40', '41-50', '51-60', '60+'];
            const values = order.map(k => ages[k as keyof typeof ages] || 0);

            this.ageChart = {
                ...this.ageChart,
                series: [{ name: 'Investigadores', data: values }],
                xaxis: { ...this.ageChart.xaxis, categories: order }
            };
        } else {
            this.ageChart = { ...this.ageChart, series: [], xaxis: { ...this.ageChart.xaxis, categories: [] } };
        }

        // 4. Verification
        if (data.estadoVerificacion && data.estadoVerificacion.length > 0) {
            const verification = data.estadoVerificacion[0];
            const values = [
                verification.validadoReniec || 0,
                verification.observado || 0,
                verification.manual || 0
            ];
            const labels = ['Validado Reniec', 'Observado', 'Manual'];

            this.verificationChart = {
                ...this.verificationChart,
                series: values,
                labels: labels
            };
        } else {
            this.verificationChart = { ...this.verificationChart, series: [], labels: [] };
        }

        // 5. Growth
        if (data.crecimientoRegistros && data.crecimientoRegistros.length > 0) {
            const years = data.crecimientoRegistros.map(item => item.anio.toString());
            const totals = data.crecimientoRegistros.map(item => item.total);

            this.growthChart = {
                ...this.growthChart,
                series: [{ name: 'Total Registros', data: totals }],
                xaxis: { ...this.growthChart.xaxis, categories: years }
            };
        } else {
            this.growthChart = { ...this.growthChart, series: [], xaxis: { ...this.growthChart.xaxis, categories: [] } };
        }
    }

    private getChartData(chartId: string): { title: string, headers: string[], rows: any[][] } {
        switch (chartId) {
            case 'academic':
                return {
                    title: 'Distribución por Nivel Académico',
                    headers: ['Grado Académico', 'Cantidad de Investigadores'],
                    rows: (this.academicLevelChart.xaxis?.categories || []).map((c: string, i: number) => [c, (this.academicLevelChart.series?.[0]?.data?.[i] || 0)])
                };
            case 'gender':
                return {
                    title: 'Distribución por Género',
                    headers: ['Género', 'Cantidad de Investigadores'],
                    rows: (this.genderChart.labels || []).map((l: string, i: number) => [l, (this.genderChart.series?.[i] || 0)])
                };
            case 'age':
                return {
                    title: 'Rango de Edades',
                    headers: ['Rango de Edad', 'Cantidad de Investigadores'],
                    rows: (this.ageChart.xaxis?.categories || []).map((c: string, i: number) => [c, (this.ageChart.series?.[0]?.data?.[i] || 0)])
                };
            case 'verification':
                return {
                    title: 'Estado de Verificación',
                    headers: ['Estado de Verificación', 'Cantidad'],
                    rows: (this.verificationChart.labels || []).map((l: string, i: number) => [l, (this.verificationChart.series?.[i] || 0)])
                };
            case 'growth':
                return {
                    title: 'Crecimiento de Registros',
                    headers: ['Año', 'Nuevos Registros'],
                    rows: (this.growthChart.xaxis?.categories || []).map((c: string, i: number) => [c, (this.growthChart.series?.[0]?.data?.[i] || 0)])
                };
            case 'production':
                const years = this.productionChart.xaxis?.categories || [];
                const series = this.productionChart.series || [];
                const headers = ['Año', ...series.map((s: any) => s.name)];
                const rows = years.map((year: any, yearIdx: number) => [
                    year,
                    ...series.map((s: any) => s.data[yearIdx] || 0)
                ]);
                return { title: 'Producción Científica', headers, rows };
            default:
                return { title: 'Dashboard Analytics', headers: [], rows: [] };
        }
    }

    downloadChart(chartId: string, format: 'pdf' | 'excel') {
        const { title, headers, rows } = this.getChartData(chartId);

        if (format === 'excel') {
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
            XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`);
            this.cdr.markForCheck();
        } else {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFontSize(18);
            doc.setTextColor(0, 84, 112); // Primary Blue
            doc.text(title, pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Fecha de exportación: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });

            autoTable(doc, {
                startY: 35,
                head: [headers],
                body: rows,
                theme: 'grid',
                headStyles: { fillColor: [0, 84, 112], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                margin: { top: 35 }
            });

            doc.save(`${title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
            this.cdr.markForCheck();
        }
    }
}
