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
    this.researchService.getResearchPapers(this.userId).subscribe({
      next: (papers) => {
        this.researchPapers = papers;
      },
      error: (error) => {
        console.error('Error loading research papers:', error);
      }
    });
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
    if (this.showModal && !this.isEditing) {
      this.researchForm.reset();
      this.initialFormValue = this.researchForm.getRawValue();
    }
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
      
      // Append form fields to FormData
      Object.keys(formValue).forEach(key => {
        if (key !== 'document') {
          formData.append(key, formValue[key]);
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
    
    this.researchForm.patchValue({
      Title: paper.Title,
      Description: paper.Description,
      Authors: paper.Authors,
      PublicationDate: paper.PublicationDate,
      ReferenceLink: paper.ReferenceLink,
      DocumentPath: paper.DocumentPath
    });

    this.initialFormValue = this.researchForm.getRawValue();

    this.showModal = true;
  }

  deletePaper(id: number): void {
    this.paperToDelete = id;
    this.showDeletePrompt = true;
  }

  cancelDelete(): void {
    this.showDeletePrompt = false;
    this.paperToDelete = null;
  }

  confirmDelete(): void {
    if (this.paperToDelete) {
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
}