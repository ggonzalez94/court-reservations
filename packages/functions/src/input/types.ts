export interface GenerateCourtsInputResponse {
    message: string;
    parameters: {
        date: string;
        duration: number;
    };
    rawOpenAIResponse: any; // We use this one to concatenate the messages and provide a better experience in the frontend
}
