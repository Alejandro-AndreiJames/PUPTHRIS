import { Component, OnInit, OnDestroy } from '@angular/core';
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
    this.isEvaluationModalOpen = true;
    this.resetEvaluationForm();
  }

  closeEvaluationModal() {
    this.isEvaluationModalOpen = false;
    this.selectedUser = null;
    this.resetEvaluationForm();
  }

  resetEvaluationForm() {
    this.ratings = {};
    this.evaluationCategories.forEach(category => {
      this.ratings[category.id] = 0;
    });
  }

  submitEvaluation() {
    if (!this.selectedUser) return;
  
    const decodedToken = this.authService.getDecodedToken();
    if (!decodedToken?.userId) {
      console.error('No user ID found in token');
      return;
    }
  
    // Calculate total score
    const scores = Object.entries(this.ratings).map(([categoryId, score]) => {
      const category = this.evaluationCategories.find(c => c.id === categoryId);
      return {
        CriteriaID: category?.criteriaId || 0,
        Score: score
      };
    });
  
    const totalScore = scores.reduce((sum, score) => sum + score.Score, 0) / scores.length;
    const qualitativeRating = this.calculateRatingDescription(totalScore).description;
  
    const evaluationData: EvaluationSubmission = {
      facultyId: this.selectedUser.UserID,
      evaluatorId: decodedToken.userId,
      academicYear: this.currentAcademicYear,
      semester: this.currentSemester,
      courseSection: this.courseYearSection,
      numberOfRespondents: this.numberOfRespondents,
      totalScore,
      qualitativeRating,
      scores,
      createdBy: decodedToken.userId
    };
  
    this.evaluationService.submitEvaluation(evaluationData).subscribe({
      next: (response) => {
        console.log('Evaluation submitted successfully', response);
        this.closeEvaluationModal();
      },
      error: (error) => {
        console.error('Error submitting evaluation', error);
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
}