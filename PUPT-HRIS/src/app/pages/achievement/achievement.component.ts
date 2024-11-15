import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AchievementAward } from '../../model/achievement-awards.model';
import { AchievementAwardService } from '../../services/achievement-awards.service';
import { AuthService } from '../../services/auth.service';
import { ExcelImportService } from '../../services/excel-import.service';
import { jwtDecode } from 'jwt-decode';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-achievement-award',
  templateUrl: './achievement.component.html',
  styleUrls: ['./achievement.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AchievementAwardComponent implements OnInit {
  achievementAwardForm: FormGroup;
  achievementAwards: AchievementAward[] = [];
  paginatedAchievementAwards: AchievementAward[] = [];
  isEditing: boolean = false;
  currentAchievementId: number | null = null;
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
    private achievementAwardService: AchievementAwardService,
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

    this.achievementAwardForm = this.fb.group({
      NatureOfAchievement: ['', Validators.required],
      Classification: ['', Validators.required],
      Level: ['', Validators.required],
      AwardingBody: ['', Validators.required],
      Venue: [''],
      InclusiveDates: ['', [Validators.required, this.dateValidator()]],
      Remarks: [''],
      SupportingDocument: [''],
      Proof: [''],
      ProofType: ['file']
    });

    this.achievementAwardForm.valueChanges.subscribe(value => {
      console.log('Form values changed:', value);
    });
  }

  ngOnInit(): void {
    this.loadAchievementAwards();
  }

  loadAchievementAwards(): void {
    this.achievementAwardService.getAchievementsByUserId(this.userId).subscribe(
      (data) => {
        this.achievementAwards = data;
        this.totalPages = Math.ceil(this.achievementAwards.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      (error) => {
        if (error.status !== 404) {
          this.showToastNotification('Error fetching achievement awards data.', 'error');
        }
        console.error('Error fetching achievement awards data', error);
      }
    );
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedAchievementAwards = this.achievementAwards.slice(startIndex, endIndex);
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

  addNewAchievementAward(): void {
    this.isEditing = true;
    this.currentAchievementId = null;
    this.achievementAwardForm.reset();
    this.selectedFileName = null;
  }

  editAchievementAward(id: number): void {
    const award = this.achievementAwards.find(a => a.AchievementID === id);
    if (award) {
      console.log('Original award data:', award);
      this.isEditing = true;
      this.currentAchievementId = id;
      
      let formattedDate = award.InclusiveDates;
      if (award.InclusiveDates) {
        try {
          if (award.InclusiveDates.includes('-')) {
            const [startDate] = award.InclusiveDates.split('-').map(d => d.trim());
            const parsedDate = new Date(startDate);
            if (!isNaN(parsedDate.getTime())) {
              formattedDate = parsedDate.toISOString().split('T')[0];
            }
          } else {
            const parsedDate = new Date(award.InclusiveDates);
            if (!isNaN(parsedDate.getTime())) {
              formattedDate = parsedDate.toISOString().split('T')[0];
            }
          }
        } catch (error) {
          console.error('Error parsing date:', error);
          formattedDate = '';
        }
      }

      const formData = {
        NatureOfAchievement: award.NatureOfAchievement || '',
        Classification: award.Classification || '',
        Level: award.Level || '',
        AwardingBody: award.AwardingBody || '',
        Venue: award.Venue || '',
        InclusiveDates: formattedDate || '',
        Remarks: award.Remarks || '',
        SupportingDocument: award.SupportingDocument || '',
        Proof: award.Proof || '',
        ProofType: award.ProofType || 'file'
      };

      console.log('Setting form data:', formData);
      this.achievementAwardForm.patchValue(formData);
      
      if (award.Proof) {
        this.selectedFileName = award.Proof.split('/').pop() || null;
      }
    }
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

  onSubmit(): void {
    if (this.achievementAwardForm.invalid) {
      if (this.achievementAwardForm.get('InclusiveDates')?.errors?.['futureDate']) {
        this.showToastNotification('Date cannot be in the future.', 'warning');
        return;
      }
      if (this.achievementAwardForm.get('InclusiveDates')?.errors?.['required']) {
        this.showToastNotification('Date is required.', 'warning');
        return;
      }
      this.showToastNotification('Please fill in all required fields correctly.', 'warning');
      return;
    }

    const formData = new FormData();

    Object.keys(this.achievementAwardForm.value).forEach((key) => {
      if (key !== 'Proof' || this.achievementAwardForm.get('ProofType')?.value === 'link') {
        formData.append(key, this.achievementAwardForm.get(key)?.value || '');
      }
    });

    formData.append('UserID', this.userId.toString());

    if (this.achievementAwardForm.get('ProofType')?.value === 'file' && this.fileToUpload) {
      formData.append('proof', this.fileToUpload);
    }

    if (this.currentAchievementId) {
      this.achievementAwardService.updateAchievement(this.currentAchievementId, formData).subscribe(
        (response) => {
          this.loadAchievementAwards();
          this.resetForm();
          this.showToastNotification('Achievement award updated successfully.', 'success');
        },
        (error) => {
          this.showToastNotification('Error updating achievement award.', 'error');
          console.error('Error updating achievement award', error);
        }
      );
    } else {
      this.achievementAwardService.addAchievement(formData).subscribe(
        (response) => {
          this.loadAchievementAwards();
          this.resetForm();
          this.showToastNotification('Achievement award added successfully.', 'success');
        },
        (error) => {
          this.showToastNotification('Error adding achievement award.', 'error');
          console.error('Error adding achievement award', error);
        }
      );
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileToUpload = file;
      this.selectedFileName = file.name;
    }
  }

  deleteAchievementAward(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.achievementAwardService.deleteAchievement(this.pendingDeleteId).subscribe(
        response => {
          this.achievementAwards = this.achievementAwards.filter(award => award.AchievementID !== this.pendingDeleteId);
          this.totalPages = Math.ceil(this.achievementAwards.length / this.itemsPerPage);
          if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
          }
          this.updatePaginatedData();
          this.showToastNotification('Achievement award deleted successfully.', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('There is an error deleting the record.', 'error');
          console.error('Error deleting achievement award', error);
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      );
    }
  }

  openProofModal(proofUrl: string, supportingDocument?: string, proofType?: 'file' | 'link'): void {
    this.selectedProofUrl = proofUrl;
    this.selectedSupportingDocument = supportingDocument || 'No description available';
    this.selectedProofType = proofType || 'file';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.selectedProofUrl = null;
    this.isModalOpen = false;
  }

  resetForm(showToast: boolean = true): void {
    this.achievementAwardForm.reset();
    this.fileToUpload = null;
    this.selectedFileName = null;
    this.currentAchievementId = null;
    this.isEditing = false;
    if (showToast) {
      this.showToastNotification('Form reset', 'warning');
    }
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif)$/.test(url);
  }

  onImageError(): void {
    alert('Failed to load image. Please check the URL.');
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
          this.loadAchievementAwards();
          this.showToastNotification('Data imported successfully', 'success');
        },
        (error) => {
          this.showToastNotification('Error importing data', 'error');
          console.error('Error importing data', error);
        }
      );
    }
  }
}
