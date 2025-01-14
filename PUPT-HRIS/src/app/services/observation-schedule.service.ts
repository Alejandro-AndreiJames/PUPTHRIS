import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CampusContextService } from './campus-context.service';

export interface ObservationSchedule {
  ScheduleID?: number;
  Topic: string;
  Subject: string;
  RoomNumber: string;
  ScheduledDate: Date;
  StartTime: string;
  EndTime: string;
  AcademicYear: string;
  Semester: '1st' | '2nd';
  Status: 'Pending' | 'Completed' | 'Cancelled';
  EvaluationID?: number;
  FacultyID: number;
  Faculty?: {
    FirstName: string;
    LastName: string;
    Email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ObservationScheduleService {
  private apiUrl = `${environment.apiBaseUrl}/observation-schedules`;

  constructor(
    private http: HttpClient, 
    private campusContextService: CampusContextService
  ) { }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Create a new observation schedule
  createSchedule(schedule: ObservationSchedule): Observable<any> {
    return this.http.post(this.apiUrl, schedule, { headers: this.getHeaders() });
  }

  // Get all schedules
  getAllSchedules(): Observable<any> {
    const campusId = this.campusContextService.getCampusId();
    return this.http.get(`${this.apiUrl}?campusId=${campusId}`, { 
      headers: this.getHeaders() 
    });
  }

  // Get schedule by ID
  getScheduleById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Update a schedule
  updateSchedule(id: number, schedule: Partial<ObservationSchedule>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, schedule, { headers: this.getHeaders() });
  }

  // Delete a schedule
  deleteSchedule(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Link evaluation to schedule
  linkEvaluation(scheduleId: number, evaluationId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/schedules/${scheduleId}/evaluation`,
      { evaluationId },
      { headers: this.getHeaders() }
    );
  }

  // Get pending schedules
  getPendingSchedules(): Observable<any> {
    const campusId = this.campusContextService.getCampusId();
    return this.http.get(
      `${this.apiUrl}/schedules/pending?campusId=${campusId}`,
      { headers: this.getHeaders() }
    );
  }

  // Add this new method
  getFacultySchedules(facultyId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/faculty/${facultyId}`, { headers: this.getHeaders() });
  }

  // Add this method to the ObservationScheduleService class
  updateScheduleStatus(scheduleId: number, status: 'Pending' | 'Completed' | 'Cancelled'): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${scheduleId}`, 
      { Status: status }, 
      { headers: this.getHeaders() }
    );
  }

  generatePdf(evaluationId: number): Observable<Blob> {
    const headers = this.getHeaders();
    return this.http.get(`${environment.apiBaseUrl}/evaluation/generate-pdf/${evaluationId}`, {
      headers,
      responseType: 'blob'  // Important for PDF download
    });
  }
}
