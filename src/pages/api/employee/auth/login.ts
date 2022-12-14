import moment from "moment";
import { z } from "zod";
import { catchAsync, validateSchema } from "../../../../core/catchAsync";
import { env } from "../../../../core/env/server.mjs";
import { TokenService } from "../../../../lib/database/tokenService";
import { EmployeeService } from "../../../../lib/database/employeeService";

const loginValidate = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export default catchAsync(async function handle(req, res) {
  switch (req.method) {
    case "POST":
      validateSchema(loginValidate, req.body);

      const { email, password } = loginValidate.parse(req.body);

      const result = await EmployeeService.authenticateEmployee(
        email,
        password
      );

      const [refreshToken, accessToken] = await Promise.all([
        TokenService.generateToken({
          type: "ADMIN_REFRESH",
          expiredAt: moment()
            .add(env.REFRESH_TOKEN_EXPIRES_IN_DAYS, "days")
            .toDate(),
          employeeId: result.id,
        }).then((token) => token?.token),
        TokenService.generateAccessToken(
          { id: result.id, role: result.employeeType },
          env.ACCESS_TOKEN_EXPIRES_IN
        ),
      ]);

      res.status(200).json({
        data: {
          employee: result,
          tokens: {
            refreshToken: refreshToken,
            accessToken: accessToken,
          },
        },
      });
      break;
    default:
      res.status(405).json({
        error: { message: "Method not allowed" },
      });
  }
});
