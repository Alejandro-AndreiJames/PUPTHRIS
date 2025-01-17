import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { Ticket } from '../../model/ticket.model';
import { FormsModule } from '@angular/forms';

interface FilterOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent implements OnInit {
  ticketForm: FormGroup;
  responseForm: FormGroup;
  selectedTicket: Ticket | null = null;
  isSubmitting = false;
  isLoading = false;
  error = '';
  formType: 'help' | 'issue' = 'help';
  showSuccessToast = false;
  isSuperAdmin = false;
  tickets: { [key: string]: any } = {};
  statusFilter: string = '';
  priorityFilter: string = '';
  showDeletePrompt: boolean = false;
  pendingDeleteId: number | null = null;
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';

  // Define filter options
  statusOptions: FilterOption[] = [
    { label: 'All Status', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' }
  ];

  priorityOptions: FilterOption[] = [
    { label: 'All Priority', value: '' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ];

  activeFilters: { [key: string]: string } = {};
  debounceTimer: any;

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    private authService: AuthService
  ) {
    this.isSuperAdmin = this.authService.hasRole('superadmin');
    
    this.ticketForm = this.fb.group({
      Subject: ['', [Validators.required]],
      Description: ['', [Validators.required]]
    });

    this.responseForm = this.fb.group({
      Status: ['in-progress', Validators.required],
      Priority: ['medium', Validators.required],
      Response: ['', Validators.required]
    });
  }

  ngOnInit() {
    if (this.isSuperAdmin) {
      this.loadAllTickets();
    }
  }

  private loadAllTickets() {
    this.isLoading = true;

    this.ticketService.getAllTickets().subscribe({
      next: (response) => {
        
        if (response && response.data) {
          this.tickets = response.data;
        } else {
          this.tickets = {};
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tickets:', error);
        this.error = 'Failed to load tickets';
        this.isLoading = false;
        this.tickets = {};
      }
    });
  }

  getTicketsArray(): any[] {
    return Object.values(this.tickets) || [];
  }

  showForm(type: 'help' | 'issue'): void {
    this.formType = type;
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    if (dialog) {
      dialog.showModal();
    }
  }

  closeDialog(): void {
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    if (dialog) {
      dialog.close();
    }
    this.ticketForm.reset();
    this.error = '';
  }

  onSubmit(): void {
    if (this.ticketForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.error = '';

      this.ticketService.createTicket(this.ticketForm.value).subscribe({
        next: () => {
          this.closeDialog();
          this.showSuccessToast = true;
          this.isSubmitting = false;
          this.ticketForm.reset();
          setTimeout(() => {
            this.showSuccessToast = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error submitting ticket:', error);
          this.error = 'Failed to submit. Please try again.';
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  respondToTicket(ticket: Ticket): void {
    this.selectedTicket = ticket;
    const dialog = document.querySelector('#responseDialog') as HTMLDialogElement;
    if (dialog) {
      this.responseForm.patchValue({
        Status: ticket.Status,
        Priority: ticket.Priority,
        Response: ticket.Response || ''
      });
      dialog.showModal();
    }
  }

  submitResponse() {
    if (this.responseForm.valid && this.selectedTicket?.TicketID) {
      this.isSubmitting = true;
      const updateData = {
        ...this.responseForm.value,
        TicketID: this.selectedTicket.TicketID
      };

      this.ticketService.updateTicket(Number(this.selectedTicket.TicketID), updateData).subscribe({
        next: (response) => {
          this.loadAllTickets();
          this.closeResponseDialog();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error updating ticket:', error);
          this.error = 'Failed to update ticket';
          this.isSubmitting = false;
        }
      });
    }
  }

  closeResponseDialog() {
    const dialog = document.querySelector('#ticketDetailsDialog') as HTMLDialogElement;
    if (dialog) {
      dialog.close();
      this.selectedTicket = null;
      this.responseForm.reset({
        Status: 'in-progress',
        Priority: 'medium',
        Response: ''
      });
    }
  }

  viewTicketDetails(ticket: any): void {
    this.selectedTicket = ticket;
    const dialog = document.querySelector('#ticketDetailsDialog') as HTMLDialogElement;
    if (dialog) {
      this.responseForm.patchValue({
        Status: ticket.Status,
        Priority: ticket.Priority,
        Response: ticket.Response || ''
      });
      dialog.showModal();
    }
  }

  applyFilter(filterType: string, value: string): void {
    if (value) {
      this.activeFilters[filterType] = value;
    } else {
      delete this.activeFilters[filterType];
    }

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer for 300ms debounce
    this.debounceTimer = setTimeout(() => {
      this.loadFilteredTickets();
    }, 300);
  }

  private loadFilteredTickets(): void {
    this.isLoading = true;
    this.ticketService.getFilteredTickets(this.activeFilters).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.tickets = response.data;
        } else {
          this.tickets = {};
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading filtered tickets:', error);
        this.error = 'Failed to load tickets';
        this.isLoading = false;
      }
    });
  }

  resetFilters(): void {
    this.activeFilters = {};
    this.statusFilter = '';
    this.priorityFilter = '';
    this.loadAllTickets();
  }

  isFilterActive(filterType: string): boolean {
    return !!this.activeFilters[filterType];
  }

  getActiveFiltersCount(): number {
    return Object.keys(this.activeFilters).length;
  }

  deleteTicket(id: number): void {
    this.pendingDeleteId = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.pendingDeleteId = null;
  }

  confirmDelete(): void {
    if (this.pendingDeleteId) {
      this.ticketService.deleteTicket(this.pendingDeleteId).subscribe({
        next: () => {
          this.loadAllTickets();
          this.showToastNotification('Ticket deleted successfully', 'success');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        },
        error: (error) => {
          console.error('Error deleting ticket:', error);
          this.showToastNotification('Error deleting ticket', 'error');
          this.showDeletePrompt = false;
          this.pendingDeleteId = null;
        }
      });
    }
  }

  private showToastNotification(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}
