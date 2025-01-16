import { Component, AfterViewInit, ChangeDetectorRef, ViewChild, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { ChartOptions, ChartType, ChartData, ChartConfiguration } from 'chart.js';
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
import { UserListModalComponent } from '../../user-list-modal/user-list-modal.component';
import { DepartmentService } from '../../services/department.service';

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

// Add type definition
type UserListType = 'male' | 'female' | 'faculty' | 'staff' | 'doctorate' | 'masters';

// Add these properties if not already present
interface FacultyEvaluation {
  AcademicYear: string;
  Semester: string;
  QualitativeRating: string;
  TotalScore: number;
}

interface ImmunityEligibleFaculty {
  Name: string;
  Department: string;
  highPerformanceCount: number;
  outstandingCount: number;
  averageRating: number;
  consistencyScore: number;
  FacultyEvaluations: Array<{
    AcademicYear: string;
    Semester: string;
    TotalScore: number;
    QualitativeRating: string;
    Status: string;
  }>;
}

// Interface for evaluation ratings
interface RatingValues {
  'Outstanding': number;
  'Very Satisfactory': number;
  'Satisfactory': number;
  'Fair': number;
  'Poor': number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [NgChartsModule, CommonModule, NgxGaugeModule, FormsModule, DragDropModule, UserListModalComponent]
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
  public designee: number = 0;

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
    labels: ['Part-Time', 'Full-Time', 'Temporary', 'Designee'],
    datasets: [
      {
        data: [0, 0, 0, 0],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
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
    { id: 'immunity-eligible', title: 'Immunity Eligible Faculty', visible: true, order: 3 },
    { id: 'government-ids', title: 'Government ID Distribution', visible: true, order: 4 }
  ];
  public showDashboardSettings = false;

  // Add these properties
  public doctorate: number = 0;
  public masters: number = 0;

  // Add these properties
  public governmentIdBarChart: ChartConfiguration<'bar'>['data'] = {
    labels: ['GSIS', 'Pag-IBIG', 'PhilHealth', 'SSS', 'TIN', 'Agency Employee'],
    datasets: [{
      data: [],
      label: 'Number of Users',
      backgroundColor: [
        'rgba(128, 0, 0, 0.8)',  // Maroon to match theme
        'rgba(128, 0, 0, 0.7)',
        'rgba(128, 0, 0, 0.6)',
        'rgba(128, 0, 0, 0.5)',
        'rgba(128, 0, 0, 0.4)',
        'rgba(128, 0, 0, 0.3)'
      ],
      borderColor: [
        'rgba(128, 0, 0, 1)',  // Maroon border
        'rgba(128, 0, 0, 1)',
        'rgba(128, 0, 0, 1)',
        'rgba(128, 0, 0, 1)',
        'rgba(128, 0, 0, 1)',
        'rgba(128, 0, 0, 1)'
      ],
      borderWidth: 1
    }]
  };

  public governmentIdBarChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: '#333'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        ticks: {
          color: '#333'
        },
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      }
    }
  };

  // Add these properties
  showFemaleModal: boolean = false;
  femaleList: any[] = [];
  femaleModalCurrentPage: number = 1;
  femaleModalItemsPerPage: number = 10;
  femaleModalTotalPages: number = 1;
  paginatedFemaleList: any[] = [];

  // Add these properties to your dashboard component
  showUserModal = false;
  currentUserList: any[] = [];
  modalTitle: string = '';

  showDetailsModal: boolean = false;
  selectedUser: any = null;

  // Pagination properties for user list
  userModalCurrentPage: number = 1;
  userModalItemsPerPage: number = 10;
  userModalTotalItems: number = 0;
  paginatedUserList: any[] = [];

  // Add/modify these properties
  departments: any[] = [];

  // Add to your DashboardComponent class
  selectedDepartmentFilter: string = '';
  selectedRankFilter: string = '';

  // Add this property to store the original list
  originalUserList: any[] = [];

  // Add these properties
  immunityEligibleFaculty: ImmunityEligibleFaculty[] = [];

  // Add these properties to your component class
  showAllImmunity = false;
  showImmunityModal = false;
  immunityCurrentPage = 1;
  immunityItemsPerPage = 10;
  paginatedImmunityFaculty: ImmunityEligibleFaculty[] = [];

  // Add these properties
  selectedFaculty: ImmunityEligibleFaculty | null = null;

  // Add these properties if not present
  showImmunityDetailsModal: boolean = false;

  // Add new properties
  selectedDepartment: number | null = null;
  selectedImmunityStatus: 'immune' | 'pending' | null = null;

  public completedSections: number = 0;
  public totalSections: number = 0;

  public totalDepartments: number = 0;

  showDepartmentModal: boolean = false;
  departmentsList: any[] = [];
  
  // Add pagination properties for department modal
  departmentModalCurrentPage: number = 1;
  departmentModalItemsPerPage: number = 5;
  paginatedDepartmentsList: any[] = [];

  constructor(
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private campusContextService: CampusContextService,
    private router: Router,
    private dashboardStateService: DashboardStateService,
    private evaluationService: EvaluationService,
    private departmentService: DepartmentService
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
    
    // If we're past June (month 5), start with next year, otherwise start with current year
    const startYear = currentMonth > 5 ? currentYear + 1 : currentYear;
    
    // Generate 5 academic years including one future year
    this.academicYears = Array.from({length: 5}, (_, i) => {
      const year = startYear - i;
      return `${year}-${year + 1}`;
    });
    
    // Set default academic year based on current date
    this.selectedAcademicYear = `${startYear}-${startYear + 1}`;
    this.selectedSemester = currentMonth > 5 ? 'First Semester' : 'Second Semester';

    this.loadDashboardPreferences();

    const campusId = this.campusContextService.getCurrentCampusId();
    if (campusId) {
      this.dashboardService.getDashboardData(campusId).subscribe({
        next: (data) => {
          console.log('Dashboard Data:', data);
          console.log('Departments from data:', data.departments);
          
          // Store departments
          this.departments = data.departments;
          this.totalDepartments = data.totalDepartments;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
        }
      });
    }

    this.loadImmunityEligibleFaculty();
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
      this.designee = data.designee;
      this.faculty = data.faculty;
      this.staff = data.staff;
      this.doctorate = data.doctorate || 0;
      this.masters = data.masters || 0;
  
      this.barChartData.datasets[0].data = [
        this.partTime, 
        this.fullTime, 
        this.temporary,
        this.designee
      ];

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

      this.dashboardService.getGovernmentIdCounts(campusId).subscribe({
        next: (data) => {
          this.governmentIdBarChart.datasets[0].data = [
            data.governmentIds.gsis,
            data.governmentIds.pagIbig,
            data.governmentIds.philHealth,
            data.governmentIds.sss,
            data.governmentIds.tin,
            data.governmentIds.agencyEmployee
          ];
          // Trigger chart update
          if (this.charts) {
            this.charts.forEach(chart => chart.update());
          }
        },
        error: (error) => {
          console.error('Error fetching government ID counts:', error);
        }
      });

      // Add this to load immunity eligible faculty
      this.evaluationService.getImmunityEligibleFaculty({ campusId }).subscribe({
        next: (data) => {
          this.immunityEligibleFaculty = data;
          // Process the data to determine eligibility
          this.immunityEligibleFaculty = this.immunityEligibleFaculty.map(faculty => ({
            ...faculty,
            isEligible: this.checkImmunityEligibility(faculty.FacultyEvaluations)
          }));
        },
        error: (error) => {
          console.error('Error loading immunity eligible faculty:', error);
        }
      });
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
    labels: ['Trainings', 'Awards', 'Officership Memberships'],
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
        this.gaugeValue = Math.round(data.completionPercentage);
        this.incompleteTasks = data.incompleteSections;
        this.completedSections = data.completedSections;
        this.totalSections = data.totalSections;
      },
      error: (error) => {
        console.error('Error loading profile completion:', error);
      }
    });
  }

  toggleTasksView(): void {
    this.showAllTasks = !this.showAllTasks;
  }

  getProfileMessage(): { title: string; description: string } {
    const percentage = this.gaugeValue;
    
    if (percentage === 0) {
      return {
        title: "Let's Get Started! 🚀",
        description: "Your journey to a complete profile begins here."
      };
    } else if (percentage <= 25) {
      return {
        title: "Great First Steps! 👣",
        description: `You've begun your profile journey. Keep going!`
      };
    } else if (percentage <= 50) {
      return {
        title: "Making Progress! 💪",
        description: "You're making progress on your profile. What's next?"
      };
    } else if (percentage <= 75) {
      return {
        title: "Almost There! ⭐",
        description: "Your profile is taking shape nicely!"
      };
    } else if (percentage < 100) {
      return {
        title: "So Close! 🎯",
        description: "Just a few more sections to perfect your profile!"
      };
    } else {
      return {
        title: "Profile Complete! 🎉",
        description: "Excellent work! Your profile is now complete."
      };
    }
  }

  // Map task descriptions to their corresponding routes
  private taskRoutes: { [key: string]: string } = {
    'Add your basic details': '/basic-details',
    'Add your personal details': '/personal-details',
    'Add your education details': '/educational-background',
    'Add your profile image': '/basic-details',
    'Add your academic rank': '/academic-rank',
    'Add your achievement awards': '/outstanding-achievement',
    'Add your officership memberships': '/officer-membership',
    'Add your professional licenses': '/professional-license',
    'Add your employment information': '/employment-information',
    'Add your certifications': '/certification'
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
      case 'designee':
        return 'Designee';  // Added this case
      default:
        return type.charAt(0).toUpperCase() + type.slice(1); // Capitalize first letter for unknown types
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
        
        // Ensure all default sections exist (without evaluation candidates)
        const defaultSections = [
          { id: 'faculty-evaluation', title: 'Faculty Evaluation', visible: true, order: 0 },
          { id: 'charts', title: 'Charts', visible: true, order: 1 },
          { id: 'academic-ranks', title: 'Academic Ranks', visible: true, order: 2 },
          { id: 'immunity-eligible', title: 'Immunity Eligible Faculty', visible: true, order: 3 },
          { id: 'government-ids', title: 'Government ID Distribution', visible: true, order: 4 }
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

  // Add this method
  clearDashboardPreferences(): void {
    const storageKey = `dashboardPreferences_${this.userID}`;
    localStorage.removeItem(storageKey);
    // Reset to default sections without evaluation candidates
    this.dashboardSections = [
      { id: 'faculty-evaluation', title: 'Faculty Evaluation', visible: true, order: 0 },
      { id: 'charts', title: 'Charts', visible: true, order: 1 },
      { id: 'academic-ranks', title: 'Academic Ranks', visible: true, order: 2 },
      { id: 'immunity-eligible', title: 'Immunity Eligible Faculty', visible: true, order: 3 },
      { id: 'government-ids', title: 'Government ID Distribution', visible: true, order: 4 }
    ];
  }

  // Add these methods
  showFemaleList() {
    // Get the current campus ID
    const campusId = this.campusContextService.getCurrentCampusId();
    
    // Call the service to get female faculty members
    if (campusId) {
      this.dashboardService.getFemaleUsers(campusId).subscribe({
        next: (data) => {
          this.femaleList = data;
          this.femaleModalTotalPages = Math.ceil(this.femaleList.length / this.femaleModalItemsPerPage);
          this.updateFemaleModalPagination();
          this.showFemaleModal = true;
        },
        error: (error) => {
          console.error('Error fetching female faculty members:', error);
        }
      });
    }
  }

  closeFemaleList() {
    this.showFemaleModal = false;
    this.femaleList = [];
    this.femaleModalCurrentPage = 1;
  }

  getFemaleModalPageArray(): number[] {
    return Array(this.femaleModalTotalPages).fill(0).map((_, i) => i + 1);
  }

  updateFemaleModalPagination() {
    const startIndex = (this.femaleModalCurrentPage - 1) * this.femaleModalItemsPerPage;
    const endIndex = startIndex + this.femaleModalItemsPerPage;
    this.paginatedFemaleList = this.femaleList.slice(startIndex, endIndex);
  }

  previousFemaleModalPage() {
    if (this.femaleModalCurrentPage > 1) {
      this.femaleModalCurrentPage--;
      this.updateFemaleModalPagination();
    }
  }

  nextFemaleModalPage() {
    if (this.femaleModalCurrentPage < this.femaleModalTotalPages) {
      this.femaleModalCurrentPage++;
      this.updateFemaleModalPagination();
    }
  }

  setFemaleModalPage(page: number) {
    this.femaleModalCurrentPage = page;
    this.updateFemaleModalPagination();
  }

  formatEmploymentTypes(type: string): string {
    if (!type) return 'N/A';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  // Add this method to handle showing different user lists
  showUserList(type: UserListType): void {
    const campusId = this.campusContextService.getCurrentCampusId();
    
    if (!campusId) {
      console.error('No campus ID found');
      return;
    }

    switch(type) {
      case 'male':
        this.dashboardService.getMaleUsers(campusId).subscribe({
          next: (users) => {
            this.originalUserList = users; // Store original list
            this.currentUserList = [...users]; // Make a copy for current display
            this.modalTitle = 'Male Faculty Members';
            this.showUserModal = true;
            this.updateUserModalPagination();
          },
          error: (error) => console.error('Error fetching male users:', error)
        });
        break;

      case 'female':
        this.dashboardService.getFemaleUsers(campusId).subscribe({
          next: (users) => {
            this.originalUserList = users; // Store original list
            this.currentUserList = [...users]; // Make a copy for current display
            this.modalTitle = 'Female Faculty Members';
            this.showUserModal = true;
            this.updateUserModalPagination();
          },
          error: (error) => console.error('Error fetching female users:', error)
        });
        break;

      case 'faculty':
        this.dashboardService.getFacultyUsers(campusId).subscribe({
          next: (users) => {
            this.originalUserList = users; // Store original list
            this.currentUserList = [...users]; // Make a copy for current display
            this.modalTitle = 'Faculty Members';
            this.showUserModal = true;
            this.updateUserModalPagination();
          },
          error: (error) => console.error('Error fetching faculty users:', error)
        });
        break;

      case 'staff':
        this.dashboardService.getStaffUsers(campusId).subscribe({
          next: (data) => {
            this.currentUserList = data;
            this.userModalCurrentPage = 1; // Reset to first page
            this.updateUserModalPagination(); // Initialize pagination
            this.modalTitle = 'Staff Members';
            this.showUserModal = true;
          },
          error: (error) => console.error('Error fetching staff users:', error)
        });
        break;

      case 'doctorate':
        this.dashboardService.getDoctorateUsers(campusId).subscribe({
          next: (users) => {
            this.originalUserList = users; // Store original list
            this.currentUserList = [...users]; // Make a copy for current display
            this.modalTitle = 'Doctorate Degree Holders';
            this.showUserModal = true;
            this.updateUserModalPagination();
          },
          error: (error) => console.error('Error fetching doctorate users:', error)
        });
        break;

      case 'masters':
        this.dashboardService.getMastersUsers(campusId).subscribe({
          next: (users) => {
            this.originalUserList = users; // Store original list
            this.currentUserList = [...users]; // Make a copy for current display
            this.modalTitle = 'Masters Degree Holders';
            this.showUserModal = true;
            this.updateUserModalPagination();
          },
          error: (error) => console.error('Error fetching masters users:', error)
        });
        break;
    }
  }

  // Add method to handle modal closing
  closeUserModal(): void {
    this.showUserModal = false;
    this.currentUserList = [];
    // Reset filters
    this.selectedDepartmentFilter = '';
    this.selectedRankFilter = '';
    this.originalUserList = [];
  }

  viewUserDetails(user: any) {
    this.selectedUser = user;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedUser = null;
  }

  // Pagination methods for user list
  getUserModalPageArray(): number[] {
    const pageCount = Math.ceil(this.currentUserList.length / this.userModalItemsPerPage);
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  setUserModalPage(pageNumber: number): void {
    this.userModalCurrentPage = pageNumber;
    this.updateUserModalPagination();
  }

  previousUserModalPage(): void {
    if (this.userModalCurrentPage > 1) {
      this.userModalCurrentPage--;
      this.updateUserModalPagination();
    }
  }

  nextUserModalPage(): void {
    if (this.userModalCurrentPage < Math.ceil(this.currentUserList.length / this.userModalItemsPerPage)) {
      this.userModalCurrentPage++;
      this.updateUserModalPagination();
    }
  }

  updateUserModalPagination(): void {
    const startIndex = (this.userModalCurrentPage - 1) * this.userModalItemsPerPage;
    const endIndex = startIndex + this.userModalItemsPerPage;
    this.paginatedUserList = this.currentUserList.slice(startIndex, endIndex);
  }

  applyFilters() {
    console.log('Applying filters:', {
      department: this.selectedDepartmentFilter,
      rank: this.selectedRankFilter
    });

    // Always start with the original list
    let filteredList = [...this.originalUserList];
    console.log('Starting with original list:', filteredList);

    // Only filter if a specific value (not empty) is selected
    if (this.selectedDepartmentFilter && this.selectedDepartmentFilter !== '') {
      filteredList = filteredList.filter(user => 
        user.department === this.selectedDepartmentFilter
      );
    }

    if (this.selectedRankFilter && this.selectedRankFilter !== '') {
      filteredList = filteredList.filter(user => 
        user.rank === this.selectedRankFilter
      );
    }

    console.log('Filtered list:', filteredList);

    // Update the current list and paginate
    this.currentUserList = filteredList;
    this.userModalCurrentPage = 1;
    this.updateUserModalPagination();
  }

  // Add a method to reset filters
  resetFilters() {
    this.selectedDepartmentFilter = '';
    this.selectedRankFilter = '';
    this.currentUserList = [...this.originalUserList];
    this.userModalCurrentPage = 1;
    this.updateUserModalPagination();
  }

  // Add helper method to check immunity eligibility
  private checkImmunityEligibility(evaluations: any[]): boolean {
    if (!evaluations || evaluations.length < 6) return false;
    
    // Get last 6 evaluations
    const lastSixEvaluations = evaluations.slice(0, 6);
    
    // Check if all ratings are Outstanding or Very Satisfactory
    return lastSixEvaluations.every(evaluation => 
      evaluation.QualitativeRating === 'Outstanding' || 
      evaluation.QualitativeRating === 'Very Satisfactory'
    );
  }



  get immunityTotalPages(): number {
    return Math.ceil(this.immunityEligibleFaculty.length / this.immunityItemsPerPage);
  }

  viewImmunityDetails(faculty: ImmunityEligibleFaculty) {
    this.selectedFaculty = faculty;
    this.showImmunityDetailsModal = true;
  }

  // Generate insights for a faculty member
  private generateImmunityInsights(faculty: any) {
    const recommendations: string[] = [];
    let performanceLevel = '';
    const trend = this.calculatePerformanceTrend(faculty.FacultyEvaluations);

    // Status-based insights
    if (faculty.highPerformanceCount >= 4) {
      performanceLevel = 'Outstanding';
      recommendations.push(
        'Maintained consistent high performance',
        'Eligible for classroom observation immunity',
        'Consider mentoring other faculty members'
      );
    } else {
      performanceLevel = 'Progressing';
      const remaining = 4 - faculty.highPerformanceCount;
      recommendations.push(
        `Needs ${remaining} more Outstanding/Very Satisfactory ratings for immunity`,
        'Focus on maintaining consistent performance',
        'Review previous evaluation feedback'
      );
    }

    // Trend-based recommendations
    if (trend === 'Improving') {
      recommendations.push('Showing positive performance trajectory');
    } else if (trend === 'Stable') {
      recommendations.push('Maintaining consistent performance levels');
    }

    return {
      recommendations,
      performanceLevel,
      trend
    };
  }

  // Calculate performance trend
  private calculatePerformanceTrend(evaluations: any[]): 'Improving' | 'Stable' | 'Declining' {
    if (!evaluations || evaluations.length < 2) return 'Stable';

    const ratingValues: RatingValues = {
      'Outstanding': 4,
      'Very Satisfactory': 3,
      'Satisfactory': 2,
      'Fair': 1,
      'Poor': 0
    };

    const scores = evaluations
      .slice(0, 3)
      .map(evaluation => ratingValues[evaluation.QualitativeRating as keyof RatingValues] || 0);

    const trend = scores[0] - scores[scores.length - 1];
    
    if (trend > 0) return 'Improving';
    if (trend < 0) return 'Declining';
    return 'Stable';
  }

  // Get page numbers for pagination
  get immunityPageNumbers(): number[] {
    const totalPages = Math.ceil(this.immunityEligibleFaculty.length / this.immunityItemsPerPage);
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Update pagination
  updateImmunityPagination() {
    const startIndex = (this.immunityCurrentPage - 1) * this.immunityItemsPerPage;
    const endIndex = startIndex + this.immunityItemsPerPage;
    this.paginatedImmunityFaculty = this.immunityEligibleFaculty.slice(startIndex, endIndex);
  }

  // View all faculty
  viewAllImmunityFaculty() {
    this.showImmunityModal = true;
    this.updateImmunityPagination();
  }

  // Close immunity modal
  closeImmunityModal() {
    this.showImmunityModal = false;
  }

  // Change page
  changeImmunityPage(page: number) {
    this.immunityCurrentPage = page;
    this.updateImmunityPagination();
  }

  // Add these methods
  loadImmunityEligibleFaculty(): void {
    const campusId = this.campusContextService.getCurrentCampusId();
    if (!campusId) return;

    const params: any = { campusId };
    
    if (this.selectedDepartment) {
      params.departmentId = this.selectedDepartment;
    }
    
    if (this.selectedImmunityStatus) {
      params.immunityStatus = this.selectedImmunityStatus;
    }

    this.evaluationService.getImmunityEligibleFaculty(params).subscribe({
      next: (data) => {
        this.immunityEligibleFaculty = data;
        this.updateImmunityPagination();
      },
      error: (error) => {
        console.error('Error loading immunity eligible faculty:', error);
      }
    });
  }

  closeImmunityDetailsModal() {
    this.showImmunityDetailsModal = false;
    this.selectedFaculty = null;
  }

  calculateAverageRating(evaluations: FacultyEvaluation[]): number {
    if (!evaluations || evaluations.length === 0) return 0;
    const sum = evaluations.reduce((acc, evaluation) => acc + evaluation.TotalScore, 0);
    return sum / evaluations.length;
  }

  calculateConsistencyScore(evaluations: FacultyEvaluation[]): number {
    if (!evaluations || evaluations.length < 2) return 0;
    const scores = evaluations.map(e => e.TotalScore);
    const mean = scores.reduce((a, b) => a + b) / scores.length;
    const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
    return 100 - Math.sqrt(variance); // Convert to 0-100 scale where 100 is most consistent
  }

  getConsistencyMessage(score: number): string {
    if (score >= 90) return 'Highly consistent performance';
    if (score >= 70) return 'Moderately consistent performance';
    return 'Variable performance';
  }

  getImmunityStatus(faculty: ImmunityEligibleFaculty): { status: string; text: string } {
    const consecutiveOutstanding = faculty.FacultyEvaluations?.filter(
      evaluation => evaluation.TotalScore >= 95 && evaluation.Status === 'Outstanding'
    ).length || 0;

    return {
      status: consecutiveOutstanding >= 4 ? 'Immune' : 'Pending',
      text: `${consecutiveOutstanding}/4 Outstanding Evaluations`
    };
  }

  // Add filter handlers
  onDepartmentChange(): void {
    this.loadImmunityEligibleFaculty();
  }

  onImmunityStatusChange(): void {
    this.loadImmunityEligibleFaculty();
  }

  // Update the method that generates the immunity progress text
  private getImmunityProgressText(faculty: ImmunityEligibleFaculty): string {
    // Count evaluations with scores >= 95 or Outstanding status
    const outstandingCount = faculty.FacultyEvaluations?.filter(
      evaluation => evaluation.TotalScore >= 95 || evaluation.Status === 'Outstanding'
    ).length || 0;
    
    return `Progress towards immunity: ${outstandingCount}/4 outstanding evaluations`;
  }

  // Update the template display method
  getImmunityAnalysis(faculty: ImmunityEligibleFaculty): string {
    return this.getImmunityProgressText(faculty);
  }

  navigateToEmployees(): void {
    this.router.navigate(['/employees']);
  }

  // Method to show department list modal
  showDepartmentList(): void {
    const campusId = this.campusContextService.getCurrentCampusId();
    if (!campusId) return;

    this.showDepartmentModal = true;
    // Make sure departments have their IDs and names
    this.departmentsList = this.departments.map(dept => ({
      DepartmentID: dept.DepartmentID,
      DepartmentName: dept.DepartmentName,
      count: dept.count
    }));
    this.updateDepartmentModalPagination();
  }

  // Method to handle view details click in the department modal
  viewDepartmentDetails(departmentId: string): void {
    this.router.navigate(['/employees'], {
      queryParams: {
        department: departmentId
      }
    });
    this.closeDepartmentModal();
  }

  // Close department modal
  closeDepartmentModal(): void {
    this.showDepartmentModal = false;
    this.departmentsList = [];
    this.departmentModalCurrentPage = 1;
  }

  // Pagination methods for department modal
  updateDepartmentModalPagination(): void {
    const startIndex = (this.departmentModalCurrentPage - 1) * this.departmentModalItemsPerPage;
    const endIndex = startIndex + this.departmentModalItemsPerPage;
    this.paginatedDepartmentsList = this.departmentsList.slice(startIndex, endIndex);
  }

  get departmentModalTotalPages(): number {
    return Math.ceil(this.departmentsList.length / this.departmentModalItemsPerPage);
  }

  previousDepartmentModalPage(): void {
    if (this.departmentModalCurrentPage > 1) {
      this.departmentModalCurrentPage--;
      this.updateDepartmentModalPagination();
    }
  }

  nextDepartmentModalPage(): void {
    if (this.departmentModalCurrentPage < this.departmentModalTotalPages) {
      this.departmentModalCurrentPage++;
      this.updateDepartmentModalPagination();
    }
  }

  setDepartmentModalPage(page: number): void {
    this.departmentModalCurrentPage = page;
    this.updateDepartmentModalPagination();
  }

  getDepartmentModalPageArray(): number[] {
    return Array(this.departmentModalTotalPages).fill(0).map((_, i) => i + 1);
  }
}
