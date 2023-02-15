import { Meteor } from 'meteor/meteor';
import type { IMessage, IUser } from '@rocket.chat/core-typings';
import { Uploads } from '@rocket.chat/models';
import { AppInterface } from '@rocket.chat/apps-engine/definition/metadata';
import { api, Apps } from '@rocket.chat/core-services';

import { FileUpload } from '../../../file-upload/server';
import { settings } from '../../../settings/server';
import { Messages, Rooms } from '../../../models/server';
import { callbacks } from '../../../../lib/callbacks';

export const deleteMessage = async function (message: IMessage, user: IUser): Promise<void> {
	const deletedMsg = Messages.findOneById(message._id);
	const isThread = deletedMsg.tcount > 0;
	const keepHistory = settings.get('Message_KeepHistory') || isThread;
	const showDeletedStatus = settings.get('Message_ShowDeletedStatus') || isThread;

	if (deletedMsg) {
		const prevent = await Apps.triggerEvent(AppInterface.IPreMessageDeletePrevent, deletedMsg);
		if (prevent) {
			throw new Meteor.Error('error-app-prevented-deleting', 'A Rocket.Chat App prevented the message deleting.');
		}
	}

	if (deletedMsg.tmid) {
		Messages.decreaseReplyCountById(deletedMsg.tmid, -1);
	}

	const files = (message.files || [message.file]).filter(Boolean); // Keep compatibility with old messages

	if (keepHistory) {
		if (showDeletedStatus) {
			Messages.cloneAndSaveAsHistoryById(message._id, user);
		} else {
			Messages.setHiddenById(message._id, true);
		}

		for await (const file of files) {
			file?._id && (await Uploads.updateOne({ _id: file._id }, { $set: { _hidden: true } }));
		}
	} else {
		if (!showDeletedStatus) {
			Messages.removeById(message._id);
		}

		files.forEach((file) => {
			file?._id && FileUpload.getStore('Uploads').deleteById(file._id);
		});
	}

	const room = Rooms.findOneById(message.rid, { fields: { lastMessage: 1, prid: 1, mid: 1, federated: 1 } });
	callbacks.run('afterDeleteMessage', deletedMsg, room);

	// update last message
	if (settings.get('Store_Last_Message')) {
		if (!room.lastMessage || room.lastMessage._id === message._id) {
			Rooms.resetLastMessageById(message.rid, message._id);
		}
	}

	// decrease message count
	Rooms.decreaseMessageCountById(message.rid, 1);

	if (showDeletedStatus) {
		Messages.setAsDeletedByIdAndUser(message._id, user);
	} else {
		api.broadcast('notify.deleteMessage', message.rid, { _id: message._id });
	}

	Apps.triggerEvent(AppInterface.IPostMessageDeleted, [deletedMsg, user]);
};
