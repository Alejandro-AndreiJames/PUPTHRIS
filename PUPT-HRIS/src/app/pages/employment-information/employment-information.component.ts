import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { EmploymentInformationService } from '../../services/employment-information.service';
import { AuthService } from '../../services/auth.service';
import { EmploymentInformation } from '../../model/employment-information.model';
import { jwtDecode } from 'jwt-decode';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-employment-information',
  templateUrl: './employment-information.component.html',
  styleUrls: ['./employment-information.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe
  ]
})
export class EmploymentInformationComponent implements OnInit {
  employmentInfo: EmploymentInformation | null = null;
  employmentForm: FormGroup;
  isEditing = false;
  userId: number;
  
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  constructor(
    private fb: FormBuilder,
    private employmentService: EmploymentInformationService,
    private authService: AuthService
  ) {
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.employmentForm = this.fb.group({
      AnnualSalary: ['', [Validators.required, Validators.min(0)]],
      SalaryGradeStep: ['', Validators.required],
      RatePerHour: ['', [Validators.required, Validators.min(0)]],
      DateOfLastPromotion: ['', Validators.required],
      InitialYearOfTeaching: ['', [Validators.required, Validators.max(new Date().getFullYear())]],
      UserID: [this.userId]
    });
  }

  ngOnInit(): void {
    this.loadEmploymentInfo();
  }

  loadEmploymentInfo(): void {
    this.employmentService.getEmploymentInfo(this.userId).subscribe({
      next: (data: any) => {
        if (data) {
          this.employmentInfo = data;
        } else {
          // Data is null/undefined but this is an expected state
          this.employmentInfo = null;
        }
      },
      error: (error) => {
        // Only show error toast for actual errors, not for 404 (not found)
        if (error.status !== 404) {
          this.showErrorToast('Error fetching employment information');
        }
      }
    });
  }

  edit(): void {
    this.isEditing = true;
  }

  cancelEdit(): void {
    this.isEditing = false;
    if (this.employmentInfo) {
      this.employmentForm.patchValue(this.employmentInfo);
    } else {
      this.employmentForm.reset();
    }
  }

  onSubmit(): void {
    if (this.employmentForm.valid) {
      const formData = this.employmentForm.value;
      
      const hasValue = Object.values(formData).some(value => 
        value !== '' && value !== 0 && value !== null && value !== this.userId
      );

      if (!hasValue) {
        this.showToastNotification('Please fill in at least one field', 'warning');
        return;
      }

      formData.UserID = this.userId;

      if (this.employmentInfo) {
        this.employmentService.updateEmploymentInfo(this.userId, formData).subscribe({
          next: (updatedInfo) => {
            this.employmentInfo = updatedInfo;
            this.isEditing = false;
            this.showToastNotification('Employment information updated successfully', 'success');
          },
          error: (error) => {
            console.error('Error updating employment information:', error);
            this.showToastNotification('Error updating employment information', 'error');
          }
        });
      } else {
        this.employmentService.addEmploymentInfo(formData).subscribe({
          next: (newInfo) => {
            this.employmentInfo = newInfo;
            this.isEditing = false;
            this.showToastNotification('Employment information added successfully', 'success');
          },
          error: (error) => {
            console.error('Error adding employment information:', error);
            this.showToastNotification('Error adding employment information', 'error');
          }
        });
      }
    } else {
      this.showToastNotification('Please fill in all required fields correctly', 'error');
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

  private cleanCurrencyValue(value: string | number | null | undefined): number | null {
    if (!value) return null;
    const cleanValue = value.toString().replace(/[^\d.-]/g, '');
    return parseFloat(cleanValue);
  }

  showErrorToast(message: string) {
    this.toastMessage = message;
    this.toastType = 'error';
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
