import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LectureMaterialsComponent } from './lecture-materials.component';

describe('LectureMaterialsComponent', () => {
  let component: LectureMaterialsComponent;
  let fixture: ComponentFixture<LectureMaterialsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LectureMaterialsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LectureMaterialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
