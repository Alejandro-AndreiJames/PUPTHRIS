import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-list-modal',
  templateUrl: './user-list-modal.component.html',
  styleUrls: ['./user-list-modal.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class UserListModalComponent implements OnChanges {
  @Input() title: string = '';
  @Input() users: any[] = [];
  @Input() show: boolean = false;
  @Output() close = new EventEmitter<void>();

  currentPage: number = 1;
  itemsPerPage: number = 10;
  paginatedUsers: any[] = [];

  ngOnChanges() {
    if (this.users) {
      this.updatePagination();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.users.length / this.itemsPerPage);
  }

  updatePagination() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedUsers = this.users.slice(startIndex, endIndex);
  }

  getPageArray(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  previousPage() {
    this.setPage(this.currentPage - 1);
  }

  nextPage() {
    this.setPage(this.currentPage + 1);
  }

  closeModal() {
    this.close.emit();
    // Reset pagination when modal closes
    this.currentPage = 1;
    this.paginatedUsers = [];
  }

  // Helper method to format names
  formatName(member: any): string {
    if (!member?.BasicDetail) return 'N/A';
    const { LastName, FirstName, MiddleInitial } = member.BasicDetail;
    return `${LastName}, ${FirstName} ${MiddleInitial || ''}`.trim();
  }

  // Helper method to format employment type
  formatEmploymentType(type: string): string {
    if (!type) return 'N/A';
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }
}