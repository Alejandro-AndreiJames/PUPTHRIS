import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { LearningService } from '../../services/learning.service';
import { LearningDevelopment } from '../../model/learning-development.model';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-learning',
  templateUrl: './learning.component.html',
  styleUrls: ['./learning.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class LearningComponent implements OnInit {
  learningForm: FormGroup;
  learningData: LearningDevelopment[] = [];
  paginatedLearningData: LearningDevelopment[] = [];
  isEditing: boolean = false;
  currentLearningId: number | null = null;
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

  today: string;

  constructor(private fb: FormBuilder, private learningService: LearningService, private authService: AuthService) {
    this.today = new Date().toISOString().split('T')[0];

    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.learningForm = this.fb.group({
      TitleOfLearningDevelopment: ['', Validators.required],
      InclusiveDatesFrom: ['', [Validators.required, this.dateValidator()]],
      InclusiveDatesTo: ['', [Validators.required, this.dateValidator(), this.dateRangeValidator()]],
      NumberOfHours: ['', [Validators.required, Validators.min(1)]],
      TypeOfLD: ['', Validators.required],
      ConductedSponsoredBy: ['', Validators.required]
    });

    this.learningForm.get('InclusiveDatesFrom')?.valueChanges.subscribe(value => {
      const toControl = this.learningForm.get('InclusiveDatesTo');
      if (toControl) {
        toControl.updateValueAndValidity();
      }
    });
  }

  ngOnInit(): void {
    this.loadLearningDevelopments();
  }

  loadLearningDevelopments(): void {
    this.learningService.getLearningDevelopments(this.userId).subscribe(
      (data: LearningDevelopment[]) => {
        this.learningData = data;
        this.totalPages = Math.ceil(this.learningData.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      error => {
        this.showToastNotification('Error fetching learning developments.', 'error');
        console.error('Error fetching learning developments', error);
      }
    );
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedLearningData = this.learningData.slice(startIndex, endIndex);
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

  resetForm(showToast: boolean = true): void {
    if (showToast && this.hasUnsavedChanges()) {
      this.showToastNotification('The changes are not saved.', 'error');
    }
    this.learningForm.reset();
    this.currentLearningId = null;
    this.isEditing = false;
    this.initialFormValue = this.learningForm.getRawValue();
  }

  onSubmit(): void {
    if (this.learningForm.invalid) {
      if (this.learningForm.get('InclusiveDatesFrom')?.errors?.['futureDate'] || 
          this.learningForm.get('InclusiveDatesTo')?.errors?.['futureDate']) {
        this.showToastNotification('Dates cannot be in the future.', 'warning');
        return;
      }
      if (this.learningForm.get('InclusiveDatesTo')?.errors?.['invalidDateRange']) {
        this.showToastNotification('End date cannot be before start date.', 'warning');
        return;
      }
      if (this.learningForm.get('NumberOfHours')?.errors?.['min']) {
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

    const formData = { ...this.learningForm.value, UserID: this.userId };
    if (this.currentLearningId) {
      this.learningService.updateLearningDevelopment(this.currentLearningId, formData).subscribe(
        response => {
          this.loadLearningDevelopments();
          this.resetForm();
          this.showToastNotification('Learning development updated successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error updating learning development', error);
        }
      );
    } else {
      this.learningService.addLearningDevelopment(formData).subscribe(
        response => {
          this.loadLearningDevelopments();
          this.resetForm();
          this.showToastNotification('Learning development added successfully.', 'success');
        },
        error => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error adding learning development', error);
        }
      );
    }
  }

  editLearning(id: number): void {
    const learning = this.learningData.find(ld => ld.LearningDevelopmentID === id);
    if (learning) {
      const formData = {
        ...learning,
        InclusiveDatesFrom: learning.InclusiveDatesFrom ? new Date(learning.InclusiveDatesFrom).toISOString().split('T')[0] : '',
        InclusiveDatesTo: learning.InclusiveDatesTo ? new Date(learning.InclusiveDatesTo).toISOString().split('T')[0] : ''
      };
      
      console.log('Setting form data:', formData);
      this.learningForm.patchValue(formData);
      this.currentLearningId = id;
      this.isEditing = true;
      this.initialFormValue = this.learningForm.getRawValue();
    }
  }

  deleteLearning(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.learningService.deleteLearningDevelopment(this.pendingDeleteId).subscribe(
        response => {
          this.learningData = this.learningData.filter(ld => ld.LearningDevelopmentID !== this.pendingDeleteId);
          this.totalPages = Math.ceil(this.learningData.length / this.itemsPerPage);
          if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
          }
          this.updatePaginatedData();
          this.showToastNotification('Learning development deleted successfully.', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('There is an error deleting the record.', 'error');
          console.error('Error deleting learning development', error);
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      );
    }
  }

  addNewLearning(): void {
    this.resetForm(false); // Avoid showing the toast on the first click
    this.isEditing = true;
    this.initialFormValue = this.learningForm.getRawValue(); // Store the initial form value for new form
  }

  private hasUnsavedChanges(): boolean {
    const currentFormValue = this.learningForm.getRawValue();
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
      const fromDate = this.learningForm?.get('InclusiveDatesFrom')?.value;
      
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
