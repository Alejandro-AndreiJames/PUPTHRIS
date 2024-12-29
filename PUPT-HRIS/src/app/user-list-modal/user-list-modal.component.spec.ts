import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserListModalComponent } from './user-list-modal.component';

describe('UserListModalComponent', () => {
  let component: UserListModalComponent;
  let fixture: ComponentFixture<UserListModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserListModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserListModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
