import { computedFrom } from "aurelia-binding";
import { autoinject } from "aurelia-dependency-injection";
import { EventAggregator } from "aurelia-event-aggregator";
import { LogManager } from "aurelia-framework";

import { ACTIONS } from "./event-constants";

import semverCompare from 'semver-compare';
import uuid from 'uuid';

const logger = LogManager.getLogger('AppStore');

declare var __APP_VERSION__: string;

@autoinject()
export class AppStore {
  public sessionId = uuid();
  private EMPTY_STATE : IStoreState = {
    login: {
      loading: false,
      error: null
    },
    user: null,
    organisation: null,
    device: null,
    routingStatus: null,
    routingStatusActivity: {
      endingWrapup: false,
      notResponding: false,
      wrapUp: false
    },
    memberActivity: null,
    interactionFlows: {
      outboundFlowOptions: [],
      selectedFlow: null,
      devices: []
    },
    selectedPresence: null,
    presences: null,
    activeInteractions: null,
    callInfo: {
      title: null,
      ringing: false,
      remote: null,
      onCall: false,
      status: null,
      direction: null,
      workType: null,
    },
    featureFlags: {
      autoAnswer: null,
      incomingCallPop: null,
      sharedLogout: null,
      logs: null,
      forcedLogs: null
    },
    globalError: null,
    oplog: null,
    connecting: true,
    connectionStopped: false,
    sip: null,
    ua: null,
    version: null,
    versionUpdateRequired: null,
  };
  private SETTINGS: Settings = {
    autoAnswer: null,
    incomingCall: null,
    inputDevice: null,
    outputDevice: null,
    volume: null,
    logs: null
  };
  public isInitiated: boolean = false;

  private state: IStoreState = JSON.parse(JSON.stringify(this.EMPTY_STATE));
  
  public isPartial = false;
  public isFullyOnline = false;

  private noConnectionCallback: Function;
  private partialOnlineCallbacks: { [key: string]: Function } = {};
  private onlineCallbacks: { [key: string]: Function } = {};
  private changeCallbacks: { [key: string]: Function } = {}; // called for every store change
  private readyCallbacks: { [key: string]: Function } = {}; // called when store is initiated
  private logReadyCallbacks: { [key: string]: Function } = {}; // called when log featureflags and settings retrieved

  constructor(
    private eventAggregator: EventAggregator
  ) {
    this.loadState();
    this.loadSettings();
    this.initiate();
  }

