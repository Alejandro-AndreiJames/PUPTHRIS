import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
import { EducationService } from '../../services/education.service';
import { Education } from '../../model/education.model';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-education',
  templateUrl: './education.component.html',
  styleUrls: ['./education.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule]
})
export class EducationComponent implements OnInit {
  educationForm: FormGroup;
  educationData: Education[] = [];
  isEditing: boolean = false;
  currentEducationId: number | null = null;
  userId: number;
  initialFormValue: any;

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  levels: string[] = [
    'Bachelors Degree',
    'Post-Baccalaureate',
    'Masters',
    'Doctoral'
  ];

  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;

  today: string;

  meansOfSupport: string[] = [
    'Financial Assistance (Faculty Discount)',
    'Self-Supporting',
    'Scholarship Grant',
    'N/A'
  ];

  selectedSupport: string[] = [];

  constructor(private fb: FormBuilder, private educationService: EducationService, private authService: AuthService) {
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.today = new Date().toISOString().split('T')[0];

    this.educationForm = this.fb.group({
      Level: ['', Validators.required],
      NameOfSchool: ['', Validators.required],
      Course: [''],
      ThesisType: [''],
      MeansOfEducationSupport: [[], Validators.required],
      FundingAgency: [''],
      DurationOfFundingSupport: [''],
      UnitsEarned: [''],
      YearGraduated: ['', Validators.required]
    });

    this.educationForm.get('PeriodOfAttendanceFrom')?.valueChanges.subscribe(value => {
      const toControl = this.educationForm.get('PeriodOfAttendanceTo');
      if (toControl?.value && value && toControl.value < value) {
        toControl.setValue('');
      }
    });

    this.educationForm.get('Level')?.valueChanges.subscribe(level => {
      this.updateFormValidation(level);
    });
  }

  ngOnInit(): void {
    console.log('Component initialized');
    this.loadEducation();
  }

  loadEducation(): void {
    console.log('Loading education data for user:', this.userId);
    this.educationService.getEducationByUser(this.userId).subscribe({
      next: (data) => {
        console.log('Received education data:', data);
        this.educationData = data;
      },
      error: (error) => {
        console.error('Error loading education:', error);
        this.showToastNotification('Error fetching education data.', 'error');
      }
    });
  }

  toggleForm(id?: number): void {
    this.isEditing = !this.isEditing;

    if (this.isEditing && id) {
      const education = this.educationData.find(e => e.EducationID === id);
      if (education) {
        const formData = {
          ...education,
        };
        
        console.log('Setting form data:', formData);
        this.educationForm.patchValue(formData);
        this.currentEducationId = id;
        this.initialFormValue = this.educationForm.getRawValue();
      }
    } else if (this.isEditing) {
      this.educationForm.reset();
      this.currentEducationId = null;
      this.initialFormValue = this.educationForm.getRawValue();
    } else {
      if (this.hasUnsavedChanges()) {
        this.showToastNotification('The changes are not saved.', 'error');
      }
    }
  }

