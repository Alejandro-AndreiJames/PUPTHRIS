import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

// Add interface for faculty user type
interface User {
  id?: number;
  name?: string;
  fcode?: string;
  department?: string;
  employmentType?: string;
  // For the backend response format
  UserID?: number;
  Fcode?: string;
  EmploymentType?: string;
  BasicDetail?: {
    LastName: string;
    FirstName: string;
    MiddleInitial?: string;
  };
  Department?: {
    DepartmentName: string;
  };
}

@Component({
  selector: 'app-user-list-modal',
  templateUrl: './user-list-modal.component.html',
  styleUrls: ['./user-list-modal.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class UserListModalComponent implements OnChanges {
  @Input() title: string = '';
  @Input() users: User[] = [];
  @Input() show: boolean = false;
  @Output() close = new EventEmitter<void>();

  currentPage: number = 1;
  itemsPerPage: number = 10;
  paginatedUsers: User[] = [];

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
  formatName(member: User): string {
    if (member.name) {
      return member.name;
    } else if (member.BasicDetail) {
      const { LastName, FirstName, MiddleInitial } = member.BasicDetail;
      return `${LastName}, ${FirstName} ${MiddleInitial || ''}`.trim();
    }
    return 'N/A';
  }

  getFcode(member: User): string {
    return member.fcode || member.Fcode || 'N/A';
  }

  getDepartment(member: User): string {
    if (member.department) {
      return member.department;
    } else if (member.Department?.DepartmentName) {
      return member.Department.DepartmentName;
    }
    return 'N/A';
  }

  formatEmploymentType(type: string | undefined): string {
    if (!type) return 'N/A';
    const formattedType = type.toLowerCase();
    switch(formattedType) {
      case 'fulltime':
      case 'full-time':
        return 'Full Time';
      case 'parttime':
      case 'part-time':
        return 'Part Time';
      case 'temporary':
        return 'Temporary';
      case 'designee':
        return 'Designee';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    }
  }
}