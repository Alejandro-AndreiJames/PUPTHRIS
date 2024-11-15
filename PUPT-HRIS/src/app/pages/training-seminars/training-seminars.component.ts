import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TrainingSeminar } from '../../model/training-seminars.model';
import { TrainingSeminarsService } from '../../services/training-seminars.service';
import { AuthService } from '../../services/auth.service';
import { ExcelImportService } from '../../services/excel-import.service';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-training-seminars',
  templateUrl: './training-seminars.component.html',
  styleUrls: ['./training-seminars.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class TrainingSeminarsComponent implements OnInit {
  trainingForm: FormGroup;
  trainingData: TrainingSeminar[] = [];
  paginatedTrainingData: TrainingSeminar[] = [];
  isEditing: boolean = false;
  currentTrainingId: number | null = null;
  userId: number;
  fileToUpload: File | null = null;
  selectedFileName: string | null = null;
  isModalOpen: boolean = false;

  selectedProofUrl: string | null = null;
  selectedSupportingDocument: string | null = null;
  selectedProofType: 'file' | 'link' = 'file';

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;

  today: string;

  constructor(
    private fb: FormBuilder,
    private trainingSeminarsService: TrainingSeminarsService,
    private authService: AuthService,
    private excelImportService: ExcelImportService
  ) {
    this.today = new Date().toISOString().split('T')[0];

    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.trainingForm = this.fb.group({
      Title: ['', Validators.required],
      Classification: ['', Validators.required],
      Nature: [''],
      Budget: [''],
      SourceOfFund: [''],
      Organizer: [''],
      Level: [''],
      Venue: [''],
      DateFrom: ['', [Validators.required, this.dateValidator()]],
      DateTo: ['', [Validators.required, this.dateValidator(), this.dateRangeValidator()]],
      NumberOfHours: ['', [Validators.min(1)]],
      SupportingDocuments: [''],
      Proof: [''],
      ProofType: ['file']
    });

    this.trainingForm.get('DateFrom')?.valueChanges.subscribe(value => {
      const toControl = this.trainingForm.get('DateTo');
      if (toControl) {
        toControl.updateValueAndValidity();
      }
    });
  }

  ngOnInit(): void {
    this.loadTrainings();
  }

  loadTrainings(): void {
    this.trainingSeminarsService.getTrainings(this.userId).subscribe({
      next: (data: TrainingSeminar[]) => {
        this.trainingData = data || [];
        this.totalPages = Math.ceil(this.trainingData.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      error: (error) => {
        if (error.status !== 404) {
          this.showToastNotification('Error fetching trainings data.', 'error');
          console.error('Error fetching trainings data', error);
        }
        this.trainingData = [];
        this.paginatedTrainingData = [];
        this.totalPages = 0;
      }
    });
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTrainingData = this.trainingData.slice(startIndex, endIndex);
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
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  addNewTraining(): void {
    this.isEditing = true;
    this.currentTrainingId = null;
    this.trainingForm.reset();
  }

  editTraining(id: number): void {
    const training = this.trainingData.find(t => t.TrainingID === id);
    if (training) {
      const formData = {
        ...training,
        DateFrom: training.DateFrom ? new Date(training.DateFrom).toISOString().split('T')[0] : '',
        DateTo: training.DateTo ? new Date(training.DateTo).toISOString().split('T')[0] : ''
      };
      
      this.trainingForm.patchValue(formData);
      this.currentTrainingId = id;
      this.isEditing = true;
    }
  }

  onSubmit(): void {
    if (this.trainingForm.invalid) {
      if (this.trainingForm.get('DateFrom')?.errors?.['futureDate'] || 
          this.trainingForm.get('DateTo')?.errors?.['futureDate']) {
        this.showToastNotification('Dates cannot be in the future.', 'warning');
        return;
      }
      if (this.trainingForm.get('DateTo')?.errors?.['invalidDateRange']) {
        this.showToastNotification('End date cannot be before start date.', 'warning');
        return;
      }
      if (this.trainingForm.get('NumberOfHours')?.errors?.['min']) {
        this.showToastNotification('Number of hours must be greater than 0.', 'warning');
        return;
      }
      this.showToastNotification('Please fill in all required fields correctly.', 'warning');
      return;
    }

    const formData = new FormData();
    Object.keys(this.trainingForm.value).forEach(key => {
      const value = this.trainingForm.get(key)?.value;
      formData.append(key, value === '' ? null : value);
    });
    formData.append('UserID', this.userId.toString());

    if (this.fileToUpload) {
      formData.append('Proof', this.fileToUpload, this.fileToUpload.name);
    }

    if (this.currentTrainingId) {
      // Updating existing training
      const originalTraining = this.trainingData.find(t => t.TrainingID === this.currentTrainingId);
      if (originalTraining && this.isFormUnchanged(originalTraining)) {
        this.showToastNotification('No changes to save.', 'warning');
        return;
      }

      this.trainingSeminarsService.updateTraining(this.currentTrainingId, formData).subscribe(
        (response) => {
          this.loadTrainings();
          this.resetForm();
          this.showToastNotification('Training updated successfully.', 'success');
        },
        (error) => {
          this.showToastNotification('Error updating training.', 'error');
          console.error('Error updating training', error);
        }
      );
    } else {
      // Adding new training
      if (this.isFormEmpty()) {
        this.showToastNotification('Please enter information before adding.', 'warning');
        return;
      }

      this.trainingSeminarsService.addTraining(formData).subscribe(
        (response) => {
          this.loadTrainings();
          this.resetForm();
          this.showToastNotification('Training added successfully.', 'success');
        },
        (error) => {
          this.showToastNotification('Error adding training.', 'error');
          console.error('Error adding training', error);
        }
      );
    }
  }

  isFormUnchanged(originalTraining: TrainingSeminar): boolean {
    const formValue = this.trainingForm.value;
    return Object.keys(formValue).every(key => formValue[key] === originalTraining[key as keyof TrainingSeminar]);
  }

  isFormEmpty(): boolean {
    return Object.values(this.trainingForm.value).every(value => value === '' || value === null);
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileToUpload = file;
      this.selectedFileName = file.name;
    }
  }

  deleteTraining(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.trainingSeminarsService.deleteTraining(this.pendingDeleteId).subscribe(
        response => {
          this.trainingData = this.trainingData.filter(t => t.TrainingID !== this.pendingDeleteId);
          this.totalPages = Math.ceil(this.trainingData.length / this.itemsPerPage);
          if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
          }
          this.updatePaginatedData();
          this.showToastNotification('Training deleted successfully.', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('There is an error deleting the record.', 'error');
          console.error('Error deleting training', error);
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      );
    }
  }

  openProofModal(proofUrl: string, supportingDocument?: string): void {
    this.selectedProofUrl = proofUrl;
    this.selectedSupportingDocument = supportingDocument || 'No description available';
    this.selectedProofType = this.isImage(proofUrl) ? 'file' : 'link';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.selectedProofUrl = null;
    this.isModalOpen = false;
  }

  resetForm(): void {
    this.trainingForm.reset();
    this.fileToUpload = null;
    this.selectedFileName = null;
    this.currentTrainingId = null;
    this.isEditing = false;
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif)$/i.test(url);
  }

  onImageError(): void {
    this.showToastNotification('Failed to load image. Please check the URL.', 'error');
  }

  showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  importExcelData(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.excelImportService.importExcelData(file, this.userId).subscribe(
        (response) => {
          this.loadTrainings();
          this.showToastNotification('Data imported successfully', 'success');
        },
        (error) => {
          this.showToastNotification('Error importing data', 'error');
          console.error('Error importing data', error);
        }
      );
    }
  }

  formatValue(value: any): string {
    return value === null || value === 'null' || value === '' ? '' : value;
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
      const fromDate = this.trainingForm?.get('DateFrom')?.value;
      
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
