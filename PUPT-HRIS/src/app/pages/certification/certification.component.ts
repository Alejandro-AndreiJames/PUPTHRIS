import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CertificationService } from '../../services/certification.service';
import { AuthService } from '../../services/auth.service';
import { Certification } from '../../model/certification.model';
import { jwtDecode } from 'jwt-decode';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-certification',
  templateUrl: './certification.component.html',
  styleUrls: ['./certification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe
  ]
})
export class CertificationComponent implements OnInit {
  certifications: Certification[] = [];
  certificationForm: FormGroup;
  isEditing = false;
  editingId: number | null = null;
  userId: number;
  
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  constructor(
    private fb: FormBuilder,
    private certificationService: CertificationService,
    private authService: AuthService
  ) {
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.certificationForm = this.fb.group({
      Name: ['', Validators.required],
      IssuingOrganization: ['', Validators.required],
      IssueDate: [''],
      ExpirationDate: [''],
      CredentialID: [''],
      CredentialURL: [''],
      UserID: [this.userId]
    });
  }

  ngOnInit(): void {
    this.loadCertifications();
  }

  loadCertifications(): void {
    this.certificationService.getCertifications(this.userId).subscribe({
      next: (data) => {
        this.certifications = data;
      },
      error: (error) => {
        console.error('Error fetching certifications:', error);
        this.showToastNotification('Error loading certifications', 'error');
      }
    });
  }

  addNew(): void {
    this.isEditing = true;
    this.editingId = null;
    this.certificationForm.reset({ UserID: this.userId });
  }

  edit(certification: Certification): void {
    this.isEditing = true;
    this.editingId = certification.CertificationID!;
    this.certificationForm.patchValue(certification);
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingId = null;
    this.certificationForm.reset();
  }

  onSubmit(): void {
    if (this.certificationForm.valid) {
      const formData = this.certificationForm.value;
      formData.UserID = this.userId;

      if (this.editingId) {
        this.certificationService.updateCertification(this.editingId, formData).subscribe({
          next: () => {
            this.loadCertifications();
            this.isEditing = false;
            this.editingId = null;
            this.showToastNotification('Certification updated successfully', 'success');
          },
          error: (error) => {
            console.error('Error updating certification:', error);
            this.showToastNotification('Error updating certification', 'error');
          }
        });
      } else {
        this.certificationService.addCertification(formData).subscribe({
          next: () => {
            this.loadCertifications();
            this.isEditing = false;
            this.showToastNotification('Certification added successfully', 'success');
          },
          error: (error) => {
            console.error('Error adding certification:', error);
            this.showToastNotification('Error adding certification', 'error');
          }
        });
      }
    }
  }

  delete(id: number): void {
    if (confirm('Are you sure you want to delete this certification?')) {
      this.certificationService.deleteCertification(id).subscribe({
        next: () => {
          this.loadCertifications();
          this.showToastNotification('Certification deleted successfully', 'success');
        },
        error: (error) => {
          console.error('Error deleting certification:', error);
          this.showToastNotification('Error deleting certification', 'error');
        }
      });
    }
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
