import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, LogManager } from 'aurelia-framework';
import { HttpClient } from 'aurelia-http-client';

import { EncryptTools } from 'utils/encrypt-tools';
import { API_CODES } from './api-codes';
import { AppStore } from './app-store';
import { ERROR_MESSAGES } from './error-messages';
import { ACTIONS } from './event-constants';
import HttpInterceptor from './http-interceptor';
import { JsSipController } from './JsSipController';
import { OplogService } from './oplog-service';
import { StateService } from './state-service';
import { LogController } from 'services/LogController';

const logger = LogManager.getLogger('ApiService');
declare var __APP_VERSION__: string;

@autoinject()
export class ApiService {

  static get ANONYMOUS_TOKEN() {
    return 'Bearer ';// updated for public repo
  }

  private oplogSubscriptions: Array<any> = [];
  private countryRegionMap = new Map([
    ['US','usw2'],
    ['ZA','za'],
    ['AT','euw1'],
    ['BE','euw1'],
    ['EE','euw1'],
    ['ES','euw1'],
    ['FI','euw1'],
    ['FR','euw1'],
    ['DE','euw1'],
    ['GR','euw1'],
    ['IE','euw1'],
    ['IT','euw1'],
    ['LV','euw1'],
    ['LT','euw1'],
    ['LU','euw1'],
    ['MT','euw1'],
    ['NL','euw1'],
    ['PT','euw1'],
    ['SK','euw1'],
    ['SI','euw1']
  ]);
  private countryRegionMapDev1 = new Map([
    ['US','usw2'],
    ['ZA','za'],
    ['AT','eu'],
    ['BE','eu'],
    ['EE','eu'],
    ['ES','eu'],
    ['FI','eu'],
    ['FR','eu'],
    ['DE','eu'],
    ['GR','eu'],
    ['IE','eu'],
    ['IT','eu'],
    ['LV','eu'],
    ['LT','eu'],
    ['LU','eu'],
    ['MT','eu'],
    ['NL','eu'],
    ['PT','eu'],
    ['SK','eu'],
    ['SI','eu']
  ]);

  constructor(
    private httpClient: HttpClient,
    private aureliaConfiguration: AureliaConfiguration,
    private stateService: StateService,
    private oplogService: OplogService,
    private jsSipController: JsSipController,
    private appStore: AppStore,
    private logController: LogController,
    eventAggregator: EventAggregator
  ) {
    // @ts-ignore;
    const env = this.aureliaConfiguration.environment;
    const apiEndpoint = this.aureliaConfiguration.obj[env].base;
    this.setEndpoint(apiEndpoint);

    eventAggregator.subscribe(ACTIONS.ERROR.MEDIA_DEVICE, () => this.reportError(API_CODES.INVALID_MEDIA_DEVICE, 'Invalid Media Device'));
    eventAggregator.subscribe(ACTIONS.ERROR.INCOMING_CALL_POP, () => this.reportError(API_CODES.INCOMING_CALL_POP, 'Incoming call pop error'));
    eventAggregator.subscribe(ACTIONS.ERROR.MEDIA_DEVICE_CHANGE, () => this.reportMediaDevice());

    eventAggregator.subscribe(ACTIONS.SIP.RECONNECT, () => this.reconnectSip());
    eventAggregator.subscribe(ACTIONS.OPLOG.RECONNECT, () => this.subscribeOplogSubscriptions());
    eventAggregator.subscribe(ACTIONS.LOG.INFO, (data: any) => this.logInfo(data));
    eventAggregator.subscribe(ACTIONS.LOG.ERROR, (data: any) => this.logError(data));
    eventAggregator.subscribe(ACTIONS.LOG.AUDIT, (data: any) => this.audit(data));

    eventAggregator.subscribe(ACTIONS.SIP.CALL.NOTIFIED, (interactionId: string) => this.reportCallNotified(interactionId));
    eventAggregator.subscribe(ACTIONS.SIP.CALL.ANSWERED, (interactionId: string) => this.reportCallAnswer(interactionId));
    eventAggregator.subscribe(ACTIONS.SIP.CALL.CONFIRMED, (data: { callInfo: { call_id: string }}) => this.reportCallConnected(data.callInfo.call_id));
    eventAggregator.subscribe(ACTIONS.SIP.CALL.FAILED, (data: { interactionId: string, cause: string, reasonCode: string }) => {
      if (data.cause === 'Canceled') {
        this.reportCallCancelled(data.interactionId);
      } else if (data.cause === 'Rejected') {
        this.reportCallRejected(data.interactionId);
      }
    });
  }

