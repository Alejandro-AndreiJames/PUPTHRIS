import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ResearchPapersComponent } from '../research-papers/research-papers.component';
import { BooksComponent } from '../books/books.component';
import { LectureMaterialsComponent } from '../lecture-materials/lecture-materials.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, 
    ResearchPapersComponent,
    BooksComponent,
    LectureMaterialsComponent
  ],
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.css'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ResourcesComponent {
  activeTab: string = 'research';
  viewMode: 'personal' | 'all' = 'personal';
  showResearchModal: boolean = false;
  showBooksModal: boolean = false;
  showLectureModal: boolean = false;
  isAdminOrSuperAdmin: boolean = false;

  constructor(private authService: AuthService) {
    // Check if user is admin/superadmin
    this.isAdminOrSuperAdmin = this.authService.hasAnyRole(['admin', 'superadmin']);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    // Reload data when switching tabs
    this.toggleViewMode(this.viewMode);
  }

  toggleViewMode(mode: 'personal' | 'all'): void {
    this.viewMode = mode;
    
    // Get references to all components
    const researchComponent = document.querySelector('app-research-papers');
    const booksComponent = document.querySelector('app-books');
    const lectureComponent = document.querySelector('app-lecture-materials');

    // Reload data based on active tab
    switch(this.activeTab) {
      case 'research':
        if (researchComponent) {
          (researchComponent as any).loadResearchPapers();
        }
        break;
      case 'books':
        if (booksComponent) {
          (booksComponent as any).loadBooks();
        }
        break;
      case 'lecture':
        if (lectureComponent) {
          (lectureComponent as any).loadMaterials();
        }
        break;
    }
  }

  openModal(type: string): void {
    switch(type) {
      case 'research':
        this.showResearchModal = true;
        break;
      case 'books':
        this.showBooksModal = true;
        break;
      case 'lecture':
        this.showLectureModal = true;
        break;
    }
  }
}
