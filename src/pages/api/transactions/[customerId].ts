import { z } from "zod";
import { catchAsync, validateSchema } from "../../../core/catchAsync";
import { EmployeeService } from "../../../lib/database/employeeService";
import { TokenService } from "../../../lib/database/tokenService";

const putEmployeeSchema = z.object({
  email: z.string().email().optional(),
  employeeType: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

export default catchAsync(async function handle(req, res) {
  const customerId = req.query.customerId as string;

  switch (req.method) {
    case "PUT": {
      // update employee
      const {
        payload: { id },
      } = await TokenService.requireEmployeeAuth(req, {
        requireAdmin: true,
      });

      const { employeeType, firstName, lastName, password, email } =
        validateSchema(putEmployeeSchema, req.body);

      const result = await EmployeeService.updateEmployee({
        id: req.query.employeeId as string,
        email,
        employeeType,
        firstName,
        lastName,
        password,
      });

      await EmployeeService.writeLog({
        employeeId: id,
        log: JSON.stringify({
          message: `Updated employee ${result.id}`,
          data: result,
        }),
        type: "EMPLOYEE_UPDATED",
      });

      res.status(200).json({ data: result });
    }

    case "DELETE": {
      // delete employee
      const {
        payload: { id },
      } = await TokenService.requireEmployeeAuth(req, {
        requireAdmin: true,
      });

      const result = await EmployeeService.deleteEmployee(
        req.query.employeeId as string
      );

      await EmployeeService.writeLog({
        employeeId: id,
        log: JSON.stringify({
          message: `Deleted employee ${result.id}`,
          data: result,
        }),
        type: "EMPLOYEE_DELETED",
      });

      res.status(200).json({ data: result });
    }

    default:
      res.status(405).json({
        error: { message: "Method not allowed" },
      });
  }
});
