import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client.js";
import { Response } from "express";
import type { ApiError } from "@repo/shared";

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientInitializationError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
    catch(
        exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientInitializationError, 
        host: ArgumentsHost
    ) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = "An unexpected database error occurred!";
        let code = "DATABASE_ERROR"

        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            switch (exception.code) {
                case "P1001":
                case "P1017":
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                    message = "Database is currently unreachable!";
                    code = "DATABASE_UNREACHABLE";
                    break;
                case "P2002":
                    status = HttpStatus.CONFLICT;
                    let targetField = (exception.meta?.target as string[])?.join(", ");

                    if (!targetField && exception.meta?.driverAdapterError) {
                        const adapterError = exception.meta.driverAdapterError as any;
                        const originalMessage = adapterError?.cause?.originalMessage || "";

                        const match = originalMessage.match(/"\w+_(\w+)_key"/);
                        if (match && match[1]) {
                            targetField = match[1];
                        }
                    }
                    else if (!targetField) {
                        targetField = "field";
                    }

                    message = `This ${targetField} is already taken!`;
                    code = `${targetField.toUpperCase()}_ALREADY_TAKEN`;
                    break;
                case "P2025":
                    status = HttpStatus.NOT_FOUND;
                    message = "Resource not found!";
                    code = "RESOURCE_NOT_FOUND";
                    break;
            }
        }
        else if (exception instanceof Prisma.PrismaClientInitializationError) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
            message = "Database initialization failed!";
            code = "DATABASE_INIT_FAILURE";
        }

        res.status(status).json({
            status: status,
            message: message,
            code: code
        } satisfies ApiError)
    }
}