  private setEndpoint(apiEndpoint: string): void {
    this.httpClient.configure(req => {
      req.withBaseUrl(apiEndpoint);
      // @ts-ignore
      req.withInterceptor(new HttpInterceptor(this.http, this.sessionStore, this.diagnosticsState));
    });
  }

  private setHeader(token: string): void {
    this.httpClient.configure(req => {
      req.withHeader('Authorization', token);
    });
  }

  public login(email: string, clearTextPassword: string): void {
    const ENCRYPTED_PASSWORD = EncryptTools.encrypt(clearTextPassword);
    const params = { email, password: ENCRYPTED_PASSWORD };

    this.stateService.triggerLogin.attempt();
    this.reportLoggedIn(false);
    this.httpClient.createRequest('v1/user/passports/authenticate')
      .asPut()
      .withContent(params)
      .send()
      .then((response: any) => {
        response.memberId = response.userAccessRoles.filter(_role => {
          return _role.memberId;
        })[0].memberId;
        this.stateService.triggerLogin.success(response);
        this.initiateMember(response);
        this.reportLoggedIn(true);
      })
      .catch((error) => {
        this.stateService.triggerLogin.failed(ERROR_MESSAGES.AUTH.FAILURE);
        this.reportError(API_CODES.LOGIN_FAILED, error);
      });
  }

  public loginWithToken(accessCode: string, setOffDuty: boolean): void {
    
    this.stateService.triggerLogin.attempt();
    this.reportLoggedIn(false);
    this.httpClient.createRequest('v1/user/passports/authenticate-with-access-code')
      .asPut()
      .withContent({ accessCode })
      .send()
      .then((response: any) => {
        response.memberId = response.userAccessRoles.filter(_role => {
          return _role.memberId;
        })[0].memberId;
        this.stateService.triggerLogin.success(response);
        this.initiateMember(response, setOffDuty);
        this.reportLoggedIn(true);
      })
      .catch((error) => {
        parent.postMessage('webphone-auth-failed', '*');
        this.stateService.triggerLogin.failed(ERROR_MESSAGES.AUTH.FAILURE);
        this.reportError(API_CODES.LOGIN_FAILED, error);
      });
  }

  public async initiateMember(response: any, setOffDuty?: boolean): Promise<void> {
    this.setHeader('Bearer ' + response.token);
    const memberId = response.memberId;
    const personId = response.personId;
    const userId = response.userId;

    try {
      const device = await this.fetchDevice(memberId);
      this.fetchUser(personId);
      this.fetchOrganisation();
      this.fetchRoutingStatus(memberId);
      this.fetchRoutingStatusActivity(memberId);
      this.fetchMemberActivity(memberId);
      this.fetchSelectedPresence(userId);
      this.fetchPresences();
      this.fetchActiveInteractions(memberId);
      this.fetchFeatureflags();
      this.fetchVersion();

      this.appStore.onPartialOnline('api-service', () => {
        if (this.appStore.connectionStopped) {
          return;
        }
        try {
          if (setOffDuty) {
            if (this.appStore.routingStatus === 'Ready') {
              this.initiateSip(device);
              return;
            }
            const memberId = response.memberId;
            this.subscribeToRoutingStatus(memberId, () => {
              this.initiateSip(device);
            });

            this.changeRoutingStatus('READY');
            return;
          }
          this.initiateSip(device);
        } catch(e) {
          console.error('WP | ERROR ', e);
          this.stateService.triggerLogin.failed(ERROR_MESSAGES.TELEPHONY.REGISTRATION_ERROR);
        }
      });
      this.initiateOplog(userId);
    } catch(e) {
      console.error('WP | initialise member failed ', e);
    }
  }

