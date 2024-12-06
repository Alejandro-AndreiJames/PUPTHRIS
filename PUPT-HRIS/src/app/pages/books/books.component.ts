import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BookService } from '../../services/book.service';
import { Book } from '../../model/book.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-books',
  templateUrl: './books.component.html',
  styleUrls: ['./books.component.css'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule]
})
export class BooksComponent implements OnInit {
  books: Book[] = [];
  bookForm: FormGroup;
  isEditing = false;
  currentBookId: number | null = null;
  showModal = false;

  constructor(private fb: FormBuilder, private bookService: BookService) {
    this.bookForm = this.fb.group({
      Title: ['', Validators.required],
      Author: ['', Validators.required],
      Description: ['']
    });
  }

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.bookService.getBooks().subscribe({
      next: (books) => this.books = books,
      error: (error) => console.error('Error loading books:', error)
    });
  }

  onSubmit(): void {
    if (this.bookForm.valid) {
      const bookData = this.bookForm.value;
      if (this.isEditing && this.currentBookId !== null) {
        this.bookService.updateBook(this.currentBookId, bookData).subscribe({
          next: () => this.loadBooks(),
          error: (error) => console.error('Error updating book:', error)
        });
      } else {
        this.bookService.addBook(bookData).subscribe({
          next: () => this.loadBooks(),
          error: (error) => console.error('Error adding book:', error)
        });
      }
      this.resetForm();
      this.toggleModal();
    }
  }

  editBook(book: Book): void {
    this.isEditing = true;
    this.currentBookId = book.BookID || null;
    this.bookForm.patchValue(book);
    this.toggleModal();
  }

  deleteBook(id: number): void {
    this.bookService.deleteBook(id).subscribe({
      next: () => this.loadBooks(),
      error: (error) => console.error('Error deleting book:', error)
    });
  }

  resetForm(): void {
    this.isEditing = false;
    this.currentBookId = null;
    this.bookForm.reset();
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
  }
}
