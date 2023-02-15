import type { IReport } from '@rocket.chat/core-typings';
import Ajv from 'ajv';

const ajv = new Ajv({ coerceTypes: true });

// Define the type of the request body of call to hide the reported message

export type ArchiveReportProps = {
	reportId: IReport['_id'];
	actionTaken?: string;
	messageId?: IReport['message']['_id'];
	reasonForHiding?: string;
};

const ArchiveReportPropsSchema = {
	type: 'object',
	properties: {
		reportId: {
			type: 'string',
		},
		messageId: {
			type: 'string',
			nullable: true,
		},
		reasonForHiding: {
			type: 'string',
			nullable: true,
		},
		actionTaken: {
			type: 'string',
			nullable: true,
		},
	},
	required: ['reportId'],
	additionalProperties: false,
};

export const isArchiveReportProps = ajv.compile<ArchiveReportProps>(ArchiveReportPropsSchema);
