import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { WorkExperience } from '../../model/work.model';
import { WorkService } from '../../services/work.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-workexperience',
  templateUrl: './workexperience.component.html',
  styleUrls: ['./workexperience.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class WorkExperienceComponent implements OnInit {
  workExperienceForm: FormGroup;
  workExperienceData: WorkExperience[] = [];
  paginatedWorkExperienceData: WorkExperience[] = [];
  isEditing: boolean = false;
  currentExperienceId: number | null = null;
  userId: number;
  initialFormValue: any;

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;

  today: string;

  constructor(private fb: FormBuilder, private workService: WorkService, private authService: AuthService) {
    this.today = new Date().toISOString().split('T')[0];

    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.workExperienceForm = this.fb.group({
      InclusiveDatesFrom: ['', [Validators.required, this.dateValidator()]],
      InclusiveDatesTo: ['', [Validators.required, this.dateValidator(), this.dateRangeValidator()]],
      PositionTitle: ['', Validators.required],
      DepartmentAgencyOfficeCompany: ['', Validators.required],
      MonthlySalary: ['', [Validators.required, Validators.min(0)]],
      SalaryJobPayGrade: [''],
      StatusOfAppointment: ['', Validators.required],
      GovtService: [false, Validators.required]
    });

    this.workExperienceForm.get('InclusiveDatesFrom')?.valueChanges.subscribe(value => {
      const toControl = this.workExperienceForm.get('InclusiveDatesTo');
      if (toControl) {
        toControl.updateValueAndValidity();
      }
    });
  }

  ngOnInit(): void {
    this.loadWorkExperiences();
  }

  loadWorkExperiences(): void {
    this.workService.getWorkExperiences(this.userId).subscribe(
      data => {
        this.workExperienceData = data;
        this.totalPages = Math.ceil(this.workExperienceData.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      error => {
        this.showToastNotification('Error fetching work experiences.', 'error');
        console.error('Error fetching work experiences', error);
      }
    );
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedWorkExperienceData = this.workExperienceData.slice(startIndex, endIndex);
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

  editExperience(id: number): void {
    const experience = this.workExperienceData.find(ex => ex.WorkExperienceID === id);
    if (experience) {
      const formData = {
        ...experience,
        InclusiveDatesFrom: experience.InclusiveDatesFrom ? new Date(experience.InclusiveDatesFrom).toISOString().split('T')[0] : '',
        InclusiveDatesTo: experience.InclusiveDatesTo ? new Date(experience.InclusiveDatesTo).toISOString().split('T')[0] : ''
      };
      
      console.log('Setting form data:', formData);
      this.workExperienceForm.patchValue(formData);
      this.currentExperienceId = id;
      this.isEditing = true;
      this.initialFormValue = this.workExperienceForm.getRawValue();
    }
  }

  deleteExperience(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.workService.deleteWorkExperience(this.pendingDeleteId).subscribe(
        response => {
          this.workExperienceData = this.workExperienceData.filter(ex => ex.WorkExperienceID !== this.pendingDeleteId);
          this.totalPages = Math.ceil(this.workExperienceData.length / this.itemsPerPage);
          if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
          }
          this.updatePaginatedData();
          this.showToastNotification('Work experience deleted successfully.', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('There is an error deleting the record.', 'error');
          console.error('Error deleting work experience', error);
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      );
    }
  }

  addNewExperience(): void {
    this.resetForm(false); // Avoid showing the toast on the first click
    this.isEditing = true;
    this.initialFormValue = this.workExperienceForm.getRawValue(); // Store the initial form value for new form
  }

  resetForm(showToast: boolean = true): void {
    if (showToast && this.hasUnsavedChanges()) {
      this.showToastNotification('The changes are not saved.', 'error');
    }
    this.workExperienceForm.reset();
    this.currentExperienceId = null;
    this.isEditing = false;
    this.initialFormValue = this.workExperienceForm.getRawValue(); // Store the initial form value for new form
  }

  onSubmit(): void {
    if (this.workExperienceForm.invalid) {
      if (this.workExperienceForm.get('InclusiveDatesFrom')?.errors?.['futureDate'] || 
          this.workExperienceForm.get('InclusiveDatesTo')?.errors?.['futureDate']) {
        this.showToastNotification('Dates cannot be in the future.', 'warning');
        return;
      }
      if (this.workExperienceForm.get('InclusiveDatesTo')?.errors?.['invalidDateRange']) {
        this.showToastNotification('End date cannot be before start date.', 'warning');
        return;
      }
      if (this.workExperienceForm.get('MonthlySalary')?.errors?.['min']) {
        this.showToastNotification('Monthly salary cannot be negative.', 'warning');
        return;
      }
      this.showToastNotification('Please fill in all required fields correctly.', 'warning');
      return;
    }

    if (!this.hasUnsavedChanges()) {
      this.showToastNotification('There are no current changes to be saved.', 'warning');
      return;
    }

    const workExperience = { ...this.workExperienceForm.value, UserID: this.userId };
    if (this.currentExperienceId) {
      this.workService.updateWorkExperience(this.currentExperienceId, workExperience).subscribe(
        response => {
          this.loadWorkExperiences();
          this.resetForm();
          this.showToastNotification('Work experience updated successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error updating work experience', error);
        }
      );
    } else {
      this.workService.addWorkExperience(workExperience).subscribe(
        response => {
          this.loadWorkExperiences();
          this.resetForm();
          this.showToastNotification('Work experience added successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error adding work experience', error);
        }
      );
    }
  }

  private hasUnsavedChanges(): boolean {
    const currentFormValue = this.workExperienceForm.getRawValue();
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
      const fromDate = this.workExperienceForm?.get('InclusiveDatesFrom')?.value;
      
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
