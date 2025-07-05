import { FastifyReply } from 'fastify';

export interface ApiResponse<T = any> {
    status: number;
    message: string;
    data?: T;
    error?: string | object;
}

export const successResponse = <T>(status: number, message: string, data?: T): ApiResponse<T> => {
    return {
        status,
        message,
        data,
    };
};

export const errorResponse = (status: number, message: any, error?: string | object): ApiResponse => {
    return {
        status,
        message,
        error,
    };
};

export const sendSuccess = <T>(reply: FastifyReply, status: number, message: string, data?: T): void => {
    reply.status(status).send(successResponse(status, message, data));
};

export const sendError = (reply: FastifyReply, status: number, message: string, error?: string | object): void => {
    reply.status(status).send(errorResponse(status, message, error));
};