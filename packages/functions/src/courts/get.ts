import { ApiHandler, useQueryParams } from 'sst/node/api';
import axios from 'axios';
import { courts } from '@padel-reservations/core/courts';
import {
    RevaEstablishment,
    RevaResponse,
    AvailableEstablishment,
    GetCourtsRequest,
    GetCourtsResponse,
} from './types';
import dayjs from 'dayjs';
import Joi from 'joi';

export const handler = ApiHandler(async (event) => {
    // Validate the request
    const params = useQueryParams() as Partial<GetCourtsRequest>;
    const defaultDate = dayjs().add(1, 'hour').minute(0).second(0).format(); //default to next hour
    const defaultDuration = 60; //default to 60 minutes

    const queryParamSchema = Joi.object({
        duration: Joi.number().min(60).default(defaultDuration),
        date: Joi.date().min('now').default(defaultDate),
    });

    const { error, value } = queryParamSchema.validate(params);
    const { duration, date } = value as GetCourtsRequest;

    if (error) {
        //TODO: define 400 error response schema
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Invalid query parameters',
                details: error.details,
            }),
        };
    }

    const dateObj = dayjs(date);
    const establishments: RevaEstablishment[] = [];

    // Get the available courts for all establishments
    for (const court of courts) {
        const response = await getCourtsByEstablishment(
            dayjs(date).format('YYYY-MM-DD'), //pass only the date component to query the Reva Api
            duration,
            court.establishmentId
        );
        establishments.push({
            establishmentId: court.establishmentId,
            name: court.name,
            availableCourts: response,
        });
    }

    // Find the courts that are available at the desired time or closer to it
    const availableEstablishmentsAtTime = getAvailableEstablishmentsAtTime(
        establishments,
        dateObj
    );

    const response = {
        date: date,
        duration: duration,
        courts: availableEstablishmentsAtTime,
    } as GetCourtsResponse;

    console.log(JSON.stringify(response));

    return {
        statusCode: 200,
        body: JSON.stringify(response),
    };
});

function getAvailableEstablishmentsAtTime(
    establishments: RevaEstablishment[],
    date: dayjs.Dayjs
): AvailableEstablishment[] {
    const availableEstablishmentsAtTime: AvailableEstablishment[] = [];
    for (const establishment of establishments) {
        for (const schedule of establishment.availableCourts) {
            // Get the schedule that starts at the desired time
            const startDate = dayjs(schedule.start);
            if (date.isSame(startDate)) {
                // Get the number of available courts. TODO: Filter by other criterias
                const availableCourts = schedule.fields.filter(
                    (field) => field.available
                );
                availableEstablishmentsAtTime.push({
                    establishmentId: establishment.establishmentId,
                    name: establishment.name,
                    numberOfAvailableCourts: availableCourts.length,
                });
            }
        }
    }
    return availableEstablishmentsAtTime;
}

async function getCourtsByEstablishment(
    date: string,
    duration: number,
    establishmentId: number
): Promise<RevaResponse[]> {
    try {
        const payload = {
            establishment_id: establishmentId,
            duration: duration,
            date: date,
        };

        const apiUrl = 'https://clubs.reva.la/get-times';

        //TODO: Filter by only padel courts
        //TODO: retrieve x-xsrf-token and laravel_session dinamically
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                cookie: 'laravel_session=eyJpdiI6Ilp4cmFlRzVkRStUVHdQVDlwM1NPV3c9PSIsInZhbHVlIjoid29FRVpxakdjTVc2eWRmTC9tL0dCeWdrRk9uTjF1c1QvVGZ5dVBYN3pad0d0RVV3cmdYN001a3VadjU2UjE3NG82Tm8wb0NsVVAzY0s1YjRRMmFvazJnS3FyOVd1a2dJUGF5UEpZQTJlbVBVZE9aaHg5TWVDcVpXUEhpekxyWG0iLCJtYWMiOiIwYWIxYjIzZWIwYTFkZjY2NThjYWVmOTZhMjRhNTljYjI3NzY5NmYwZmJhNjIxZGQ4ZWM3ODM4OTI1Yjk0NWI3In0%3D',
                // Add any other headers you might need
                'x-xsrf-token':
                    'eyJpdiI6ImsvclpYN3YzYUp3ekNrYzU3ODFJMkE9PSIsInZhbHVlIjoiUHZoQlBCYzI1Vm4zTHJqQTA0QTZTaHBHVXBCMUJyQi9vbk00QitWQlVkQXFadmloYlB6NGVXZkE5NlZSendPZWRqQVBnR2hkRFl2aktveDBySnIvNEpTNE45TGVycUxrdVdVZ2V6WXZ4YjlFdW5KVkduWTdXYVVSMVNpcEt5K28iLCJtYWMiOiI3MmQ5YWM5YTIzN2ExZGFjZmNkOWNkZjE2YWQ0Mjg2N2Y3NmJlYjY2MGE0ZDdhYjBkNTM3MWQzNzU1M2U2NDgzIn0',
            },
        });
        return response.data as RevaResponse[];
    } catch (error) {
        return [];
    }
}
