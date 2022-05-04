import { PaginatedMultiSelectFiltered } from '@rocket.chat/fuselage';
import { useDebouncedValue } from '@rocket.chat/fuselage-hooks';
import React, { memo, useMemo, useState, ReactElement, forwardRef } from 'react';
import { Controller, Control } from 'react-hook-form';

import { useTranslation } from '../../../../client/contexts/TranslationContext';
import { useRecordList } from '../../../../client/hooks/lists/useRecordList';
import { AsyncStatePhase } from '../../../../client/hooks/useAsyncState';
import { useTagsList } from '../../hooks/useTagsList';

type AutoCompleteTagsProps = {
	value: string;
	onlyMyTags?: boolean;
	onchange: () => void;
	control: Control;
	name: string;
};

const AutoCompleteTagMultiple = forwardRef(function AutoCompleteTagMultiple({
	value,
	onlyMyTags = false,
	onChange = () => {},
	control,
	name,
}: AutoCompleteTagsProps): ReactElement {
	const t = useTranslation();
	const [tagsFilter, setTagsFilter] = useState('');

	const debouncedTagsFilter = useDebouncedValue(tagsFilter, 500);

	const { itemsList: tagsList, loadMoreItems: loadMoreTags } = useTagsList(
		useMemo(() => ({ filter: debouncedTagsFilter, onlyMyTags }), [debouncedTagsFilter, onlyMyTags]),
	);

	const { phase: tagsPhase, items: tagsItems, itemCount: tagsTotal } = useRecordList(tagsList);

	const sortedByName = tagsItems.sort((a, b) => {
		if (a.label > b.label) {
			return 1;
		}
		if (a.label < b.label) {
			return -1;
		}

		return 0;
	});

	return control ? (
		<Controller
			name={name}
			control={control}
			render={({ field }) => (
				<PaginatedMultiSelectFiltered
					{...field}
					filter={tagsFilter}
					setFilter={setTagsFilter as (value: string | number | undefined) => void}
					options={sortedByName}
					width='100%'
					flexShrink={0}
					flexGrow={0}
					placeholder={t('Select_an_option')}
					endReached={
						tagsPhase === AsyncStatePhase.LOADING
							? (): void => undefined
							: (start: number): void => loadMoreTags(start, Math.min(50, tagsTotal))
					}
				/>
			)}
		/>
	) : (
		<PaginatedMultiSelectFiltered
			value={value}
			onChange={onChange}
			filter={tagsFilter}
			setFilter={setTagsFilter as (value: string | number | undefined) => void}
			options={sortedByName}
			width='100%'
			flexShrink={0}
			flexGrow={0}
			placeholder={t('Select_an_option')}
			endReached={
				tagsPhase === AsyncStatePhase.LOADING
					? (): void => undefined
					: (start: number): void => loadMoreTags(start, Math.min(50, tagsTotal))
			}
		/>
	);
});

export default memo(AutoCompleteTagMultiple);
