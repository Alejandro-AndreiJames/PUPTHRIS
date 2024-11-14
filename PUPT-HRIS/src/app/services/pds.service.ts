import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { timeout, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PdsService {
  private apiUrl = `${environment.apiBaseUrl}/pds`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  downloadPDS(): Observable<Blob | { message: string }> {
    const headers = this.getHeaders();
    return this.http.get(`${this.apiUrl}/download-pds`, {
      headers,
      responseType: 'blob',
    }).pipe(
      timeout(30000),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 400) {
          if (error.error instanceof Blob) {
            return new Observable<{ message: string }>(observer => {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const errorMessage = JSON.parse(reader.result as string);
                  observer.next({ message: errorMessage.message });
                } catch (e) {
                  observer.next({ message: 'Some user details are missing. Please complete your profile before generating the PDS.' });
                }
                observer.complete();
              };
              reader.readAsText(error.error);
            });
          }
          return of({ message: 'Some user details are missing. Please complete your profile before generating the PDS.' });
        }
        
        if (error.status === 404) {
          return of({ message: 'User details not found. Please complete your profile first.' });
        }
        if (error.status === 500) {
          return of({ message: 'There was a problem generating your PDS. Please try again later.' });
        }
        
        return of({ message: 'Unable to generate PDS. Please ensure all required information is complete.' });
      })
    );
  }

  downloadPDSForUser(userId: number): Observable<Blob | { message: string }> {
    const headers = this.getHeaders();
    const url = `${this.apiUrl}/download-pds/${userId}`;
    return this.http.get(url, {
      headers,
      responseType: 'blob',
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 400 && error.error instanceof Blob) {
          return new Observable<{ message: string }>(observer => {
            const reader = new FileReader();
            reader.onload = () => {
              const errorMessage = JSON.parse(reader.result as string);
              observer.next({ message: errorMessage.message });
              observer.complete();
            };
            reader.readAsText(error.error);
          });
        }
        return throwError(() => new Error('PDS download failed. Please try again.'));
      })
    );
  }   
}
