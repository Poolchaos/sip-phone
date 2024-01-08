import { autoinject } from "aurelia-dependency-injection";
import { EventAggregator } from "aurelia-event-aggregator";
import { LogManager } from "aurelia-framework";
import { ApiService } from "./api-service";

import { AppStore } from "./app-store";
import { ACTIONS } from "./event-constants";

const logger = LogManager.getLogger('StateService');

@autoinject()
export class StateService {

  private failureCount = 0;

  constructor(
    private eventAggregator: EventAggregator,
    private appStore: AppStore
  ) {}

  public triggerLogin = {
    attempt: () => this.eventAggregator.publish(ACTIONS.LOGIN.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.LOGIN.SUCCESS, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.LOGIN.FAILED, error)
  };

  public triggerDevice = {
    attempt: () => this.eventAggregator.publish(ACTIONS.DEVICE.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.DEVICE.SUCCESS, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.DEVICE.FAILED, error)
  };

  public triggerUser = {
    attempt: () => this.eventAggregator.publish(ACTIONS.USER.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.USER.SUCCESS, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.USER.FAILED, error)
  };

  public triggerOrganisation = {
    attempt: () => this.eventAggregator.publish(ACTIONS.ORGANISATION.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.ORGANISATION.SUCCESS, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.ORGANISATION.FAILED, error)
  };

