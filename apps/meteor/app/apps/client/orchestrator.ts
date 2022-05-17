import { AppClientManager } from '@rocket.chat/apps-engine/client/AppClientManager';
import { ISetting } from '@rocket.chat/core-typings';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';

import { dispatchToastMessage } from '../../../client/lib/toast';
import { hasAtLeastOnePermission } from '../../authorization/client';
import { settings } from '../../settings/client';
import { CachedCollectionManager } from '../../ui-cached-collection';
import { APIClient } from '../../utils/client';
import { AppWebsocketReceiver } from './communication';
import { handleI18nResources } from './i18n';
import { RealAppsEngineUIHost } from './RealAppsEngineUIHost';

const createDeferredValue = <T>(): [Promise<T>, (value: T | PromiseLike<T>) => void, (reason?: any) => void] => {
	let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
	let reject: (reason?: any) => void = () => undefined;

	const promise = new Promise<T>((_resolve, _reject) => {
		resolve = _resolve;
		reject = _reject;
	});

	return [promise, resolve as any, reject as any];
};

class AppClientOrchestrator {
	_appClientUIHost: RealAppsEngineUIHost;

	_manager: AppClientManager;

	isLoaded = false;

	deferredIsEnabled;

	setEnabled;

	ws: AppWebsocketReceiver;

	constructor() {
		this._appClientUIHost = new RealAppsEngineUIHost();
		this._manager = new AppClientManager(this._appClientUIHost);
		this.isLoaded = false;
		[this.deferredIsEnabled, this.setEnabled] = createDeferredValue<boolean>();
	}

	load = async (isEnabled: boolean): Promise<void> => {
		if (!this.isLoaded) {
			this.ws = new AppWebsocketReceiver();
			this.isLoaded = true;
		}

		this.setEnabled(isEnabled);

		// Since the deferred value (a promise) is immutable after resolved,
		// it need to be recreated to resolve a new value
		[this.deferredIsEnabled, this.setEnabled] = createDeferredValue<boolean>();

		await handleI18nResources();
		this.setEnabled(isEnabled);
	};

	getWsListener = (): AppWebsocketReceiver => this.ws;

	getAppClientManager = (): AppClientManager => this._manager;

	handleError = (error: unknown): void => {
		console.error(error);
		if (hasAtLeastOnePermission(['manage-apps'])) {
			dispatchToastMessage({
				type: 'error',
				message: (error as Error).message,
			});
		}
	};

	isEnabled = (): Promise<boolean> => this.deferredIsEnabled;

	getApps = async (): Promise<unknown> => {
		const { apps } = await APIClient.get('apps');
		return apps;
	};

	getAppsFromMarketplace = async (): Promise<unknown> => {
		const appsOverviews = await APIClient.get('apps', { marketplace: 'true' });
		return appsOverviews.map(
			({
				latest,
				price,
				pricingPlans,
				purchaseType,
				isEnterpriseOnly,
				modifiedAt,
			}: {
				latest: {};
				price: number;
				pricingPlans: string;
				purchaseType: string;
				isEnterpriseOnly: boolean;
				modifiedAt: Date;
			}) => ({
				...latest,
				price,
				pricingPlans,
				purchaseType,
				isEnterpriseOnly,
				modifiedAt,
			}),
		);
	};

	getAppsOnBundle = async (bundleId: string): Promise<unknown> => {
		const { apps } = await APIClient.get(`apps/bundles/${bundleId}/apps`);
		return apps;
	};

	getAppsLanguages = async (): Promise<[]> => {
		const { apps } = await APIClient.get('apps/languages');
		return apps;
	};

	getApp = async (appId: string): Promise<unknown> => {
		const { app } = await APIClient.get(`apps/${appId}`);
		return app;
	};

	getAppFromMarketplace = async (appId: string, version: string): Promise<unknown> => {
		const { app } = await APIClient.get(`apps/${appId}`, {
			marketplace: 'true',
			version,
		});
		return app;
	};

	getLatestAppFromMarketplace = async (appId: string, version: string): Promise<unknown> => {
		const { app } = await APIClient.get(`apps/${appId}`, {
			marketplace: 'true',
			update: 'true',
			appVersion: version,
		});
		return app;
	};

	getAppSettings = async (appId: string): Promise<unknown> => {
		const { settings } = await APIClient.get(`apps/${appId}/settings`);
		return settings;
	};

	setAppSettings = async (appId: string, settings: ISetting): Promise<unknown> => {
		const { updated } = await APIClient.post(`apps/${appId}/settings`, undefined, { settings });
		return updated;
	};

	getAppApis = async (appId: string): Promise<unknown> => {
		const { apis } = await APIClient.get(`apps/${appId}/apis`);
		return apis;
	};

	getAppLanguages = async (appId: string): Promise<unknown> => {
		const { languages } = await APIClient.get(`apps/${appId}/languages`);
		return languages;
	};

	installApp = async (appId: string, version: string, permissionsGranted: string[]): Promise<unknown> => {
		const { app } = await APIClient.post('apps/', {
			appId,
			marketplace: true,
			version,
			permissionsGranted,
		});
		return app;
	};

	updateApp = async (appId: string, version: string, permissionsGranted: string[]): Promise<unknown> => {
		const { app } = await APIClient.post(`apps/${appId}`, {
			appId,
			marketplace: true,
			version,
			permissionsGranted,
		});
		return app;
	};

	uninstallApp = (appId: string): Promise<unknown> => APIClient.delete(`apps/${appId}`);

	syncApp = (appId: string): Promise<unknown> => APIClient.post(`apps/${appId}/sync`);

	setAppStatus = async (appId: string, status: string): Promise<string> => {
		const { status: effectiveStatus } = await APIClient.post(`apps/${appId}/status`, { status });
		return effectiveStatus;
	};

	/* deprecated */
	screenshots = (appId: string): Promise<{ screenshots: unknown[] }> => APIClient.get(`apps/${appId}/screenshots`);

	/* deprecated */
	enableApp = (appId: string): Promise<string> => this.setAppStatus(appId, 'manually_enabled');

	/* deprecated */
	disableApp = (appId: string): Promise<string> => this.setAppStatus(appId, 'manually_disabled');

	/* deprecated */
	buildExternalUrl = (appId: string, purchaseType = 'buy', details = false): Promise<unknown> =>
		APIClient.get('apps', {
			buildExternalUrl: 'true',
			appId,
			purchaseType,
			details,
		});

	getCategories = async (): Promise<unknown> => {
		const categories = await APIClient.get('apps', { categories: 'true' });
		return categories;
	};

	getUIHost = (): RealAppsEngineUIHost => this._appClientUIHost;
}

export const Apps = new AppClientOrchestrator();

Meteor.startup(() => {
	CachedCollectionManager.onLogin(() => {
		Meteor.call('apps/is-enabled', (error: unknown, isEnabled: boolean) => {
			if (error) {
				Apps.handleError(error);
				return;
			}

			Apps.getAppClientManager().initialize();
			Apps.load(isEnabled);
		});
	});

	Tracker.autorun(() => {
		const isEnabled = settings.get('Apps_Framework_enabled');
		Apps.load(isEnabled);
	});
});
