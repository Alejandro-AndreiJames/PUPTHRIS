import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObservationScheduleComponent } from './observation-schedule.component';

describe('ObservationScheduleComponent', () => {
  let component: ObservationScheduleComponent;
  let fixture: ComponentFixture<ObservationScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObservationScheduleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ObservationScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
