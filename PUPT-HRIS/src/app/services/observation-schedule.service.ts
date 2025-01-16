import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CampusContextService } from './campus-context.service';
import { map } from 'rxjs/operators';

export interface ObservationSchedule {
  ScheduleID?: number;
  Topic: string;
  Subject: string;
  RoomNumber: string;
  ScheduledDate: Date;
  StartTime: string;
  EndTime: string;
  AcademicYear: string;
  Semester: 'First Semester' | 'Second Semester';
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
  getAllSchedules(
    status?: string,
    sortBy?: string,
    sortOrder?: string,
    academicYear?: string,
    semester?: string,
    searchName?: string
  ): Observable<any> {
    let params = new HttpParams();
    
    if (status) params = params.set('status', status);
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortOrder) params = params.set('sortOrder', sortOrder);
    if (academicYear) params = params.set('academicYear', academicYear);
    if (semester) params = params.set('semester', semester);
    if (searchName) params = params.set('searchName', searchName);

    return this.http.get(this.apiUrl, { 
      params,
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
  getFacultySchedules(
    facultyId: number,
    academicYear?: string,
    semester?: string
  ): Observable<any> {
    let params = new HttpParams();
    
    if (academicYear) params = params.set('academicYear', academicYear);
    if (semester) params = params.set('semester', semester);

    return this.http.get(
      `${this.apiUrl}/faculty/${facultyId}/schedules`, 
      { 
        headers: this.getHeaders(),
        params 
      }
    );
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

  // Add this method
  getAcademicYears(): Observable<string[]> {
    return this.http.get<{success: boolean, data: string[]}>(`${this.apiUrl}/academic-years`, {
      headers: this.getHeaders()
    }).pipe(
      map(response => response.data)
    );
  }
}
