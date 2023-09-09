const Success = <T>(data: T) => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };
};

const BadRequest = (error: string) => {
    return {
        statusCode: 400,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
    };
};

const NotFound = (error: string) => {
    return {
        statusCode: 404,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
    };
};

export { Success, BadRequest, NotFound };