  private initiate(): void {
    logger.debug('WP | STORE | INITIATE ');
    this.eventAggregator.subscribe(ACTIONS.LOGIN.ATTEMPT, () => this.handleLogin(ACTIONS.LOGIN.ATTEMPT));
    this.eventAggregator.subscribe(ACTIONS.LOGIN.SUCCESS, (data: any) => this.handleLogin(ACTIONS.LOGIN.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.LOGIN.COMPLETE, (data: any) => this.handleLogin(ACTIONS.LOGIN.COMPLETE, data));
    this.eventAggregator.subscribe(ACTIONS.LOGIN.FAILED, (data: string) => this.handleLogin(ACTIONS.LOGIN.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.ORGANISATION.SUCCESS, (data: any) => this.handleOrganisation(ACTIONS.ORGANISATION.SUCCESS, data ? data.organisation : null));
    this.eventAggregator.subscribe(ACTIONS.ORGANISATION.FAILED, (data: string) => this.handleOrganisation(ACTIONS.ORGANISATION.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.USER.SUCCESS, (data: any) => this.handleUser(ACTIONS.USER.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.USER.FAILED, (data: string) => this.handleUser(ACTIONS.USER.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.DEVICE.SUCCESS, (data: any) => this.handleDeviceInfo(ACTIONS.DEVICE.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.DEVICE.FAILED, (data: string) => this.handleDeviceInfo(ACTIONS.DEVICE.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.ROUTING_STATUS.SUCCESS, (data: any) => this.handleRoutingStatus(ACTIONS.ROUTING_STATUS.SUCCESS, data ? data.routingStatus : null));
    this.eventAggregator.subscribe(ACTIONS.ROUTING_STATUS.OPLOG, (data: any) => this.handleRoutingStatus(ACTIONS.ROUTING_STATUS.OPLOG, data ? data.routingStatus : null));
    this.eventAggregator.subscribe(ACTIONS.ROUTING_STATUS.FAILED, (data: string) => this.handleRoutingStatus(ACTIONS.ROUTING_STATUS.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.ROUTING_STATUS_ACTIVITY.SUCCESS, (data: any) => this.handleRoutingStatusActivity(ACTIONS.ROUTING_STATUS_ACTIVITY.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.ROUTING_STATUS_ACTIVITY.OPLOG, (data: any) => this.handleRoutingStatusActivity(ACTIONS.ROUTING_STATUS_ACTIVITY.OPLOG, data));
    this.eventAggregator.subscribe(ACTIONS.ROUTING_STATUS_ACTIVITY.FAILED, (data: string) => this.handleRoutingStatusActivity(ACTIONS.ROUTING_STATUS_ACTIVITY.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.MEMBER_ACTIVITY.SUCCESS, (data: any) => this.handleMemberActivity(ACTIONS.MEMBER_ACTIVITY.SUCCESS, data ? data.activity : null));
    this.eventAggregator.subscribe(ACTIONS.MEMBER_ACTIVITY.OPLOG, (data: any) => this.handleMemberActivity(ACTIONS.MEMBER_ACTIVITY.OPLOG, data ? data.activity : null));
    this.eventAggregator.subscribe(ACTIONS.MEMBER_ACTIVITY.FAILED, (data: string) => this.handleMemberActivity(ACTIONS.MEMBER_ACTIVITY.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.INTERACTION_FLOWS.SUCCESS, (data: any) => this.handleInteractionFlows(ACTIONS.INTERACTION_FLOWS.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.INTERACTION_FLOWS.OPLOG, (data: any) => this.handleInteractionFlows(ACTIONS.INTERACTION_FLOWS.OPLOG, data));
    this.eventAggregator.subscribe(ACTIONS.INTERACTION_FLOWS.FAILED, (data: string) => this.handleInteractionFlows(ACTIONS.INTERACTION_FLOWS.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.SELECTED_PRESENCE.SUCCESS, (data: any) => this.handleSelectedPresence(ACTIONS.SELECTED_PRESENCE.SUCCESS, data ? data.presence : null));
    this.eventAggregator.subscribe(ACTIONS.SELECTED_PRESENCE.OPLOG, (data: any) => this.handleSelectedPresence(ACTIONS.SELECTED_PRESENCE.OPLOG, data ? data.presence : null));
    this.eventAggregator.subscribe(ACTIONS.SELECTED_PRESENCE.FAILED, (data: string) => this.handleSelectedPresence(ACTIONS.SELECTED_PRESENCE.FAILED, data));
    
    this.eventAggregator.subscribe(ACTIONS.PRESENCES.SUCCESS, (data: any) => this.handlePresences(ACTIONS.PRESENCES.SUCCESS, data ? data.presenceCodes : []));
    this.eventAggregator.subscribe(ACTIONS.PRESENCES.FAILED, (data: string) => this.handlePresences(ACTIONS.PRESENCES.FAILED, data));
    
    this.eventAggregator.subscribe(ACTIONS.ACTIVE_INTERACTIONS.SUCCESS, (data: any) => this.handleActiveInteractions(ACTIONS.ACTIVE_INTERACTIONS.SUCCESS, data ? data.memberInteractions : null));
    this.eventAggregator.subscribe(ACTIONS.ACTIVE_INTERACTIONS.OPLOG, (data: any) => this.handleActiveInteractions(ACTIONS.ACTIVE_INTERACTIONS.OPLOG, data ? data.interactions : null));
    this.eventAggregator.subscribe(ACTIONS.ACTIVE_INTERACTIONS.FAILED, (data: string) => this.handleActiveInteractions(ACTIONS.ACTIVE_INTERACTIONS.FAILED, data));
    
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.AUTO_ANSWER.SUCCESS, (data: any) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.AUTO_ANSWER.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.AUTO_ANSWER.FAILED, (data: string) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.AUTO_ANSWER.FAILED, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.INCOMING_CALL_POP.SUCCESS, (data: any) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.INCOMING_CALL_POP.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.INCOMING_CALL_POP.FAILED, (data: string) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.INCOMING_CALL_POP.FAILED, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.SHARED_LOGOUT.SUCCESS, (data: any) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.SHARED_LOGOUT.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.SHARED_LOGOUT.FAILED, (data: string) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.SHARED_LOGOUT.FAILED, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.LOGS.SUCCESS, (data: any) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.LOGS.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.LOGS.FAILED, (data: string) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.LOGS.FAILED, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.FORCED_LOGS.SUCCESS, (data: any) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.FORCED_LOGS.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.FEATURE_FLAGS.FORCED_LOGS.FAILED, (data: string) => this.handleFeatureFlag(ACTIONS.FEATURE_FLAGS.FORCED_LOGS.FAILED, data));
    

    this.eventAggregator.subscribe(ACTIONS.OPLOG.SUCCESS, (data: any) => this.handleOplog(ACTIONS.OPLOG.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.OPLOG.FAILED, (data: string) => this.handleOplog(ACTIONS.OPLOG.FAILED, data));
    
    this.eventAggregator.subscribe(ACTIONS.SIP.CONNECTED, (data: any) => this.handleSIP(ACTIONS.SIP.CONNECTED, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CONNECTING, (data: any) => this.handleSIP(ACTIONS.SIP.CONNECTING, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.DISCONNECTED, (data: any) => this.handleSIP(ACTIONS.SIP.DISCONNECTED, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.FAILED, (data: string) => this.handleSIP(ACTIONS.SIP.FAILED, data));

    
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.CONNECTING, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.CONNECTING, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.SENDING, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.SENDING, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.PROGRESS, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.PROGRESS, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.ACCEPTED, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.ACCEPTED, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.CONFIRMED, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.CONFIRMED, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.ENDED, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.ENDED, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.FAILED, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.FAILED, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.HOLD, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.HOLD, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.UNHOLD, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.UNHOLD, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.MUTED, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.MUTED, data));
    this.eventAggregator.subscribe(ACTIONS.SIP.CALL.UNMUTED, (data: any) => this.handleSIPCall(ACTIONS.SIP.CALL.UNMUTED, data));

    
    this.eventAggregator.subscribe(ACTIONS.UA.REGISTERED, (data: any) => this.handleUA(ACTIONS.UA.REGISTERED, data));
    this.eventAggregator.subscribe(ACTIONS.UA.UNREGISTERED, (data: any) => this.handleUA(ACTIONS.UA.UNREGISTERED, data));
    this.eventAggregator.subscribe(ACTIONS.UA.FAILED, (data: string) => this.handleUA(ACTIONS.UA.FAILED, data));

    this.eventAggregator.subscribe(ACTIONS.VOLUME, (data: string) => this.handleVolumeChange(ACTIONS.VOLUME, data));
    this.eventAggregator.subscribe(ACTIONS.SETTINGS, (data: string) => this.handleSettingsChange(ACTIONS.SETTINGS, data));

    this.eventAggregator.subscribe(ACTIONS.END_WRAPUP.ATTEMPT, (data: string) => this.handleEndWrapup(ACTIONS.END_WRAPUP.ATTEMPT, data));

    this.eventAggregator.subscribe(ACTIONS.VERSION.SUCCESS, (data: string) => this.handleVersion(ACTIONS.VERSION.SUCCESS, data));
    this.eventAggregator.subscribe(ACTIONS.VERSION.OPLOG, (data: string) => this.handleVersion(ACTIONS.VERSION.OPLOG, data));
  }

  private storeSession(): void {
    if (!this.isInitiated) {
      setTimeout(() => {
        this.storeSession();
      }, 100);
      return;
    }
    if (this.state.user) {
      this.handleAllCallbacks('changeCallbacks');
    }
    const data = JSON.stringify(this.state);
    sessionStorage.setItem('wp-state', data);
  }

  private storeSettings(): void {
    if (!this.isInitiated) {
      setTimeout(() => {
        this.storeSettings();
      }, 100);
      return;
    }
    const data = JSON.stringify(this.settings);
    localStorage.setItem('wp-settings', data);
  }

  private loadState(): void {
    try {
      let state = sessionStorage.getItem('wp-state')
      let parsedState = JSON.parse(state);

      if (!this.noConnectionCallback) {
        setTimeout(() => {
          this.loadState();
        }, 100);
        return;
      }
      if (parsedState) {
        parsedState.login = { error: null };
        parsedState.connecting = true;
        parsedState.connectionStopped = false;
        parsedState.sip = false;
        parsedState.oplog = false;
        parsedState.ua = false;
        parsedState.callInfo = JSON.parse(JSON.stringify(this.EMPTY_STATE.callInfo));
      } else {
        parsedState = JSON.parse(JSON.stringify(this.EMPTY_STATE));
      }
      this.state = {
        ...this.state,
        ...parsedState
      };
      this.storeSession();
      this.noConnectionCallback && this.noConnectionCallback();
    } catch(e) {
      console.error('error', e);
    }
    this.isInitiated = true;
    this.handleAllCallbacks('readyCallbacks');
  }

  private loadSettings(): void {
    try {
      let settings = localStorage.getItem('wp-settings');
      let parsedSettings = JSON.parse(settings);
      this.SETTINGS = parsedSettings || this.SETTINGS;
    } catch(e) {}
  }

  public addNoConnectionHandler(callback: Function): void {
    this.noConnectionCallback = callback;
  }

  private handleLogin(event: string, data?: any): void {
    logger.debug('WP | STORE | handleLogin ', event, data);
    switch(event) {
      case ACTIONS.LOGIN.ATTEMPT:
        this.state.login.loading = true;
        break;
      case ACTIONS.LOGIN.SUCCESS:
        this.state.login.loading = false;
        this.state.user = data;
        this.setUserRoles();
        break;
      case ACTIONS.LOGIN.COMPLETE:
        this.state.login.loading = false;
        this.state.login.error = null;
        break;
      case ACTIONS.LOGIN.FAILED:
        this.state.login.loading = false;
        this.state.login.error = data;
      default:
        this.state.connecting = false;
        break;
    }
    this.storeSession();
  }

  private setUserRoles(): void {
    if (!this.state.user) return;
    const ROLES = {
      ADMINISTRATOR: 'Administrator',
      AGENT: 'Agent',
      TEAM_LEADER: 'Team Leader',
      OFFICE_EMPLOYEE: 'Office Employee',
      QA_MANAGER: 'QA Manager',
      QA: 'QA',
      CAMPAIGN_MANAGER: 'Campaign Manager'
    };
    const roleStrategy = {
      [ROLES.ADMINISTRATOR]: () => { this.state.user.hasAdministratorRole = true; },
      [ROLES.AGENT]: () => { this.state.user.hasAgentRole = true; },
      [ROLES.TEAM_LEADER]: () => { this.state.user.hasTeamLeaderRole = true; },
      [ROLES.OFFICE_EMPLOYEE]: () => { this.state.user.hasOfficeEmployeeRole = true; },
      [ROLES.QA]: () => { this.state.user.hasQARole = true; },
      [ROLES.QA_MANAGER]: () => { this.state.user.hasQAManagerRole = true; },
      [ROLES.CAMPAIGN_MANAGER]: () => { this.state.user.hasCampaignManagerRole = true; }
    };

    for (let userAccessRole of this.state.user.userAccessRoles) {
      if (userAccessRole.accountType === 'ORGANISATION' && roleStrategy[userAccessRole.role]) {
        roleStrategy[userAccessRole.role]();
      }
    }
  }

  private handleOrganisation(event: string, data?: any): void {
    logger.debug('WP | STORE | handleOrganisation ', event, data);
    switch(event) {
      case ACTIONS.ORGANISATION.SUCCESS:
        this.state.organisation = data;
        break;
      case ACTIONS.ORGANISATION.FAILED:
        break;
      default:
        break;
    }
    this.storeSession();
  }

  private handleUser(event: string, data?: any): void {
    logger.debug('WP | STORE | handleUser ', event, data);
    switch(event) {
      case ACTIONS.USER.SUCCESS:
        this.state.user = {
          ...this.state.user,
          ...data.person
        };
        break;
      case ACTIONS.USER.FAILED:
        break;
      default:
        break;
    }
    this.storeSession();
  }

  private handleDeviceInfo(event: string, data?: any): void {
    logger.debug('WP | STORE | handleDeviceInfo ', event, data);
    switch(event) {
      case ACTIONS.DEVICE.SUCCESS:
        this.state.device = data;
        break;
      case ACTIONS.DEVICE.FAILED:
        this.state.connecting = false;
      default:
        break;
    }
    this.isPartialOnline();
    this.isOnline();
    this.storeSession();
  }

  private handleRoutingStatus(event: string, data?: any): void {
    logger.debug('WP | STORE | handleRoutingStatus ', event, data);
    switch(event) {
      case ACTIONS.ROUTING_STATUS.SUCCESS:
      case ACTIONS.ROUTING_STATUS.OPLOG:
        this.state.routingStatus = data;
        break;
      case ACTIONS.ROUTING_STATUS.FAILED:
      default:
        break;
    }
    this.storeSession();
  }

  private handleRoutingStatusActivity(event: string, data?: any): void {
    logger.debug('WP | STORE | handleRoutingStatusActivity ', event, data);
    switch(event) {
      case ACTIONS.ROUTING_STATUS_ACTIVITY.SUCCESS:
      case ACTIONS.ROUTING_STATUS_ACTIVITY.OPLOG:
        this.state.routingStatusActivity = {
          ...this.state.routingStatusActivity,
          ...data
        };
        if (!this.state.routingStatusActivity.wrapUp) {
          this.state.routingStatusActivity.endingWrapup = false;
        }
        break;
      case ACTIONS.ROUTING_STATUS_ACTIVITY.FAILED:
      default:
        break;
    }
    this.storeSession();
  }

  private handleMemberActivity(event: string, data?: any): void {
    logger.debug('WP | STORE | handleMemberActivity ', event, data);
    switch(event) {
      case ACTIONS.MEMBER_ACTIVITY.SUCCESS:
      case ACTIONS.MEMBER_ACTIVITY.OPLOG:
        this.state.memberActivity = data;
        break;
      case ACTIONS.MEMBER_ACTIVITY.FAILED:
      default:
        break;
    }
    this.storeSession();
  }

  private handleInteractionFlows(event: string, data?: any): void {
    logger.debug('WP | STORE | handleInteractionFlows ', event, data);
    switch(event) {
      case ACTIONS.INTERACTION_FLOWS.SUCCESS:
      case ACTIONS.INTERACTION_FLOWS.OPLOG:
        this.state.interactionFlows = data;
        let selectedFlow = data.outboundFlowOptions.find(flow => flow.selected);
        let privateNoFlow = { flowId: null, selected: !selectedFlow, flowName: 'Private (No Flow)' };
        this.state.interactionFlows.selectedFlow = selectedFlow || privateNoFlow;
        this.state.interactionFlows.outboundFlowOptions = [privateNoFlow].concat(data.outboundFlowOptions || []);
        break;
      case ACTIONS.INTERACTION_FLOWS.FAILED:
      default:
        break;
    }
    this.storeSession();
  }

  private handleSelectedPresence(event: string, data?: any): void {
    logger.debug('WP | STORE | handleSelectedPresence ', event, data);
    switch(event) {
      case ACTIONS.SELECTED_PRESENCE.SUCCESS:
      case ACTIONS.SELECTED_PRESENCE.OPLOG:
        this.state.selectedPresence = data;
        break;
      case ACTIONS.SELECTED_PRESENCE.FAILED:
      default:
        break;
    }
    this.storeSession();0
  }

  private handlePresences(event: string, data?: any): void {
    logger.debug('WP | STORE | handlePresences ', event, data);
    switch(event) {
      case ACTIONS.PRESENCES.SUCCESS:
        this.state.presences = data;
        break;
      case ACTIONS.PRESENCES.FAILED:
      default:
        break;
    }
    this.storeSession();
  }

  private handleActiveInteractions(event: string, data?: any): void {
    logger.debug('WP | STORE | handleActiveInteractions ', event, data);
    switch(event) {
      case ACTIONS.ACTIVE_INTERACTIONS.SUCCESS:
      case ACTIONS.ACTIVE_INTERACTIONS.OPLOG:
        this.state.activeInteractions = data;
        break;
      case ACTIONS.ACTIVE_INTERACTIONS.FAILED:
      default:
        break;
    }
    this.storeSession();
  }

  private handleFeatureFlag(event: string, data?: any): void {
    logger.debug('WP | STORE | handleFeatureFlag ', event, data);
    switch(event) {
      case ACTIONS.FEATURE_FLAGS.AUTO_ANSWER.SUCCESS:
        this.state.featureFlags = {
          ...this.state.featureFlags,
          autoAnswer: data.enabled
        };
        break;
      case ACTIONS.FEATURE_FLAGS.INCOMING_CALL_POP.SUCCESS:
        this.state.featureFlags = {
          ...this.state.featureFlags,
          incomingCallPop: data.enabled
        };
        break;
      case ACTIONS.FEATURE_FLAGS.SHARED_LOGOUT.SUCCESS:
        this.state.featureFlags = {
          ...this.state.featureFlags,
          sharedLogout: data.enabled
        };
        this.state.globalError = null;
        break;
      case ACTIONS.FEATURE_FLAGS.LOGS.SUCCESS:
        this.state.featureFlags = {
          ...this.state.featureFlags,
          logs: data.enabled
        };
        if (data.enabled) {
          this.handleAllCallbacks('logReadyCallbacks');
        }
        break;
      case ACTIONS.FEATURE_FLAGS.FORCED_LOGS.SUCCESS:
        this.state.featureFlags = {
          ...this.state.featureFlags,
          forcedLogs: data.enabled
        };
        if (data.enabled) {
          this.handleAllCallbacks('logReadyCallbacks');
        }
        break;
      default:
        break;
    }
    this.storeSession();
  }


  private handleOplog(event: string, data?: any): void {
    logger.debug('WP | STORE | handleOplog ', event, data);
    switch(event) {
      case ACTIONS.OPLOG.SUCCESS:
        this.state.oplog = true;
        break;
      case ACTIONS.OPLOG.FAILED:
        this.state.oplog = false;
      default:
        break;
    }
    this.isPartialOnline();
    this.isOnline();
    this.storeSession();
  }

  private handleSIP(event: string, data?: any): void {
    logger.debug('WP | STORE | handleSIP ', event, data);
    switch(event) {
      case ACTIONS.SIP.CONNECTING:
        this.state.sip = false;
        this.state.connecting = true;
        break;
      case ACTIONS.SIP.CONNECTED:
        this.state.sip = true;
        this.state.connecting = false;
        break;
      case ACTIONS.SIP.DISCONNECTED:
        this.state.sip = false;
        this.state.connecting = false;
        break;
      case ACTIONS.SIP.FAILED:
        this.state.sip = false;
        this.state.connecting = false;
      default:
        break;
    }
    this.isPartialOnline();
    this.isOnline();
    this.storeSession();
  }

  private handleSIPCall(event: string, data?: any): void {
    logger.debug('WP | STORE | handleSIPCall ', event, data);
    switch(event) {
      case ACTIONS.SIP.CALL.CONNECTING:
        this.state.callInfo = {
          title: data.callInfo.title,
          ringing: true,
          remote: data.callInfo.remote,
          onCall: false,
          status: 20,
          direction: data.callInfo.direction,
          workType: data.callInfo.workType
        };
        break;
      case ACTIONS.SIP.CALL.SENDING:
        break;
      case ACTIONS.SIP.CALL.PROGRESS:
        break;
      case ACTIONS.SIP.CALL.ACCEPTED:
        this.state.callInfo = {
          ...this.state.callInfo,
          title: 'On Call',
          ringing: false,
          onCall: false,
          status: 20,
          startTime: new Date().getTime(),
        };
        break;
      case ACTIONS.SIP.CALL.CONFIRMED:
        this.state.callInfo = {
          ...this.state.callInfo,
          title: 'On Call',
          ringing: false,
          onCall: true,
          status: 30
        };
        break;
      case ACTIONS.SIP.CALL.ENDED:
      case ACTIONS.SIP.CALL.FAILED:
        this.state.callInfo = {
          ...this.state.callInfo,
          title: data.callInfo.title,
          cause: data.callInfo.cause,
          ringing: false,
          onCall: false,
          status:40,
          endTime: data.callInfo.end_time,
          muted: false,
          hold: false
        };
        break;
      case ACTIONS.SIP.CALL.HOLD:
        this.state.callInfo.hold = true;
        break;
      case ACTIONS.SIP.CALL.UNHOLD:
        this.state.callInfo.hold = false;
        break;
      case ACTIONS.SIP.CALL.MUTED:
        this.state.callInfo.muted = true;
        break;
      case ACTIONS.SIP.CALL.UNMUTED:
        this.state.callInfo.muted = false;
        break;
      default:
        break;
    }
    this.storeSession();
  }

  private handleUA(event: string, data?: any): void {
    logger.debug('WP | STORE | handleUA ', event, data);
    switch(event) {
      case ACTIONS.UA.REGISTERED:
        this.state.ua = true;
        break;
      case ACTIONS.UA.UNREGISTERED:
        this.state.ua = false;
        break;
      case ACTIONS.UA.FAILED:
        this.state.ua = false;
      default:
        break;
    }
    this.isPartialOnline();
    this.isOnline();
    this.storeSession();
  }

  private handleVolumeChange(event: string, data: any): void {
    logger.debug('WP | STORE | handleVolumeChange ', event, data);
    switch(event) {
      case ACTIONS.VOLUME:
        this.SETTINGS.volume = data;
        break;
      default:
        break;
    }
    this.storeSettings();
  }

  private handleSettingsChange(event: string, data: any): void {
    logger.debug('WP | STORE | handleSettingsChange ', event, data);
    switch(event) {
      case ACTIONS.SETTINGS:
        this.SETTINGS = {
          ...this.SETTINGS,
          ...data
        };
        break;
      default:
        break;
    }
    this.storeSettings();
  }

  private handleEndWrapup(event: string, data: any): void {
    logger.debug('WP | STORE | handleEndWrapup ', event, data);
    switch(event) {
      case ACTIONS.END_WRAPUP.ATTEMPT:
        this.state.routingStatusActivity.endingWrapup = true;
        break;
      default:
        break;
    }
    this.storeSession();
  }

  private handleVersion(event: string, data: any): void {
    logger.debug('WP | STORE | handleVersion ', event, data);
    switch(event) {
      case ACTIONS.VERSION.SUCCESS:
      case ACTIONS.VERSION.OPLOG:
        this.state.version = data;
        this.state.versionUpdateRequired = __APP_VERSION__ && data && semverCompare(__APP_VERSION__, data) < 0;
        break;
      default:
        break;
    }
    this.storeSession();
  }

  @computedFrom('state.login')
  public get login(): Login {
    return this.state.login;
  }

  @computedFrom('state.user')
  public get user(): User {
    return this.state.user;
  }

  @computedFrom('state.organisation')
  public get organisation(): Organisation {
    return this.state.organisation;
  }

  @computedFrom('state.device')
  public get device(): InteractionFlowsClass {
    return this.state.device;
  }

  @computedFrom('state.routingStatus')
  public get routingStatus(): string {
    return this.state.routingStatus;
  }

  @computedFrom('state.routingStatusActivity')
  public get routingStatusActivity(): RoutingStatusActivity {
    return this.state.routingStatusActivity;
  }

  @computedFrom('state.memberActivity')
  public get memberActivity(): string {
    return this.state.memberActivity;
  }

  @computedFrom('state.interactionFlows')
  public get interactionFlows(): InteractionFlowsClass {
    return this.state.interactionFlows;
  }

  @computedFrom('state.selectedPresence')
  public get selectedPresence(): any {
    return this.state.selectedPresence;
  }

  @computedFrom('state.presences')
  public get presences(): any {
    return this.state.presences;
  }

  @computedFrom('state.activeInteractions')
  public get activeInteractions(): any {
    return this.state.activeInteractions;
  }

  
  @computedFrom('state.globalError')
  public get globalError(): any {
    return this.state.globalError;
  }
  
  @computedFrom('state.oplog')
  public get oplog(): any {
    return this.state.oplog;
  }

  @computedFrom('state.connecting')
  public get connecting(): any {
    return this.state.connecting;
  }

  @computedFrom('state.sip')
  public get sip(): any {
    return this.state.sip;
  }

  @computedFrom('state.ua')
  public get ua(): any {
    return this.state.ua;
  }

  @computedFrom('state.callInfo')
  public get callInfo(): any {
    return this.state.callInfo;
  }

  @computedFrom('state.featureFlags')
  public get featureFlags(): any {
    return this.state.featureFlags;
  }

  @computedFrom('SETTINGS')
  public get settings(): any {
    return this.SETTINGS;
  }

  @computedFrom('state.connectionStopped')
  public get connectionStopped(): any {
    return this.state.connectionStopped;
  }

  @computedFrom('state.versionUpdateRequired')
  public get versionUpdateRequired(): any {
    return this.state.versionUpdateRequired;
  }

  public isPartialOnline(): boolean {
    if (!this.state.user || !this.state.device) {
      return this.isPartial = false;
    } else if (this.state.oplog && (!this.state.sip || !this.state.ua)) {
      if (!this.isPartial) {
        this.handleAllCallbacks('partialOnlineCallbacks');
      }
      return this.isPartial = true;
    }
    return this.isPartial = false;
  }

  public isOnline(): boolean {
    logger.debug('WS | checking isOnline ', this.state);
    if (!this.state.user) {
      return this.isFullyOnline = false;
    } else if (this.state.oplog && this.state.sip && this.state.ua) {
      delete this.onlineCallbacks;
      this.handleAllCallbacks('onlineCallbacks');
      parent.postMessage('webphone-initialized', '*');
      this.eventAggregator.publish(ACTIONS.LOGIN.COMPLETE);
      return this.isFullyOnline = true;
    }
    return this.isFullyOnline = false;
  }

  public onPartialOnline(view: string, callback: Function) {
    this.partialOnlineCallbacks[view] = callback;
  }

  public onFullyOnline(view: string, callback: Function) {
    this.onlineCallbacks[view] = callback;
  }

  public onChange(view: string, callback: Function): any {
    console.log('WP | Store add onChange handler ', view);
    this.changeCallbacks[view] = callback;
  }

  public onReady(view: string, callback: Function): any {
    console.log('WP | Store add onReady handler ', view);
    this.readyCallbacks[view] = callback;
    if (this.isInitiated) {
      callback();
    }
  }

  public onLogReady(view: string, callback: Function): any {
    console.log('WP | Store add onReady handler ', view);
    this.logReadyCallbacks[view] = callback;
    if (this.state.featureFlags.logs || this.state.featureFlags.forcedLogs) {
      callback();
    }
  }

  public connectionStopForced(error?: string): void {
    this.state.connectionStopped = true;
    if (error) {
      this.state.globalError = error;
    }
  }

  public clearConnectionStopForced(): void {
    this.state.connectionStopped = false;
  }

  public reconnectSip(): void {
    this.state.connecting = true;
  }

  public handleLogout(): void {
    logger.debug('WP | handleLogout ');
    this.state = JSON.parse(JSON.stringify(this.EMPTY_STATE));
    this.storeSession();
  }

  private handleAllCallbacks(prop: string): void {
    let callbacks: { [key: string]: Function } = this[prop];
    if (!callbacks) return;

    Object.entries(callbacks).forEach(callback => {
      if (callback[1]) {
        callback[1]();
      }
    });
  }
}