  private fetchDevice(memberId: string): any {
    this.stateService.triggerDevice.attempt();
    this.stateService.triggerInteractionFlows.attempt();
    return new Promise((resolve, reject) => {
      this.httpClient.createRequest(`v1/organisation/members/${memberId}/profiles`)
        .asGet()
        .send()
        .then((response) => {
          this.stateService.triggerDevice.success(response);
          this.stateService.triggerInteractionFlows.success(response);
          resolve(response);
        })
        .catch((error) => {
          this.stateService.triggerLogin.failed(ERROR_MESSAGES.AUTH.FAILURE);
          this.stateService.triggerInteractionFlows.failed(error);
          reject(error);
        });
    });
  }
  private subscribeToInteractionFlows(memberId: string): any {
    let interactionFlowsOplog = this.oplogService.subscribeOn('_id', memberId).in('member-projector.displayMemberProfileView');
    interactionFlowsOplog.on('update', data => {
      logger.debug('WP | update received :: subscribeToInteractionFlows:', data);
      if (data) {
        this.stateService.triggerInteractionFlows.oplog(data);
      }
    });
    this.oplogSubscriptions.push(interactionFlowsOplog);
  }
  
  private fetchUser(personId: string): any {
    this.stateService.triggerUser.attempt();
    this.httpClient.createRequest(`v1/user/persons/profile-information/${personId}`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerUser.success(response))
      .catch((error) => this.stateService.triggerUser.failed(error));
  }
  
  private fetchOrganisation(): any {
    this.stateService.triggerOrganisation.attempt();
    this.httpClient.createRequest('v1/organisation/organisations/me/information')
      .asGet()
      .send()
      .then((response) => this.stateService.triggerOrganisation.success(response))
      .catch((error) => this.stateService.triggerOrganisation.failed(error));
  }

  private fetchRoutingStatus(memberId: string): void {
    this.stateService.triggerRoutingStatus.attempt();
    this.httpClient.createRequest(`v1/organisation/members/${memberId}/routing-status`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerRoutingStatus.success(response))
      .catch((error) => this.stateService.triggerRoutingStatus.failed(error));
  }
  private routingStatusChangeCallback;
  private subscribeToRoutingStatus(memberId: string, callback?: Function): any {
    if (callback) {
      this.routingStatusChangeCallback = callback;
    }
    let routingStatusOplog = this.oplogService.subscribeOn('_id', memberId).in('member-projector.displayRoutingStatusView');
    routingStatusOplog.on('update', data => {
      logger.debug('WP | update received :: subscribeToRoutingStatus');
      if (data) {
        if (this.routingStatusChangeCallback) {
          this.routingStatusChangeCallback();
          delete this.routingStatusChangeCallback;
        }
        this.stateService.triggerRoutingStatus.oplog(data);
      }
    });
    this.oplogSubscriptions.push(routingStatusOplog);
  }
  
  private fetchRoutingStatusActivity(memberId: string): void {
    this.stateService.triggerRoutingStatusActivity.attempt();
    this.httpClient.createRequest(`v1/organisation/members/${memberId}/activity-routability`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerRoutingStatusActivity.success(response))
      .catch((error) => this.stateService.triggerRoutingStatusActivity.failed(error));
  }
  private subscribeToRoutingStatusActivity(memberId: string): any {
    let routingStatusActivityOplog = this.oplogService.subscribeOn('_id', memberId).in('member-projector.activityRoutabilityView');
    routingStatusActivityOplog.on('update', data => {
      logger.debug('WP | update received :: subscribeToRoutingStatusActivity', data);
      if (data) {
        this.stateService.triggerRoutingStatusActivity.oplog(data);
      }
    });
    this.oplogSubscriptions.push(routingStatusActivityOplog);
  }
  