  public triggerRoutingStatus = {
    attempt: () => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS.SUCCESS, data),
    oplog: (data) => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS.OPLOG, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS.FAILED, error)
  };

  public triggerRoutingStatusActivity = {
    attempt: () => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS_ACTIVITY.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS_ACTIVITY.SUCCESS, data),
    oplog: (data) => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS_ACTIVITY.OPLOG, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.ROUTING_STATUS_ACTIVITY.FAILED, error)
  };

  public triggerMemberActivity = {
    attempt: () => this.eventAggregator.publish(ACTIONS.MEMBER_ACTIVITY.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.MEMBER_ACTIVITY.SUCCESS, data),
    oplog: (data) => this.eventAggregator.publish(ACTIONS.MEMBER_ACTIVITY.OPLOG, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.MEMBER_ACTIVITY.FAILED, error)
  };

  public triggerInteractionFlows = {
    attempt: () => this.eventAggregator.publish(ACTIONS.INTERACTION_FLOWS.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.INTERACTION_FLOWS.SUCCESS, data),
    oplog: (data) => this.eventAggregator.publish(ACTIONS.INTERACTION_FLOWS.OPLOG, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.INTERACTION_FLOWS.FAILED, error)
  };

  public triggerSelectedPresence = {
    attempt: () => this.eventAggregator.publish(ACTIONS.SELECTED_PRESENCE.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.SELECTED_PRESENCE.SUCCESS, data),
    oplog: (data) => this.eventAggregator.publish(ACTIONS.SELECTED_PRESENCE.OPLOG, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.SELECTED_PRESENCE.FAILED, error)
  };

  public triggerPresences = {
    attempt: () => this.eventAggregator.publish(ACTIONS.PRESENCES.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.PRESENCES.SUCCESS, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.PRESENCES.FAILED, error)
  };

  public triggerActiveInteractions = {
    attempt: () => this.eventAggregator.publish(ACTIONS.ACTIVE_INTERACTIONS.ATTEMPT),
    success: (data) => this.eventAggregator.publish(ACTIONS.ACTIVE_INTERACTIONS.SUCCESS, data),
    oplog: (data) => this.eventAggregator.publish(ACTIONS.ACTIVE_INTERACTIONS.OPLOG, data),
    failed: (error) => this.eventAggregator.publish(ACTIONS.ACTIVE_INTERACTIONS.FAILED, error)
  };


  public triggerOplog = {
    attempt: () => this.eventAggregator.publish(ACTIONS.OPLOG.ATTEMPT),
    success: () => {
      this.eventAggregator.publish(ACTIONS.OPLOG.SUCCESS);
      this.eventAggregator.publish(ACTIONS.OPLOG.RECONNECT);
    },
    failed: (error) => this.eventAggregator.publish(ACTIONS.OPLOG.FAILED, error)
  };
  public triggerSip = {
    connecting: () => this.eventAggregator.publish(ACTIONS.SIP.CONNECTING),
    connected: () => {
      this.failureCount = 0;
      this.eventAggregator.publish(ACTIONS.SIP.CONNECTED);
    },
    disconnected: () => this.eventAggregator.publish(ACTIONS.SIP.DISCONNECTED),
    failed: (error) => this.eventAggregator.publish(ACTIONS.SIP.FAILED, error)
  };
  public triggerUA = {
    registered: () => this.eventAggregator.publish(ACTIONS.UA.REGISTERED),
    unregistered: () => this.eventAggregator.publish(ACTIONS.UA.UNREGISTERED),
    failed: () => this.eventAggregator.publish(ACTIONS.UA.FAILED)
  };

  public triggerTelephony = {
    answered: (interactionId) => this.eventAggregator.publish(ACTIONS.SIP.CALL.ANSWERED, interactionId),
    notified: (interactionId) => this.eventAggregator.publish(ACTIONS.SIP.CALL.NOTIFIED, interactionId),
    connecting: (data) => this.eventAggregator.publish(ACTIONS.SIP.CALL.CONNECTING, data),
    sending: (data) => this.eventAggregator.publish(ACTIONS.SIP.CALL.SENDING, data),
    progress: (data) => this.eventAggregator.publish(ACTIONS.SIP.CALL.PROGRESS, data),
    accepted: (data) => this.eventAggregator.publish(ACTIONS.SIP.CALL.ACCEPTED, data),
    confirmed: (data) => this.eventAggregator.publish(ACTIONS.SIP.CALL.CONFIRMED, data),
    ended: (data) => this.eventAggregator.publish(ACTIONS.SIP.CALL.ENDED, data),
    failed: (data) => this.eventAggregator.publish(ACTIONS.SIP.CALL.FAILED, data),
    hold: () => this.eventAggregator.publish(ACTIONS.SIP.CALL.HOLD),
    unhold: () => this.eventAggregator.publish(ACTIONS.SIP.CALL.UNHOLD),
    mute: () => this.eventAggregator.publish(ACTIONS.SIP.CALL.MUTED),
    unmute: () => this.eventAggregator.publish(ACTIONS.SIP.CALL.UNMUTED)
  };

  public triggerError = {
    mediaDevice: () => this.eventAggregator.publish(ACTIONS.ERROR.MEDIA_DEVICE),
    mediaDeviceChange: () => this.eventAggregator.publish(ACTIONS.ERROR.MEDIA_DEVICE_CHANGE),
    incomingCallPop: () => this.eventAggregator.publish(ACTIONS.ERROR.INCOMING_CALL_POP),
  };

  public triggerFeatureFlag = {
    autoAnswer: {
      success: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.AUTO_ANSWER.SUCCESS, data),
      failed: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.AUTO_ANSWER.FAILED, data)
    },
    incomingCallPop: {
      success: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.INCOMING_CALL_POP.SUCCESS, data),
      failed: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.INCOMING_CALL_POP.FAILED, data)
    },
    sharedLogout: {
      success: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.SHARED_LOGOUT.SUCCESS, data),
      failed: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.SHARED_LOGOUT.FAILED, data)
    },
    logs: {
      success: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.LOGS.SUCCESS, data),
      failed: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.LOGS.FAILED, data)
    },
    forcedLogs: {
      success: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.FORCED_LOGS.SUCCESS, data),
      failed: (data) => this.eventAggregator.publish(ACTIONS.FEATURE_FLAGS.FORCED_LOGS.FAILED, data)
    },
  }

  public triggerVolumeChange = (data) => this.eventAggregator.publish(ACTIONS.VOLUME, data);
  public triggerSettingsChange = (data) => this.eventAggregator.publish(ACTIONS.SETTINGS, data);

  public triggerEndWrapup = {
    attempt: () => this.eventAggregator.publish(ACTIONS.END_WRAPUP.ATTEMPT)
  }

  public triggerVersion = {
    success: (data) => this.eventAggregator.publish(ACTIONS.VERSION.SUCCESS, data),
    oplog: (data) => this.eventAggregator.publish(ACTIONS.VERSION.OPLOG, data)
  }

  public handleDisconnected(): void {
    this.triggerSip.disconnected();
    
    if (this.appStore.user) {
      // is logged in
        logger.debug('WP | SIP | DISCONNECT | is logged in');
      if (this.appStore.connectionStopped) {
        // disconnect forced due to invalid device
        logger.debug('WP | SIP | DISCONNECT | forced disconnect');
        return;
      }
      this.failureCount++;
      if (this.failureCount > 3) {
        this.appStore.connectionStopForced();
        this.failureCount = 0;
        return;
      }
      // was disconnected, attempting reconnect
      this.appStore.reconnectSip();
      logger.debug('WP | SIP | DISCONNECT | was disconnected, attempting reconnect');

      const reconnectDelay = this.calculateReconnectDelayMS(this.failureCount);

      if (this.failureCount > 1) {
        setTimeout(() => {
          this.eventAggregator.publish(ACTIONS.SIP.RECONNECT);
        logger.debug('WP | SIP | DISCONNECT | next reconnect attempts ');
        }, reconnectDelay);
      } else if (this.failureCount === 1) {
        this.eventAggregator.publish(ACTIONS.SIP.RECONNECT);
      }
    }
  }

  private calculateReconnectDelayMS(failureCount): number {
    return Math.pow(2, failureCount) * 1000;
  }
}
