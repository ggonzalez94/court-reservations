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
}

export interface RevaResponse {
    start: string;
    end: string;
    fields: RevaField[];
    available_fields_count: number;
    default: boolean;
}

export interface RevaField {
    start: string;
    end: string;
    field_id: number;
    price: number;
    size: string;
    establishment_id: number;
    field_name: string;
    terrain_type: string;
    has_roof: boolean;
    field_picture_url: string;
    full_field_picture_url: string;
    available: boolean;
    reason: null | string;
    modality: null | string;
}

export interface RevaEstablishment {
    establishmentId: number;
    name: string;
    availableCourts: RevaResponse[];
}
