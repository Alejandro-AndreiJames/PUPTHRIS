import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Book } from '../model/book.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private apiUrl = `${environment.apiBaseUrl}/books`;

  constructor(private http: HttpClient) { }

  getBooks(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    viewMode: 'personal' | 'all' = 'all'
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search)
      .set('viewMode', viewMode);

    return this.http.get<any>(`${this.apiUrl}`, { params });
  }

  addBook(formData: FormData): Observable<Book> {
    return this.http.post<Book>(this.apiUrl, formData);
  }

  updateBook(id: number, formData: FormData): Observable<Book> {
    return this.http.put<Book>(`${this.apiUrl}/${id}`, formData);
  }

  deleteBook(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}