  private fetchMemberActivity(memberId: string): void {
    this.stateService.triggerMemberActivity.attempt();
    this.httpClient.createRequest(`v1/organisation/members/${memberId}/activity`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerMemberActivity.success(response))
      .catch((error) => this.stateService.triggerMemberActivity.failed(error));
  }
  private subscribeToMemberActivity(memberId: string): any {
    let memberActivityOplog = this.oplogService.subscribeOn('_id', memberId).in('member-projector.displayMemberActivityView');
    memberActivityOplog.on('update', data => {
      logger.debug('WP | update received :: subscribeToMemberActivity', data);
      if (data) {
        if (data.activity === 'Not Responding') {
          this.logError({ errorCode: data.activity });
        }
        this.stateService.triggerMemberActivity.oplog(data);
      }
    });
    this.oplogSubscriptions.push(memberActivityOplog);
  }

  private fetchSelectedPresence(userId: string): void {
    this.stateService.triggerSelectedPresence.attempt();
    this.httpClient.createRequest(`v1/user/users/${userId}/presence`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerSelectedPresence.success(response))
      .catch((error) => this.stateService.triggerSelectedPresence.failed(error));
  }
  private subscribeToSelectedPresence(userId: string): any {
    let selectedPresenceOplog = this.oplogService.subscribeOn('_id', userId).in('passport-projector.displayPresenceView');
    selectedPresenceOplog.on('update', data => {
      logger.debug('WP | update received :: subscribeToSelectedPresence', data);
      if (data) {
        this.stateService.triggerSelectedPresence.oplog(data);
      }
    });
    this.oplogSubscriptions.push(selectedPresenceOplog);
  }
  
  private fetchPresences(): void {
    this.stateService.triggerPresences.attempt();
    this.httpClient.createRequest(`v1/user/users/presences`)
      .asGet()
      .send()
      .then((response: any) => this.stateService.triggerPresences.success(response))
      .catch((error) => this.stateService.triggerPresences.failed(error));
  }
  
  private fetchActiveInteractions(memberId: string): void {
    this.stateService.triggerActiveInteractions.attempt();
    this.httpClient.createRequest(`v1/organisation/interactions/members/${memberId}/interactions`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerActiveInteractions.success(response))
      .catch((error) => this.stateService.triggerActiveInteractions.failed(error));
  }
  private subscribeToActiveInteractionsOplog(memberId): any {
    let activeInteractionsOplog = this.oplogService.subscribeOn('_id', memberId).in('interaction-projector.memberInteractionsView');
    activeInteractionsOplog.on('update', data => {
      logger.debug('WP | update received :: activeInteractionsOplog', data);
      if (data) {
        this.stateService.triggerActiveInteractions.oplog(data);
      }
    });
    this.oplogSubscriptions.push(activeInteractionsOplog);
  }

  private fetchFeatureflags(): void {
    this.fetchAutoAnswerFeatureFlag();
    this.fetchIncomingCallPopFlag();
    this.fetchSharedLogoutFlag();
    this.fetchLogsFlag();
    this.fetchForcedLogsFlag();
  }
  private fetchAutoAnswerFeatureFlag(): void {
    this.httpClient.createRequest(`v1/unleash/featureflags/autoAnswer`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerFeatureFlag.autoAnswer.success(response))
      .catch((error) => this.stateService.triggerFeatureFlag.autoAnswer.failed(error));
  }
  private fetchIncomingCallPopFlag(): void {
    this.httpClient.createRequest(`v1/unleash/featureflags/incomingCallPop`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerFeatureFlag.incomingCallPop.success(response))
      .catch((error) => this.stateService.triggerFeatureFlag.incomingCallPop.failed(error));
  }
  private fetchSharedLogoutFlag(): void {
    this.httpClient.createRequest(`v1/unleash/featureflags/sharedLogOut`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerFeatureFlag.sharedLogout.success(response))
      .catch((error) => this.stateService.triggerFeatureFlag.sharedLogout.failed(error));
  }
  private fetchLogsFlag(): void {
    this.httpClient.createRequest(`v1/unleash/featureflags/logs`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerFeatureFlag.logs.success(response))
      .catch((error) => this.stateService.triggerFeatureFlag.logs.failed(error));
  }
  private fetchForcedLogsFlag(): void {
    this.httpClient.createRequest(`v1/unleash/featureflags/forcedLogs`)
      .asGet()
      .send()
      .then((response) => this.stateService.triggerFeatureFlag.forcedLogs.success(response))
      .catch((error) => this.stateService.triggerFeatureFlag.forcedLogs.failed(error));
  }

