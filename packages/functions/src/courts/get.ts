import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Joi from 'joi';
import AWS from 'aws-sdk';
import { ApiHandler, useQueryParams } from 'sst/node/api';
import { Table } from 'sst/node/table';
import { courts } from '@padel-reservations/core/courts';
import { baseUrl } from '../reva/constants';
import {
    AvailableEstablishment,
    GetCourtsRequest,
    GetCourtsResponse,
} from './types';
import { RevaResponse, Establishment } from '../reva/types';
import { BadRequest, Success } from 'src/common/http-response';

const EXPIRY_TIME = 600; // 10 minutes
const CACHE_KEY = 'establishments';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

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
        return BadRequest(JSON.stringify(error.details));
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

    return Success(response);
});

async function getAllCourts(
    date: string,
    duration: number
): Promise<Establishment[]> {
    const establishments: Establishment[] = [];
    //TODO: The cache should include the duration and the date
    const getParams = {
        TableName: Table.Cache.tableName,
        Key: {
            key: CACHE_KEY,
        },
    };
    const result = await dynamoDb.get(getParams).promise();
    if (result.Item) {
        //Serve directly from the cache
        return JSON.parse(result.Item.data) as Establishment[];
    }
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

    // Store in the cache before returning
    const putParams = {
        TableName: Table.Cache.tableName,
        Item: {
            key: CACHE_KEY,
            data: JSON.stringify(establishments),
            expiresAt: Math.floor(Date.now() / 1000) + EXPIRY_TIME, // EXPIRY_TIME from now
        },
    };
    await dynamoDb.put(putParams).promise();
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
        console.error(`Error retrieving data for court ${establishmentId}:`);
        console.error(error);
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
            dayjs.extend(utc);
            dayjs.extend(timezone);
            const startDate = dayjs.tz(schedule.start, 'America/La_Paz'); //The time retrieved from the api does not have timezone
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
