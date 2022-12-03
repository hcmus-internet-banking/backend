import { Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { z, ZodError } from "zod";
import { ApiError, BaseResponse } from "./baseResponse";

/// A function that validate the request body or query string
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: any) => {
  try {
    schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ApiError(error.message, 400, error);
    }
  }
};

export const catchAsync = (
  fn: (req: NextApiRequest, res: NextApiResponse<BaseResponse>) => Promise<void>
) => {
  return async (req: NextApiRequest, res: NextApiResponse<BaseResponse>) => {
    const stackTrace = new Error().stack;
    const isDev = process.env.NODE_ENV === "development";

    fn(req, res).catch((err) => {
      if (err instanceof ApiError) {
        return res.status(err.status).json({
          error: {
            message: err.message,
            stackTrace: isDev ? stackTrace : undefined,
            ...err.error,
          },
        } as any);
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        return res.status(400).json({
          error: {
            message: err.message,
            stackTrace: isDev ? stackTrace : undefined,
            ...err,
          },
        } as any);
      }

      return res.status(500).json({
        data: null,
        error: { message: err.message, data: err },
        stackTrace: isDev ? stackTrace : undefined,
      } as any);
    });
  };
};