  private fetchVersion(): void {
    this.httpClient.createRequest('application/version/sip-phone')
      .asGet()
      .send()
      .then((response) => this.stateService.triggerVersion.success(response))
      .catch((error) => {});
  }
  private subscribeToVersionOplog(): any {
    let versionOplog = this.oplogService.subscribeOn('application', 'sip-phone').in('version-service.versionServiceView');
    versionOplog.on('update', data => {
      logger.debug('WP | update received :: versionOplog:', data);
      if (data) {
        this.stateService.triggerVersion.oplog(data);
      }
    });
    this.oplogSubscriptions.push(versionOplog);
  }

  private initiateOplog(userId: string): void {
    this.oplogService.start(userId);
  }

  public initiateSip(device: any): void {
    logger.debug('WP | initiateSip', device);
    if (!device) {
      return;
    }
    // @ts-ignore
    const env = this.aureliaConfiguration.environment;
    const config = this.aureliaConfiguration.obj[env];
    logger.debug('WP | initiateSip | config', config);

    const sipConfig: ISipConfig = {
      userName: device.devices[0].name,
      password: device.devices[0].pin.code,
      port: config._port,
      host: config._host,
      domain: config._domain
    };
    logger.debug('WP | device | sipConfig', {
      device,
      sipConfig
    });
    try {
      this.jsSipController.initialise(sipConfig);
    } catch(e) {
      console.error('WP | jssip initialise ERROR ', e);
      this.stateService.triggerLogin.failed(ERROR_MESSAGES.TELEPHONY.REGISTRATION_ERROR);
    }
  }

  private async reconnectSip(): Promise<void> {
    logger.debug('WP | reconnectSip');
    const user = this.appStore.device;
    const sip = this.appStore.sip;
    if (!user || sip) return;

    this.logController.logInfo({ action: 'Sip websocket is disconnected. Attempting to reconnect websocket.' });
    const device = this.appStore.device;
    await this.jsSipController.destroyUserAgent();
    this.initiateSip(device);
  }

  // ACTIONS
  public changePresence(presence: string): void {
    const userId = this.appStore.user.userId;
    this.httpClient.createRequest(`v1/user/users/${userId}/presence`)
      .asPut()
      .withContent({ presence: presence.toUpperCase() })
      .send()
      .catch((error) => console.warn('WP | failed to change presence', error));
  }

  public changeRoutingStatus(routingStatus: string): void {
    const memberId = this.appStore.user.memberId;
    this.httpClient.createRequest(`v1/organisation/members/${memberId}/change-routing-status`)
      .asPost()
      .withContent({ routingStatus })
      .send()
      .catch((error) => console.warn('WP | failed to change routing status', error));
  }

  public changeOutboundFlow(flowId: string): void {
    const memberId = this.appStore.user.memberId;
    this.httpClient.createRequest(`v1/organisation/members/${memberId}/outbound-flow-options`)
      .asPost()
      .withContent({ flowId })
      .send()
      .catch((error) => console.warn('WP | failed to change outbound flow', error));
  }

  // webphone state triggers
  public reportIsActive(): void {
    const sessionId = this.appStore.sessionId;
    const memberId = this.appStore.user ? this.appStore.user.memberId : null;
    const passportId = this.appStore.user ? this.appStore.user.passportId : null;
    const organisationId = this.appStore.organisation ? this.appStore.organisation.organisationId : null;
    const payload = { webphoneId: sessionId, memberId, organisationId, passportId };

    if (!memberId) {
      this.setHeader(ApiService.ANONYMOUS_TOKEN);
    }
    this.httpClient.createRequest(`/v1/organisation/webphones`)
      .asPost()
      .withContent(payload)
      .send()
      .catch((error) => console.warn('WP | failed to set webphone as active', error));
  }

