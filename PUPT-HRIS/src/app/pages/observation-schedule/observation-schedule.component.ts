import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { jwtDecode } from 'jwt-decode';
import { ObservationScheduleService, ObservationSchedule } from '../../services/observation-schedule.service';
import { AuthService } from '../../services/auth.service';
import { CampusContextService } from '../../services/campus-context.service';
import { CalendarViewComponent } from '../../calendar-view/calendar-view.component';

@Component({
  selector: 'app-observation-schedule',
  templateUrl: './observation-schedule.component.html',
  styleUrls: ['./observation-schedule.component.css'],
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    CalendarViewComponent
  ]
})
export class ObservationScheduleComponent implements OnInit, OnDestroy {
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
  selectedStatus: string = '';
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' }
  ];
  sortBy: string = 'date';
  sortOrder: string = 'asc';
  sortOptions = [
    { value: 'date', label: 'Sort by Date' },
    { value: 'time', label: 'Sort by Time' },
    { value: 'status', label: 'Sort by Status' }
  ];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  paginatedSchedules: any[] = [];
  selectedAcademicYear: string = '';
  selectedSemester: string = '';
  searchName: string = '';
  private searchDebounce: any;
  isEditing: boolean = false;
  editingSchedule: ObservationSchedule | null = null;
  viewMode: 'table' | 'calendar' = 'table';
  totalPagesArray: number[] = [];
  semesterOptions = [
    { value: '', label: 'All Semesters' },
    { value: 'First Semester', label: 'First Semester' },
    { value: 'Second Semester', label: 'Second Semester' }
  ];

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
    }

    // Generate academic years dynamically
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11 where 0 is January

    // If we're in the latter half of the year (July onwards), 
    // start from current year, otherwise start from previous year
    const startYear = currentMonth >= 6 ? currentYear : currentYear - 1;

    // Generate 4 academic years (current + 3 future years)
    this.academicYears = [];
    for (let i = 0; i < 4; i++) {
      const year = startYear + i;
      this.academicYears.push(`${year}-${year + 1}`);
    }

    // Set current academic year based on date
    this.currentAcademicYear = `${startYear}-${startYear + 1}`;

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
      Semester: ['First Semester', Validators.required],
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

      if (this.isEditing && this.editingSchedule?.ScheduleID) {
        // Update existing schedule
        this.scheduleService.updateSchedule(this.editingSchedule.ScheduleID, formData)
          .subscribe({
            next: (response) => {
              this.closeScheduleModal();
              this.loadSchedules();
              this.showToastNotification('Schedule updated successfully', 'success');
            },
            error: (error) => {
              this.showToastNotification('Error updating schedule', 'error');
            }
          });
      } else {
        // Create new schedule
        this.scheduleService.createSchedule(formData)
          .subscribe({
            next: (response) => {
              this.closeScheduleModal();
              this.loadSchedules();
              this.showToastNotification('Schedule created successfully', 'success');
            },
            error: (error) => {
              this.showToastNotification('Error creating schedule', 'error');
            }
          });
      }
    }
  }

  private loadSchedules(): void {
    this.isLoading = true;
    
    if (this.isAdmin) {
      this.scheduleService.getAllSchedules(
        this.selectedStatus,
        this.sortBy,
        this.sortOrder,
        this.selectedAcademicYear,
        this.selectedSemester,
        this.searchName
      ).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.schedules = response.data;
            this.totalPages = Math.ceil(this.schedules.length / this.itemsPerPage);
            this.totalPagesArray = Array.from({length: this.totalPages}, (_, i) => i + 1);
          } else {
            this.schedules = [];
            this.totalPages = 0;
            this.totalPagesArray = [];
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.showToastNotification('Error loading schedules', 'error');
          this.schedules = [];
          this.isLoading = false;
        }
      });
    } else if (this.isFaculty) {
      this.scheduleService.getFacultySchedules(
        this.userId,
        this.selectedAcademicYear,
        this.selectedSemester
      ).subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.schedules = response.data;
            this.totalPages = Math.ceil(this.schedules.length / this.itemsPerPage);
            this.totalPagesArray = Array.from({length: this.totalPages}, (_, i) => i + 1);
          } else {
            this.schedules = [];
            this.totalPages = 0;
            this.totalPagesArray = [];
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.showToastNotification('Error loading schedules', 'error');
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

  downloadPdf(schedule: ObservationSchedule): void {
    if (!schedule.EvaluationID) {
      this.showToastNotification('No evaluation available for this schedule', 'warning');
      return;
    }

    this.scheduleService.generatePdf(schedule.EvaluationID).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Create descriptive filename
        const facultyName = schedule.Faculty?.LastName || 'Unknown';
        const academicYear = schedule.AcademicYear?.replace('-', '_') || 'Unknown';
        const semester = schedule.Semester?.replace(' ', '') || 'Unknown';
        const filename = `${facultyName}_${academicYear}_${semester}_evaluation.pdf`;
        
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showToastNotification('PDF downloaded successfully', 'success');
      },
      error: (error) => {
        this.showToastNotification('Error downloading PDF', 'error');
      }
    });
  }

  onStatusChange(): void {
    this.currentPage = 1; // Reset to first page when status changes
    this.loadSchedules();
  }

  onSortChange(): void {
    this.loadSchedules();
  }

  ngOnInit(): void {
    this.loadSchedules();

    // Subscribe to campus changes
    this.campusContextService.getCampusId().subscribe(campusId => {
      this.campusId = campusId;
      this.loadSchedules();
    });
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  editSchedule(schedule: any): void {
    this.isEditing = true;
    this.editingSchedule = { ...schedule };
    
    // Format the date properly
    const formattedDate = schedule.Date ? new Date(schedule.Date).toISOString().split('T')[0] : '';

    // Handle the time range
    let startTime = '';
    let endTime = '';
    if (schedule.Time) {
      [startTime, endTime] = schedule.Time.split(' - ');
    }

    // Populate the form with existing data
    this.scheduleForm.patchValue({
      Topic: schedule.Topic,
      Subject: schedule.Subject,
      RoomNumber: schedule.Room,
      ScheduledDate: formattedDate,
      StartTime: startTime.trim(),
      EndTime: endTime.trim(),
      AcademicYear: schedule.AcademicYear,
      Semester: schedule.Semester
    });

    // Open the modal
    (document.getElementById('schedule-modal') as HTMLDialogElement).showModal();
  }

  private resetForm(): void {
    this.scheduleForm.reset({
      Semester: '1st',
      AcademicYear: this.currentAcademicYear
    });
    this.isEditing = false;
    this.editingSchedule = null;
    this.showScheduleForm = false;
  }

  get formTitle(): string {
    return this.isEditing ? 'Edit Observation Schedule' : 'Create New Schedule';
  }

  changeView(view: 'table' | 'calendar'): void {
    this.viewMode = view;
  }

  openScheduleModal() {
    (document.getElementById('schedule-modal') as HTMLDialogElement).showModal();
  }

  closeScheduleModal() {
    (document.getElementById('schedule-modal') as HTMLDialogElement).close();
    this.resetForm();
  }

  onSearchChange(): void {
    // Clear any existing timeout
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    // Set a new timeout to delay the search
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1; // Reset to first page when search changes
      this.loadSchedules();
    }, 300); // 300ms delay
  }

  onFilterChange(): void {
    this.currentPage = 1; // Reset to first page when filters change
    this.loadSchedules();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadSchedules();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadSchedules();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadSchedules();
    }
  }
}
