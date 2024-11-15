import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { OfficershipMembershipService } from '../../services/officership-membership.service';
import { AuthService } from '../../services/auth.service';
import { ExcelImportService } from '../../services/excel-import.service';
import { CommonModule } from '@angular/common';
import { jwtDecode } from 'jwt-decode';
import { OfficershipMembership } from '../../model/officership-membership.model';

@Component({
  selector: 'app-officership-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class OfficershipMembershipComponent implements OnInit {
  membershipForm: FormGroup;
  memberships: OfficershipMembership[] = [];
  paginatedMemberships: OfficershipMembership[] = [];
  isEditing: boolean = false;
  currentMembershipId: number | null = null;
  userId: number;
  fileToUpload: File | null = null;
  selectedFileName: string | null = null;
  selectedProofUrl: string | null = null;
  selectedSupportingDocument: string | null = null;
  selectedProofType: 'file' | 'link' | null = null;
  isModalOpen: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;

  today: string;

  constructor(
    private fb: FormBuilder,
    private membershipService: OfficershipMembershipService,
    private authService: AuthService,
    private excelImportService: ExcelImportService,
    private cdr: ChangeDetectorRef
  ) {
    this.today = new Date().toISOString().split('T')[0];

    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.membershipForm = this.fb.group({
      OrganizationName: ['', Validators.required],
      OrganizationAddress: [''],
      Position: ['', Validators.required],
      Level: ['Local'],
      Classification: ['Learning and Development Interventions', Validators.required],
      InclusiveDatesFrom: ['', [Validators.required, this.dateValidator()]],
      InclusiveDatesTo: ['', [Validators.required, this.dateValidator(), this.dateRangeValidator()]],
      Remarks: [''],
      SupportingDocument: [''],
      Proof: [''],
      ProofType: ['file']
    });

    this.membershipForm.get('InclusiveDatesFrom')?.valueChanges.subscribe(() => {
      this.membershipForm.get('InclusiveDatesTo')?.updateValueAndValidity();
    });
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
      const fromDate = new Date(this.membershipForm?.get('InclusiveDatesFrom')?.value);

      if (fromDate && toDate < fromDate) {
        return { invalidDateRange: true };
      }
      return null;
    };
  }

  ngOnInit(): void {
    this.loadMemberships();
  }

  loadMemberships(): void {
    this.membershipService.getMembershipsByUserId(this.userId).subscribe({
      next: (data) => {
        this.memberships = data || [];
        this.totalPages = Math.ceil(this.memberships.length / this.itemsPerPage);
        this.updatePaginatedData();
      },
      error: (error) => {
        if (error.status !== 404) {
          this.showToastNotification('Error fetching officership/membership data.', 'error');
          console.error('Error fetching officership/membership data', error);
        }
        this.memberships = [];
        this.paginatedMemberships = [];
        this.totalPages = 0;
      }
    });
  }

  updatePaginatedData(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMemberships = this.memberships.slice(startIndex, endIndex);
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

  addNewMembership(): void {
    this.resetForm(false);
    this.isEditing = true;
  }

  editMembership(id: number): void {
    const membership = this.memberships.find(m => m.OfficershipMembershipID === id);
    if (membership) {
      this.isEditing = true;
      this.currentMembershipId = id;

      const formData = {
        ...membership,
        InclusiveDatesFrom: membership.InclusiveDatesFrom ? new Date(membership.InclusiveDatesFrom).toISOString().split('T')[0] : '',
        InclusiveDatesTo: membership.InclusiveDatesTo ? new Date(membership.InclusiveDatesTo).toISOString().split('T')[0] : ''
      };

      this.membershipForm.patchValue(formData);
    }
  }

  onSubmit(): void {
    if (this.membershipForm.invalid) {
      if (this.membershipForm.get('InclusiveDatesFrom')?.errors?.['futureDate'] || 
          this.membershipForm.get('InclusiveDatesTo')?.errors?.['futureDate']) {
        this.showToastNotification('Dates cannot be in the future.', 'warning');
        return;
      }
      if (this.membershipForm.get('InclusiveDatesTo')?.errors?.['invalidDateRange']) {
        this.showToastNotification('End date must be after start date.', 'warning');
        return;
      }
      this.showToastNotification('Please fill in all required fields correctly.', 'warning');
      return;
    }

    const formData = new FormData();

    Object.keys(this.membershipForm.value).forEach((key) => {
      if (key !== 'Proof' || this.membershipForm.get('ProofType')?.value === 'link') {
        formData.append(key, this.membershipForm.get(key)?.value || '');
      }
    });

    formData.append('UserID', this.userId.toString());

    if (this.membershipForm.get('ProofType')?.value === 'file' && this.fileToUpload) {
      formData.append('proof', this.fileToUpload);
    }

    if (this.currentMembershipId) {
      this.membershipService.updateMembership(this.currentMembershipId, formData).subscribe(
        (response) => {
          this.loadMemberships();
          this.resetForm();
          this.showToastNotification('Officership/Membership updated successfully.', 'success');
        },
        (error) => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
        }
      );
    } else {
      this.membershipService.addMembership(formData).subscribe(
        (response) => {
          this.loadMemberships();
          this.resetForm();
          this.showToastNotification('Officership/Membership added successfully.', 'success');
        },
        (error) => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
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

  deleteMembership(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.membershipService.deleteMembership(this.pendingDeleteId).subscribe(
        response => {
          this.memberships = this.memberships.filter(m => m.OfficershipMembershipID !== this.pendingDeleteId);
          this.totalPages = Math.ceil(this.memberships.length / this.itemsPerPage);
          if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
          }
          this.updatePaginatedData();
          this.showToastNotification('Officership/Membership deleted successfully.', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('Error deleting officership/membership.', 'error');
          console.error('Error deleting officership/membership', error);
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
    this.membershipForm.reset();
    this.fileToUpload = null;
    this.selectedFileName = null;
    this.currentMembershipId = null;
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
          this.loadMemberships();
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
