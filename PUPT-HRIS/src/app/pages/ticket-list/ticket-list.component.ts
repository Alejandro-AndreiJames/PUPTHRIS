import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { Ticket } from '../../model/ticket.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
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

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    private authService: AuthService
  ) {
    this.isSuperAdmin = this.authService.hasRole('superadmin');
    console.log('Is SuperAdmin:', this.isSuperAdmin);
    
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
    console.log('Loading tickets...');

    this.ticketService.getAllTickets().subscribe({
      next: (response) => {
        console.log('Raw response:', response);
        
        if (response && response.data) {
          this.tickets = response.data;
        } else {
          this.tickets = {};
        }

        console.log('Processed tickets:', this.tickets);
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
          setTimeout(() => {
            this.showSuccessToast = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Error submitting ticket:', error);
          this.error = 'Failed to submit. Please try again.';
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
}
