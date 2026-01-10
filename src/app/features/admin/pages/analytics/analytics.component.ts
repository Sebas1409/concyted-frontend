import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsCardComponent } from '../../components/stats-card/stats-card.component';
import { NgApexchartsModule, ChartComponent, ApexAxisChartSeries, ApexChart, ApexXAxis, ApexTitleSubtitle, ApexStroke, ApexDataLabels, ApexYAxis, ApexLegend, ApexPlotOptions, ApexGrid } from "ng-apexcharts";
import { AdminDashboardService, DashboardData } from '../../../../core/services/admin-dashboard.service';

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
    imports: [CommonModule, StatsCardComponent, NgApexchartsModule],
    templateUrl: './analytics.component.html',
    styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent implements OnInit {
    private dashboardService = inject(AdminDashboardService);
    private cdr = inject(ChangeDetectorRef);

    isLoading = true;

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

    // 4. Estado de Verificación (Pie/Donut)
    verificationChart: Partial<ChartOptions> | any = {
        series: [],
        labels: [],
        chart: { type: 'pie', height: 350, fontFamily: 'Inter, sans-serif' },
        colors: ['#F59E0B', '#EF4444', '#10B981'], // Orange, Red, Green
        legend: { position: 'bottom' }
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

    // 6. Producción Científica (Grouped Bar)
    productionChart: Partial<ChartOptions> | any = {
        series: [],
        chart: { type: 'bar', height: 350, fontFamily: 'Inter, sans-serif' },
        plotOptions: {
            bar: { horizontal: false, columnWidth: '70%', borderRadius: 2 }
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: { categories: [] },
        colors: ['#005470', '#38BDF8', '#F59E0B'],
        legend: { position: 'bottom' }
    };

    ngOnInit() {
        this.loadDashboardData();
    }

    loadDashboardData() {
        this.isLoading = true;
        this.dashboardService.getDashboardStats().subscribe({
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

    updateStats(data: DashboardData) {
        this.stats = [
            { title: 'Investigadores Registrados', value: (data.investigadoresRegistrados ?? 0).toLocaleString(), icon: 'users', type: 'info' },
            { title: 'Total de Instituciones', value: (data.totalInstituciones ?? 0).toLocaleString(), icon: 'building', type: 'info' },
            { title: 'Investigadores Activos', value: (data.investigadoresActivos ?? 0).toLocaleString(), label: 'Renacyt', icon: 'check-circle', type: 'success' },
            { title: 'Publicaciones Indexadas', value: (data.publicacionesIndexadas ?? 0).toLocaleString(), icon: 'book', type: 'info' }
        ];
    }

    updateCharts(data: DashboardData) {
        // 1. Academic Level
        if (data.nivelAcademico && data.nivelAcademico.length > 0) {
            const academic = data.nivelAcademico[0];
            const order = ['bachiller', 'maestro', 'doctor', 'licenciado', 'segundaEspecialidad'];
            const categories = ['Bachiller', 'Maestro', 'Doctor', 'Licenciado', '2da Especialidad'];
            const values = order.map(key => academic[key as keyof typeof academic] || 0);

            this.academicLevelChart.series = [{ name: 'Investigadores', data: values }];
            this.academicLevelChart.xaxis = { categories: categories };
        }

        // 2. Gender
        if (data.distribucionGenero && data.distribucionGenero.length > 0) {
            const gender = data.distribucionGenero[0];
            this.genderChart.series = [gender.femenino || 0, gender.masculino || 0];
        }

        // 3. Age Ranges
        if (data.rangoEdades && data.rangoEdades.length > 0) {
            const ages = data.rangoEdades[0];
            // Order explicitly
            const order = ['20-30', '31-40', '41-50', '51-60', '60+'];
            const values = order.map(k => ages[k as keyof typeof ages] || 0);

            this.ageChart.series = [{ name: 'Investigadores', data: values }];
            this.ageChart.xaxis = { categories: order };
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

            this.verificationChart.series = values;
            this.verificationChart.labels = labels;
        }

        // 5. Growth
        if (data.crecimientoRegistros && data.crecimientoRegistros.length > 0) {
            const years = data.crecimientoRegistros.map(item => item.anio.toString());
            const totals = data.crecimientoRegistros.map(item => item.total);

            this.growthChart.series = [{ name: 'Total Registros', data: totals }];
            this.growthChart.xaxis = { categories: years };
        }

        // 6. Production
        if (data.produccionCientifica && data.produccionCientifica.length > 0) {
            // Placeholder: Implement when structure is known
        }
    }

    downloadChart(chartId: string, format: 'pdf' | 'excel') {
        console.log(`Downloading chart ${chartId} as ${format}`);
    }
}
