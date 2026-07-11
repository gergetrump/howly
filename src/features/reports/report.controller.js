import * as reportService from './report.service.js';
import { validateCreateReportInput } from './report.validation.js';

const badRequest = (res, message, code) => {
  const body = { message };

  if (code) {
    body.code = code;
  }

  return res.status(400).json(body);
};

export async function createReport(req, res) {
  // Validate text/tags before the service stores the report or sends email.
  const { error, value } = validateCreateReportInput(req.body);

  if (error) {
    return badRequest(res, error);
  }

  try {
    const { report, errorCode } = await reportService.createReport({
      reporterId: req.user.id,
      reportedUserId: value.reportedUserId,
      message: value.message,
      tags: value.tags,
      attachmentFile: req.file,
    });

    if (errorCode === 'USER_NOT_FOUND') {
      return res.status(404).json({ message: 'User not found', code: errorCode });
    }

    if (errorCode) {
      return badRequest(res, 'Report could not be sent', errorCode);
    }

    return res.status(201).json({
      report,
      message: 'Thank you for your report. We will take a look at it and come back to you as soon as possible.',
    });
  } catch (err) {
    console.error('Failed to create report:', err);
    return res.status(500).json({ message: 'Failed to send report' });
  }
}
