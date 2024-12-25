import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ticket } from '../model/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private apiUrl = `${environment.apiBaseUrl}/tickets`;

  constructor(private http: HttpClient) { }

  // Create a new ticket
  createTicket(ticket: Partial<Ticket>): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/create`, ticket);
  }

  // Get all tickets (for superadmin)
  getAllTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/all`);
  }

  // Get user's tickets
  getUserTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/user`);
  }

  // Get ticket by ID
  getTicketById(ticketId: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${ticketId}`);
  }

  // Update ticket (for superadmin)
  updateTicket(ticketId: number, updateData: Partial<Ticket>): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${ticketId}`, updateData);
  }

  // Delete ticket (for superadmin)
  deleteTicket(ticketId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${ticketId}`);
  }
}
