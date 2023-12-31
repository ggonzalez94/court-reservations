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

// Use dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/La_Paz');

const EXPIRY_TIME = 600; // 10 minutes
const CACHE_KEY = 'establishments';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const handler = ApiHandler(async (event) => {
    console.log('Starting request...');
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
    console.log('Getting all courts...');
    const establishments = await getAllCourts(date, duration);

    // Find the courts that are available at the desired time
    console.log('Filtering establishments by time...');
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
            key: `${CACHE_KEY}-${dayjs
                .tz(date)
                .format('YYYY-MM-DD')}-${duration}}`,
        },
    };
    const result = await dynamoDb.get(getParams).promise();
    if (result.Item) {
        //Serve directly from the cache
        return JSON.parse(result.Item.data) as Establishment[];
    }
    console.log('Cache is empty. Retrieving data from Reva...');
    // Create a cookie jar
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));

    await client.get(`${baseUrl}/costanera-padel-club-sur`); //It can be any club. We just need to get the cookies

    // Get the available courts for all establishments
    for (const court of courts) {
        const response = await getCourtsByEstablishment(
            dayjs.tz(date).format('YYYY-MM-DD'), //Pass only the date component to query the Reva Api
            duration,
            court.establishmentId,
            jar
        );
        establishments.push({
            establishmentId: court.establishmentId,
            name: court.name,
            availableCourts: response,
            link: court.link,
        });
    }

    // If there's any available field store in the cache before returning
    if (
        establishments.some(
            (establishment) => establishment.availableCourts.length > 0
        )
    ) {
        const putParams = {
            TableName: Table.Cache.tableName,
            Item: {
                key: `${CACHE_KEY}-${dayjs
                    .tz(date)
                    .format('YYYY-MM-DD')}-${duration}}`,
                data: JSON.stringify(establishments),
                expiresAt: Math.floor(Date.now() / 1000) + EXPIRY_TIME, // EXPIRY_TIME from now
            },
        };
        await dynamoDb.put(putParams).promise();
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

        const cookies = jar.getCookiesSync(`${baseUrl}/`);
        const xsrfToken = cookies.find((cookie) => cookie.key === 'XSRF-TOKEN');
        const revaSession = cookies.find(
            (cookie) => cookie.key === 'reva_session'
        );
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                cookie: `reva_session=${revaSession?.value}`,
                'x-xsrf-token': xsrfToken?.value.slice(0, -3), //Remove the %3D at the end
            },
        });

        //Exclude all soccer fields(Reva only provides the size to differentiate between padel and soccer)
        const filteredResponse: RevaResponse[] = response.data.map(
            (response: RevaResponse) => {
                const updatedFields = response.fields.filter(
                    (field) => field.size !== '7v7'
                );
                return {
                    ...response,
                    fields: updatedFields,
                };
            }
        );
        return filteredResponse;
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
                    reservationLink: establishment.link,
                });
            }
        }
    }
    return availableEstablishmentsAtTime;
}
