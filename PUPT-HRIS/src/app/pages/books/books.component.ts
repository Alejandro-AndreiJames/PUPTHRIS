import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BookService } from '../../services/book.service';
import { Book } from '../../model/book.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-books',
  templateUrl: './books.component.html',
  styleUrls: ['./books.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class BooksComponent implements OnInit {
  books: Book[] = [];
  @Input() showModal: boolean = false;
  bookForm: FormGroup;
  isEditing = false;
  currentBookId: number | null = null;
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  showDeletePrompt: boolean = false;
  bookToDelete: number | null = null;
  originalBookData: any = null;
  hasChanges: boolean = false;
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder, private bookService: BookService) {
    this.bookForm = this.fb.group({
      Title: ['', Validators.required],
      Author: ['', Validators.required],
      Description: [''],
      ISBN: ['', [
        Validators.pattern(/^(?:\d{10}|\d{13})$/),
        Validators.minLength(10),
        Validators.maxLength(13)
      ]],
      document: [null]
    });

    // Debug: Log form value changes
    this.bookForm.valueChanges.subscribe(values => {
      console.log('Form values changed:', values);
    });
  }

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.bookService.getBooks().subscribe({
      next: (books) => this.books = books,
      error: (error) => {
        console.error('Error loading books:', error);
        this.showToastNotification('Error loading books', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.bookForm.valid) {
      // Get the form values directly
      const title = this.bookForm.get('Title')?.value;
      const author = this.bookForm.get('Author')?.value;
      const description = this.bookForm.get('Description')?.value;
      const isbn = this.bookForm.get('ISBN')?.value;

      // Log the values
      console.log('Form Values:', {
        Title: title,
        Author: author,
        Description: description,
        ISBN: isbn
      });

      // Create the form data
      const formData = new FormData();
      
      // Fix: Use the correct case for form field names to match the backend model
      formData.append('Title', this.bookForm.get('Title')?.value || '');
      formData.append('Author', this.bookForm.get('Author')?.value || '');
      
      // Optional fields
      if (this.bookForm.get('Description')?.value) {
        formData.append('Description', this.bookForm.get('Description')?.value);
      }
      if (this.bookForm.get('ISBN')?.value) {
        formData.append('ISBN', this.bookForm.get('ISBN')?.value);
      }
      
      // File handling
      if (this.selectedFile) {
        formData.append('document', this.selectedFile);
      }

      // Debug log
      formData.forEach((value, key) => {
        console.log(`FormData ${key}:`, value);
      });

      if (this.isEditing && this.currentBookId !== null) {
        this.bookService.updateBook(this.currentBookId, formData).subscribe({
          next: (response) => {
            console.log('Update success:', response);
            this.loadBooks();
            this.closeModal();
            this.showToastNotification('Book updated successfully', 'success');
          },
          error: (error) => {
            console.error('Update error:', error);
            this.showToastNotification(
              'Error updating book: ' + (error.error?.message || error.message), 
              'error'
            );
          }
        });
      } else {
        this.bookService.addBook(formData).subscribe({
          next: (response) => {
            console.log('Add success:', response);
            this.loadBooks();
            this.closeModal();
            this.showToastNotification('Book added successfully', 'success');
          },
          error: (error) => {
            console.error('Add error:', error);
            this.showToastNotification(
              'Error adding book: ' + (error.error?.message || error.message), 
              'error'
            );
          }
        });
      }
    } else {
      // Log validation errors
      console.log('Form invalid. Errors:', this.bookForm.errors);
      console.log('Title errors:', this.bookForm.get('Title')?.errors);
      console.log('Author errors:', this.bookForm.get('Author')?.errors);
      this.showToastNotification('Please fill in all required fields', 'error');
    }
  }

  editBook(book: Book): void {
    this.isEditing = true;
    this.currentBookId = book.BookID || null;
    this.originalBookData = { ...book };
    
    this.bookForm.patchValue({
      Title: book.Title,
      Author: book.Author,
      Description: book.Description,
      ISBN: book.ISBN
    });
    
    this.bookForm.valueChanges.subscribe(currentValue => {
      this.hasChanges = this.checkForChanges(currentValue);
    });
    
    this.showModal = true;
  }

  private checkForChanges(currentValue: any): boolean {
    if (!this.originalBookData) return true;
    
    return (
      currentValue.Title !== this.originalBookData.Title ||
      currentValue.Author !== this.originalBookData.Author ||
      currentValue.Description !== this.originalBookData.Description ||
      currentValue.ISBN !== this.originalBookData.ISBN
    );
  }

  addBook(): void {
    this.isEditing = false;
    this.currentBookId = null;
    this.bookForm.reset();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditing = false;
    this.currentBookId = null;
    this.originalBookData = null;
    this.hasChanges = false;
    this.bookForm.reset();
    this.selectedFile = null;
  }

  toggleModal(): void {
    if (this.showModal) {
      this.closeModal();
    } else {
      this.addBook();
    }
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  deleteBook(id: number): void {
    this.bookToDelete = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.bookToDelete = null;
  }

  confirmDelete(): void {
    if (this.bookToDelete) {
      this.bookService.deleteBook(this.bookToDelete).subscribe({
        next: () => {
          this.loadBooks();
          this.showDeletePrompt = false;
          this.bookToDelete = null;
          this.showToastNotification('Book deleted successfully', 'success');
        },
        error: (error) => {
          console.error('Error deleting book:', error);
          this.showToastNotification('Error deleting book', 'error');
        }
      });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  // Add this method to help with debugging
  private logFormData(formData: FormData): void {
    console.log('Form validation state:', this.bookForm.valid);
    console.log('Form values:', this.bookForm.value);
    console.log('Form errors:', this.bookForm.errors);
    
    formData.forEach((value, key) => {
      console.log(`FormData ${key}:`, value);
    });
  }

  viewDocument(documentPath: string): void {
    if (documentPath) {
      window.open(documentPath, '_blank');
    }
  }
}
