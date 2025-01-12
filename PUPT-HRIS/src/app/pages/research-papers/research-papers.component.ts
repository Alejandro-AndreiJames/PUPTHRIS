import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ResearchPaperService } from '../../services/research-paper.service';
import { ResearchPaper } from '../../model/research-paper.model';
import { AuthService } from '../../services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-research-papers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './research-papers.component.html',
  styleUrls: ['./research-papers.component.css']
})
export class ResearchPapersComponent implements OnInit {
  researchPapers: ResearchPaper[] = [];
  @Input() set viewMode(value: 'personal' | 'all') {
    if (this._viewMode !== value) {
      this._viewMode = value;
      // Reload data when viewMode changes
      if (this.researchService) {
        this.currentPage = 1; // Reset to first page
        this.loadResearchPapers();
      }
    }
  }
  get viewMode(): 'personal' | 'all' {
    return this._viewMode;
  }
  private _viewMode: 'personal' | 'all' = 'all';
  @Input() showModal: boolean = false;
  isEditing: boolean = false;
  currentResearchId: number | null = null;
  userId: number;
  researchForm: FormGroup;
  private s3Config: any;
  selectedFile: File | null = null;
  showDeletePrompt: boolean = false;
  paperToDelete: number | null = null;
  initialFormValue: any;
  showToast: boolean = false;
  toastMessage: string = '';
  toastType: 'success' | 'error' | 'warning' = 'success';
  
  // Add pagination properties
  currentPage: number = 1;
  totalPages: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  
  // Add search property
  searchTerm: string = '';

  // Add loading state
  isLoading: boolean = false;

  // Add these properties to the class
  selectedFileName: string | null = null;
  isFileSelected: boolean = false;

  constructor(
    private fb: FormBuilder,
    private researchService: ResearchPaperService,
    private authService: AuthService
  ) {
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    } else {
      this.userId = 0;
    }

    this.researchForm = this.fb.group({
      Title: ['', Validators.required],
      Description: [''],
      Authors: ['', Validators.required],
      PublicationDate: ['', Validators.required],
      ReferenceLink: [''],
      DocumentPath: ['']
    });

