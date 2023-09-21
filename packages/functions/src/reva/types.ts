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

export interface Establishment {
    establishmentId: number;
    name: string;
    link: string;
    availableCourts: RevaResponse[];
}
