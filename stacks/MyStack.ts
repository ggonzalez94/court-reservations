import { StackContext, Api, Table } from 'sst/constructs';

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

    const api = new Api(stack, 'api', {
        defaults: {
            function: {
                bind: [cacheTable],
            },
        },
        routes: {
            'GET /': 'packages/functions/src/lambda.handler',
            'GET /courts': 'packages/functions/src/courts/get.handler',
        },
    });

    stack.addOutputs({
        CacheTable: cacheTable.tableName,
        ApiEndpoint: api.url,
    });
}
