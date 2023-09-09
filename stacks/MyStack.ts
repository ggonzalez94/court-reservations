import { StackContext, Api, Table, Config } from 'sst/constructs';

export function API({ stack }: StackContext) {
    // Use DynamoDB as a serverless cache
    const cacheTable = new Table(stack, 'Cache', {
        fields: {
            key: 'string', // Partition Key
            data: 'string', // Cached data
            expiresAt: 'number', // For TTL
        },
        primaryIndex: {
            partitionKey: 'key',
        },
        timeToLiveAttribute: 'expiresAt',
    });

    // Secrets
    const OPENAI_API_KEY = new Config.Secret(stack, 'OpenAI_API_KEY');

    // API
    const api = new Api(stack, 'api', {
        defaults: {
            function: {
                bind: [cacheTable],
            },
        },
        routes: {
            'GET /': 'packages/functions/src/lambda.handler',
            'GET /courts': 'packages/functions/src/courts/get.handler',
            'POST /courts-input': {
                function: {
                    handler:
                        'packages/functions/src/input/generate-court-input.handler',
                    bind: [OPENAI_API_KEY],
                },
            },
        },
    });

    stack.addOutputs({
        CacheTable: cacheTable.tableName,
        ApiEndpoint: api.url,
    });
}
