import { StackContext, Api } from 'sst/constructs';

export function API({ stack }: StackContext) {
    const api = new Api(stack, 'api', {
        defaults: {
            function: {
                bind: [],
            },
        },
        routes: {
            'GET /': 'packages/functions/src/lambda.handler',
            'GET /courts': 'packages/functions/src/courts/get.handler',
        },
    });

    stack.addOutputs({
        ApiEndpoint: api.url,
    });
}
