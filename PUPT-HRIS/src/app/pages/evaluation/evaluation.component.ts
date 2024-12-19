import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CampusContextService } from '../../services/campus-context.service';
import { Subscription, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
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
import { GetUsersParams } from '../../model/get-user-params.model';

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

  showDeleteConfirmModal = false;
  evaluationToDelete: number | null = null;

  toastVisible = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  private toastTimeout: any;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private campusContextService: CampusContextService,
    private userService: UserService,
    private departmentService: DepartmentService,
    private evaluationService: EvaluationService,
    private authService: AuthService
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1; // Reset to first page when searching
      this.loadFaculties();
    });
  }

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
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFaculties(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    
    const params: GetUsersParams = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      campusId: this.campusId,
      role: 'faculty',
      departmentId: this.selectedDepartment || undefined,
      employmentType: this.selectedEmploymentType || undefined,
      search: this.searchTerm || undefined
    };

    console.log('Requesting faculties with params:', params);

    this.userService.getUsers(params).subscribe({
      next: (response) => {
        console.log('Faculty response:', response);
        this.users = response.data;
        this.filteredUsers = [...this.users];
        this.totalPages = response.metadata.totalPages;
        this.paginateUsers();
      },
      error: (error) => {
        console.error('Error loading faculties:', error);
      }
    });
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
    // Since the data is already paginated from the server, 
    // we just need to set it to paginatedUsers
    this.paginatedUsers = this.filteredUsers;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadFaculties(); // Reload data with new page
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadFaculties(); // Reload data with new page
    }
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadFaculties(); // Reload data with new page
    }
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page
    this.loadFaculties();
  }

  onSearch(event: any): void {
    const searchValue = event.target.value;
    this.searchTerm = searchValue;
    this.searchSubject.next(searchValue);
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
      this.showToast('Please fill in all required fields with valid scores (0-100).', 'error');
      return;
    }
    
    const evaluationData = this.prepareEvaluationData();
    
    if (this.isEditMode && this.currentEvaluationId) {
      // Check for unsaved changes
      const originalEvaluation = this.evaluationHistory.find(e => e.EvaluationID === this.currentEvaluationId);
      if (!originalEvaluation || !this.hasUnsavedChanges(evaluationData, originalEvaluation)) {
        this.showToast('No unsaved changes to update', 'warning');
        return;
      }

      this.evaluationService.updateEvaluation(this.currentEvaluationId, evaluationData).subscribe({
        next: (response) => {
          console.log('Update successful:', response);
          this.showToast('Evaluation updated successfully', 'success');
          this.closeEvaluationModal();
          if (this.showEvaluationHistory && this.selectedUser) {
            this.viewEvaluationHistory(this.selectedUser);
          }
        },
        error: (error) => {
          console.error('Update failed:', error);
          this.showToast('Failed to update evaluation. Please try again.', 'error');
        }
      });
    } else {
      this.evaluationService.submitEvaluation(evaluationData).subscribe({
        next: (response) => {
          this.showToast('Evaluation submitted successfully', 'success');
          this.closeEvaluationModal();
        },
        error: (error) => {
          console.error('Submission failed:', error);
          this.showToast('Failed to submit evaluation. Please try again.', 'error');
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
    console.log('View history clicked for user:', user);
    this.selectedUser = user;
    this.evaluationService.getFacultyEvaluationHistory(user.UserID).subscribe({
      next: (history) => {
        console.log('Received history:', history);
        this.evaluationHistory = history.sort((a: any, b: any) => {
          // Parse academic years into comparable numbers
          const yearA = parseInt(a.AcademicYear.split('-')[0]);
          const yearB = parseInt(b.AcademicYear.split('-')[0]);
          
          // Compare years first
          if (yearA !== yearB) {
            return yearB - yearA; // Reverse the comparison for newest to oldest
          }
          
          // If years are equal, compare semesters
          // Second semester should come before first semester for the same year
          return a.Semester === 'Second Semester' ? -1 : 1;
        });
        
        this.showEvaluationHistory = true;
        setTimeout(() => {
          this.createOrUpdateChart();
        }, 100);
      },
      error: (error) => {
        console.error('Error fetching evaluation history:', error);
        // Optionally show an error message to the user
        alert('Failed to load evaluation history. Please try again.');
      }
    });
  }

  private createOrUpdateChart(): void {
    if (!this.chartCanvas) {
      console.error('Chart canvas not found');
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    // Sort evaluations chronologically (oldest to newest)
    const sortedHistory = [...this.evaluationHistory].sort((a, b) => {
      // First compare academic years
      const yearA = parseInt(a.AcademicYear.split('-')[0]);
      const yearB = parseInt(b.AcademicYear.split('-')[0]);
      if (yearA !== yearB) return yearA - yearB;
      
      // If same year, compare semesters
      return a.Semester === 'First Semester' ? -1 : 1;
    });

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Could not get chart context');
      return;
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedHistory.map(d => `${d.AcademicYear} ${d.Semester}`),
        datasets: [{
          label: 'Total Score',
          data: sortedHistory.map(d => d.TotalScore),
          borderColor: '#800000',
          backgroundColor: 'rgba(128, 0, 0, 0.1)',
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Evaluation Scores Over Time',
            color: '#800000'
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
    this.evaluationToDelete = evaluationId;
    this.showDeleteConfirmModal = true;
  }

  deleteEvaluation() {
    if (!this.evaluationToDelete) return;
    
    this.evaluationService.deleteEvaluation(this.evaluationToDelete).subscribe({
      next: () => {
        // Remove the deleted evaluation from the history array
        this.evaluationHistory = this.evaluationHistory.filter(
          evaluation => evaluation.EvaluationID !== this.evaluationToDelete
        );
        
        // Refresh the chart
        this.createOrUpdateChart();
        
        // Show success message and close modal
        this.showToast('Evaluation deleted successfully', 'success');
        this.showDeleteConfirmModal = false;
        this.evaluationToDelete = null;
      },
      error: (error) => {
        console.error('Error deleting evaluation:', error);
        this.showToast('Failed to delete evaluation. Please try again.', 'error');
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

  private showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    // Clear any existing timeout
    if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
    }

    // Set new toast
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;

    // Auto hide after 3 seconds
    this.toastTimeout = setTimeout(() => {
        this.toastVisible = false;
        this.toastTimeout = null;
    }, 3000);
  }

  // Add this method to check for changes
  private hasUnsavedChanges(currentData: any, originalData: any): boolean {
    // Check if number of respondents or course section changed
    if (currentData.numberOfRespondents !== originalData.NumberOfRespondents ||
        currentData.courseSection !== originalData.CourseSection) {
      return true;
    }

    // Check if scores changed
    for (const score of originalData.EvaluationScores) {
      const category = this.evaluationCategories.find(c => c.criteriaId === score.CriteriaID);
      if (category && this.ratings[category.id] !== score.Score) {
        return true;
      }
    }

    return false;
  }

  // Change handlers
  onDepartmentChange(): void {
    this.currentPage = 1;
    this.loadFaculties();
  }

  onEmploymentTypeChange(): void {
    this.currentPage = 1;
    this.loadFaculties();
  }
}