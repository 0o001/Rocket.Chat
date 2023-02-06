import type { IReport, IMessage } from '@rocket.chat/core-typings';
import type { Document, FindCursor, UpdateResult } from 'mongodb';

import type { FindPaginated, IBaseModel } from './IBaseModel';

export interface IReportsModel extends IBaseModel<IReport> {
	createWithMessageDescriptionAndUserId(
		message: IMessage,
		description: string,
		userId: string,
	): ReturnType<IBaseModel<IReport>['insertOne']>;

	findReportsBetweenDates(
		latest: Date,
		oldest: Date,
		offset?: number,
		count?: number,
		sort?: any,
		selector?: string,
	): FindPaginated<FindCursor<IReport>>;

	findReportsByRoom(roomId: string, offset?: number, count?: number, sort?: any, selector?: string): FindPaginated<FindCursor<IReport>>;

	findReportsByUser(userId: string, offset?: number, count?: number, sort?: any, selector?: string): FindPaginated<FindCursor<IReport>>;

	findReportsByMessageId(
		messageId: IReport['message']['_id'],
		offset?: number,
		count?: number,
		sort?: any,
		selector?: string,
	): FindPaginated<FindCursor<IReport>>;

	findReportsAfterDate(latest: Date, offset?: number, count?: number, sort?: any, selector?: string): FindPaginated<FindCursor<IReport>>;

	findReportsBeforeDate(oldest: Date, offset?: number, count?: number, sort?: any, selector?: string): FindPaginated<FindCursor<IReport>>;

	hideReportById(reportId: IReport['_id'], userId: string): Promise<UpdateResult | Document>;

	hideReportsByMessageId(messageId: IReport['message']['_id'], userId: string): Promise<UpdateResult | Document>;
}
