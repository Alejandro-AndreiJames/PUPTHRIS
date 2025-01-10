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
  }

  toggleViewMode(mode: 'personal' | 'all'): void {
    this.viewMode = mode;
    // Trigger change detection and reload data
    if (this.activeTab === 'research') {
      const researchComponent = document.querySelector('app-research-papers');
      if (researchComponent) {
        (researchComponent as any).loadResearchPapers();
      }
    }
    // Add similar logic for books and lecture materials if needed
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
