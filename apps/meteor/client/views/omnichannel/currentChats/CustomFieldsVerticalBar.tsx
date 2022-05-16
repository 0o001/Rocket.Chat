// TODO
// DONE Add Router Usage
// DONE Move the logic from FilterByText to this component
// DONE Convert CustomFieldAssembler to ts and expose it
// DONE Review the logic of this file
// NO NEED Create a hook for the convertCustomFieldsToValidJSONFormat and rename it to something more appropriate
// Implement interfaces for different custom Fields

import { ILivechatCustomField } from '@rocket.chat/core-typings';
import { useTranslation, useRoute } from '@rocket.chat/ui-contexts';
import React, { FC } from 'react';

import OmnichannelCustomFieldsForm from '../../../components/Omnichannel/OmnichannelCustomFieldsForm';
import VerticalBar from '../../../components/VerticalBar';

type CustomFieldsVerticalBarProps = {
	customFields: ILivechatCustomField[];
	register: unknown;
	errors: unknown[];
};

const CustomFieldsVerticalBar: FC<CustomFieldsVerticalBarProps> = ({ customFields, register, errors }) => {
	console.log('CustomFieldsVerticalBar', customFields);

	const t = useTranslation();
	const currentChatsRoute = useRoute('omnichannel-current-chats');

	return (
		<VerticalBar>
			<VerticalBar.Header>
				{t('Filter_by_Custom_Fields')}
				<VerticalBar.Close onClick={(): void => currentChatsRoute.push({ context: '' })} />
			</VerticalBar.Header>
			<VerticalBar.ScrollableContent>
				<OmnichannelCustomFieldsForm customFields={customFields} register={register} errors={errors} />
			</VerticalBar.ScrollableContent>
		</VerticalBar>
	);
};

export default CustomFieldsVerticalBar;
