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
  paginatedDepartments: Department[] = [];

  // Pagination for modal faculty list
  modalCurrentPage: number = 1;
  modalTotalPages: number = 1;
  modalItemsPerPage: number = 10;
  modalTotalItems: number = 0;
  modalPageNumbers: number[] = [];

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
    this.coordinatorService.getAllDepartmentsWithCoordinators(this.campusId).subscribe({
      next: (departments) => {
        this.departments = departments;
        this.filteredDepartments = [...departments];
        this.totalPages = Math.ceil(this.filteredDepartments.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      error: (error) => {
        console.error('Error fetching departments:', error);
        this.showToastNotification('Error fetching departments', 'error');
      }
    });
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedDepartments = this.filteredDepartments.slice(startIndex, endIndex);
  }

  loadActiveFacultyUsers(): void {
    // Show loading state
    this.loading = true;

    const params = {
      page: this.modalCurrentPage,
      limit: this.modalItemsPerPage,
      search: this.facultySearchTerm,
      role: 'faculty' // Add this if you want to filter only faculty users
    };

    this.userManagementService.getAllUsers(params).subscribe({
      next: (response) => {
        this.facultyUsers = response.data;
        this.modalTotalItems = response.metadata.totalItems;
        this.modalTotalPages = response.metadata.totalPages;
        this.modalPageNumbers = Array.from({length: this.modalTotalPages}, (_, i) => i + 1);
        
        // Update the paginated faculty users
        this.paginatedFacultyUsers = this.facultyUsers;
        
        // Hide loading state
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading faculty users:', error);
        this.loading = false;
      }
    });
  }

  openAssignModal(department: Department): void {
    this.selectedDepartment = department;
    this.showAssignModal = true;
    this.modalCurrentPage = 1; // Reset to first page when opening modal
    this.facultySearchTerm = ''; // Reset search term
    this.loadActiveFacultyUsers();
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
    this.facultySearchTerm = event.target.value;
    this.modalCurrentPage = 1; // Reset to first page when searching
    this.loadActiveFacultyUsers();
  }

  private filterDepartments(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDepartments = [...this.departments];
    } else {
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
    this.totalPages = Math.ceil(this.filteredDepartments.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePaginatedData();
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
      this.updatePaginatedData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
  }

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pageNumbers(): number[] {
    const visiblePages = 5; // Show 5 page numbers at a time
    let start = Math.max(this.currentPage - Math.floor(visiblePages / 2), 1);
    let end = Math.min(start + visiblePages - 1, this.totalPages);

    if (end - start + 1 < visiblePages) {
      start = Math.max(end - visiblePages + 1, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  calculateEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  // Methods for modal faculty list pagination
  modalNextPage(): void {
    if (this.modalCurrentPage < this.modalTotalPages) {
      this.modalCurrentPage++;
      this.loadActiveFacultyUsers(); // Reload data with new page
    }
  }

  modalPreviousPage(): void {
    if (this.modalCurrentPage > 1) {
      this.modalCurrentPage--;
      this.loadActiveFacultyUsers(); // Reload data with new page
    }
  }

  modalGoToPage(page: number): void {
    if (page >= 1 && page <= this.modalTotalPages && page !== this.modalCurrentPage) {
      this.modalCurrentPage = page;
      this.loadActiveFacultyUsers(); // Reload data with new page
    }
  }

  calculateModalEndIndex(): number {
    return Math.min(this.modalCurrentPage * this.modalItemsPerPage, this.modalTotalItems);
  }

  updatePaginatedFacultyUsers(): void {
    const startIndex = (this.modalCurrentPage - 1) * this.modalItemsPerPage;
    const endIndex = startIndex + this.modalItemsPerPage;
    this.paginatedFacultyUsers = this.facultyUsers.slice(startIndex, endIndex);
  }
}
