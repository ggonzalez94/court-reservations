import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import dayjs from 'dayjs';
import Joi from 'joi';
import { ApiHandler, useQueryParams } from 'sst/node/api';
import { courts } from '@padel-reservations/core/courts';
import { baseUrl } from '../reva/constants';
import {
    AvailableEstablishment,
    GetCourtsRequest,
    GetCourtsResponse,
} from './types';
import { RevaResponse, Establishment } from '../reva/types';

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
    const { duration, date } = value as GetCourtsRequest;
    const dateObj = dayjs(date);

    //Get all available courts at that date
    const establishments = await getAllCourts(date, duration);

    // Find the courts that are available at the desired time
    const availableEstablishmentsAtTime = getAvailableEstablishmentsAtTime(
        establishments,
        dateObj
    );

    const response = {
        date: date,
        duration: duration,
        courts: availableEstablishmentsAtTime,
    } as GetCourtsResponse;

    return {
        statusCode: 200,
        body: JSON.stringify(response),
    };
});

//TODO: Cache this for x minutes to avoid querying the Reva API too often
async function getAllCourts(
    date: string,
    duration: number
): Promise<Establishment[]> {
    const establishments: Establishment[] = [];
    // Create a cookie jar
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));

    await client.get(`${baseUrl}/club-padelbo`); //It can be any club. We just need to get the cookies

    // Get the available courts for all establishments
    for (const court of courts) {
        const response = await getCourtsByEstablishment(
            dayjs(date).format('YYYY-MM-DD'), //Pass only the date component to query the Reva Api
            duration,
            court.establishmentId,
            jar
        );
        establishments.push({
            establishmentId: court.establishmentId,
            name: court.name,
            availableCourts: response,
        });
    }
    return establishments;
}

async function getCourtsByEstablishment(
    date: string,
    duration: number,
    establishmentId: number,
    jar: CookieJar
): Promise<RevaResponse[]> {
    try {
        const payload = {
            establishment_id: establishmentId,
            duration: duration,
            date: date,
        };

        const apiUrl = `${baseUrl}/get-times`;

        //TODO: Filter by only padel courts
        const cookies = jar.getCookiesSync(`${baseUrl}/`);
        const xsrfToken = cookies.find((cookie) => cookie.key === 'XSRF-TOKEN');
        const laravelSession = cookies.find(
            (cookie) => cookie.key === 'laravel_session'
        );
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                cookie: `laravel_session=${laravelSession?.value}`,
                'x-xsrf-token': xsrfToken?.value.slice(0, -3), //Remove the %3D at the end
            },
        });
        return response.data as RevaResponse[];
    } catch (error) {
        return [];
    }
}

function getAvailableEstablishmentsAtTime(
    establishments: Establishment[],
    date: dayjs.Dayjs
): AvailableEstablishment[] {
    const availableEstablishmentsAtTime: AvailableEstablishment[] = [];
    for (const establishment of establishments) {
        for (const schedule of establishment.availableCourts) {
            // Get the schedule that starts at the desired time
            const startDate = dayjs(schedule.start);
            if (date.isSame(startDate)) {
                // Get the number of available courts.
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
