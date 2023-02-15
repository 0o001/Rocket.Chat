/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { AppStatus } from '@rocket.chat/apps-engine/definition/AppStatus';
import { AppStatusUtils } from '@rocket.chat/apps-engine/definition/AppStatus';
import type { ISetting } from '@rocket.chat/core-typings';
import type { IStreamer } from 'meteor/rocketchat:streamer';
import type { IAppStorageItem } from '@rocket.chat/apps-engine/server/storage';
import { Apps, AppsManager } from '@rocket.chat/core-services';

import { SystemLogger } from '../../../../server/lib/logger/system';
import notifications from '../../../notifications/server/lib/Notifications';

export enum AppEvents {
	APP_ADDED = 'app/added',
	APP_REMOVED = 'app/removed',
	APP_UPDATED = 'app/updated',
	APP_STATUS_CHANGE = 'app/statusUpdate',
	APP_SETTING_UPDATED = 'app/settingUpdated',
	COMMAND_ADDED = 'command/added',
	COMMAND_DISABLED = 'command/disabled',
	COMMAND_UPDATED = 'command/updated',
	COMMAND_REMOVED = 'command/removed',
	ACTIONS_CHANGED = 'actions/changed',
}
export class AppServerListener {
	engineStreamer: IStreamer;

	clientStreamer: IStreamer;

	received;

	constructor(engineStreamer: IStreamer, clientStreamer: IStreamer, received: Map<any, any>) {
		this.engineStreamer = engineStreamer;
		this.clientStreamer = clientStreamer;
		this.received = received;

		this.engineStreamer.on(AppEvents.APP_STATUS_CHANGE, this.onAppStatusUpdated.bind(this));
		this.engineStreamer.on(AppEvents.APP_REMOVED, this.onAppRemoved.bind(this));
		this.engineStreamer.on(AppEvents.APP_UPDATED, this.onAppUpdated.bind(this));
		this.engineStreamer.on(AppEvents.APP_ADDED, this.onAppAdded.bind(this));
		this.engineStreamer.on(AppEvents.ACTIONS_CHANGED, this.onActionsChanged.bind(this));

		this.engineStreamer.on(AppEvents.APP_SETTING_UPDATED, this.onAppSettingUpdated.bind(this));
		this.engineStreamer.on(AppEvents.COMMAND_ADDED, this.onCommandAdded.bind(this));
		this.engineStreamer.on(AppEvents.COMMAND_DISABLED, this.onCommandDisabled.bind(this));
		this.engineStreamer.on(AppEvents.COMMAND_UPDATED, this.onCommandUpdated.bind(this));
		this.engineStreamer.on(AppEvents.COMMAND_REMOVED, this.onCommandRemoved.bind(this));
	}

