import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CivilServiceEligibility } from '../../model/civil-service.model';
import { CivilServiceService } from '../../services/civil.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-civil',
  templateUrl: './civil.component.html',
  styleUrls: ['./civil.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CivilComponent implements OnInit {
  civilServiceForm: FormGroup;
  civilServiceData: CivilServiceEligibility[] = [];
  paginatedCivilServiceData: CivilServiceEligibility[] = [];
  isEditing: boolean = false;
  currentEligibilityId: number | null = null;
  userId: number;
  initialFormValue: any; // To store the initial form value

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private civilServiceService: CivilServiceService,
    private authService: AuthService
  ) {
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.civilServiceForm = this.fb.group({
      CareerService: ['', Validators.required],
      Rating: ['', Validators.required],
      DateOfExamination: [''],
      PlaceOfExamination: [''],
      LicenseNumber: ['', Validators.required],
      LicenseValidityDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadCivilServiceEligibilities();
  }

  loadCivilServiceEligibilities(): void {
    this.civilServiceService.getCivilServiceEligibilities(this.userId).subscribe({
      next: (data: CivilServiceEligibility[]) => {
        this.civilServiceData = data || [];
        this.totalPages = Math.ceil(this.civilServiceData.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      error: (error) => {
        if (error.status !== 404) {
          this.showToastNotification('Error fetching civil service eligibilities.', 'error');
          console.error('Error fetching civil service eligibilities', error);
        }
        this.civilServiceData = [];
        this.paginatedCivilServiceData = [];
        this.totalPages = 0;
      }
    });
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedCivilServiceData = this.civilServiceData.slice(startIndex, endIndex);
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

  get totalPagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
  }

  editEligibility(id: number): void {
    const eligibility = this.civilServiceData.find(el => el.CivilServiceEligibilityID === id);
    if (eligibility) {
      this.civilServiceForm.patchValue(eligibility);
      this.currentEligibilityId = id;
      this.isEditing = true;
      this.initialFormValue = this.civilServiceForm.getRawValue(); // Store the initial form value
    }
  }

  deleteEligibility(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.civilServiceService.deleteCivilServiceEligibility(this.pendingDeleteId).subscribe(
        response => {
          this.civilServiceData = this.civilServiceData.filter(el => el.CivilServiceEligibilityID !== this.pendingDeleteId);
          this.totalPages = Math.ceil(this.civilServiceData.length / this.itemsPerPage);
          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages || 1;
          }
          this.updatePaginatedData();
          this.showToastNotification('Civil service eligibility deleted successfully.', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('There is an error deleting the record.', 'error');
          console.error('Error deleting civil service eligibility', error);
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      );
    }
  }

  addNewEligibility(): void {
    this.resetForm(false);
    this.isEditing = true;
    this.initialFormValue = this.civilServiceForm.getRawValue(); // Store the initial form value for new form
  }

  resetForm(showToast: boolean = true): void {
    if (showToast && this.hasUnsavedChanges()) {
      this.showToastNotification('The changes are not saved.', 'error');
    }
    this.civilServiceForm.reset();
    this.currentEligibilityId = null;
    this.isEditing = false;
    this.initialFormValue = this.civilServiceForm.getRawValue(); // Store the initial form value for new form
  }

  onSubmit(): void {
    if (this.civilServiceForm.invalid) {
      this.showToastNotification('Please fill in all required fields (Career Service, Rating, and License Number).', 'warning');
      return;
    }

    if (!this.hasUnsavedChanges()) {
      this.showToastNotification('There are no current changes to be saved.', 'warning');
      return;
    }

    const formData = { ...this.civilServiceForm.value, UserID: this.userId };

    if (this.currentEligibilityId) {
      this.civilServiceService.updateCivilServiceEligibility(this.currentEligibilityId, formData).subscribe(
        response => {
          this.loadCivilServiceEligibilities();
          this.resetForm();
          this.showToastNotification('Information updated successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error updating civil service eligibility', error);
        }
      );
    } else {
      this.civilServiceService.addCivilServiceEligibility(formData).subscribe(
        response => {
          this.loadCivilServiceEligibilities();
          this.resetForm();
          this.showToastNotification('Civil service eligibility added successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error adding civil service eligibility', error);
        }
      );
    }
  }

  private hasUnsavedChanges(): boolean {
    const currentFormValue = this.civilServiceForm.getRawValue();
    return JSON.stringify(currentFormValue) !== JSON.stringify(this.initialFormValue);
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000); // Hide toast after 3 seconds
  }
}
