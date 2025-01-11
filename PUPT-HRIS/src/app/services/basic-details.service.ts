import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { BasicDetails } from '../model/basic-details.model';

@Injectable({
  providedIn: 'root'
})
export class BasicDetailsService {
  private apiUrl = `${environment.apiBaseUrl}/basic-details`;

  constructor(private http: HttpClient) { }

  getBasicDetails(userId: number): Observable<BasicDetails> {
    const token = localStorage.getItem('Token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<BasicDetails>(`${this.apiUrl}/${userId}`, { headers }).pipe(
      catchError(this.handleError)
    );
  }  

  addBasicDetails(basicDetails: BasicDetails): Observable<BasicDetails> {
    const token = localStorage.getItem('Token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.post<BasicDetails>(`${this.apiUrl}/add`, basicDetails, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  updateBasicDetails(basicDetails: BasicDetails): Observable<BasicDetails> {
    const token = localStorage.getItem('Token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    // Use the BasicDetailsID from the basicDetails object
    const id = basicDetails.BasicDetailsID;
    if (!id) {
      return throwError('BasicDetailsID is required for update');
    }

    return this.http.patch<BasicDetails>(`${this.apiUrl}/update/${id}`, basicDetails, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      errorMessage = error.error.message || error.message;
    }
    console.error('Error:', error);
    return throwError(errorMessage);
  }
}
