import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { ObservationScheduleService, ObservationSchedule } from '../../services/observation-schedule.service';
import { AuthService } from '../../services/auth.service';
import { CampusContextService } from '../../services/campus-context.service';

@Component({
  selector: 'app-observation-schedule',
  templateUrl: './observation-schedule.component.html',
  styleUrls: ['./observation-schedule.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class ObservationScheduleComponent implements OnInit {
  scheduleForm: FormGroup = this.initializeForm();
  schedules: ObservationSchedule[] = [];
  userId: number = 0;
  userRole: string = '';
  isFaculty: boolean = false;
  isAdmin: boolean = false;
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  campusId: number | null = null;
  academicYears: string[] = [];
  currentAcademicYear: string = '';
  showCriteria: boolean = false;
  showScheduleForm: boolean = false;
  isLoading: boolean = true;
  showDeletePrompt: boolean = false;
  scheduleToDelete: number | null = null;

  constructor(
    private fb: FormBuilder,
    private scheduleService: ObservationScheduleService,
    private authService: AuthService,
    private campusContextService: CampusContextService
  ) {
    // Get user info from JWT token
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
      this.userRole = decoded.role;
      
      // Check if roles is an array and includes 'faculty'
      if (Array.isArray(decoded.roles)) {
        this.isFaculty = decoded.roles.includes('faculty');
      } else {
        // If roles is a single string, check if it equals 'faculty'
        this.isFaculty = decoded.role === 'faculty';
      }
      
      // Similarly for admin
      if (Array.isArray(decoded.roles)) {
        this.isAdmin = decoded.roles.includes('admin') || decoded.roles.includes('superadmin');
      } else {
        this.isAdmin = decoded.role === 'admin' || decoded.role === 'superadmin';
      }

      console.log('User Role:', this.userRole);
      console.log('Is Faculty:', this.isFaculty);
      console.log('Token Decoded:', decoded);
    }

    // Generate academic years (current year and next 2 years)
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 3; i++) {
      const year = currentYear + i;
      this.academicYears.push(`${year}-${year + 1}`);
    }
    this.currentAcademicYear = `${currentYear}-${currentYear + 1}`;

    this.scheduleForm = this.initializeForm();

    // Get campus ID
    this.campusId = this.campusContextService.getCurrentCampusId();
  }

  private initializeForm(): FormGroup {
    return this.fb.group({
      Topic: ['', Validators.required],
      Subject: ['', Validators.required],
      RoomNumber: ['', Validators.required],
      ScheduledDate: ['', Validators.required],
      StartTime: ['', Validators.required],
      EndTime: ['', Validators.required],
      AcademicYear: [this.currentAcademicYear, Validators.required],
      Semester: ['1st', Validators.required],
      FacultyID: [this.userId],
      CollegeCampusID: [this.campusId]
    });
  }

  onSubmit(): void {
    if (this.scheduleForm.valid) {
      const formData = {
        ...this.scheduleForm.value,
        FacultyID: this.userId,
        CollegeCampusID: this.campusId
      };

      this.scheduleService.createSchedule(formData).subscribe({
        next: (response) => {
          this.loadSchedules();
          this.scheduleForm.reset({
            Semester: '1st',
            AcademicYear: '2023-2024',
            FacultyID: this.userId
          });
          this.showToastNotification('Schedule created successfully', 'success');
        },
        error: (error) => {
          console.error('Error creating schedule:', error);
          this.showToastNotification('Error creating schedule', 'error');
        }
      });
    } else {
      this.showToastNotification('Please fill in all required fields', 'warning');
    }
  }

  private loadSchedules(): void {
    this.isLoading = true;
    if (this.isAdmin) {
      this.scheduleService.getAllSchedules().subscribe({
        next: (response) => {
          this.schedules = response.data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading schedules:', error);
          this.showToastNotification('Error loading schedules', 'error');
          this.schedules = [];
          this.isLoading = false;
        }
      });
    } else if (this.isFaculty) {
      this.scheduleService.getFacultySchedules(this.userId).subscribe({
        next: (response) => {
          this.schedules = response.data;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading faculty schedules:', error);
          this.showToastNotification('Error loading your schedules', 'error');
          this.schedules = [];
          this.isLoading = false;
        }
      });
    }
  }

  deleteSchedule(scheduleId: number): void {
    this.scheduleToDelete = scheduleId;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.scheduleToDelete = null;
  }

  confirmDelete(): void {
    if (this.scheduleToDelete) {
      this.scheduleService.deleteSchedule(this.scheduleToDelete).subscribe({
        next: () => {
          this.loadSchedules();
          this.showToastNotification('Schedule deleted successfully', 'success');
          this.showDeletePrompt = false;
          this.scheduleToDelete = null;
        },
        error: (error) => {
          console.error('Error deleting schedule:', error);
          this.showToastNotification('Error deleting schedule', 'error');
          this.showDeletePrompt = false;
          this.scheduleToDelete = null;
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

  updateStatus(scheduleId: number, newStatus: 'Pending' | 'Completed' | 'Cancelled'): void {
    this.scheduleService.updateScheduleStatus(scheduleId, newStatus).subscribe({
      next: () => {
        this.loadSchedules();
        this.showToastNotification(`Status updated to ${newStatus}`, 'success');
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.showToastNotification('Error updating status', 'error');
      }
    });
  }

  toggleCriteria() {
    this.showCriteria = !this.showCriteria;
  }

  toggleScheduleForm() {
    this.showScheduleForm = !this.showScheduleForm;
  }

  ngOnInit(): void {
    this.loadSchedules();

    // Subscribe to campus changes
    this.campusContextService.getCampusId().subscribe(campusId => {
      this.campusId = campusId;
      this.loadSchedules();
    });
  }
}
