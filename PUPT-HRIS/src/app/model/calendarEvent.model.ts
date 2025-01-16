export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    allDay?: boolean;
}