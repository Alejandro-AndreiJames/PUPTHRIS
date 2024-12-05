import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ResearchPapersComponent } from '../research-papers/research-papers.component';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, 
    ResearchPapersComponent
  ],
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.css'],
  schemas: [NO_ERRORS_SCHEMA]
})
export class ResourcesComponent {
  activeTab: string = 'research';
  showResearchModal: boolean = false;

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openModal(type: string): void {
    switch(type) {
      case 'research':
        this.showResearchModal = true;
        break;
      case 'books':
        // Handle books modal
        break;
      case 'lecture':
        // Handle lecture materials modal
        break;
    }
  }
}
