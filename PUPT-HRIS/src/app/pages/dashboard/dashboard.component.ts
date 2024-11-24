import { Component, AfterViewInit, ChangeDetectorRef, ViewChild, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { ChartOptions, ChartType, ChartData } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { DashboardService } from '../../services/dashboard.service';
import { DepartmentCount } from '../../model/departmentCount.model';
import { AuthService } from '../../services/auth.service';
import { CampusContextService } from '../../services/campus-context.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UserDashboardData } from '../../services/dashboard.service';
import { UpcomingBirthday } from '../../services/dashboard.service';
import { NgxGaugeModule} from 'ngx-gauge';
import { Router } from '@angular/router';
import { DashboardStateService } from '../../services/dashboard-state.service';
import { AcademicRank, AcademicRankCount } from '../../model/academicRank.model';
import { EvaluationService, EvaluationRatingCount } from '../../services/evaluation.service';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { 
  RegularizationCandidate, 
  PerformanceReviewCandidate,
  CandidateFilterCriteria 
} from '../../model/evaluation-candidates.model';

type NgxGaugeType = 'full' | 'semi' | 'arch';

interface TrainingSeminar {
  title: string;
  date: Date;
  type: string;
  status: string;
}

interface Employee {
  name: string;
}

// Add this constant at the top of the file
const ALL_ACADEMIC_RANKS = [
  'Instructor I', 'Instructor II', 'Instructor III',
  'Assistant Professor I', 'Assistant Professor II', 'Assistant Professor III', 'Assistant Professor IV',
  'Associate Professor I', 'Associate Professor II', 'Associate Professor III', 'Associate Professor IV', 'Associate Professor V',
  'Professor I', 'Professor II', 'Professor III', 'Professor IV', 'Professor V', 'Professor VI'
];

// Define the enum at the top level
export enum SectionOrder {
  First = 0,
  Second = 1,
  Third = 2
}

interface DashboardSection {
  id: string;
  title: string;
  visible: boolean;
  order: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [NgChartsModule, CommonModule, NgxGaugeModule, FormsModule, DragDropModule]
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(BaseChartDirective) chart!: BaseChartDirective | undefined;

  // Add ViewChildren to track all charts
  @ViewChildren(BaseChartDirective) charts!: QueryList<BaseChartDirective>;

  public totalFemale: number = 0;
  public totalMale: number = 0;
  public partTime: number = 0;
  public fullTime: number = 0;
  public temporary: number = 0;
  public faculty: number = 0;
  public staff: number = 0;

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      }
    }
  };
  public barChartLegend = false;
  public barChartData: ChartData<'bar'> = {
    labels: ['Part-Time', 'Full-Time', 'Temporary'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
      }
    ]
  };

  public pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      }
    }
  };
  public pieChartLabels: string[] = [];
  public pieChartType: ChartType = 'pie';
  public pieChartLegend = true;
  public pieChartData: ChartData<'pie'> = {
    labels: this.pieChartLabels,
    datasets: [
      {
        data: [],
        backgroundColor: [],
      }
    ]
  };

  public userRole: string = '';

  // User-specific properties
  public userDepartment: string = '';
  public userAcademicRank: string = '';
  public userEmploymentType: string = '';

  // User attendance chart
  public userAttendanceChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      }
    }
  };
  public userAttendanceChartLegend = true;
  public userAttendanceChartData: ChartData<'pie'> = {
    labels: ['Present', 'Absent', 'Late'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#4BC0C0', '#FF6384', '#FFCE56'],
      }
    ]
  };

  // User performance chart
  public userPerformanceChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      }
    }
  };
  public userPerformanceChartLegend = false;
  public userPerformanceChartData: ChartData<'bar'> = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: '#36A2EB',
      }
    ]
  };

  // Trainings and Seminars
  public trainingsAndSeminars: TrainingSeminar[] = [];

  public isFullTimeView: boolean = true;
  public fullTimeEmployees: Employee[] = Array(20).fill(null).map((_, i) => ({ name: `Full-Time Employee ${i + 1}` }));
  public partTimeEmployees: Employee[] = Array(12).fill(null).map((_, i) => ({ name: `Part-Time Employee ${i + 1}` }));

  public employmentTypeChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      }
    }
  };
  public employmentTypeChartData: ChartData<'pie'> = {
    labels: ['Full-Time', 'Part-Time'],
    datasets: [
      {
        data: [20, 12], // Filler data
        backgroundColor: ['#4BC0C0', '#FF6384'],
      }
    ]
  };

  private campusSubscription: Subscription;

  public isAdminView: boolean = false; // Set default to false

  private userID: number;

  public profileCompletionPercentage: number = 0;

  public upcomingBirthdays: UpcomingBirthday[] = [];

  public ageGroupChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };

  public ageGroupChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Age Distribution' }
    }
  };

  // Add new chart property for academic ranks
  public academicRankChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: '#800000', // Maroon color
      borderColor: '#800000',
      borderWidth: 1
    }]
  };

  public academicRankChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        ticks: {
          autoSkip: false,
          padding: 10
        }
      }
    }
  };

  public academicRanks: AcademicRankCount[] = [];

  public evaluationRatingChartData: ChartData<'pie'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#4BC0C0', // Outstanding (Green)
        '#36A2EB', // Very Satisfactory (Blue)
        '#FFCE56', // Satisfactory (Yellow)
        '#FF9F40', // Fair (Orange)
        '#FF6384'  // Poor (Red)
      ],
      hoverOffset: 4
    }]
  };

  public evaluationRatingChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      }
    }
  };

  // Add new properties
  academicYears: string[] = [];
  selectedAcademicYear: string = '';
  semesters: string[] = ['First Semester', 'Second Semester'];
  selectedSemester: string = '';

  // Add these properties
  showFacultyList: boolean = false;
  selectedRating: string = '';
  facultiesList: any[] = [];

  // Add these properties
  modalCurrentPage: number = 1;
  modalItemsPerPage: number = 10;
  modalTotalPages: number = 1;
  paginatedFacultiesList: any[] = [];

  // Make enum available to template
  SectionOrder = SectionOrder;

  public dashboardSections: DashboardSection[] = [
    { id: 'faculty-evaluation', title: 'Faculty Evaluation', visible: true, order: 0 },
    { id: 'charts', title: 'Charts', visible: true, order: 1 },
    { id: 'academic-ranks', title: 'Academic Ranks', visible: true, order: 2 },
    { id: 'evaluation-candidates', title: 'Faculty Evaluation Candidates', visible: true, order: 3 }
  ];
  public showDashboardSettings = false;

  // Add new properties for evaluation candidates
  regularizationCandidates: RegularizationCandidate[] = [];
  performanceReviewCandidates: PerformanceReviewCandidate[] = [];
  selectedCandidate: RegularizationCandidate | PerformanceReviewCandidate | null = null;
  showCandidateModal: boolean = false;
  candidateFilters: CandidateFilterCriteria = {};

  // Add loading states
  isLoadingRegularization: boolean = false;
  isLoadingPerformance: boolean = false;

  // Add these properties to the DashboardComponent class
  showAllRegularization: boolean = false;
  showAllPerformance: boolean = false;

  // Add these properties
  showAllCandidatesModal: boolean = false;
  modalType: 'regularization' | 'performance' | null = null;

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private campusContextService: CampusContextService,
    private router: Router,
    private dashboardStateService: DashboardStateService,
    private evaluationService: EvaluationService
  ) {
    this.campusSubscription = new Subscription();
    const decodedToken = this.authService.getDecodedToken();
    this.userID = decodedToken?.userId || 0;
  }

  ngOnInit(): void {
    const roles = this.authService.getUserRoles();

    if (roles.length > 0) {
      this.userRole = roles.includes('admin') ? 'admin' : 
                      roles.includes('superadmin') ? 'superadmin' : 
                      roles.includes('faculty') ? 'faculty' : 
                      roles.includes('staff') ? 'staff' : 'user';
    }

    // Load the saved view state
    this.isAdminView = this.dashboardStateService.getAdminView();

    // Subscribe to campus changes and load data accordingly
    this.campusSubscription = this.campusContextService.getCampusId().subscribe(
      campusId => {
        if (campusId !== null) {
          if (this.isAdminView && (this.userRole === 'admin' || this.userRole === 'superadmin')) {
            this.loadAdminDashboardData(campusId);
          } else {
            this.loadUserDashboardData();
          }
        }
      },
      error => console.error('Dashboard - Error getting campus ID:', error)
    );

    this.loadUpcomingBirthdays();
    this.loadProfileCompletion();

    // Generate academic years dynamically
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11 where 0 is January
    
    // If we're past June (month 5), start with current year, otherwise start with previous year
    const startYear = currentMonth > 5 ? currentYear : currentYear - 1;
    
    // Generate last 5 academic years
    this.academicYears = Array.from({length: 5}, (_, i) => {
      const year = startYear - i;
      return `${year}-${year + 1}`;
    });
    
    // Set default academic year based on current date
    this.selectedAcademicYear = `${startYear}-${startYear + 1}`;
    this.selectedSemester = currentMonth > 5 ? 'First Semester' : 'Second Semester';

    this.loadDashboardPreferences();
    this.loadEvaluationCandidates();
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
  }

  ngAfterViewInit() {
    // Initial render of charts
    this.renderCharts();
    
    // Watch for changes in section visibility and order
    this.dashboardSections.forEach(section => {
      if (section.visible) {
        setTimeout(() => {
          this.renderCharts();
        }, 250); // Increased timeout to ensure DOM is ready
      }
    });
  }

  private renderCharts() {
    if (this.charts) {
      this.charts.forEach(chart => {
        if (chart && chart.chart) {
          chart.chart.update();
        }
      });
    }
  }

  loadAdminDashboardData(campusId: number): void {
    this.dashboardService.getDashboardData(campusId).subscribe(data => {
      this.totalFemale = data.totalFemale;
      this.totalMale = data.totalMale;
      this.partTime = data.partTime;
      this.fullTime = data.fullTime;
      this.temporary = data.temporary;
      this.faculty = data.faculty;
      this.staff = data.staff;
  
      this.barChartData.datasets[0].data = [this.partTime, this.fullTime, this.temporary];

      if (data.departments && Array.isArray(data.departments)) {
        const departments: DepartmentCount[] = data.departments.map((dept: { DepartmentName: string, count: number }) => ({
          Department: dept.DepartmentName,
          count: dept.count,
        }));
  
        this.pieChartLabels = departments.map(dept => dept.Department);
  
        const colors = [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
          '#FFCD56', '#4BC0C0', '#36A2EB', '#FF6384', '#C9CBCF', '#6B486B',
          '#A9A9A9', '#C71585', '#3CB371', '#FFD700', '#8B008B', '#7FFFD4',
          '#FF4500', '#32CD32'
        ];
  
        this.pieChartData = {
          labels: this.pieChartLabels,
          datasets: [{
            data: departments.map(dept => dept.count),
            backgroundColor: departments.map((dept, index) => colors[index % colors.length])
          }]
        };
  
        // Process academic rank data
        if (data.academicRanks && Array.isArray(data.academicRanks)) {
          // Create a map of existing ranks and their counts
          const rankCountMap = new Map<string, number>();
          
          // Populate the map with the incoming data
          data.academicRanks.forEach((rank: any) => {
            rankCountMap.set(rank.Rank, Number(rank.count));
          });

          // Create the full list including zeros for missing ranks
          this.academicRanks = ALL_ACADEMIC_RANKS.map(rankName => ({
            Rank: rankName,
            count: rankCountMap.get(rankName) || 0
          }));

          // Find the maximum count
          const maxCount = Math.max(...this.academicRanks.map(rank => rank.count));
          
          // Calculate a reasonable maximum for the scale
          const scaleMax = Math.ceil((maxCount + 1) / 5) * 5;

          // Calculate dynamic step size
          const stepSize = Math.max(1, Math.floor(scaleMax / 10));

          // Update chart options with type assertion
          this.academicRankChartOptions = {
            ...this.academicRankChartOptions,
            scales: {
              x: {
                beginAtZero: true,
                grid: {
                  display: true,
                  color: '#e5e5e5',
                  drawTicks: true,
                  lineWidth: 1
                },
                border: {
                  display: false
                },
                ticks: {
                  stepSize: stepSize,
                  precision: 0
                },
                max: scaleMax,
                min: 0
              } as any, // Type assertion to avoid TypeScript error
              y: {
                grid: {
                  display: false
                }
              }
            }
          };

          // Update the chart data
          this.academicRankChartData = {
            labels: this.academicRanks.map(rank => rank.Rank),
            datasets: [{
              data: this.academicRanks.map(rank => rank.count),
              backgroundColor: '#800000',
              borderColor: '#800000',
              borderWidth: 1
            }]
          };

          // Force chart update
          if (this.chart) {
            this.chart.update();
          }
        }

        this.updateCharts();
      } else {
        console.error('Departments data is missing or not an array');
      }

      this.loadEvaluationRatingsDistribution(campusId);
    });
  }

  loadUserDashboardData(): void {
    this.dashboardService.getUserDashboardData(this.userID).subscribe({
      next: (data: UserDashboardData) => {
        this.userDepartment = data.department;
        this.userAcademicRank = data.academicRank;
        this.userEmploymentType = data.employmentType;
        
        // Update the user activity chart data
        this.userActivityChartData.datasets[0].data = [
          data.activityCounts.trainings,
          data.activityCounts.awards,
          data.activityCounts.voluntaryActivities,
          data.activityCounts.officershipMemberships
        ];
        
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading user dashboard data:', error);
        // Handle the error, e.g., show a notification to the user
      }
    });
  }

  updateCharts(): void {
    setTimeout(() => {
      if (this.chart) {
        this.chart.chart?.resize();
        this.chart.update();
      }
      this.cdr.detectChanges();
    }, 0);
  }

  loadUpcomingBirthdays(): void {
    this.dashboardService.getUpcomingBirthdays().subscribe({
      next: (birthdays: UpcomingBirthday[]) => {
        this.upcomingBirthdays = birthdays;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading upcoming birthdays:', error);
      }
    });
  }

  // Update the toggle function
  toggleDashboardView(isAdmin: boolean): void {
    this.isAdminView = isAdmin;
    this.dashboardStateService.setAdminView(isAdmin); // Save the state
    
    if (isAdmin) {
      const campusId = this.campusContextService.getCurrentCampusId();
      if (campusId) {
        this.loadAdminDashboardData(campusId);
      }
    } else {
      this.loadUserDashboardData();
    }
  }

  // New property for user activity chart
  public userActivityChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Your Activities'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };
  public userActivityChartData: ChartData<'bar'> = {
    labels: ['Trainings', 'Awards', 'Voluntary Activities', 'Officership Memberships'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
      }
    ]
  };

  loadAgeGroupData(campusId: number): void {
    this.dashboardService.getAgeGroupData(campusId).subscribe({
      next: (data) => {
        this.ageGroupChartData = {
          labels: data.map(item => item.ageGroup),
          datasets: [{
            data: data.map(item => item.count),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
            ]
          }]
        };
        this.cdr.detectChanges(); // Trigger change detection
      },
      error: (error) => {
        console.error('Error loading age group data:', error);
        // Handle the error, maybe set default data
      }
    });
  }

  public gaugeType: NgxGaugeType = 'arch'; // or 'semi', 'full'
  public gaugeValue: number = 0; // Example value
  public gaugeAppendText: string = '%';
  public gaugeThick: number = 20; // Thickness of the gauge
  public gaugeSize: number = 200; // Size of the gauge
  public incompleteTasks: string[] = [];
  public showAllTasks: boolean = false;

  loadProfileCompletion(): void {
    this.dashboardService.getProfileCompletion(this.userID).subscribe({
      next: (data) => {
        this.profileCompletionPercentage = data.completionPercentage;
        this.gaugeValue = Math.round(this.profileCompletionPercentage);
        this.incompleteTasks = data.incompleteSections; // Store incomplete tasks
      },
      error: (error) => {
        console.error('Error loading profile completion:', error);
      }
    });
  }

  toggleTasksView(): void {
    this.showAllTasks = !this.showAllTasks;
  }

  getProfileMessage(): { title: string, description: string } {
    if (this.gaugeValue === 0) {
      return {
        title: "Let's Get Started!",
        description: "Begin building your professional profile today."
      };
    } else if (this.gaugeValue === 100) {
      return {
        title: "Profile Complete!",
        description: "Thank you for keeping your information up to date."
      };
    } else if (this.gaugeValue >= 50) {
      return {
        title: "Making Great Progress!",
        description: "You're more than halfway there. Keep going!"
      };
    } else {
      return {
        title: "Profile In Progress",
        description: "Take a few moments to complete your profile information."
      };
    }
  }

  // Map task descriptions to their corresponding routes
  private taskRoutes: { [key: string]: string } = {
    'Add your work experience': '/work-experience',
    'Add your contact details': '/contact-details',
    'Add your family background': '/family-background',
    'Add your profile image': '/basic-details',
    'Add your special skills': '/other-information',
    'Add your voluntary work': '/voluntary-works',
    'Add your character references': '/character-reference',
    'Add your basic details': '/basic-details',
    'Add your personal details': '/personal-details',
    'Add your education details': '/educational-background',
    'Add your children details': '/children',
    'Add your signature': '/signature',
    'Add your academic rank': '/academic-rank',
    'Add your memberships': '/officer-membership',
    'Add your civil service eligibility': '/civil-service-eligibility',
    'Answer additional questions': '/additional-question',
    'Add your learning and development': '/learning-development',
    'Add your achievement awards': '/outstanding-achievement'
  };

  navigateToTask(task: string): void {
    const route = this.taskRoutes[task];
    if (route) {
      this.router.navigate([route]);
    }
  }

  // Add this method to the DashboardComponent class
  formatEmploymentType(type: string): string {
    switch(type.toLowerCase()) {
      case 'parttime':
      case 'part-time':
        return 'Part Time';
      case 'fulltime':
      case 'full-time':
        return 'Full Time';
      case 'temporary':
        return 'Temporary';
      default:
        return type; // Return original value if no match
    }
  }

  loadEvaluationRatingsDistribution(campusId: number): void {
    const academicYear = this.selectedAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const semester = this.selectedSemester || 'First Semester';

    this.evaluationService.getEvaluationRatingDistribution(
      campusId,
      academicYear,
      semester
    ).subscribe({
      next: (data: EvaluationRatingCount[]) => {
        this.evaluationRatingChartData = {
          labels: data.map(item => item.rating),
          datasets: [{
            data: data.map(item => item.count),
            backgroundColor: [
              '#4BC0C0', // Outstanding (Green)
              '#36A2EB', // Very Satisfactory (Blue)
              '#FFCE56', // Satisfactory (Yellow)
              '#FF9F40', // Fair (Orange)
              '#FF6384'  // Poor (Red)
            ],
            hoverOffset: 4
          }]
        };
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading evaluation ratings distribution:', error);
      }
    });
  }
  // Add this method to handle filter changes specifically for evaluation data
  onEvaluationFilterChange(): void {
    const campusId = this.campusContextService.getCurrentCampusId();
    if (campusId) {
      this.loadEvaluationRatingsDistribution(campusId);
    }
  }

  viewFacultiesByRating(rating: string): void {
    this.selectedRating = rating;
    const campusId = this.campusContextService.getCurrentCampusId();
    
    if (campusId) {
      this.evaluationService.getFacultiesByRating(
        campusId,
        rating,
        this.selectedAcademicYear,
        this.selectedSemester
      ).subscribe({
        next: (faculties) => {
          this.facultiesList = faculties;
          this.showFacultyList = true;
          this.modalCurrentPage = 1;
          this.updateModalPagination();
        },
        error: (error) => {
          console.error('Error fetching faculties:', error);
        }
      });
    }
  }

  closeFacultyList(): void {
    this.showFacultyList = false;
    this.selectedRating = '';
    this.facultiesList = [];
  }

  // Add pagination methods for modal
  previousModalPage(): void {
    if (this.modalCurrentPage > 1) {
      this.modalCurrentPage--;
      this.updateModalPagination();
    }
  }

  nextModalPage(): void {
    if (this.modalCurrentPage < this.modalTotalPages) {
      this.modalCurrentPage++;
      this.updateModalPagination();
    }
  }

  setModalPage(page: number): void {
    this.modalCurrentPage = page;
    this.updateModalPagination();
  }

  getModalPageArray(): number[] {
    return Array(this.modalTotalPages).fill(0);
  }

  updateModalPagination(): void {
    const startIndex = (this.modalCurrentPage - 1) * this.modalItemsPerPage;
    const endIndex = startIndex + this.modalItemsPerPage;
    this.paginatedFacultiesList = this.facultiesList.slice(startIndex, endIndex);
    this.modalTotalPages = Math.ceil(this.facultiesList.length / this.modalItemsPerPage);
  }

  // Add these methods
  openDashboardSettings(): void {
    this.showDashboardSettings = true;
  }

  closeDashboardSettings(): void {
    this.showDashboardSettings = false;
    this.saveDashboardPreferences();
  }

  toggleSectionVisibility(section: DashboardSection): void {
    section.visible = !section.visible;
    this.saveDashboardPreferences();
    
    // Re-render charts after visibility change
    setTimeout(() => {
      this.renderCharts();
    }, 250);
  }

  updateSectionOrder(section: DashboardSection, newOrder: SectionOrder): void {
    const sectionAtNewPosition = this.dashboardSections.find(s => s.order === newOrder);
    
    if (sectionAtNewPosition && section !== sectionAtNewPosition) {
      const oldOrder = section.order;
      sectionAtNewPosition.order = oldOrder;
      section.order = newOrder;
      
      this.dashboardSections.sort((a, b) => a.order - b.order);
      this.saveDashboardPreferences();
    }
  }

  getAvailableOrders(currentSection: DashboardSection): number[] {
    const totalSections = this.dashboardSections.length;
    return Array.from({ length: totalSections }, (_, i) => i);
  }

  private saveDashboardPreferences(): void {
    const storageKey = `dashboardPreferences_${this.userID}`;
    localStorage.setItem(storageKey, JSON.stringify(this.dashboardSections));
  }

  private loadDashboardPreferences(): void {
    const storageKey = `dashboardPreferences_${this.userID}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const savedSections = JSON.parse(saved);
        
        // Ensure all default sections exist
        const defaultSections = [
          { id: 'faculty-evaluation', title: 'Faculty Evaluation', visible: true, order: 0 },
          { id: 'charts', title: 'Charts', visible: true, order: 1 },
          { id: 'academic-ranks', title: 'Academic Ranks', visible: true, order: 2 },
          { id: 'evaluation-candidates', title: 'Faculty Evaluation Candidates', visible: true, order: 3 }
        ];

        // Merge saved sections with defaults, keeping saved preferences
        this.dashboardSections = defaultSections.map(defaultSection => {
          const savedSection = savedSections.find((s: DashboardSection) => s.id === defaultSection.id);
          return savedSection || defaultSection;
        });

        this.dashboardSections.sort((a, b) => a.order - b.order);
        
        setTimeout(() => {
          this.renderCharts();
        }, 250);
      } catch (error) {
        console.error('Error parsing dashboard preferences:', error);
        // Reset to defaults if there's an error
        this.clearDashboardPreferences();
      }
    }
  }

  getOrderLabel(order: SectionOrder): string {
    return SectionOrder[order];
  }

  onDragDrop(event: CdkDragDrop<DashboardSection[]>) {
    moveItemInArray(this.dashboardSections, event.previousIndex, event.currentIndex);
    
    this.dashboardSections.forEach((section, index) => {
      section.order = index;
    });
    
    this.saveDashboardPreferences();
    
    // Re-render charts after order change
    setTimeout(() => {
      this.renderCharts();
    }, 250);
  }

  loadEvaluationCandidates() {
    const campusId = this.campusContextService.getCurrentCampusId();
    if (!campusId) {
      console.log('No campus ID found');
      return;
    }

    console.log('Loading candidates for campus:', campusId);

    this.isLoadingRegularization = true;
    this.evaluationService.getRegularizationCandidates(campusId).subscribe({
      next: (candidates) => {
        console.log('Raw regularization candidates:', candidates);
        
        // Check each candidate's data
        candidates.forEach(candidate => {
          console.log('Candidate:', {
            name: `${candidate.faculty?.Faculty?.Surname}, ${candidate.faculty?.Faculty?.FirstName}`,
            employmentType: candidate.faculty?.Faculty?.EmploymentType,
            evaluationsCount: candidate.evaluations?.length,
            evaluations: candidate.evaluations
          });
        });

        // Filter part-time faculty with 4 evaluations
        this.regularizationCandidates = candidates.filter(candidate => {
          const isPartTime = candidate.faculty?.Faculty?.EmploymentType?.toLowerCase().includes('part');
          const hasFourEvals = candidate.evaluations?.length === 4;
          
          console.log('Candidate filtering:', {
            name: `${candidate.faculty?.Faculty?.Surname}, ${candidate.faculty?.Faculty?.FirstName}`,
            isPartTime,
            hasFourEvals,
            included: isPartTime && hasFourEvals
          });

          return isPartTime && hasFourEvals;
        });

        console.log('Filtered regularization candidates:', this.regularizationCandidates);
      },
      error: (error) => {
        console.error('Error loading regularization candidates:', error);
        this.regularizationCandidates = [];
      },
      complete: () => {
        this.isLoadingRegularization = false;
      }
    });

    // Similar debugging for performance review candidates
    this.isLoadingPerformance = true;
    this.evaluationService.getPerformanceReviewCandidates(campusId).subscribe({
      next: (candidates) => {
        console.log('Raw performance review candidates:', candidates);
        
        candidates.forEach(candidate => {
          console.log('Performance candidate:', {
            name: `${candidate.faculty?.Faculty?.Surname}, ${candidate.faculty?.Faculty?.FirstName}`,
            employmentType: candidate.faculty?.Faculty?.EmploymentType,
            evaluationsCount: candidate.evaluations?.length,
            evaluations: candidate.evaluations
          });
        });

        this.performanceReviewCandidates = candidates.filter(candidate => {
          const isFullTime = candidate.faculty?.Faculty?.EmploymentType?.toLowerCase().includes('full');
          const hasFourEvals = candidate.evaluations?.length === 4;
          
          console.log('Performance candidate filtering:', {
            name: `${candidate.faculty?.Faculty?.Surname}, ${candidate.faculty?.Faculty?.FirstName}`,
            isFullTime,
            hasFourEvals,
            included: isFullTime && hasFourEvals
          });

          return isFullTime && hasFourEvals;
        });

        console.log('Filtered performance review candidates:', this.performanceReviewCandidates);
      },
      error: (error) => {
        console.error('Error loading performance review candidates:', error);
        this.performanceReviewCandidates = [];
      },
      complete: () => {
        this.isLoadingPerformance = false;
      }
    });
  }

  viewCandidateDetails(candidate: RegularizationCandidate | PerformanceReviewCandidate) {
    this.selectedCandidate = candidate;
    this.showCandidateModal = true;
  }

  calculateRating(score: number): string {
    if (score === 0 || isNaN(score)) return 'N/A';
    if (score >= 91) return 'Outstanding';
    if (score >= 71) return 'Very Satisfactory';
    if (score >= 51) return 'Satisfactory';
    if (score >= 31) return 'Fair';
    return 'Poor';
  }

  isRegularizationCandidate(candidate: any): candidate is RegularizationCandidate {
    return candidate && 'recommendationStrength' in candidate;
  }

  closeCandidateModal() {
    this.showCandidateModal = false;
    this.selectedCandidate = null;
  }

  getTrendColor(trend: string): string {
    switch (trend) {
      case 'Improving': return 'text-green-600';
      case 'Declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getConcernLevelColor(level: string): string {
    switch (level) {
      case 'High': return 'text-red-600';
      case 'Moderate': return 'text-yellow-600';
      case 'Low': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  }

  // Add this method
  clearDashboardPreferences(): void {
    const storageKey = `dashboardPreferences_${this.userID}`;
    localStorage.removeItem(storageKey);
    // Reset to default sections
    this.dashboardSections = [
      { id: 'faculty-evaluation', title: 'Faculty Evaluation', visible: true, order: 0 },
      { id: 'charts', title: 'Charts', visible: true, order: 1 },
      { id: 'academic-ranks', title: 'Academic Ranks', visible: true, order: 2 },
      { id: 'evaluation-candidates', title: 'Faculty Evaluation Candidates', visible: true, order: 3 }
    ];
  }

  // Add these getter methods
  get displayedRegularizationCandidates() {
    return this.showAllRegularization 
      ? this.regularizationCandidates 
      : this.regularizationCandidates.slice(0, 3);
  }

  get displayedPerformanceReviewCandidates() {
    return this.showAllPerformance 
      ? this.performanceReviewCandidates 
      : this.performanceReviewCandidates.slice(0, 3);
  }

  // Add these methods
  toggleRegularizationDisplay() {
    this.showAllRegularization = !this.showAllRegularization;
  }

  togglePerformanceDisplay() {
    this.showAllPerformance = !this.showAllPerformance;
  }

  // Add these methods
  openCandidatesModal(type: 'regularization' | 'performance') {
    this.modalType = type;
    this.showAllCandidatesModal = true;
  }

  closeCandidatesModal() {
    this.showAllCandidatesModal = false;
    this.modalType = null;
  }

  // Helper method to get modal title
  getModalTitle(): string {
    return this.modalType === 'regularization' 
      ? 'All Regularization Candidates' 
      : 'All Performance Review Candidates';
  }

  // Helper method to get candidates list for modal
  get modalCandidates(): (RegularizationCandidate | PerformanceReviewCandidate)[] {
    if (this.modalType === 'regularization') {
      return this.regularizationCandidates;
    }
    return this.performanceReviewCandidates;
  }

  // Add this type guard method
  isPerformanceCandidate(candidate: any): candidate is PerformanceReviewCandidate {
    return candidate && 'performanceMetrics' in candidate;
  }
}
