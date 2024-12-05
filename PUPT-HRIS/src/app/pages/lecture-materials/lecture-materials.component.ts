import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LectureMaterialService } from '../../services/lecture-material.service';
import { LectureMaterial } from '../../model/lecture-material.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lecture-materials',
  templateUrl: './lecture-materials.component.html',
  styleUrls: ['./lecture-materials.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LectureMaterialsComponent implements OnInit {
  materials: LectureMaterial[] = [];
  materialForm: FormGroup;
  isEditing = false;
  currentMaterialId: number | null = null;
  showModal = false;
  selectedFile: File | null = null;
  s3Config: any;

  constructor(
    private fb: FormBuilder, 
    private lectureMaterialService: LectureMaterialService
  ) {
    this.materialForm = this.fb.group({
      Title: ['', Validators.required],
      Description: [''],
      ReferenceLink: ['']
    });
  }

  ngOnInit(): void {
    this.loadMaterials();
    this.loadS3Config();
  }

  loadMaterials(): void {
    this.lectureMaterialService.getLectureMaterials().subscribe({
      next: (materials) => this.materials = materials,
      error: (error) => console.error('Error loading materials:', error)
    });
  }

  loadS3Config(): void {
    this.lectureMaterialService.getS3Config().subscribe({
      next: (config) => this.s3Config = config,
      error: (error) => console.error('Error loading S3 config:', error)
    });
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onSubmit(): void {
    if (this.materialForm.valid) {
      const formData = new FormData();
      Object.keys(this.materialForm.value).forEach(key => {
        formData.append(key, this.materialForm.value[key]);
      });

      if (this.selectedFile) {
        formData.append('file', this.selectedFile);
      }

      if (this.isEditing && this.currentMaterialId !== null) {
        this.lectureMaterialService.updateLectureMaterial(this.currentMaterialId, formData).subscribe({
          next: () => this.loadMaterials(),
          error: (error) => console.error('Error updating material:', error)
        });
      } else {
        this.lectureMaterialService.addLectureMaterial(formData).subscribe({
          next: () => this.loadMaterials(),
          error: (error) => console.error('Error adding material:', error)
        });
      }
      this.resetForm();
      this.toggleModal();
    }
  }

  editMaterial(material: LectureMaterial): void {
    this.isEditing = true;
    this.currentMaterialId = material.LectureID || null;
    this.materialForm.patchValue({
      Title: material.Title,
      Description: material.Description,
      ReferenceLink: material.ReferenceLink
    });
    this.toggleModal();
  }

  deleteMaterial(id: number): void {
    this.lectureMaterialService.deleteLectureMaterial(id).subscribe({
      next: () => this.loadMaterials(),
      error: (error) => console.error('Error deleting material:', error)
    });
  }

  downloadFile(filePath: string): void {
    if (this.s3Config && filePath) {
      const url = `https://${this.s3Config.bucketName}.s3.${this.s3Config.region}.amazonaws.com/${filePath}`;
      window.open(url, '_blank');
    }
  }

  resetForm(): void {
    this.isEditing = false;
    this.currentMaterialId = null;
    this.materialForm.reset();
    this.selectedFile = null;
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
    if (!this.showModal) {
      this.resetForm();
    }
  }
}
