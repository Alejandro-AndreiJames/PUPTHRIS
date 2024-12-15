import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../../services/user.service';
import { BasicDetailsService } from '../../services/basic-details.service';
import { EducationService } from '../../services/education.service';
import { PersonalDetailsService } from '../../services/personal-details.service';
import { VoluntaryWorkService } from '../../services/voluntarywork.service';
import { TrainingSeminarsService } from '../../services/training-seminars.service';

import { User } from '../../model/user.model';
import { BasicDetails } from '../../model/basic-details.model';
import { Education } from '../../model/education.model';
import { PersonalDetails } from '../../model/personal-details.model';
import { VoluntaryWork } from '../../model/voluntary-work.model';
import { CommonModule } from '@angular/common';
import { RoleName, Role } from '../../model/role.model';
import { CampusContextService } from '../../services/campus-context.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../services/department.service';
import { ProfileImageComponent } from '../profile-image/profile-image.component';
import { ProfileImageService } from '../../services/profile-image.service';
import { TrainingSeminar } from '../../model/training-seminars.model';

@Component({
  selector: 'app-employee',
  templateUrl: './employees.component.html',
  styleUrls: ['./employees.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ProfileImageComponent]
})
export class EmployeeComponent implements OnInit, OnDestroy {
  users: User[] = [];
  paginatedUsers: User[] = []; // To hold the users for the current page
  basicDetails: BasicDetails | null = null;
  educationDetails: Education[] | null = null;
  personalDetails: PersonalDetails | null = null;
  voluntaryWorks: VoluntaryWork[] | null = null;
  isModalOpen: boolean = false;
  activeTab: string = 'basic';
  roleName = RoleName;
  campusId: number | null = null;
  // Pagination variables
  currentPage: number = 1;
  itemsPerPage: number = 10; // Set the number of users per page to 10
  totalPages: number = 0;
  private campusSubscription: Subscription | undefined;
  searchTerm: string = '';
  filteredUsers: User[] = [];
  selectedRole: string = '';
  selectedEmploymentType: string = '';
  departments: any[] = [];
  selectedDepartment: string = '';
  selectedUser: User | null = null;
  trainingSeminars: TrainingSeminar[] | null = null;
  isProofModalOpen: boolean = false;
  selectedProofUrl: string | null = null;
  selectedSupportingDocument: string | null = null;
  selectedProofType: 'file' | 'link' = 'file';

  constructor(
    private campusContextService: CampusContextService,
    private userService: UserService,
    private basicDetailsService: BasicDetailsService,
    private educationService: EducationService,
    private personalDetailsService: PersonalDetailsService,
    private voluntaryWorkService: VoluntaryWorkService,
    private departmentService: DepartmentService,
    private profileImageService: ProfileImageService,
    private trainingSeminarsService: TrainingSeminarsService
  ) {}

  ngOnInit(): void {
    this.campusSubscription = this.campusContextService.getCampusId().subscribe(
      id => {
        console.log('Received campus ID:', id);
        if (id !== null) {
          this.campusId = id;
          this.loadActiveUsers();
          this.loadDepartments();
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.campusSubscription) {
      this.campusSubscription.unsubscribe();
    }
  }

  loadActiveUsers(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    this.userService.getUsers(this.campusId).subscribe(
      (data) => {
        this.users = data;
        this.filteredUsers = data; // Initialize filteredUsers
        this.totalPages = Math.ceil(this.users.length / this.itemsPerPage);
        this.paginateUsers();
      },
      (error) => {
        console.error('Error fetching active users', error);
      }
    );
  }

  getRoleName(roles: { RoleName: string }[]): string {
    if (roles && roles.length > 0) {
      if (roles.some(role => role.RoleName.toLowerCase() === 'faculty')) return 'Faculty';
      if (roles.some(role => role.RoleName.toLowerCase() === 'staff')) return 'Staff';
      if (roles.some(role => role.RoleName.toLowerCase() === 'admin')) return 'Admin';
      if (roles.some(role => role.RoleName.toLowerCase() === 'superadmin')) return 'Super Admin';
      return roles[0].RoleName; // Return the first role if none of the above match
    }
    return 'Unknown';
  }

  // Method to paginate users based on the current page
  paginateUsers(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(start, end);
  }

  // Method to go to the next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateUsers();
    }
  }

  // Method to go to the previous page
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateUsers();
    }
  }

  // Method to set a specific page
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateUsers();
    }
  }

  openModal(user: User): void {
    this.selectedUser = user;
    this.isModalOpen = true;
    this.activeTab = 'basic';
    
    // Load profile image when opening modal
    this.profileImageService.getProfileImage(user.UserID).subscribe({
      next: (profileImage) => {
        if (profileImage && this.selectedUser) {
          this.selectedUser.profileImageUrl = profileImage.ImagePath;
        }
      },
      error: (error) => {
        console.error('Error loading profile image:', error);
        if (this.selectedUser) {
          this.selectedUser.profileImageUrl = 'assets/images/default-avatar.png';
        }
      }
    });

    this.fetchBasicDetails(user.UserID);
    this.fetchEducationDetails(user.UserID);
    this.fetchPersonalDetails(user.UserID);
    this.fetchVoluntaryWorks(user.UserID);
    this.fetchTrainingSeminars(user.UserID);
  }

  fetchBasicDetails(userId: number): void {
    console.log('Fetching basic details for user ID:', userId);
    this.basicDetailsService.getBasicDetails(userId).subscribe(
      (details) => {
        console.log('Received basic details:', details);
        this.basicDetails = details;
      },
      (error) => {
        console.error('Error fetching basic details', error);
        this.basicDetails = null;
      }
    );
  }

  fetchEducationDetails(userId: number): void {
    this.educationService.getEducationByUser(userId).subscribe(
      (details) => (this.educationDetails = details),
      (error) => {
        console.error('Error fetching education details', error);
        this.educationDetails = null;
      }
    );
  }

  fetchPersonalDetails(userId: number): void {
    this.personalDetailsService.getPersonalDetails(userId).subscribe(
      (details) => {
        console.log('Fetched personal details:', details); // Log to check if details are fetched
        this.personalDetails = details;
      },
      (error) => {
        console.error('Error fetching personal details', error);
        this.personalDetails = null;
      }
    );
  }

  fetchVoluntaryWorks(userId: number): void {
    this.voluntaryWorkService.getVoluntaryWorks(userId).subscribe(
      (details) => (this.voluntaryWorks = details),
      (error) => {
        console.error('Error fetching voluntary works', error);
        this.voluntaryWorks = null;
      }
    );
  }

  fetchTrainingSeminars(userId: number): void {
    this.trainingSeminarsService.getTrainings(userId).subscribe(
      (trainings) => {
        this.trainingSeminars = trainings;
      },
      (error) => {
        console.error('Error fetching training seminars', error);
        this.trainingSeminars = null;
      }
    );
  }

  formatAddress(details: PersonalDetails | null, type: 'Residential' | 'Permanent'): string {
    if (!details) return '';
    let address = '';

    if (type === 'Residential') {
      address = `${details.ResidentialHouseBlockLot || ''} 
      ${details.ResidentialStreet || ''}, 
      ${details.ResidentialSubdivisionVillage || ''}, 
      ${details.ResidentialBarangay || ''}, 
      ${details.ResidentialCityMunicipality || ''}, 
      ${details.ResidentialProvince || ''}
      ${details.ResidentialZipCode || ''}`;
    } else if (type === 'Permanent') {
      address = `${details.PermanentHouseBlockLot || ''} 
      ${details.PermanentStreet || ''}, 
      ${details.PermanentSubdivisionVillage || ''}, 
      ${details.PermanentBarangay || ''}, 
      ${details.PermanentCityMunicipality || ''}, 
      ${details.PermanentProvince || ''} 
      ${details.PermanentZipCode || ''}`;
    }

    return address.replace(/\s+/g, ' ').trim(); // Clean up any extra spaces
  }

  setActiveTab(tab: string): void {
    console.log('Setting active tab to:', tab);
    this.activeTab = tab;
    console.log('Current tab data:', (this as any)[tab + 'Details']);
  }

  closeModal(): void {
    const modalElement = document.querySelector('.modal');
    const modalBoxElement = document.querySelector('.modal-box');
    
    if (modalElement && modalBoxElement) {
      modalElement.classList.add('closing');
      modalBoxElement.classList.add('closing');
      
      setTimeout(() => {
        this.isModalOpen = false;
        this.clearDetails();
      }, 300);
    } else {
      this.isModalOpen = false;
      this.clearDetails();
    }
  }

  private clearDetails(): void {
    this.basicDetails = null;
    this.educationDetails = null;
    this.personalDetails = null;
    this.voluntaryWorks = null;
    this.trainingSeminars = null;
  }

  applyFilters(): void {
    console.log('Starting filter application with:', {
      searchTerm: this.searchTerm,
      selectedRole: this.selectedRole,
      selectedEmploymentType: this.selectedEmploymentType,
      selectedDepartment: this.selectedDepartment
    });

    console.log('Total users before filtering:', this.users.length);

    this.filteredUsers = this.users.filter(user => {
      console.log('Processing user:', {
        name: `${user.FirstName} ${user.Surname}`,
        roles: user.Roles,
        employmentType: user.EmploymentType,
        department: user.Department
      });

      const matchesSearch = !this.searchTerm.trim() || 
        `${user.FirstName} ${user.MiddleName} ${user.Surname} ${user.NameExtension}`
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        user.Fcode.toLowerCase().includes(this.searchTerm.toLowerCase());
      console.log('Search match:', matchesSearch);

      const matchesRole = !this.selectedRole || 
        user.Roles?.some(role => role.RoleName.toLowerCase() === this.selectedRole.toLowerCase());
      console.log('Role match:', matchesRole);

      const matchesEmploymentType = !this.selectedEmploymentType || 
        user.EmploymentType.toLowerCase() === this.selectedEmploymentType.toLowerCase();
      console.log('Employment type match:', {
        userType: user.EmploymentType,
        selectedType: this.selectedEmploymentType,
        matches: matchesEmploymentType
      });

      const matchesDepartment = !this.selectedDepartment || 
        (this.selectedDepartment === 'na' ? 
          !user.Department : 
          user.Department?.DepartmentName === this.departments.find(d => 
            d.DepartmentID.toString() === this.selectedDepartment
          )?.DepartmentName);

      console.log('Department match:', {
        userDeptName: user.Department?.DepartmentName,
        selectedDeptId: this.selectedDepartment,
        selectedDeptName: this.departments.find(d => 
          d.DepartmentID.toString() === this.selectedDepartment
        )?.DepartmentName,
        matches: matchesDepartment
      });

      const includeUser = matchesSearch && matchesRole && matchesEmploymentType && matchesDepartment;
      console.log('Final decision for user:', includeUser);

      return includeUser;
    });

    console.log('Total users after filtering:', this.filteredUsers.length);

    this.currentPage = 1;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
    this.paginateUsers();
  }

  onSearch(): void {
    this.applyFilters();
  }

  loadDepartments(): void {
    if (this.campusId === null) {
      console.error('Cannot load departments: Campus ID is null');
      return;
    }
    
    console.log('Loading departments for campus:', this.campusId);
    this.departmentService.getDepartments(this.campusId).subscribe({
      next: (departments) => {
        console.log('Departments loaded successfully:', departments);
        this.departments = departments;
      },
      error: (error) => {
        console.error('Error loading departments:', error);
      }
    });
  }

  loadProfileImage(user: User): void {
    this.profileImageService.getProfileImage(user.UserID).subscribe({
      next: (profileImage) => {
        if (profileImage) {
          user.profileImageUrl = profileImage.ImagePath;
        }
      },
      error: (error) => {
        console.error('Error loading profile image for user:', user.UserID, error);
        user.profileImageUrl = 'assets/images/default-avatar.png';
      }
    });
  }

  loadUsers(): void {
    this.userService.getUsers(this.campusId || undefined).subscribe({
      next: (users) => {
        this.users = users;
        this.users.forEach(user => this.loadProfileImage(user));
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  handleImageError(event: any): void {
    event.target.src = '../../../assets/images/default-avatar.jpeg';
    if (this.selectedUser) {
      this.selectedUser.profileImageUrl = undefined;
    }
  }

  getProfileImage(): string {
    if (this.selectedUser?.profileImageUrl) {
      return this.selectedUser.profileImageUrl;
    }
    return '../../../assets/default-avatar.jpg';
  }

  formatUserName(user: User): string {
    const nameParts = [
      user.FirstName,
      user.MiddleName,
      user.Surname,
      user.NameExtension
    ].filter(part => part !== null && part !== undefined && part !== '');

    return nameParts.length > 0 ? nameParts.join(' ') : 'No information entered';
  }

  openProofModal(proofUrl: string, supportingDocument?: string): void {
    this.selectedProofUrl = proofUrl;
    this.selectedSupportingDocument = supportingDocument || 'No description available';
    this.selectedProofType = this.isImage(proofUrl) ? 'file' : 'link';
    this.isProofModalOpen = true;
  }

  closeProofModal(): void {
    this.selectedProofUrl = null;
    this.isProofModalOpen = false;
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif)$/i.test(url);
  }

  onProofImageError(): void {
    console.error('Error loading proof image');
    // You can add error handling here if needed
  }
}
