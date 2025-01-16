import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ObservationScheduleService } from '../services/observation-schedule.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CommonModule } from '@angular/common';
import { FullCalendarComponent } from '@fullcalendar/angular';
import { AuthService } from '../services/auth.service';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-calendar-view',
  templateUrl: './calendar-view.component.html',
  styleUrls: ['./calendar-view.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FullCalendarModule
  ]
})
export class CalendarViewComponent implements OnInit, AfterViewInit {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;
  calendarApi: any;
  selectedEvent: any;
  userId: number = 0;

  constructor(
    private scheduleService: ObservationScheduleService,
    private authService: AuthService
  ) {
    // Get user ID from token
    const token = this.authService.getToken();
    if (token) {
      const decoded: any = jwtDecode(token);
      this.userId = decoded.userId;
    }
  }

  ngAfterViewInit() {
    this.calendarApi = this.calendarComponent.getApi();
  }

  handleEventMount(info: any) {
    if (info && info.event) {
      console.log('Event mounted:', info.event);
    }
  }

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth'
    },
    events: [],
    // Time-specific settings for week and day views
    slotMinTime: '07:00:00',
    slotMaxTime: '17:00:00',
    slotDuration: '00:30:00',  // 30-minute slots
    allDaySlot: true,
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    // View-specific settings
    views: {
      dayGridMonth: {
        titleFormat: { year: 'numeric', month: 'long' },
        displayEventEnd: true,
      }
    },
    // Existing settings
    datesSet: (arg) => {
      if (arg) {
        console.log('datesSet triggered', arg);
      }
    },
    eventClick: (info) => {
      this.handleEventClick(info);
    },
    dateClick: (info) => {
      if (info) {
        console.log('Date clicked:', info);
      }
    },
    viewDidMount: (info) => {
      if (info) {
        console.log('View changed:', info);
      }
    },
    eventDidMount: (info) => {
      if (info && info.event) {
        console.log('Event mounted:', info.event);
      }
    },
    height: 'auto',
    weekends: true,
    editable: false,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    handleWindowResize: true,
    contentHeight: 'auto',
    fixedWeekCount: false,
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    eventDisplay: 'block',
    displayEventTime: true,
    displayEventEnd: true,
    eventContent: (arg) => {
      return {
        html: `
          <div class="fc-content">
            <div class="fc-time">${arg.timeText}</div>
            <div class="fc-title">${arg.event.title}</div>
          </div>
        `
      };
    }
  };

  // Add these methods to handle navigation
  handlePrev() {
    if (this.calendarApi) {
      this.calendarApi.prev();
    }
  }

  handleNext() {
    if (this.calendarApi) {
      this.calendarApi.next();
    }
  }

  handleToday() {
    if (this.calendarApi) {
      this.calendarApi.today();
    }
  }

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    // Get only faculty's schedules
    this.scheduleService.getFacultySchedules(this.userId).subscribe({
      next: (response) => {
        if (response && response.data) {
          const events: EventInput[] = response.data.map((schedule: any) => {
            const scheduleDate = schedule.ScheduledDate.split('T')[0];
            
            return {
              id: schedule.ScheduleID,
              title: schedule.Topic,
              start: `${scheduleDate}T${schedule.StartTime}`,
              end: `${scheduleDate}T${schedule.EndTime}`,
              backgroundColor: this.getStatusColor(schedule.Status),
              borderColor: this.getStatusColor(schedule.Status),
              extendedProps: {
                faculty: schedule.Faculty,
                subject: schedule.Subject,
                room: schedule.RoomNumber,
                status: schedule.Status
              },
              display: 'block'
            };
          });

          // Update calendar options with events
          this.calendarOptions = {
            ...this.calendarOptions,
            events: events
          };
        }
      },
      error: (error) => {
        console.error('Error loading faculty schedules:', error);
      }
    });
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'Pending':
        return '#FFA500'; // Orange
      case 'Completed':
        return '#4CAF50'; // Green
      case 'Cancelled':
        return '#F44336'; // Red
      default:
        return '#2196F3'; // Blue
    }
  }

  handleEventClick(info: any): void {
    const event = info.event;
    const faculty = event.extendedProps.faculty;
    
    this.selectedEvent = {
      title: event.title,
      faculty: `${faculty?.FirstName || ''} ${faculty?.LastName || ''}`,
      subject: event.extendedProps.subject,
      room: event.extendedProps.room,
      startTime: event.start?.toLocaleTimeString(),
      endTime: event.end?.toLocaleTimeString(),
      status: event.extendedProps.status
    };
    
    (document.getElementById('schedule-modal') as HTMLDialogElement).showModal();
  }

  handleDateSet(dateInfo: any) {
    console.log('Calendar date changed:', dateInfo);
  }

  handleViewChange(viewInfo: any) {
    console.log('Calendar view changed:', viewInfo);
  }

  handleButtonClick(buttonInfo: any) {
    console.log('Calendar button clicked:', buttonInfo);
  }
}