    this.researchService.getS3Config().subscribe(
      config => this.s3Config = config
    );
  }

  ngOnInit(): void {
    this.loadResearchPapers();
  }

  loadResearchPapers(): void {
    this.isLoading = true;
    // Reset search when switching views
    this.searchTerm = '';
    
    this.researchService.getResearchPapers(
      this.currentPage,
      this.itemsPerPage,
      this.searchTerm,
      this.viewMode
    ).subscribe({
      next: (response) => {
        this.researchPapers = response.items;
        this.currentPage = response.currentPage;
        this.totalPages = response.totalPages;
        this.totalItems = response.totalItems;
        this.itemsPerPage = response.itemsPerPage;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading research papers:', error);
        this.showToastNotification('Error loading research papers', 'error');
        this.isLoading = false;
      }
    });
  }

  get showAddButton(): boolean {
    return this.viewMode === 'personal';
  }

  openModal(): void {
    this.showModal = true;
    if (!this.isEditing) {
      this.researchForm.reset();
      this.initialFormValue = this.researchForm.getRawValue();
    }
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
    if (!this.showModal) {
      this.researchForm.reset();
      this.isEditing = false;
      this.currentResearchId = null;
    }
  }

  onSubmit(): void {
    if (this.researchForm.valid) {
      const formData = new FormData();
      const formValue = this.researchForm.value;
      
      // Define interface for cleaned values
      interface CleanedValues {
        Title: string;
        Description: string;
        Authors: string;
        PublicationDate: string | null;
        ReferenceLink: string;
        [key: string]: string | null; // Index signature for dynamic access
      }
      
      // Clean up form values with proper typing
      const cleanedValues: CleanedValues = {
        Title: formValue.Title || '',
        Description: formValue.Description || '',
        Authors: formValue.Authors || '',
        PublicationDate: formValue.PublicationDate || null,
        ReferenceLink: formValue.ReferenceLink || '',
      };
      
      // Append cleaned form fields to FormData
      Object.keys(cleanedValues).forEach(key => {
        if (key !== 'document' && cleanedValues[key] !== null) {
          formData.append(key, cleanedValues[key] as string);
        }
      });

      // Append file if exists
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('document', fileInput.files[0]);
      }

      if (this.isEditing && this.currentResearchId) {
        this.researchService.updateResearchPaper(this.currentResearchId, formData).subscribe({
          next: () => {
            this.loadResearchPapers();
            this.toggleModal();
            this.showToastNotification('Research paper updated successfully', 'success');
          },
          error: (error) => {
            console.error('Error updating research paper:', error);
            this.showToastNotification('Error updating research paper', 'error');
          }
        });
      } else {
        formData.append('UserID', this.userId.toString());
        this.researchService.addResearchPaper(formData).subscribe({
          next: () => {
            this.loadResearchPapers();
            this.toggleModal();
            this.showToastNotification('Research paper added successfully', 'success');
          },
          error: (error) => {
            console.error('Error adding research paper:', error);
            this.showToastNotification('Error adding research paper', 'error');
          }
        });
      }
    }
  }

  editPaper(paper: ResearchPaper): void {
    this.isEditing = true;
    this.currentResearchId = paper.ResearchID!;
    
    // Format the date to YYYY-MM-DD for the input type="date"
    const formattedDate = paper.PublicationDate ? 
      new Date(paper.PublicationDate).toISOString().split('T')[0] : '';
    
    this.researchForm.patchValue({
      Title: paper.Title,
      Description: paper.Description,
      Authors: paper.Authors,
      PublicationDate: formattedDate, // Use the formatted date
      ReferenceLink: paper.ReferenceLink,
      DocumentPath: paper.DocumentPath
    });

    this.initialFormValue = this.researchForm.getRawValue();
    this.showModal = true;
  }

  deletePaper(paper: ResearchPaper): void {
    if (!paper || !paper.ResearchID) {
      this.showToastNotification('Cannot delete paper: Invalid paper information', 'error');
      return;
    }
    
    this.paperToDelete = paper.ResearchID;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.paperToDelete = null;
  }

  confirmDelete(): void {
    if (!this.paperToDelete) {
      this.showToastNotification('No paper selected for deletion', 'error');
      return;
    }

    this.researchService.deleteResearchPaper(this.paperToDelete).subscribe({
      next: () => {
        this.loadResearchPapers();
        this.showDeletePrompt = false;
        this.paperToDelete = null;
        this.showToastNotification('Research paper deleted successfully', 'success');
      },
      error: (error) => {
        console.error('Error deleting research paper:', error);
        this.showToastNotification('Error deleting research paper', 'error');
      }
    });
  }

  downloadFile(documentPath: string): void {
    if (!documentPath || !this.s3Config) {
      console.error('Missing document path or S3 configuration');
      return;
    }

    const s3Url = `https://${this.s3Config.bucketName}.s3.${this.s3Config.region}.amazonaws.com/${documentPath}`;
    
    const link = document.createElement('a');
    link.href = s3Url;
    link.target = '_blank';
    link.download = documentPath.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.isFileSelected = true;
      
      // Optional: Update form value to trigger change detection
      this.researchForm.patchValue({
        DocumentPath: file.name
      });
    }
  }

  public hasUnsavedChanges(): boolean {
    const currentFormValue = this.researchForm.getRawValue();
    return JSON.stringify(currentFormValue) !== JSON.stringify(this.initialFormValue);
  }

  private showToastNotification(message: string, type: 'success' | 'error' | 'warning'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 3000); // Hide toast after 3 seconds
  }

  onViewPaper(paper: ResearchPaper): void {
    if (!paper) {
      this.showToastNotification('Paper information not available', 'error');
      return;
    }

    // First try to download document if available
    if (paper.DocumentPath) {
      this.downloadFile(paper.DocumentPath);
      return;
    }

    // If no document, try to open reference link
    if (paper.ReferenceLink) {
      if (this.isValidUrl(paper.ReferenceLink)) {
        window.open(paper.ReferenceLink, '_blank');
      } else {
        this.showToastNotification('Invalid reference link', 'error');
      }
      return;
    }

    this.showToastNotification('No document or reference link available', 'warning');
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Add pagination methods
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadResearchPapers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadResearchPapers();
    }
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadResearchPapers();
    }
  }

  // Add search method
  onSearch(event: any): void {
    this.searchTerm = event.target.value;
    this.currentPage = 1; // Reset to first page when searching
    this.loadResearchPapers();
  }

  // Add debounced search
  private searchDebounce: any;
  onSearchInput(event: any): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
    this.searchDebounce = setTimeout(() => {
      this.onSearch(event);
    }, 300);
  }

  viewDocument(documentPath: string): void {
    if (documentPath) {
      window.open(documentPath, '_blank');
    }
  }

  // Add method to clear file selection
  clearFileSelection(): void {
    this.selectedFile = null;
    this.selectedFileName = null;
    this.isFileSelected = false;
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}