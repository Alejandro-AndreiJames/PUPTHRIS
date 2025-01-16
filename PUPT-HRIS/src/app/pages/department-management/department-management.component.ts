import { Component, OnInit, OnDestroy } from '@angular/core';
import { DepartmentService } from '../../services/department.service';
import { CampusContextService } from '../../services/campus-context.service';
import { Department } from '../../model/department.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-department-management',
  templateUrl: './department-management.component.html',
  styleUrls: ['./department-management.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class DepartmentManagementComponent implements OnInit, OnDestroy {
  departments: Department[] = [];
  departmentForm: FormGroup;
  isEditing: boolean = false;
  currentDepartmentId: number | null = null;
  currentCampusId: number | null = null;
  private campusSubscription: Subscription | undefined;
  editForm: FormGroup;

  // Toast variables
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  showModal: boolean = false;

  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;

  // Add pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  paginatedDepartments: Department[] = [];

  get totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  constructor(
    private departmentService: DepartmentService,
    private campusContextService: CampusContextService,
    private fb: FormBuilder
  ) {
    this.departmentForm = this.fb.group({
      DepartmentName: ['', [Validators.required, Validators.maxLength(100)]],
      Description: ['', Validators.maxLength(255)]
    });

    this.editForm = this.fb.group({
      DepartmentName: ['', [Validators.required, Validators.maxLength(100)]],
      Description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    this.campusSubscription = this.campusContextService.getCampusId().subscribe(
      campusId => {
        this.currentCampusId = campusId;
        this.loadDepartments();
      }
    );
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
  }

  loadDepartments(): void {
    if (this.currentCampusId === null) {
      this.showToastNotification('No campus selected', 'warning');
      return;
    }
    this.departmentService.getDepartments(this.currentCampusId).subscribe(
      (data) => {
        this.departments = data;
        this.totalPages = Math.ceil(this.departments.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      (error) => {
        this.showToastNotification('Error fetching departments', 'error');
        console.error('Error fetching departments', error);
      }
    );
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedDepartments = this.departments.slice(startIndex, endIndex);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedData();
    }
  }

  onSubmit(): void {
    if (this.departmentForm.invalid) {
      this.showToastNotification('Please fill out all required fields.', 'warning');
      return;
    }

    const department: Department = {
      ...this.departmentForm.value,
      CollegeCampusID: this.currentCampusId
    };

    if (this.isEditing && this.currentDepartmentId !== null) {
      this.departmentService.updateDepartment(this.currentDepartmentId, department).subscribe(
        () => {
          this.loadDepartments();
          this.resetForm();
          this.showToastNotification('Department updated successfully', 'success');
        },
        (error) => {
          this.showToastNotification('Error updating department', 'error');
          console.error('Error updating department', error);
        }
      );
    } else {
      this.departmentService.addDepartment(department).subscribe(
        () => {
          this.loadDepartments();
          this.resetForm();
          this.showToastNotification('Department added successfully', 'success');
        },
        (error) => {
          this.showToastNotification('Error adding department', 'error');
          console.error('Error adding department', error);
        }
      );
    }
  }

  editDepartment(department: Department): void {
    this.isEditing = true;
    this.currentDepartmentId = department.DepartmentID ?? null;
    this.departmentForm.patchValue(department);
    this.showModal = true;
  }

  deleteDepartment(id: number | undefined): void {
    if (id === undefined) {
      this.showToastNotification('Cannot delete department with undefined ID', 'error');
      return;
    }
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.departmentService.deleteDepartment(this.pendingDeleteId).subscribe({
        next: () => {
          this.loadDepartments();
          this.showToastNotification('Department deleted successfully', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error: (error) => {
          console.error('Error deleting department', error);
          this.showToastNotification('Error deleting department', 'error');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      });
    }
  }

  resetForm(): void {
    this.departmentForm.reset();
  }

  // Toast Notification Method
  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000); // Toast disappears after 3 seconds
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.currentDepartmentId = null;
    this.departmentForm.reset();
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentDepartmentId = null;
    this.departmentForm.reset();
    this.showModal = true;
  }

  updateDepartment(): void {
    if (this.editForm.invalid) {
      this.showToastNotification('Please fill out all required fields.', 'warning');
      return;
    }

    // Check if there are any changes by comparing with original values
    const originalDepartment = this.departments.find(d => d.DepartmentID === this.currentDepartmentId);
    const formValues = this.editForm.value;
    
    if (originalDepartment && 
        originalDepartment.DepartmentName === formValues.DepartmentName && 
        originalDepartment.Description === formValues.Description) {
      this.showToastNotification('No changes to be saved', 'warning');
      return;
    }

    const department: Department = {
      ...this.editForm.value,
      CollegeCampusID: this.currentCampusId
    };

    if (this.currentDepartmentId !== null) {
      this.departmentService.updateDepartment(this.currentDepartmentId, department).subscribe({
        next: () => {
          this.loadDepartments();
          this.closeModal();
          this.showToastNotification('Department updated successfully', 'success');
        },
        error: (error) => {
          this.showToastNotification('Error updating department', 'error');
          console.error('Error updating department', error);
        }
      });
    }
  }
}
