import { ApiHandler, useJsonBody } from 'sst/node/api';
import { Config } from 'sst/node/config';
import Joi from 'joi';
import OpenAI from 'openai';
import { GenerateCourtsInputResponse } from './types';
import { BadRequest, Success } from 'src/common/http-response';

export const handler = ApiHandler(async (event) => {
    const body = useJsonBody();
    console.log(JSON.stringify(body));

    // Validate request body
    const schema = Joi.array()
        .items(
            Joi.object({
                role: Joi.string().required(),
                content: Joi.string().required(),
            })
        )
        .required();

    const { error, value } = schema.validate(body);

    if (error) {
        return BadRequest(JSON.stringify(error.details));
    }

    const openai = new OpenAI({
        apiKey: Config.OpenAI_API_KEY,
    });
    //Build request to send to OpenAI
    const messages = [
        {
            role: 'system',
            content:
                'You are an assistant to help people book padel courts at their desired time, date and duration. You should try to extract the required parameters from the function call or ask them questions that will lead them to provide you those inputs. Make sure the user always provides both date and time as well as duration. Conversations will always be in spanish',
        },
        ...value,
    ];
    const functions = [
        {
            name: 'getCourts',
            description:
                'Get the courts available at a given time and date and for a given duration',
            parameters: {
                type: 'object',
                properties: {
                    date: {
                        type: 'string',
                        description:
                            'The date and time for which to get the courts in ISOISO8601 fromat and UTC-4 timezone',
                    },
                    duration: {
                        type: 'number',
                        description:
                            'The duration in minutes for which to get the courts.',
                    },
                },
                required: ['date', 'duration'],
            },
        },
    ];

    const openAiResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        functions: functions,
        function_call: 'auto', // auto is default, but we'll be explicit
    });
    console.log(JSON.stringify(openAiResponse));
    const responseMessage = openAiResponse.choices[0].message;

    const response = {
        message: responseMessage.content,
        parameters: responseMessage.function_call
            ? JSON.parse(responseMessage.function_call.arguments)
            : null,
        rawOpenAIResponse: openAiResponse,
    } as GenerateCourtsInputResponse;

    return Success(response);
});
