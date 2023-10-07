const BASE_URL = 'https://clubs.reva.la';
export interface Court {
    name: string;
    establishmentId: number;
    link: string;
}

// TODO: Migrate to DynamoDB
export const courts: Court[] = [
    { name: 'PadelBo', establishmentId: 479, link: `${BASE_URL}/club-padelbo` },
    {
        name: 'Costanera Sur',
        establishmentId: 496,
        link: `${BASE_URL}/costanera-padel-club-sur`,
    },
    {
        name: 'Costanera Norte',
        establishmentId: 489,
        link: `${BASE_URL}/costanera-padel-club-norte`,
    },
    {
        name: 'Padel Lounge',
        establishmentId: 498,
        link: `${BASE_URL}/padel-lounge`,
    },
    {
        name: 'Santa Cruz Padel Club',
        establishmentId: 510,
        link: `${BASE_URL}/santa-cruz-padel-club`,
    },
    {
        name: 'Costanera Central',
        establishmentId: 518,
        link: `${BASE_URL}/costanera-padel-club-central`,
    },
    {
        name: 'Cape Padel',
        establishmentId: 519,
        link: `${BASE_URL}/cape-padel`,
    },
];