  onSubmit(): void {
    if (this.educationForm.invalid) {
      if (this.educationForm.errors?.['futureDate']) {
        this.showToastNotification('Please select a date not later than today.', 'warning');
        return;
      }
      this.showToastNotification('Please fill in all required fields correctly.', 'warning');
      return;
    }

    if (!this.hasUnsavedChanges()) {
      this.showToastNotification('There are no current changes to be saved.', 'warning');
      return;
    }

    // Get form data and ensure MeansOfEducationSupport is properly formatted
    const formData = { 
      ...this.educationForm.value,
      UserID: this.userId,
      // Convert array to string if needed
      MeansOfEducationSupport: Array.isArray(this.educationForm.value.MeansOfEducationSupport) 
        ? this.educationForm.value.MeansOfEducationSupport.join(',')
        : this.educationForm.value.MeansOfEducationSupport
    };

    if (this.currentEducationId) {
      this.educationService.updateEducation(this.currentEducationId, formData).subscribe({
        next: (response) => {
          this.loadEducation();
          this.isEditing = false;
          this.currentEducationId = null;
          this.showToastNotification('Information updated successfully.', 'success');
        },
        error: (error) => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error updating education', error);
        }
      });
    } else {
      this.educationService.addEducation(formData).subscribe({
        next: (response) => {
          this.loadEducation();
          this.isEditing = false;
          this.showToastNotification('Education added successfully.', 'success');
        },
        error: (error) => {
          this.showToastNotification('There is an error saving/updating the changes.', 'error');
          console.error('Error adding education', error);
        }
      });
    }
  }

  deleteEducation(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.educationService.deleteEducation(this.pendingDeleteId).subscribe(
        response => {
          this.loadEducation();
          this.showToastNotification('Education record deleted successfully.', 'error');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error => {
          this.showToastNotification('There is an error deleting the record.', 'error');
          console.error('Error deleting education', error);
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      );
    }
  }

  private hasUnsavedChanges(): boolean {
    const currentFormValue = this.educationForm.getRawValue();
    return JSON.stringify(currentFormValue) !== JSON.stringify(this.initialFormValue);
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  private dateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const selectedDate = new Date(control.value);
      const today = new Date();
      
      // Reset time part for accurate date comparison
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        return { futureDate: true };
      }
      return null;
    };
  }

  private updateFormValidation(level: string) {
    const courseControl = this.educationForm.get('Course');
    const thesisTypeControl = this.educationForm.get('ThesisType');
    const meansControl = this.educationForm.get('MeansOfEducationSupport');
    const fundingControl = this.educationForm.get('FundingAgency');
    const durationControl = this.educationForm.get('DurationOfFundingSupport');
    const unitsControl = this.educationForm.get('UnitsEarned');

    // Reset all validations first
    [courseControl, thesisTypeControl, meansControl, fundingControl, 
     durationControl, unitsControl].forEach(control => {
      control?.clearValidators();
      control?.updateValueAndValidity();
    });

    switch(level) {
      case 'Bachelors Degree':
        courseControl?.setValidators(Validators.required);
        break;
      case 'Post-Baccalaureate':
        [meansControl, fundingControl, durationControl].forEach(control => 
          control?.setValidators(Validators.required));
        break;
      case 'Masters':
        [thesisTypeControl, meansControl, fundingControl, durationControl].forEach(control => 
          control?.setValidators(Validators.required));
        break;
      case 'Doctoral':
        [thesisTypeControl, meansControl, fundingControl, durationControl, unitsControl]
          .forEach(control => control?.setValidators(Validators.required));
        break;
    }

    // Update validity
    this.educationForm.updateValueAndValidity();
  }

  onSupportChange(event: any): void {
    const value = event.target.value;
    const checked = event.target.checked;

    // Get current values and ensure it's an array
    let currentSupport: string[] = this.educationForm.get('MeansOfEducationSupport')?.value || [];
    if (!Array.isArray(currentSupport)) {
      currentSupport = [];
    }

    if (checked) {
      if (value === 'N/A') {
        currentSupport = ['N/A'];
      } else {
        currentSupport = currentSupport.filter(item => item !== 'N/A');
        if (!currentSupport.includes(value)) {
          currentSupport.push(value);
        }
      }
    } else {
      currentSupport = currentSupport.filter(item => item !== value);
    }

    // Update form control
    this.educationForm.patchValue({
      MeansOfEducationSupport: currentSupport
    });
  }

  isChecked(support: string): boolean {
    const currentSupport: string[] = this.educationForm.get('MeansOfEducationSupport')?.value || [];
    return Array.isArray(currentSupport) && currentSupport.includes(support);
  }

  loadEducationData(education: Education): void {
    if (education.MeansOfEducationSupport) {
      let supportArray: string[] = [];
      
      if (typeof education.MeansOfEducationSupport === 'string') {
        supportArray = education.MeansOfEducationSupport.split(',').map(s => s.trim());
      } else if (Array.isArray(education.MeansOfEducationSupport)) {
        supportArray = education.MeansOfEducationSupport;
      }

      this.educationForm.patchValue({
        MeansOfEducationSupport: supportArray
      });
    }
  }
}
