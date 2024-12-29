import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ProfessionalLicenseService } from '../../services/professional-license.service';
import { AuthService } from '../../services/auth.service';
import { ProfessionalLicense } from '../../model/professional-license.model';
import { jwtDecode } from 'jwt-decode';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-professional-license',
  templateUrl: './professional-license.component.html',
  styleUrls: ['./professional-license.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe
  ]
})
export class ProfessionalLicenseComponent implements OnInit {
  professionalLicense: ProfessionalLicense | null = null;
  professionalLicenseForm: FormGroup;
  isEditing = false;
  userId: number;
  
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  constructor(
    private fb: FormBuilder,
    private professionalLicenseService: ProfessionalLicenseService,
    private authService: AuthService
  ) {
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.professionalLicenseForm = this.fb.group({
      ProfessionalLicenseEarned: ['', Validators.required],
      YearObtained: ['', Validators.required],
      ExpirationDate: [''],
      UserID: [this.userId]
    });
  }

  ngOnInit(): void {
    this.loadProfessionalLicense();
  }

  loadProfessionalLicense(): void {
    this.professionalLicenseService.getProfessionalLicenses(this.userId).subscribe({
      next: (data) => {
        this.professionalLicense = data.length > 0 ? data[0] : null;
        if (this.professionalLicense) {
          this.professionalLicenseForm.patchValue(this.professionalLicense);
        }
      },
      error: (error) => {
        console.error('Error fetching professional license:', error);
        this.showToastNotification('Error loading professional license', 'error');
      }
    });
  }

  edit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.professionalLicense) {
      this.professionalLicenseForm.patchValue(this.professionalLicense);
    } else {
      this.professionalLicenseForm.reset();
    }
  }

  onSubmit(): void {
    if (this.professionalLicenseForm.valid) {
      const formData = this.professionalLicenseForm.value;
      formData.UserID = this.userId;

      if (this.professionalLicense?.LicenseID) {
        this.professionalLicenseService.updateProfessionalLicense(
          this.professionalLicense.LicenseID, 
          formData
        ).subscribe({
          next: (updatedLicense) => {
            this.professionalLicense = updatedLicense;
            this.isEditing = false;
            this.showToastNotification('Professional license updated successfully', 'success');
          },
          error: (error) => {
            console.error('Error updating professional license:', error);
            this.showToastNotification('Error updating professional license', 'error');
          }
        });
      } else {
        this.professionalLicenseService.addProfessionalLicense(formData).subscribe({
          next: (newLicense) => {
            this.professionalLicense = newLicense;
            this.isEditing = false;
            this.showToastNotification('Professional license added successfully', 'success');
          },
          error: (error) => {
            console.error('Error adding professional license:', error);
            this.showToastNotification('Error adding professional license', 'error');
          }
        });
      }
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