  public reportLoggedIn(successful: boolean): void {
    const sessionId = this.appStore.sessionId;
    const memberId = this.appStore.user ? this.appStore.user.memberId : null;
    const passportId = this.appStore.user ? this.appStore.user.passportId : null;
    const organisationId = this.appStore.organisation ? this.appStore.organisation.organisationId : null;
    const payload = { successful, memberId, organisationId, passportId };

    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/login`)
      .asPut()
      .withContent(payload)
      .send()
      .catch((error) => console.warn('WP | failed to report login', error));
  }

  public reportMediaDevice(): void {
    const sessionId = this.appStore.sessionId;
    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/media-device`)
      .asPut()
      .withContent({})
      .send()
      .catch((error) => console.warn('WP | failed to report login', error));
  }

  public reportError(code: string, description: string): void {
    const sessionId = this.appStore.sessionId;
    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/issues`)
      .asPost()
      .withContent({
        issue: code,
        description
      })
      .send()
      .catch((error) => console.warn('WP | failed to report error', error));
  }

  public reportCallNotified(interactionId: string): void {
    const sessionId = this.appStore.sessionId;
    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/call-notification`)
      .asPut()
      .withContent({ interactionId })
      .send()
      .catch((error) => console.warn('WP | failed to report call Notified', error));
  }

  public reportCallAnswer(interactionId: string): void {
    const sessionId = this.appStore.sessionId;
    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/call-answer`)
      .asPut()
      .withContent({ interactionId })
      .send()
      .catch((error) => console.warn('WP | failed to report call answered', error));
  }

  public reportCallConnected(interactionId: string): void {
    const sessionId = this.appStore.sessionId;
    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/call-connection`)
      .asPut()
      .withContent({ interactionId })
      .send()
      .catch((error) => console.warn('WP | failed to report call connected', error));
  }

  public reportCallRejected(interactionId: string, reasonCode: string = ''): void {
    const sessionId = this.appStore.sessionId;
    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/call-rejection`)
      .asPut()
      .withContent({ interactionId, reasonCode })
      .send()
      .catch((error) => console.warn('WP | failed to report call rejected', error));
  }

  public reportCallCancelled(interactionId: string): void {
    const sessionId = this.appStore.sessionId;
    this.httpClient.createRequest(`/v1/organisation/webphones/${sessionId}/call-cancellation`)
      .asPut()
      .withContent({ interactionId })
      .send()
      .catch((error) => console.warn('WP | failed to report call cancelled', error));
  }

  private getState(): { sipConnected: boolean; sipConnecting: boolean; oplogConnected: boolean } {
    const sipConnected = this.appStore.sip;
    const sipConnecting = this.appStore.connecting;
    const oplogConnected = this.appStore.oplog;

    return {
      sipConnected,
      sipConnecting,
      oplogConnected
    };
  }

  public logInfo(data: any): void {
    if (!this.appStore.user) return; // until logs work with anonymous token
    const memberId = this.appStore.user.memberId;
    const organisationId = this.appStore.organisation ? this.appStore.organisation.organisationId : null;

    const payload = {
      type: 'info',
      organisationId,
      memberId,
      timeStamp: new Date().getTime(),
      data: {
        ...data,
        source: 'sip-phone',
        version: __APP_VERSION__,
        state: this.getState()
      }
    };
    this.httpClient.createRequest(`v1/log`)
      .asPost()
      .withContent(payload)
      .send()
      .catch((error) => Promise.reject(error));
  }

  public logError(data: any): void {
    if (!this.appStore.user) return; // until logs work with anonymous token
    const memberId = this.appStore.user.memberId;
    const organisationId = this.appStore.organisation.organisationId;

    const payload = {
      type: 'error',
      organisationId,
      memberId,
      timeStamp: new Date().getTime(),
      data: {
        ...data,
        source: 'sip-phone',
        version: __APP_VERSION__,
        state: this.getState(),
      }
    };
    this.httpClient.createRequest(`v1/log`)
      .asPost()
      .withContent(payload)
      .send()
      .catch((error) => console.warn('WP | log', error));
  }

  public audit(data: any): void {
    if (!this.appStore.user) return; // untill logs work with anonymous token
    const memberId = this.appStore.user.memberId;
    const organisationId = this.appStore.organisation.organisationId;

    const payload = {
      type: 'audit',
      organisationId,
      memberId,
      timeStamp: new Date().getTime(),
      data: {
        ...data,
        source: 'sip-phone',
        version: __APP_VERSION__,
        state: this.getState(),
      }
    };
    this.httpClient.createRequest(`v1/log`)
      .asPost()
      .withContent(payload)
      .send()
      .catch((error) => console.warn('WP | log', error));
  }

  public async wrapUpAllInteractions(countryCode: string): Promise<void> {
    this.stateService.triggerEndWrapup.attempt();

    let interactions = this.appStore.activeInteractions;
    // @ts-ignore;
    const env = this.aureliaConfiguration.environment;
    const apiEndpoint = this.aureliaConfiguration.obj[env].base;
    const rtcEndpoint = this.aureliaConfiguration.obj[env].apiRouterEndpoint;
    let regionBasedUrl;

    if (env === 'default' || env === 'dev1') {
      regionBasedUrl = await this.getRegionBaseUrlForDev1(rtcEndpoint, countryCode);
    } else {
      regionBasedUrl = await this.getRegionBaseUrl(rtcEndpoint, countryCode);
    }

    await this.setEndpoint(regionBasedUrl);
    const wrapUpRequests = interactions.map(interaction => {
      return this.goOffWrapup(interaction.interactionId, interaction.wrapUpChannelIds, countryCode);
    });
    await Promise.all(wrapUpRequests);
    this.setEndpoint(apiEndpoint);
  }

  public goOffWrapup(interactionId: string, wrapUpChannelIds: Array<string>, countryCode: string): void {
    const memberId = this.appStore.user.memberId;
    const commandPayload = { channel: 'Call', memberId, wrapUpChannelIds };
    this.httpClient.createRequest(`v1/telephony/calls/${interactionId}/endwrapup`)
      .asPut()
      .withContent(commandPayload)
      .send()
      .catch((error) => console.warn('WP | failed to change outbound flow', error));
  }

  public changeVolume(volume): void {
    this.stateService.triggerVolumeChange(volume);
  }

  public updateSettings(settings: any): void {
    this.stateService.triggerSettingsChange(settings);
  }

  public logout(): void {
    this.logController.logInfo({ action: 'User triggered logout on the webphone.' });
    this.jsSipController.destroyUserAgent();
    this.appStore.handleLogout();
    this.stopOplog();
  }

  private stopOplog(): void {
    this.oplogSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.oplogSubscriptions = [];
    this.oplogService.stop();
  }

  private subscribeOplogSubscriptions(): void {
    const user = this.appStore.user;
    if (this.appStore.user) {
      const memberId = user.memberId;
      const userId = user.userId;
      this.subscribeToInteractionFlows(memberId);
      this.subscribeToRoutingStatus(memberId);
      this.subscribeToRoutingStatusActivity(memberId);
      this.subscribeToMemberActivity(memberId);
      this.subscribeToSelectedPresence(userId);
      this.subscribeToActiveInteractionsOplog(memberId);
      this.subscribeToVersionOplog();
    }
  }

  private getRegionBaseUrl(url: string, countryCode: string): string {
    let organisationCountryCode = countryCode;
    let region = null;

    if (url && url.includes('region')) {
      region = this.countryRegionMap.get(organisationCountryCode);
      if(!region){
        region = 'za';
      }
      url = url.replace('region', region);
    }
    return url;
  }

  private getRegionBaseUrlForDev1(url: string, countryCode: string): string {
    let organisationCountryCode = countryCode;
    let region = null;

    if (url && url.includes('region')) {
      region = this.countryRegionMapDev1.get(organisationCountryCode);
      if(!region){
        region = 'za';
      }
      url = url.replace('region', region);
    }
    return url;
  }
}
