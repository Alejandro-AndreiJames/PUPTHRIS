import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { VoluntaryWorkService } from '../../services/voluntarywork.service';
import { VoluntaryWork } from '../../model/voluntary-work.model';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-voluntarywork',
  templateUrl: './voluntarywork.component.html',
  styleUrls: ['./voluntarywork.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class VoluntaryWorkComponent implements OnInit {
  voluntaryWorkForm: FormGroup;
  voluntaryWorkData: VoluntaryWork[] = [];
  paginatedVoluntaryWorkData: VoluntaryWork[] = [];
  isEditing: boolean = false;
  currentVoluntaryWorkId: number | null = null;
  userId: number;
  initialFormValue: any; // To store the initial form value

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5; // You can adjust this value for number of records per page
  totalPages: number = 1;
  totalPagesArray: number[] = [];

  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;

  today: string;

  constructor(private fb: FormBuilder, private voluntaryWorkService: VoluntaryWorkService, private authService: AuthService) {
    this.today = new Date().toISOString().split('T')[0];

    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.voluntaryWorkForm = this.fb.group({
      OrganizationNameAddress: ['', Validators.required],
      InclusiveDatesFrom: ['', [Validators.required, this.dateValidator()]],
      InclusiveDatesTo: ['', [Validators.required, this.dateValidator(), this.dateRangeValidator()]],
      NumberOfHours: ['', [Validators.required, Validators.min(1)]],
      PositionNatureOfWork: ['', Validators.required]
    });

    // Add validator for InclusiveDatesTo when InclusiveDatesFrom changes
    this.voluntaryWorkForm.get('InclusiveDatesFrom')?.valueChanges.subscribe(value => {
      const toControl = this.voluntaryWorkForm.get('InclusiveDatesTo');
      if (toControl) {
        toControl.updateValueAndValidity();
      }
    });
  }

  ngOnInit(): void {
    this.loadVoluntaryWorks();
  }

  loadVoluntaryWorks(): void {
    this.voluntaryWorkService.getVoluntaryWorks(this.userId).subscribe(
      data => {
        this.voluntaryWorkData = data;
        this.calculatePagination(); // Calculate pagination after data load
      },
      error => {
        this.showToastNotification('Error fetching voluntary works.', 'error');
        console.error('Error fetching voluntary works', error);
      }
    );
  }

  calculatePagination(): void {
    this.totalPages = Math.ceil(this.voluntaryWorkData.length / this.itemsPerPage);
    this.totalPagesArray = Array(this.totalPages).fill(0).map((x, i) => i + 1);
    this.paginateData();
  }

  paginateData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedVoluntaryWorkData = this.voluntaryWorkData.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.paginateData();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateData();
    }
  }

  resetForm(showToast: boolean = true): void {
    if (showToast && this.hasUnsavedChanges()) {
      this.showToastNotification('The changes are not saved.', 'error');
    }
    this.voluntaryWorkForm.reset();
    this.currentVoluntaryWorkId = null;
    this.isEditing = false;
    this.initialFormValue = this.voluntaryWorkForm.getRawValue(); // Store the initial form value for new form
  }

  onSubmit(): void {
    if (this.voluntaryWorkForm.invalid) {
      if (this.voluntaryWorkForm.get('InclusiveDatesFrom')?.errors?.['futureDate'] || 
          this.voluntaryWorkForm.get('InclusiveDatesTo')?.errors?.['futureDate']) {
        this.showToastNotification('Dates cannot be in the future.', 'warning');
        return;
      }
      if (this.voluntaryWorkForm.get('InclusiveDatesTo')?.errors?.['invalidDateRange']) {
        this.showToastNotification('End date cannot be before start date.', 'warning');
        return;
      }
      if (this.voluntaryWorkForm.get('NumberOfHours')?.errors?.['min']) {
        this.showToastNotification('Number of hours must be greater than 0.', 'warning');
        return;
      }
      this.showToastNotification('Please fill in all required fields correctly.', 'warning');
      return;
    }

    if (!this.hasUnsavedChanges()) {
      this.showToastNotification('There are no current changes to be saved.', 'warning');
      return;
    }

    const voluntaryWork = { ...this.voluntaryWorkForm.value, UserID: this.userId };
    if (this.currentVoluntaryWorkId) {
      this.voluntaryWorkService.updateVoluntaryWork(this.currentVoluntaryWorkId, voluntaryWork).subscribe(
        response => {
          this.loadVoluntaryWorks();
          this.resetForm();
          this.showToastNotification('Voluntary work updated successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error updating voluntary work', error);
        }
      );
    } else {
      this.voluntaryWorkService.addVoluntaryWork(voluntaryWork).subscribe(
        response => {
          this.loadVoluntaryWorks();
          this.resetForm();
          this.showToastNotification('Voluntary work added successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error adding voluntary work', error);
        }
      );
    }
  }

  editVoluntaryWork(id: number): void {
    const voluntaryWork = this.voluntaryWorkData.find(vw => vw.VoluntaryWorkID === id);
    if (voluntaryWork) {
      // Format the dates before setting them in the form
      const formData = {
        ...voluntaryWork,
        InclusiveDatesFrom: voluntaryWork.InclusiveDatesFrom ? new Date(voluntaryWork.InclusiveDatesFrom).toISOString().split('T')[0] : '',
        InclusiveDatesTo: voluntaryWork.InclusiveDatesTo ? new Date(voluntaryWork.InclusiveDatesTo).toISOString().split('T')[0] : ''
      };
      
      console.log('Setting form data:', formData);
      this.voluntaryWorkForm.patchValue(formData);
      this.currentVoluntaryWorkId = id;
      this.isEditing = true;
      this.initialFormValue = this.voluntaryWorkForm.getRawValue();
    }
  }

  deleteVoluntaryWork(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.voluntaryWorkService.deleteVoluntaryWork(this.pendingDeleteId).subscribe(
        response => {
          this.voluntaryWorkData = this.voluntaryWorkData.filter(vw => vw.VoluntaryWorkID !== this.pendingDeleteId);
          this.showToastNotification('Voluntary work deleted successfully.', 'success');
          this.calculatePagination();
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('There is an error deleting the record.', 'error');
          console.error('Error deleting voluntary work', error);
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      );
    }
  }

  addNewVoluntaryWork(): void {
    this.resetForm(false); // Avoid showing the toast on the first click
    this.isEditing = true;
    this.initialFormValue = this.voluntaryWorkForm.getRawValue(); // Store the initial form value for new form
  }

  private hasUnsavedChanges(): boolean {
    const currentFormValue = this.voluntaryWorkForm.getRawValue();
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

  private dateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const selectedDate = new Date(control.value);
      const today = new Date();
      
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        return { futureDate: true };
      }
      return null;
    };
  }

  private dateRangeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const toDate = new Date(control.value);
      const fromDate = this.voluntaryWorkForm?.get('InclusiveDatesFrom')?.value;
      
      if (!fromDate) return null;

      const fromDateTime = new Date(fromDate);
      
      toDate.setHours(0, 0, 0, 0);
      fromDateTime.setHours(0, 0, 0, 0);

      if (toDate < fromDateTime) {
        return { invalidDateRange: true };
      }
      return null;
    };
  }
}
