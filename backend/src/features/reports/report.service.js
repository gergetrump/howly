import { Report } from './report.model.js';
import User from '../users/user.model.js';
import { sendUserReportEmail } from '../mail/mail.service.js';

function toPublicReport(report) {
  // Return only the fields the client needs after submission. The reporter id
  // stays server-side because the current UI only confirms the created report.
  return {
    id: report._id.toString(),
    reportedUser: report.reportedUser.toString(),
    tags: report.tags,
    message: report.message,
    attachment: report.attachment,
    emailSent: report.emailSent,
    createdAt: report.createdAt,
  };
}

export async function createReport({ reporterId, reportedUserId, message, tags, attachmentFile }) {
  if (reporterId === reportedUserId) {
    return { errorCode: 'CANNOT_REPORT_SELF' };
  }

  // Load both users before saving so reports cannot point to deleted or
  // non-existing users.
  const [reporter, reportedUser] = await Promise.all([
    User.findById(reporterId).select('username email firstName lastName').lean(),
    User.findById(reportedUserId).select('username email firstName lastName').lean(),
  ]);

  if (!reporter || !reportedUser) {
    return { errorCode: 'USER_NOT_FOUND' };
  }

  const attachment = attachmentFile
    ? {
      filename: attachmentFile.originalname,
      mimeType: attachmentFile.mimetype,
      size: attachmentFile.size,
    }
    : undefined;

  const report = await Report.create({
    reporter: reporterId,
    reportedUser: reportedUserId,
    tags,
    message,
    attachment,
  });

  // Report creation is the source of truth. Email delivery is tracked on the
  // report, but a skipped email does not discard the user's report.
  const emailResult = await sendUserReportEmail({
    report,
    reporter,
    reportedUser,
    attachmentFile,
  });

  report.emailSent = !emailResult?.skipped;
  await report.save();

  return { report: toPublicReport(report) };
}
