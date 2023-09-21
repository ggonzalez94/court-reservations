export interface GetCourtsRequest {
    duration: number;
    date: string;
}

export interface GetCourtsResponse {
    date: string;
    duration: number;
    courts: AvailableEstablishment[];
}

export interface AvailableEstablishment {
    establishmentId: number;
    name: string;
    reservationLink: string;
    numberOfAvailableCourts: number;
}
