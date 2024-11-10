import { Component, Input, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-evaluation-chart',
  template: `
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-4">Evaluation History</h3>
      <canvas #evaluationChart></canvas>
    </div>
  `
})
export class EvaluationChartComponent implements OnInit {
  @Input() evaluationData: any[] = [];
  private chart: Chart | undefined;

  ngOnInit() {
    this.createChart();
  }

  private createChart() {
    const ctx = document.getElementById('evaluationChart') as HTMLCanvasElement;
    
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.evaluationData.map(d => `${d.AcademicYear} ${d.Semester}`),
        datasets: [{
          label: 'Total Score',
          data: this.evaluationData.map(d => d.TotalScore),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    });
  }
}