	async onAppAdded(appId: string): Promise<void> {
		await AppsManager.loadOne(appId);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_ADDED, appId);
	}

	async onAppStatusUpdated({ appId, status }: { appId: string; status: AppStatus }): Promise<void> {
		const app = await AppsManager.getOneById(appId);

		if (!app || app.getStatus() === status) {
			return;
		}

		this.received.set(`${AppEvents.APP_STATUS_CHANGE}_${appId}`, {
			appId,
			status,
			when: new Date(),
		});

		if (AppStatusUtils.isEnabled(status)) {
			await AppsManager.enable(appId).catch(SystemLogger.error);
			this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_STATUS_CHANGE, { appId, status });
		} else if (AppStatusUtils.isDisabled(status)) {
			await AppsManager.disable(appId).catch(SystemLogger.error);
			this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_STATUS_CHANGE, { appId, status });
		}
	}

	async onAppSettingUpdated({ appId, setting }: { appId: string; setting: ISetting }): Promise<void> {
		this.received.set(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting._id}`, {
			appId,
			setting,
			when: new Date(),
		});
		await AppsManager.updateAppSetting(appId, setting as any);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_SETTING_UPDATED, { appId });
	}

	async onAppUpdated(appId: string): Promise<void> {
		this.received.set(`${AppEvents.APP_UPDATED}_${appId}`, { appId, when: new Date() });

		const storageItem = (await Apps.retrieveOneFromStorage(appId)) as IAppStorageItem; // maybe we should verify if items exists?

		const appPackage = (await Apps.fetchAppSourceStorage(storageItem)) as Buffer; // maybe we should verify if items exists?

		await AppsManager.updateLocal(storageItem, appPackage);

		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_UPDATED, appId);
	}

	async onAppRemoved(appId: string): Promise<void> {
		const app = await AppsManager.getOneById(appId);

		if (!app) {
			return;
		}

		await AppsManager.removeLocal(appId);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_REMOVED, appId);
	}

	async onCommandAdded(command: string): Promise<void> {
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_ADDED, command);
	}

	async onCommandDisabled(command: string): Promise<void> {
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_DISABLED, command);
	}

	async onCommandUpdated(command: string): Promise<void> {
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_UPDATED, command);
	}

	async onCommandRemoved(command: string): Promise<void> {
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_REMOVED, command);
	}

	async onActionsChanged(): Promise<void> {
		this.clientStreamer.emitWithoutBroadcast(AppEvents.ACTIONS_CHANGED);
	}
}

export class AppServerNotifier {
	engineStreamer: IStreamer;

	clientStreamer: IStreamer;

	received: Map<any, any>;

	listener: AppServerListener;

	constructor() {
		this.engineStreamer = notifications.streamAppsEngine;

		// This is used to broadcast to the web clients
		this.clientStreamer = notifications.streamApps;

		this.received = new Map();
		this.listener = new AppServerListener(this.engineStreamer, this.clientStreamer, this.received);

		Apps.runOnAppEvent(this);
	}

	async appAdded(appId: string): Promise<void> {
		this.engineStreamer.emit(AppEvents.APP_ADDED, appId);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_ADDED, appId);
	}

	async appRemoved(appId: string): Promise<void> {
		this.engineStreamer.emit(AppEvents.APP_REMOVED, appId);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_REMOVED, appId);
	}

	async appUpdated(appId: string): Promise<void> {
		if (this.received.has(`${AppEvents.APP_UPDATED}_${appId}`)) {
			this.received.delete(`${AppEvents.APP_UPDATED}_${appId}`);
			return;
		}

		this.engineStreamer.emit(AppEvents.APP_UPDATED, appId);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_UPDATED, appId);
	}

	async appStatusChange(appId: string, status: AppStatus): Promise<void> {
		if (this.received.has(`${AppEvents.APP_STATUS_CHANGE}_${appId}`)) {
			const details = this.received.get(`${AppEvents.APP_STATUS_CHANGE}_${appId}`);
			if (details.status === status) {
				this.received.delete(`${AppEvents.APP_STATUS_CHANGE}_${appId}`);
				return;
			}
		}

		this.engineStreamer.emit(AppEvents.APP_STATUS_CHANGE, { appId, status });
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_STATUS_CHANGE, { appId, status });
	}

	async appSettingUpdated(appId: string, setting: ISetting): Promise<void> {
		if (this.received.has(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting._id}`)) {
			this.received.delete(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting._id}`);
			return;
		}

		this.engineStreamer.emit(AppEvents.APP_SETTING_UPDATED, { appId, setting });
		this.clientStreamer.emitWithoutBroadcast(AppEvents.APP_SETTING_UPDATED, { appId });
	}

	async commandAdded(command: string): Promise<void> {
		this.engineStreamer.emit(AppEvents.COMMAND_ADDED, command);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_ADDED, command);
	}

	async commandDisabled(command: string): Promise<void> {
		this.engineStreamer.emit(AppEvents.COMMAND_DISABLED, command);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_DISABLED, command);
	}

	async commandUpdated(command: string): Promise<void> {
		this.engineStreamer.emit(AppEvents.COMMAND_UPDATED, command);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_UPDATED, command);
	}

	async commandRemoved(command: string): Promise<void> {
		this.engineStreamer.emit(AppEvents.COMMAND_REMOVED, command);
		this.clientStreamer.emitWithoutBroadcast(AppEvents.COMMAND_REMOVED, command);
	}

	async actionsChanged(): Promise<void> {
		this.clientStreamer.emitWithoutBroadcast(AppEvents.ACTIONS_CHANGED);
	}
}
