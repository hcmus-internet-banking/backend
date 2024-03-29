import { z } from 'zod';
import { catchAsync } from '../../../core/catchAsync';
import { TokenService } from '../../../lib/database/tokenService';
import { NotificationService } from '../../../lib/database/notifyService';

const readNotificationSchema = z.object({
  notificationId: z.preprocess(BigInt, z.bigint()),
});

export default catchAsync(async function handle(req, res) {
  const notificationId = readNotificationSchema.parse(req.query).notificationId;

  switch (req.method) {
    case 'PUT': {
      try {
        await Promise.all([
          TokenService.requireAuth(req),
          NotificationService.markNotificationAsRead(notificationId),
        ]);

        res.status(200).json({
          data: { message: 'Notification marked as read' },
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
      }
      break;
    }
    default:
      res.status(405).json({
        error: { message: 'Method not allowed' },
      });
  }
});
