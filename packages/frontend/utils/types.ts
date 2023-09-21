export interface GenerateCourtsInputResponse {
    message: string;
    parameters: {
        date: string;
        duration: number;
    };
}

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
    numberOfAvailableCourts: number;
    reservationLink: string;
}
