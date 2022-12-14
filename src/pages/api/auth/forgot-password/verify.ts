import { z } from "zod";
import { catchAsync, validateSchema } from "../../../../core/catchAsync";
import { TokenService } from "../../../../lib/database/tokenService";

const forgotPassword = z.object({
  token: z.string(),
});

export default catchAsync(async function handle(req, res) {
  switch (req.method) {
    case "POST":
      validateSchema(forgotPassword, req.body);

      // eslint-disable-next-line no-case-declarations
      const { token } = forgotPassword.parse(req.body);
      const isValid = await TokenService.validateResetPasswordToken(token);
      if (!isValid) {
        res.status(400).json({
          error: { message: "Invalid token" },
        });
        return;
      }

      // extend more 15 minutes
      await TokenService.extendToken(token, 15);

      res.status(200).json({
        data: {
          message: "Token is valid",
        },
      });
      break;
    default:
      res.status(405).json({
        error: { message: "Method not allowed" },
      });
  }
});
