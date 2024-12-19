import { Component, OnInit, OnDestroy } from '@angular/core';
import { UserService } from '../../services/user.service';
import { BasicDetailsService } from '../../services/basic-details.service';
import { EducationService } from '../../services/education.service';
import { PersonalDetailsService } from '../../services/personal-details.service';
import { VoluntaryWorkService } from '../../services/voluntarywork.service';
import { TrainingSeminarsService } from '../../services/training-seminars.service';
import { AchievementAwardService } from '../../services/achievement-awards.service';
import { OfficershipMembershipService } from '../../services/officership-membership.service';
import { ProfessionalLicenseService } from '../../services/professional-license.service';
import { EmploymentInformationService } from '../../services/employment-information.service';
import { CertificationService } from '../../services/certification.service';

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
import { AchievementAward } from '../../model/achievement-awards.model';
import { OfficershipMembership } from '../../model/officership-membership.model';
import { ProfessionalLicense } from '../../model/professional-license.model';
import { EmploymentInformation } from '../../model/employment-information.model';
import { Certification } from '../../model/certification.model';
import { GetUsersParams } from '../../model/get-user-params.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  achievements: AchievementAward[] | null = null;
  memberships: OfficershipMembership[] | null = null;
  professionalLicenses: ProfessionalLicense[] | null = null;
  employmentInfo: EmploymentInformation | null = null;
  certifications: Certification[] | null = null;
  private searchSubject = new Subject<string>();
  private readonly DEBOUNCE_TIME = 300; // 300ms delay

  constructor(
    private campusContextService: CampusContextService,
    private userService: UserService,
    private basicDetailsService: BasicDetailsService,
    private educationService: EducationService,
    private personalDetailsService: PersonalDetailsService,
    private voluntaryWorkService: VoluntaryWorkService,
    private departmentService: DepartmentService,
    private profileImageService: ProfileImageService,
    private trainingSeminarsService: TrainingSeminarsService,
    private achievementAwardService: AchievementAwardService,
    private officershipMembershipService: OfficershipMembershipService,
    private professionalLicenseService: ProfessionalLicenseService,
    private employmentInformationService: EmploymentInformationService,
    private certificationService: CertificationService
  ) {
    // Setup search debouncing in constructor
    this.searchSubject.pipe(
      debounceTime(this.DEBOUNCE_TIME), // Wait for 300ms pause
      distinctUntilChanged() // Only emit if value is different from previous
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.currentPage = 1; // Reset to first page
      this.loadActiveUsers();
    });
  }

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
    this.searchSubject.complete();
  }

  loadActiveUsers(): void {
    if (this.campusId === null) {
      console.error('Campus ID is null');
      return;
    }
    
    const params: any = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      campusId: this.campusId
    };

    // Modified role filter logic
    if (this.selectedRole && this.selectedRole !== 'All Roles') {
      // Make sure we're using the exact role name as stored in the database
      params.role = this.selectedRole === 'Staff' ? 'staff' : 
                    this.selectedRole === 'Faculty' ? 'faculty' : 
                    this.selectedRole === 'Admin' ? 'admin' : 
                    this.selectedRole.toLowerCase();
      
      console.log('Filtering by role:', params.role); // Debug log
    }

    if (this.selectedDepartment) {
      params.departmentId = this.selectedDepartment;
    }
    if (this.selectedEmploymentType) {
      params.employmentType = this.selectedEmploymentType;
    }
    if (this.searchTerm) {
      params.search = this.searchTerm;
    }

    console.log('Request params:', params); // Debug log

    this.userService.getUsers(params).subscribe({
      next: (response) => {
        console.log('Response:', response);
        this.users = response.data;
        this.filteredUsers = [...this.users];
        this.totalPages = response.metadata.totalPages;
        this.paginateUsers();
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
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
    // Since data is already paginated from server, just set it
    this.paginatedUsers = this.filteredUsers;
  }

  // Method to go to the next page
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadActiveUsers();
    }
  }

  // Method to go to the previous page
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadActiveUsers();
    }
  }

  // Method to set a specific page
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadActiveUsers();
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
    if (user.UserID) {
      this.loadAchievements(user.UserID);
      this.loadMemberships(user.UserID);
      this.loadProfessionalLicenses(user.UserID);
      this.loadEmploymentInfo(user.UserID);
      this.loadCertifications(user.UserID);
    }
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
    this.educationService.getEducationByUser(userId).subscribe({
      next: (details) => {
        this.educationDetails = details;
        console.log('Education details loaded:', details);
      },
      error: (error) => {
        console.error('Error fetching education details', error);
        this.educationDetails = null;
      }
    });
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
    if (tab === 'achievements' && this.selectedUser) {
      this.loadAchievements(this.selectedUser.UserID);
    }
    if (this.selectedUser?.UserID) {
      switch (tab) {
        case 'licenses':
          this.loadProfessionalLicenses(this.selectedUser.UserID);
          break;
        case 'employment':
          this.loadEmploymentInfo(this.selectedUser.UserID);
          break;
        case 'certifications':
          this.loadCertifications(this.selectedUser.UserID);
          break;
      }
    }
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
    this.achievements = null;
    this.memberships = null;
    this.professionalLicenses = null;
    this.employmentInfo = null;
    this.certifications = null;
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page when applying filters
    this.loadActiveUsers();
  }

  onSearch(event: any): void {
    const searchTerm = event.target.value;
    this.searchSubject.next(searchTerm);
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
    if (this.campusId === null) {
      console.error('Cannot load users: Campus ID is null');
      return;
    }

    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      campusId: this.campusId
    };

    this.userService.getUsers(params).subscribe({
      next: (response) => {
        this.users = response.data;
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

  loadAchievements(userId: number): void {
    this.achievementAwardService.getAchievementsByUserId(userId).subscribe({
      next: (data) => {
        this.achievements = data;
      },
      error: (error) => {
        if (error.status !== 404) {
          console.error('Error loading achievements:', error);
        }
        this.achievements = [];
      }
    });
  }

  loadMemberships(userId: number): void {
    this.officershipMembershipService.getMembershipsByUserId(userId).subscribe({
      next: (data) => {
        this.memberships = data;
      },
      error: (error) => {
        if (error.status !== 404) {
          console.error('Error loading memberships:', error);
        }
        this.memberships = [];
      }
    });
  }

  loadProfessionalLicenses(userId: number): void {
    this.professionalLicenseService.getProfessionalLicenses(userId).subscribe({
      next: (data) => {
        this.professionalLicenses = data;
      },
      error: (error) => {
        if (error.status !== 404) {
          console.error('Error loading professional licenses:', error);
        }
        this.professionalLicenses = [];
      }
    });
  }

  loadEmploymentInfo(userId: number): void {
    this.employmentInformationService.getEmploymentInfo(userId).subscribe({
      next: (data) => {
        this.employmentInfo = data;
      },
      error: (error) => {
        if (error.status !== 404) {
          console.error('Error loading employment information:', error);
        }
        this.employmentInfo = null;
      }
    });
  }

  loadCertifications(userId: number): void {
    this.certificationService.getCertifications(userId).subscribe({
      next: (data) => {
        this.certifications = data;
      },
      error: (error) => {
        if (error.status !== 404) {
          console.error('Error loading certifications:', error);
        }
        this.certifications = [];
      }
    });
  }

  // Add this method to handle role selection changes
  onRoleChange(): void {
    console.log('Selected role:', this.selectedRole); // Debug log
    this.currentPage = 1; // Reset to first page
    this.loadActiveUsers();
  }
}
