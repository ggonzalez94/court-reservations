import { ApiHandler, useQueryParams } from 'sst/node/api';
import axios from 'axios';
import { Court, courts } from '@padel-reservations/core/courts';

export const handler = ApiHandler(async (event) => {
    // Validate the request
    const params = useQueryParams();
    const duration = params?.duration || '60'; //default to 60 minutes
    const durationAsNumber = parseInt(duration);
    const date = params?.date || new Date(new Date()).toISOString(); //default to today
    const availableCourts: any[] = [];

    // Get the available courts for all establishments
    for (const court of courts) {
        const response = await getAvailableCourtsByEstablishment(
            date,
            durationAsNumber,
            court.establishmentId
        );
        availableCourts.push(response);
    }

    // Find the courts that are available at the desired time or closer to it

    return {
        statusCode: 200,
        body: `Let's do Padel!!`,
    };
});

async function getAvailableCourtsByEstablishment(
    date: string,
    duration: number,
    establishmentId: number
): Promise<any> {
    try {
        const payload = {
            establishment_id: establishmentId,
            duration: duration,
            date: date,
        };

        // Replace the URL with your Laravel backend endpoint
        const apiUrl = 'https://clubs.reva.la/get-times';

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                cookie: 'intercom-id-zfp1tuwi=c4c97158-2103-439c-b4fa-0946c38e7f02; intercom-device-id-zfp1tuwi=eca57232-3c70-4c8f-a1ef-684bd74d72f0; intercom-session-zfp1tuwi=; XSRF-TOKEN=eyJpdiI6ImwxWTEvYXl3RFkvajlpeXNtM1haaHc9PSIsInZhbHVlIjoiTDdSbCtyMnYvNHhhVnZPZEtQS2RtMTAwTWJIaHRna2Y0NHI4RDhjSHNlT3NLOG9qRVA5QWlscCt6Z0V1ZmZadzBHRGlDL1JQSjJyZmVodjZmSGZtL2cvSXVnTkRsV2VkZ0MwbGtUVCtWR2NkckFzR2svdlpNam5USk1mU2xmU2ciLCJtYWMiOiIwZDc4M2EzYTM4N2Q1NjQwYTI3M2YwZjc1ZjlkODI1MzYwM2JiNmJkMmJjMjIwMDk1YmY0OTIzN2VlZWQ3NDI1In0%3D; laravel_session=eyJpdiI6IkhlalZPeTh1NHNSVkdNQncvNFl6a1E9PSIsInZhbHVlIjoidlh2Vitob1IwaXJVQndCTEl2ZjZNWWx4T3JXZ3JuY0NYT2xKdG05TjRTNlFGWklVNDRyTkJlU2hDTjhHT1hoOUxSalBzcHBPcWN6WjJFbmZEQ3dIRkEwR3dKejN1WGtrVXFqUy9KYm1GRkYyQjZMckZtR2Y5aHJJeUJWNUNFQ1UiLCJtYWMiOiIyNTViOTFmYjVjNDNiY2E2MzkyNjczYjIxZTQ3YzJlNDY4YTIwNTYxNGI2N2JlNmUxOWMyNGI1MTdkOGIwMjI4In0%3D',
                // Add any other headers you might need
                'x-xsrf-token':
                    'eyJpdiI6ImwxWTEvYXl3RFkvajlpeXNtM1haaHc9PSIsInZhbHVlIjoiTDdSbCtyMnYvNHhhVnZPZEtQS2RtMTAwTWJIaHRna2Y0NHI4RDhjSHNlT3NLOG9qRVA5QWlscCt6Z0V1ZmZadzBHRGlDL1JQSjJyZmVodjZmSGZtL2cvSXVnTkRsV2VkZ0MwbGtUVCtWR2NkckFzR2svdlpNam5USk1mU2xmU2ciLCJtYWMiOiIwZDc4M2EzYTM4N2Q1NjQwYTI3M2YwZjc1ZjlkODI1MzYwM2JiNmJkMmJjMjIwMDk1YmY0OTIzN2VlZWQ3NDI1In0',
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
    }
}
