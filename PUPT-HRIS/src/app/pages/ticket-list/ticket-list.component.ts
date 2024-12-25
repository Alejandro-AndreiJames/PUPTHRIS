import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket } from '../../model/ticket.model';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent implements OnInit {
  ticketForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  error = '';
  formType: 'help' | 'issue' = 'help';
  showSuccessToast = false;
  isSuperAdmin = false;
  tickets: Ticket[] = [];
  responseForm: FormGroup;
  selectedTicket: Ticket | null = null;

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
      Response: ['', Validators.required],
      Status: ['in-progress', Validators.required],
      Priority: ['medium', Validators.required]
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
      next: (tickets) => {
        this.tickets = tickets;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading tickets:', error);
        this.isLoading = false;
      }
    });
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

  submitResponse(): void {
    if (this.responseForm.valid && this.selectedTicket && !this.isSubmitting) {
      this.isSubmitting = true;
      
      this.ticketService.updateTicket(
        this.selectedTicket.TicketID!, 
        this.responseForm.value
      ).subscribe({
        next: () => {
          this.closeResponseDialog();
          this.loadAllTickets();
          this.showSuccessToast = true;
          setTimeout(() => this.showSuccessToast = false, 3000);
        },
        error: (error) => {
          console.error('Error updating ticket:', error);
          this.error = 'Failed to update ticket. Please try again.';
          this.isSubmitting = false;
        }
      });
    }
  }

  closeResponseDialog(): void {
    const dialog = document.querySelector('#responseDialog') as HTMLDialogElement;
    if (dialog) {
      dialog.close();
    }
    this.selectedTicket = null;
    this.responseForm.reset({
      Status: 'in-progress',
      Priority: 'medium'
    });
    this.error = '';
    this.isSubmitting = false;
  }
}
