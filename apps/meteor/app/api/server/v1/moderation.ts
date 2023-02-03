import { isReportHistoryProps, isArchiveReportProps } from '@rocket.chat/rest-typings';
import { Reports } from '@rocket.chat/models';

import { API } from '../api';

API.v1.addRoute(
	'moderation.getReports',
	{
		authRequired: true,
		validateParams: isReportHistoryProps,
		permissionsRequired: ['view-moderation-console'],
	},
	{
		async get() {
			const { latest, oldest } = this.queryParams;

			const { count = 20, offset = 0 } = this.getPaginationItems();
			const { sort, query } = this.parseJsonQuery();

			const { cursor, totalCount } = oldest
				? Reports.findReportsBetweenDates(latest ? new Date(latest) : new Date(), new Date(oldest), offset, count, sort, query)
				: Reports.findReportsBeforeDate(latest ? new Date(latest) : new Date(), offset, count, sort, query);

			const [reports, total] = await Promise.all([cursor.toArray(), totalCount]);

			return API.v1.success({
				reports,
				count: reports.length,
				offset,
				total,
			});
		},
	},
);

API.v1.addRoute(
	'moderation.markChecked',
	{
		authRequired: true,
		validateParams: isArchiveReportProps,
		hasPermission: 'manage-moderation-actions',
	},
	{
		async post() {
			const { reportId } = this.requestParams();

			const { userId } = this;

			const reportDoc = await Reports.findOneById(reportId);

			if (!reportDoc) {
				return API.v1.failure('Report not found');
			}

			if (reportDoc._hidden) {
				return API.v1.failure('Report is already hidden');
			}

			const update = await Reports.hideReportById(reportId, userId);

			const report = await Reports.findOneById(reportId);

			return API.v1.success({ report, update });
		},
	},
);

API.v1.addRoute(
	'moderation.reportsByMessage',
	{
		authRequired: true,
	},
	{
		async get() {
			const { msgId } = this.queryParams;

			const { count = 20, offset = 0 } = this.getPaginationItems();
			const { sort, query } = this.parseJsonQuery();

			if (!msgId) {
				return API.v1.failure('The required "msgId" query param is missing.');
			}

			const { cursor, totalCount } = Reports.findReportsByMessageId(msgId, offset, count, sort, query);

			const [reports, total] = await Promise.all([cursor.toArray(), totalCount]);

			return API.v1.success({
				reports,
				count: reports.length,
				offset,
				total,
			});
		},
	},
);
