import type { ILivechatDepartment } from '@rocket.chat/core-typings';
import { useEndpoint, useTranslation } from '@rocket.chat/ui-contexts';
import { useCallback, useState } from 'react';

import { useScrollableRecordList } from '../../../hooks/lists/useScrollableRecordList';
import { useComponentDidUpdate } from '../../../hooks/useComponentDidUpdate';
import { RecordList } from '../../../lib/lists/RecordList';

type DepartmentsListOptions = {
	filter: string;
	departmentId?: string;
	onlyMyDepartments?: boolean;
	haveAll?: boolean;
	haveNone?: boolean;
	excludeDepartmentId?: string;
	enabled?: boolean;
	showArchived?: boolean;
};

export const useDepartmentsList = (
	options: DepartmentsListOptions,
): {
	itemsList: RecordList<ILivechatDepartment>;
	initialItemCount: number;
	reload: () => void;
	loadMoreItems: (start: number, end: number) => void;
} => {
	const t = useTranslation();
	const [itemsList, setItemsList] = useState(() => new RecordList<ILivechatDepartment>());
	const reload = useCallback(() => setItemsList(new RecordList<ILivechatDepartment>()), []);

	const getDepartments = useEndpoint('GET', '/v1/livechat/department');

	useComponentDidUpdate(() => {
		options && reload();
	}, [options, reload]);

	const fetchData = useCallback(
		async (start, end) => {
			const { departments, total } = await getDepartments({
				onlyMyDepartments: `${!!options.onlyMyDepartments}`,
				text: options.filter,
				offset: start,
				count: end + start,
				sort: `{ "name": 1 }`,
				excludeDepartmentId: options.excludeDepartmentId,
				enabled: options.enabled ? 'true' : 'false',
				showArchived: options.showArchived ? 'true' : 'false',
			});

			const items = departments
				.filter((department) => {
					if (options.departmentId && department._id === options.departmentId) {
						return false;
					}
					return true;
				})
				.map((department: any) => {
					if (department.archived) {
						department.name = `${department.name} [${t('Archived')}]`;
					}
					department._updatedAt = new Date(department._updatedAt);
					department.label = department.name;
					department.value = { value: department._id, label: department.name };
					return department;
				});

			options.haveAll &&
				items.unshift({
					label: t('All'),
					value: { value: 'all', label: t('All') },
					_updatedAt: new Date(),
				});

			options.haveNone &&
				items.unshift({
					label: t('None'),
					value: { value: '', label: t('None') },
					_updatedAt: new Date(),
				});

			return {
				items,
				itemCount: options.departmentId ? total - 1 : total,
			};
		},
		[
			getDepartments,
			options.onlyMyDepartments,
			options.filter,
			options.excludeDepartmentId,
			options.enabled,
			options.showArchived,
			options.haveAll,
			options.haveNone,
			options.departmentId,
			t,
		],
	);

	const { loadMoreItems, initialItemCount } = useScrollableRecordList(itemsList, fetchData, 25);

	return {
		reload,
		itemsList,
		loadMoreItems,
		initialItemCount,
	};
};
