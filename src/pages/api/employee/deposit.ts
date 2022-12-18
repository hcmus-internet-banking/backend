import { z } from "zod";
import { catchAsync, validateSchema } from "../../../core/catchAsync";
import { EmployeeService } from "../../../lib/database/employeeService";
import { TokenService } from "../../../lib/database/tokenService";

// deposit
const postEmployeeSchema = z.object({
  bankNumber: z.string().min(9).max(9),
  amount: z.preprocess(BigInt, z.bigint()).refine((amount) => amount > 0),
  message: z.string().optional(),
});

export default catchAsync(async function handle(req, res) {
  switch (req.method) {
    case "POST": {
      // create employee
      const {
        payload: { id },
      } = await TokenService.requireEmployeeAuth(req, {
        requireEmployee: true,
        requireAdmin: true,
      });

      const { bankNumber, amount, message } = validateSchema(
        postEmployeeSchema,
        req.body
      );

      const result = await EmployeeService.deposit({
        amount: amount as bigint,
        bankNumber,
        employeeId: id,
        message,
      });

      res.status(200).json({ data: result });
    }

    default:
      res.status(405).json({
        error: { message: "Method not allowed" },
      });
  }
});