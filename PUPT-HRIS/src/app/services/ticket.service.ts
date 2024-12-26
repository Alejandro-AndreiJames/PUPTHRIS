import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private apiUrl = `${environment.apiBaseUrl}/tickets`;

  constructor(private http: HttpClient) { }

  // Create a new ticket
  createTicket(ticketData: any): Observable<any> {
    return this.http.post(this.apiUrl, ticketData);
  }

  // Get all tickets (superadmin)
  getAllTickets(): Observable<any> {
    return this.http.get(`${this.apiUrl}/all`);
  }

  // Get user's tickets
  getUserTickets(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-tickets`);
  }

  // Update ticket
  updateTicket(ticketId: number, updateData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${ticketId}`, updateData);
  }
}
