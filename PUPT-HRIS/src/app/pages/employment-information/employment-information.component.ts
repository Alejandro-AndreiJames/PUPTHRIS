import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { EmploymentInformationService } from '../../services/employment-information.service';
import { AuthService } from '../../services/auth.service';
import { EmploymentInformation } from '../../model/employment-information.model';
import { jwtDecode } from 'jwt-decode';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-employment-information',
  templateUrl: './employment-information.component.html',
  styleUrls: ['./employment-information.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe
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
      AnnualSalary: [''],
      SalaryGradeStep: [''],
      RatePerHour: [''],
      DateOfLastPromotion: [''],
      InitialYearOfTeaching: [''],
      UserID: [this.userId]
    });
  }

  ngOnInit(): void {
    this.loadEmploymentInfo();
  }

  loadEmploymentInfo(): void {
    this.employmentService.getEmploymentInfo(this.userId).subscribe({
      next: (data) => {
        this.employmentInfo = data;
        if (this.employmentInfo) {
          this.employmentForm.patchValue(this.employmentInfo);
        }
      },
      error: (error) => {
        console.error('Error fetching employment information:', error);
        this.showToastNotification('Error loading employment information', 'error');
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
