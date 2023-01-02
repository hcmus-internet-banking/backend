import { sendEmail } from "../nodemailer";
import { TokenService } from "./tokenService";
import { defaultCustomerSelector } from "./customerService";
import { ApiError, PagingResponse } from "../../core/baseResponse";
import { Prisma, TokenType } from "@prisma/client";
import { prisma } from "../prisma";
import moment from "moment";
import { env } from "../../core/env/server.mjs";

export class TransactionService {
  static defaultSelector: Prisma.TransactionSelect = {
    amount: true,
    createdAt: true,
    fromCustomer: { select: defaultCustomerSelector },
    toCustomer: { select: defaultCustomerSelector },
    // recipient: { select: RecipientService.defaultSelector },
    message: true,
    id: true,
    type: true,
  };

  static createTransaction = async (
    recipient: Prisma.TransactionCreateInput
  ) => {
    try {
      return await prisma.transaction.create({
        data: recipient,
      });
    } catch (error) {
      // P2002
      if (error.code === "P2002") {
        throw new ApiError("Invalid recipient", 400);
      }

      throw new ApiError("Something went wrong", 500);
    }
  };

  static getTransactionsByCustomerId = async (
    customerId: string,
    type: string,
    offset = 0,
    limit = 10
  ) => {
    try {
      let dataResult = [];
      if (type === "sent") {
        dataResult = await Promise.all([
          prisma.transaction.findMany({
            where: {
              fromCustomerId: customerId,
            },
            select: TransactionService.defaultSelector,
            skip: offset,
            take: limit,
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.transaction.count({
            where: {
              fromCustomerId: customerId,
            },
          }),
        ]);
      } else if (type === "received") {
        dataResult = await Promise.all([
          prisma.transaction.findMany({
            where: {
              toCustomerId: customerId,
            },
            select: TransactionService.defaultSelector,
            skip: offset,
            take: limit,
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.transaction.count({
            where: {
              toCustomerId: customerId,
            },
          }),
        ]);
      } else {
        dataResult = await Promise.all([
          prisma.transaction.findMany({
            // where: {
            //   fromCustomerId: customerId,
            // },
            where: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              OR: [
                {
                  fromCustomerId: customerId,
                },
                {
                  toCustomerId: customerId,
                },
              ],
            },
            select: TransactionService.defaultSelector,
            skip: offset,
            take: limit,
            orderBy: {
              createdAt: "desc",
            },
          }),
          prisma.transaction.count({
            where: {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              OR: [
                {
                  fromCustomerId: customerId,
                },
                {
                  toCustomerId: customerId,
                },
              ],
            },
          }),
        ]);
      }

      const [transactions, total] = dataResult;

      const result: PagingResponse = {
        data: transactions,
        metadata: {
          total: total,
          page: Math.floor(offset / limit) + 1,
          limit: limit,
          hasNextPage: offset + limit < total,
          hasPrevPage: offset > 0,
        },
      };

      return result;
    } catch (error) {
      return [];
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static canGetTransaction = async (transactionId: string, id: string) => {
    // TODO: Change later to match the need
    return true;
  };

  static generateTransactionToken = async (customerId: string) => {
    // if there is an existing token just in time
    // return that token
    const existingToken = await prisma.token.findFirst({
      where: {
        type: TokenType.TRANSFER,
        expiredAt: {
          gte: new Date(),
        },
      },
    });

    if (existingToken && existingToken.expiredAt > new Date()) {
      throw new ApiError(
        `Please wait ${moment(existingToken.expiredAt).fromNow()}`,
        400
      );
    }

    const result = await TokenService.generateToken({
      type: TokenType.TRANSFER,
      customerId,
      expiredAt: moment()
        .add(env.TRANSFER_TOKEN_EXPIRES_IN_MINUTE, "minutes")
        .toDate(),
    });
    const userEmail = (
      await prisma.customer.findFirst({
        where: {
          id: customerId,
        },
        select: {
          email: true,
        },
      })
    ).email;

    sendEmail({
      to: userEmail,
      subject: "Transfer token",
      html: `Your transfer token is ${result.token}`,
    });

    return result;
  };

  static verifyTransactionToken = async (token: string) => {
    // return true if token is valid
    const transactionToken = await prisma.token
      .findFirstOrThrow({
        where: {
          token: token,
          type: TokenType.TRANSFER,
          expiredAt: {
            gte: new Date(),
          },
        },
      })
      .catch(() => {
        throw new ApiError("Invalid token", 400);
      });

    if (
      !transactionToken.expiredAt ||
      transactionToken.expiredAt < new Date()
    ) {
      throw new ApiError("Token expired", 400);
    }

    return transactionToken;
  };
}
