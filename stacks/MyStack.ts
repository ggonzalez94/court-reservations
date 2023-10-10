import { StackContext, Api, Table, Config, NextjsSite } from 'sst/constructs';

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
                timeout: 30, // API Gateway timeout is 21s - so this is more than enough
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

    const site = new NextjsSite(stack, 'site', {
        path: 'packages/frontend',
        environment: {
            NEXT_PUBLIC_API_BASE_URL: api.url,
        },
    });

    stack.addOutputs({
        CacheTable: cacheTable.tableName,
        ApiEndpoint: api.url,
        SiteUrl: site.url,
    });
}
