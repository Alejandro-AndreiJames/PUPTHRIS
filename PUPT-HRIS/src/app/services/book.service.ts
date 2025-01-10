import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Book } from '../model/book.model';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = `${environment.apiBaseUrl}/books`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  addBook(formData: FormData): Observable<Book> {
    const headers = this.getHeaders();
    
    // Log the request details
    console.log('Request URL:', this.apiUrl);
    console.log('Request Headers:', headers);
    formData.forEach((value, key) => {
      console.log(`Request FormData ${key}:`, value);
    });

    return this.http.post<Book>(this.apiUrl, formData, { 
      headers: headers 
    }).pipe(
      catchError(error => {
        console.error('Book service error:', error);
        return throwError(() => error);
      })
    );
  }

  updateBook(id: number, bookData: FormData): Observable<Book> {
    return this.http.put<Book>(`${this.apiUrl}/${id}`, bookData, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  getBooks(userId?: number): Observable<Book[]> {
    const url = userId ? `${this.apiUrl}/${userId}` : this.apiUrl;
    return this.http.get<Book[]>(url, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteBook(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    return throwError(() => error);
  }
}