import { validateSchema } from "../../../core/catchAsync";
import { RecipientService } from "../../../lib/database/recipientService";
import { z } from "zod";
import { catchAsync } from "../../../core/catchAsync";
import { TokenService } from "../../../lib/database/tokenService";
import { ApiError } from "../../../core/baseResponse";

const updateRecipientSchema = z.object({
  mnemonicName: z.string().optional(),
});

export default catchAsync(async function handle(req, res) {
  const recipientId = req.query.recipientId as string;

  switch (req.method) {
    case "DELETE": {
      const {
        payload: { id },
      } = await TokenService.requireAuth(req);

      const canDelete = await RecipientService.canDeleteRecipient(
        recipientId,
        id
      );

      if (!canDelete) {
        throw new ApiError("You can't delete this recipient", 403);
      }

      const result = await RecipientService.deleteRecipient(recipientId);

      res.status(200).json({ data: result });
      break;
    }
    case "GET": {
      const {
        payload: { id },
      } = await TokenService.requireAuth(req);

      const canGet = await RecipientService.canGetRecipient(recipientId, id);

      if (!canGet) {
        throw new ApiError("You can't get this recipient", 403);
      }

      const recipients = await RecipientService.getRecipientById(recipientId);

      res.status(200).json({ data: recipients });
      break;
    }
    case "PUT": {
      const {
        payload: { id },
      } = await TokenService.requireAuth(req);

      validateSchema(updateRecipientSchema, req.body);

      const canUpdate = await RecipientService.canUpdateRecipient(
        recipientId,
        id
      );

      if (!canUpdate) {
        throw new ApiError("You can't update this recipient", 403);
      }

      const mnemonicName = req.body.mnemonicName as string;

      const recipient = await RecipientService.updateRecipient(recipientId, {
        mnemonicName,
      });

      res.status(200).json({ data: recipient });
      break;
    }

    default:
      res.status(405).json({
        error: { message: "Method not allowed" },
      });
  }
});
