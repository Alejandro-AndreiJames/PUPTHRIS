export interface Ticket {
    TicketID?: number;
    UserID: number;
    Subject: string;
    Description: string;
    Status: 'open' | 'in-progress' | 'resolved' | 'closed';
    Priority: 'low' | 'medium' | 'high';
    Response?: string;
    RespondedBy?: number;
    Creator?: {
        UserID: number;
        FirstName: string;
        Surname: string;
        Email: string;
    };
    Responder?: {
        UserID: number;
        FirstName: string;
        Surname: string;
    };
    CreatedAt?: Date;
    UpdatedAt?: Date;
}