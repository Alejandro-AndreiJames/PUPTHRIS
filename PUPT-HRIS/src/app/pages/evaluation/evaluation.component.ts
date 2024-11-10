import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CampusContextService } from '../../services/campus-context.service';
import { Subscription } from 'rxjs';
import { UserService } from '../../services/user.service';
import { User } from '../../model/user.model';
import { DepartmentService } from '../../services/department.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';
import { AuthService } from '../../services/auth.service';
import { EvaluationSubmission, FacultyEvaluation } from '../../model/evaluation.model';
import { EVALUATION_CATEGORIES } from '../../model/evaluation-criteria.model';
import { Chart } from 'chart.js/auto';

// Add this interface to define the return type
interface RatingDescription {
  description: string;
  scale: number;
}

// Add this type at the top with your other interfaces
type Semester = 'First Semester' | 'Second Semester';

// Add this type near your other type definitions
type QualitativeRating = 'Poor' | 'Fair' | 'Satisfactory' | 'Very Satisfactory' | 'Outstanding';

@Component({
  selector: 'app-evaluation',
  templateUrl: './evaluation.component.html',
  styleUrls: ['./evaluation.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EvaluationComponent implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  searchTerm: string = '';
  selectedDepartment: string = '';
  departments: any[] = [];
  campusId: number | null = null;
  private campusSubscription: Subscription | undefined;
  selectedEmploymentType: string = '';

  isEvaluationModalOpen = false;
  selectedUser: User | null = null;
  currentAcademicYear: string = '';
  currentSemester: Semester = 'First Semester';
  academicYears: string[] = [];
  ratings: { [key: string]: number } = {};
  numberOfRespondents: number = 0;
  courseYearSection: string = '';

  evaluationCategories = [
    {
      id: 'InstructionAndDiscussion',
      name: 'Instruction and Discussion Facilitation',
      description: 'Instruction and discussion facilitation refer to sharing control and direction with students.',
      criteriaId: 1  // Add criteriaId to match backend
    },
    {
      id: 'Commitment',
      name: 'Commitment',
      description: 'Commitment refers to the course specialist act or quality of fulfilling responsibility giving the dedication, discipline, maturity for the learners development and advancement',
      criteriaId: 2
    },
    {
      id: 'TeachingIndependentLearning',
      name: 'Teaching for Independent Learning',
      description: 'Teaching for independent learning pertains to the course specialist\'s ability to organize teaching-learning process to enable learners to maximize their potentials',
      criteriaId: 3
    },
    {
      id: 'InstructionalMaterials',
      name: 'Use of Instructional Materials',
      description: 'Use of instructional materials and other educational resources to help maximize learning',
      criteriaId: 4
    }
  ];

  showEvaluationHistory = false;
  evaluationHistory: any[] = [];
  @ViewChild('evaluationChart') private chartCanvas!: ElementRef;
  private chart: Chart | undefined;

  isEditMode: boolean = false;
  currentEvaluationId: number | null = null;

  showErrorModal = false;
  errorMessage = '';

  constructor(
    private campusContextService: CampusContextService,
    private userService: UserService,
    private departmentService: DepartmentService,
    private evaluationService: EvaluationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.campusSubscription = this.campusContextService.getCampusId().subscribe(
      id => {
        if (id !== null) {
          this.campusId = id;
          this.loadFaculties();
          this.loadDepartments();
        }
      }
    );
    this.initializeAcademicYears();
    this.setCurrentPeriod();
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadFaculties(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    this.userService.getUsers(this.campusId).subscribe(
      (data) => {
        this.users = data.filter(user => 
          user.Roles?.some(role => role.RoleName.toLowerCase() === 'faculty')
        );
        this.filteredUsers = this.users;
        this.totalPages = Math.ceil(this.users.length / this.itemsPerPage);
        this.paginateUsers();
      },
      (error) => {
        console.error('Error fetching faculties', error);
      }
    );
  }

  loadDepartments(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    this.departmentService.getDepartments(this.campusId).subscribe(
      (departments) => {
        this.departments = departments;
      },
      (error) => {
        console.error('Error loading departments:', error);
      }
    );
  }

  paginateUsers(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateUsers();
    }
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateUsers();
    }
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm.trim() || 
        `${user.FirstName} ${user.MiddleName} ${user.Surname} ${user.NameExtension}`
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase());

      const matchesDepartment = !this.selectedDepartment || 
        user.Department?.DepartmentName === this.departments.find(d => 
          d.DepartmentID.toString() === this.selectedDepartment
        )?.DepartmentName;

      const matchesEmploymentType = !this.selectedEmploymentType || 
        user.EmploymentType?.toLowerCase() === this.selectedEmploymentType.toLowerCase();

      console.log('Department matching:', {
        userDeptName: user.Department?.DepartmentName,
        selectedDeptId: this.selectedDepartment,
        selectedDeptName: this.departments.find(d => 
          d.DepartmentID.toString() === this.selectedDepartment
        )?.DepartmentName,
        matches: matchesDepartment
      });

      return matchesSearch && matchesDepartment && matchesEmploymentType;
    });

    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.paginateUsers();
  }

  onSearch(): void {
    this.applyFilters();
  }

  private initializeAcademicYears() {
    const currentYear = new Date().getFullYear();
    this.academicYears = [
      `${currentYear-1}-${currentYear}`,
      `${currentYear}-${currentYear+1}`,
      `${currentYear+1}-${currentYear+2}`
    ];
  }

  private setCurrentPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    this.currentAcademicYear = `${year}-${year + 1}`;
    
    const month = now.getMonth() + 1;
    if (month >= 6 && month <= 10) {
      this.currentSemester = 'First Semester';
    } else {
      this.currentSemester = 'Second Semester';
    }
  }

  openEvaluationModal(user: User) {
    this.selectedUser = user;
    this.resetEvaluationForm();
    this.isEvaluationModalOpen = true;
  }

  closeEvaluationModal() {
    this.isEvaluationModalOpen = false;
    this.selectedUser = null;
    this.resetEvaluationForm();
  }

  resetEvaluationForm() {
    // Reset all form values
    this.numberOfRespondents = 0;
    this.courseYearSection = '';
    this.ratings = {};
    
    // Set default values for academic year and semester
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    this.currentAcademicYear = `${currentYear}-${currentYear + 1}`;
    this.currentSemester = 'First Semester';
    
    // Reset edit mode
    this.isEditMode = false;
    this.currentEvaluationId = null;
  }

  submitEvaluation() {
    if (!this.selectedUser || !this.isFormValid()) {
      this.errorMessage = 'Please fill in all required fields with valid scores (0-100).';
      this.showErrorModal = true;
      return;
    }
    
    const evaluationData = this.prepareEvaluationData();
    console.log('Submitting evaluation data:', evaluationData);
    
    if (this.isEditMode && this.currentEvaluationId) {
      this.evaluationService.updateEvaluation(this.currentEvaluationId, evaluationData).subscribe({
        next: (response) => {
          console.log('Update successful:', response);
          alert('Evaluation updated successfully');
          this.closeEvaluationModal();
          if (this.showEvaluationHistory && this.selectedUser) {
            this.viewEvaluationHistory(this.selectedUser);
          }
        },
        error: (error) => {
          console.error('Update failed:', error);
          this.errorMessage = `An error occurred while updating the evaluation: ${error.message}`;
          this.showErrorModal = true;
        }
      });
    } else {
      this.evaluationService.submitEvaluation(evaluationData).subscribe({
        next: (response) => {
          alert('Evaluation submitted successfully');
          this.closeEvaluationModal();
        },
        error: (error) => {
          this.errorMessage = 'An error occurred while submitting the evaluation. Please try again.';
          this.showErrorModal = true;
        }
      });
    }
  }

  private loadExistingEvaluation(evaluation: any) {
    this.numberOfRespondents = evaluation.NumberOfRespondents;
    this.courseYearSection = evaluation.CourseSection;
    this.currentAcademicYear = evaluation.AcademicYear;
    this.currentSemester = evaluation.Semester;

    // Load existing scores
    evaluation.EvaluationScores.forEach((score: any) => {
      const category = this.evaluationCategories.find(c => c.criteriaId === score.CriteriaID);
      if (category) {
        this.ratings[category.id] = score.Score;
      }
    });
  }

  calculateRatingDescription(score: number): { description: QualitativeRating, scale: number } {
    if (score >= 91 && score <= 100) {
      return { description: 'Outstanding', scale: 5 };
    } else if (score >= 71 && score < 91) {
      return { description: 'Very Satisfactory', scale: 4 };
    } else if (score >= 51 && score < 71) {
      return { description: 'Satisfactory', scale: 3 };
    } else if (score >= 31 && score < 51) {
      return { description: 'Fair', scale: 2 };
    } else {
      return { description: 'Poor', scale: 1 };
    }
  }

  viewEvaluationHistory(user: User): void {
    this.selectedUser = user;
    this.evaluationService.getFacultyEvaluationHistory(user.UserID).subscribe({
      next: (history) => {
        this.evaluationHistory = history;
        this.showEvaluationHistory = true;
        // Wait for the modal to be shown before creating the chart
        setTimeout(() => {
          this.createOrUpdateChart();
        }, 100);
      },
      error: (error) => console.error('Error fetching evaluation history:', error)
    });
  }

  private createOrUpdateChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.evaluationHistory.map(d => `${d.AcademicYear} ${d.Semester}`),
        datasets: [{
          label: 'Total Score',
          data: this.evaluationHistory.map(d => d.TotalScore),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Evaluation Scores Over Time'
          }
        }
      }
    });
  }

  private prepareEvaluationData(): any {
    if (!this.selectedUser) return null;

    // Calculate total score
    const validScores = Object.values(this.ratings)
      .filter(score => !isNaN(Number(score)) && score !== null)
      .map(score => Number(score));
      
    const totalScore = validScores.length > 0 
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
      : 0;

    // Get qualitative rating based on total score
    const { description: qualitativeRating } = this.calculateRatingDescription(totalScore);

    // Prepare scores array
    const scores = this.evaluationCategories.map(category => ({
      CriteriaID: category.criteriaId,
      Score: Number(this.ratings[category.id]) || 0
    }));

    const decodedToken = this.authService.getDecodedToken();

    const evaluationData = {
      facultyId: this.selectedUser.UserID,
      evaluatorId: decodedToken.userId,
      courseSection: this.courseYearSection,
      numberOfRespondents: Number(this.numberOfRespondents),
      academicYear: this.currentAcademicYear,
      semester: this.currentSemester,
      totalScore: Number(totalScore.toFixed(2)),
      qualitativeRating: qualitativeRating,
      scores: scores,
      createdBy: decodedToken.userId
    };

    console.log('Prepared evaluation data:', evaluationData);
    return evaluationData;
  }

  confirmDeleteEvaluation(evaluationId: number) {
    if (confirm('Are you sure you want to delete this evaluation? This action cannot be undone.')) {
      this.deleteEvaluation(evaluationId);
    }
  }

  deleteEvaluation(evaluationId: number) {
    this.evaluationService.deleteEvaluation(evaluationId).subscribe({
      next: () => {
        // Remove the deleted evaluation from the history array
        this.evaluationHistory = this.evaluationHistory.filter(
          evaluation => evaluation.EvaluationID !== evaluationId
        );
        
        // Refresh the chart
        this.createOrUpdateChart();
        
        // Show success message
        alert('Evaluation deleted successfully');
      },
      error: (error) => {
        console.error('Error deleting evaluation:', error);
        alert('Failed to delete evaluation. Please try again.');
      }
    });
  }

  canDeleteEvaluation(): boolean {
    return this.authService.isAdmin() || this.authService.isSuperAdmin();
  }

  editEvaluation(evaluation: any) {
    this.isEditMode = true;
    this.currentEvaluationId = evaluation.EvaluationID;
    this.selectedUser = this.users.find(u => u.UserID === evaluation.FacultyID) || null;
    
    // Load the evaluation data into the form
    this.numberOfRespondents = evaluation.NumberOfRespondents;
    this.courseYearSection = evaluation.CourseSection;
    this.currentAcademicYear = evaluation.AcademicYear;
    this.currentSemester = evaluation.Semester as Semester;

    // Load scores into ratings object
    if (evaluation.EvaluationScores) {
      evaluation.EvaluationScores.forEach((score: any) => {
        const category = this.evaluationCategories.find(c => c.criteriaId === score.CriteriaID);
        if (category) {
          this.ratings[category.id] = score.Score;
        }
      });
    }

    // Close history modal and open evaluation modal
    this.showEvaluationHistory = false;
    this.isEvaluationModalOpen = true;
  }

  viewExistingEvaluation() {
    this.showErrorModal = false;
    if (this.selectedUser) {
      this.viewEvaluationHistory(this.selectedUser);
    }
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.errorMessage = '';
  }

  validateScore(event: any, categoryId: string) {
    let value = event.target.value;
    
    // Allow typing decimal point
    if (value === '.') {
      this.ratings[categoryId] = value;
      return;
    }

    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Handle whole number part (limit to 100)
    if (parts[0].length > 0) {
      let wholeNumber = parseInt(parts[0]);
      if (wholeNumber > 100) {
        parts[0] = '100';
        value = parts.length === 2 ? `100.${parts[1]}` : '100';
      }
    }
    
    // Handle decimal part (limit to 4 places)
    if (parts.length === 2) {
      if (parts[1].length > 4) {
        parts[1] = parts[1].substring(0, 4);
      }
      value = parts.join('.');
    }
    
    // Update the ratings object
    this.ratings[categoryId] = value;
    
    // Update the input field value
    event.target.value = value;
  }

  isFormValid(): boolean {
    // Check if all required fields are filled
    if (!this.courseYearSection || !this.numberOfRespondents) {
      return false;
    }

    // Check if all scores are valid (between 0 and 100)
    const scores = Object.values(this.ratings);
    if (scores.length !== this.evaluationCategories.length) {
      return false;
    }

    return scores.every(score => 
      score !== null && 
      !isNaN(Number(score)) && 
      Number(score) >= 0 && 
      Number(score) <= 100
    );
  }

  formatScore(score: number | string): string {
    return Number(score).toFixed(4);
  }
}