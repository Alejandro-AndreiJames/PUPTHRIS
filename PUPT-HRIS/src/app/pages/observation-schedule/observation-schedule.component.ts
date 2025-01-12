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
      AcademicYear: ['2023-2024', Validators.required],
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
    if (this.isAdmin) {
      this.loadAllSchedules();
    } else if (this.isFaculty) {
      this.loadFacultySchedules();
    }
  }

  loadAllSchedules(): void {
    this.scheduleService.getAllSchedules().subscribe({
      next: (response) => {
        this.schedules = response.data;
      },
      error: (error) => {
        console.error('Error loading schedules:', error);
        this.showToastNotification('Error loading schedules', 'error');
      }
    });
  }

  loadFacultySchedules(): void {
    this.scheduleService.getFacultySchedules(this.userId).subscribe({
      next: (response) => {
        this.schedules = response.data;
      },
      error: (error) => {
        console.error('Error loading faculty schedules:', error);
        this.showToastNotification('Error loading your schedules', 'error');
      }
    });
  }

  deleteSchedule(id: number): void {
    if (confirm('Are you sure you want to delete this schedule?')) {
      this.scheduleService.deleteSchedule(id).subscribe({
        next: () => {
          this.loadSchedules();
          this.showToastNotification('Schedule deleted successfully', 'success');
        },
        error: (error) => {
          console.error('Error deleting schedule:', error);
          this.showToastNotification('Error deleting schedule', 'error');
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

  ngOnInit(): void {
    this.loadSchedules();

    // Subscribe to campus changes
    this.campusContextService.getCampusId().subscribe(campusId => {
      this.campusId = campusId;
      this.loadSchedules();
    });
  }
}
