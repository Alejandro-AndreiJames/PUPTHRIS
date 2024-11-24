import { Component, OnInit } from '@angular/core';
import { CollegeCampusService } from '../../services/college-campus.service';
import { CollegeCampus } from '../../model/college-campus.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-college-campus-management',
  templateUrl: './college-campus-management.component.html',
  styleUrls: ['./college-campus-management.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class CollegeCampusManagementComponent implements OnInit {
  campuses: CollegeCampus[] = [];
  modalForm: FormGroup;
  isEditing: boolean = false;
  currentCampusId: number | null = null;
  showModal: boolean = false;

  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';

  constructor(
    private collegeCampusService: CollegeCampusService,
    private fb: FormBuilder
  ) {
    this.modalForm = this.fb.group({
      Name: ['', [Validators.required, Validators.maxLength(100)]],
      Description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    this.loadCampuses();
  }

  loadCampuses(): void {
    this.collegeCampusService.getCollegeCampuses().subscribe(
      (data) => {
        this.campuses = data;
      },
      (error) => {
        this.showToastNotification('Error fetching college campuses', 'error');
        console.error('Error fetching college campuses', error);
      }
    );
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentCampusId = null;
    this.modalForm.reset();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.currentCampusId = null;
    this.modalForm.reset();
  }

  onModalSubmit(): void {
    if (this.modalForm.invalid) {
      this.showToastNotification('Please fill out all required fields.', 'warning');
      return;
    }

    const campus: CollegeCampus = this.modalForm.value;

    if (this.isEditing && this.currentCampusId !== null) {
      this.collegeCampusService.updateCollegeCampus(this.currentCampusId, campus).subscribe(
        () => {
          this.loadCampuses();
          this.closeModal();
          this.showToastNotification('College campus updated successfully', 'success');
        },
        (error) => {
          this.showToastNotification('Error updating college campus', 'error');
          console.error('Error updating college campus', error);
        }
      );
    } else {
      this.collegeCampusService.addCollegeCampus(campus).subscribe(
        () => {
          this.loadCampuses();
          this.closeModal();
          this.showToastNotification('College campus added successfully', 'success');
        },
        (error) => {
          this.showToastNotification('Error adding college campus', 'error');
          console.error('Error adding college campus', error);
        }
      );
    }
  }

  editCampus(campus: CollegeCampus): void {
    this.isEditing = true;
    this.currentCampusId = campus.CollegeCampusID ?? null;
    this.modalForm.patchValue(campus);
    this.showModal = true;
  }

  deleteCampus(id: number | undefined): void {
    if (id === undefined) {
      this.showToastNotification('Invalid campus ID', 'error');
      return;
    }

    if (confirm('Are you sure you want to delete this college campus?')) {
      this.collegeCampusService.deleteCollegeCampus(id).subscribe(
        () => {
          this.loadCampuses();
          this.showToastNotification('College campus deleted successfully', 'success');
        },
        (error) => {
          this.showToastNotification('Error deleting college campus', 'error');
          console.error('Error deleting college campus', error);
        }
      );
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
