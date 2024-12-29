import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoordinatorService } from '../../services/coordinator.service';
import { UserManagementService } from '../../services/user-management.service';
import { Department, Coordinator } from '../../model/coodinatorModel';
import { User } from '../../model/user.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampusContextService } from '../../services/campus-context.service';
import { Subscription } from 'rxjs';
import { GetUsersParams } from '../../model/get-user-params.model';
import { UserResponse } from '../../model/user-response.model';
import { Role } from '../../model/role.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-coordinator-management',
  templateUrl: './coordinator-management.component.html',
  styleUrls: ['./coordinator-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CoordinatorManagementComponent implements OnInit, OnDestroy {
  departments: Department[] = [];
  facultyUsers: User[] = [];
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  showAssignModal: boolean = false;
  selectedDepartment: Department | null = null;
  campusId: number | null = null;
  private campusSubscription: Subscription | undefined;
  searchTerm: string = '';
  filteredDepartments: Department[] = [];
  facultySearchTerm: string = '';
  filteredFacultyUsers: User[] = [];
  private departmentSearchSubject = new Subject<string>();
  private facultySearchSubject = new Subject<string>();
  private readonly DEBOUNCE_TIME = 300;
  loading: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  paginatedFacultyUsers: User[] = [];

  constructor(
    private coordinatorService: CoordinatorService,
    private userManagementService: UserManagementService,
    private campusContextService: CampusContextService
  ) {
    this.departmentSearchSubject.pipe(
      debounceTime(this.DEBOUNCE_TIME),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.filterDepartments();
    });

    this.facultySearchSubject.pipe(
      debounceTime(this.DEBOUNCE_TIME),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.facultySearchTerm = searchTerm;
      this.currentPage = 1;
      this.loadActiveFacultyUsers();
    });
  }

  ngOnInit(): void {
    this.campusSubscription = this.campusContextService.getCampusId().subscribe(
      id => {
        console.log('Received campus ID:', id);
        if (id !== null) {
          this.campusId = id;
          this.loadDepartments();
          this.loadActiveFacultyUsers();
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
    this.departmentSearchSubject.complete();
    this.facultySearchSubject.complete();
  }

  loadDepartments(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    console.log('Loading departments for campus ID:', this.campusId);
    this.coordinatorService.getAllDepartmentsWithCoordinators(this.campusId).subscribe({
      next: (departments) => {
        console.log('Received departments:', JSON.stringify(departments, null, 2));
        this.departments = departments;
        this.filteredDepartments = [...departments];
      },
      error: (error) => {
        console.error('Error fetching departments:', error);
        this.showToastNotification('Error fetching departments', 'error');
      }
    });
  }
  
  loadActiveFacultyUsers(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }

    this.loading = true;
    const params: GetUsersParams = {
      campusId: this.campusId,
      role: 'faculty',
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.facultySearchTerm
    };

    this.userManagementService.getAllUsers(params).subscribe({
      next: (response: UserResponse) => {
        this.facultyUsers = response.data;
        this.paginatedFacultyUsers = response.data;
        this.totalItems = response.metadata.totalItems;
        this.totalPages = response.metadata.totalPages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching faculty users:', error);
        this.showToastNotification('Error fetching faculty users', 'error');
        this.loading = false;
      }
    });
  }

  openAssignModal(department: Department): void {
    this.selectedDepartment = department;
    this.showAssignModal = true;
    this.facultySearchTerm = '';
    this.filteredFacultyUsers = [...this.facultyUsers];
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedDepartment = null;
  }

  assignCoordinator(department: Department, userId: number): void {
    this.coordinatorService.assignCoordinator(department.DepartmentID, userId).subscribe({
      next: (response) => {
        console.log('Coordinator assigned:', response);
        if (response.department && response.department.Coordinator) {
          department.Coordinator = response.department.Coordinator;
          department.CoordinatorID = response.department.CoordinatorID;
        }
        this.showToastNotification('Coordinator assigned successfully', 'success');
        this.closeAssignModal();
        this.loadDepartments(); // Reload departments to reflect changes
      },
      error: (error) => {
        console.error('Error assigning coordinator:', error);
        this.showToastNotification('Error assigning coordinator', 'error');
      }
    });
  }

  removeCoordinator(department: Department): void {
    if (!department.Coordinator) {
      this.showToastNotification('No coordinator assigned to remove', 'warning');
      return;
    }
    this.coordinatorService.removeCoordinator(department.DepartmentID).subscribe({
      next: () => {
        department.Coordinator = null;
        department.CoordinatorID = null;
        this.showToastNotification('Coordinator removed successfully', 'success');
      },
      error: (error) => {
        console.error('Error removing coordinator:', error);
        this.showToastNotification('Error removing coordinator: ' + error.message, 'error');
      }
    });
  }

  updateUserDepartment(userId: number, departmentId: number): void {
    this.userManagementService.updateUserDepartment(userId, departmentId).subscribe({
      next: () => {
        const user = this.facultyUsers.find(u => u.UserID === userId);
        if (user) {
          user.Department = { DepartmentID: departmentId, DepartmentName: '' };
        }
      },
      error: (error) => {
        console.error('Error updating user department:', error);
        this.showToastNotification('Error updating user department', 'warning');
      }
    });
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  onDepartmentSearch(event: any): void {
    const searchTerm = event.target.value;
    this.departmentSearchSubject.next(searchTerm);
  }

  onFacultySearch(event: any): void {
    const searchTerm = event.target.value;
    this.facultySearchSubject.next(searchTerm);
  }

  private filterDepartments(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDepartments = [...this.departments];
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredDepartments = this.departments.filter(dept => 
      dept.DepartmentName.toLowerCase().includes(searchTermLower) ||
      (dept.Coordinator && 
        (`${dept.Coordinator.FirstName} ${dept.Coordinator.Surname}`
          .toLowerCase()
          .includes(searchTermLower))
      )
    );
  }

  private filterFacultyUsers(): void {
    if (!this.facultySearchTerm.trim()) {
      this.filteredFacultyUsers = [...this.facultyUsers];
      return;
    }

    const searchTermLower = this.facultySearchTerm.toLowerCase();
    this.filteredFacultyUsers = this.facultyUsers.filter(user => 
      `${user.FirstName} ${user.Surname}`.toLowerCase().includes(searchTermLower)
    );
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadActiveFacultyUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadActiveFacultyUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadActiveFacultyUsers();
    }
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
