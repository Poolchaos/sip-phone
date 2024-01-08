import { LogManager, autoinject, customElement } from 'aurelia-framework';
import { AureliaConfiguration } from 'aurelia-configuration';

import * as moment from 'moment';

const html = require('./incoming-call-app.html');

import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Workbox } from 'workbox-window';
import { PhoneService } from 'services/phone-service';
import { ACTIONS } from 'services/event-constants';
import { AppStore } from 'services/app-store';
import { LogController } from 'services/LogController';
import { StateService } from 'services/state-service';

const acceptIcon = require('./assets/images/accept.png');
const rejectIcon = require('./assets/images/reject.png');
const zaiIcon = require('./assets/images/zai-icon.png');

// Extension Toolbar Icons
const defaultIcon = require('./assets/images/default.png');
const incomingIcon = require('./assets/images/incoming.png');
const outgoingIcon = require('./assets/images/outgoing.png');
const onCallIcon = require('./assets/images/on-call.png');
const muteIcon = require('./assets/images/mute.png');
const lowVolumeIcon = require('./assets/images/low-volume.png');
const highVolumeIcon = require('./assets/images/high-volume.png');

const logger = LogManager.getLogger('App BG');

declare var chrome: any;
declare var window: any;
declare var __DEV__: boolean;

@customElement('z-background')
@autoinject()
export class AppBackground {

  private telephonySubscription: Subscription;
  private applicationSubscription: Subscription;
  private connectivitySubscription: Subscription;

  private newWindow: any;
  private autoAnswer: any;
  private incomingCall: any;

  public phoneAudio: HTMLAudioElement;
  private serviceWorker: Workbox;

  private telephonyEventHandlers = {
    [ACTIONS.SIP.CALL.CONNECTING]: message => {
      if (message && message.callInfo) {
        if (message.callInfo.direction === 'inbound') {
          this.triggerAutoAnswer();
          this.showInboundNotification(message);
        }
      }
    },
    [ACTIONS.SIP.CALL.ACCEPTED]: () => this.clearNotifications(),
    [ACTIONS.SIP.CALL.CONFIRMED]: () => this.clearNotifications(),
    [ACTIONS.SIP.CALL.FAILED]: () => this.clearNotifications(),
    [ACTIONS.SIP.CALL.ENDED]: () => this.clearNotifications()
  };

  constructor(
    private eventAggregator: EventAggregator,
    private config: AureliaConfiguration,
    private phoneService: PhoneService,
    private appStore: AppStore,
    private logController: LogController,
    private stateService: StateService
  ) {
    Object.entries(this.telephonyEventHandlers).forEach(event => {
      this.eventAggregator.subscribe(event[0], (data) => event[1](data));
    });
  }

  async attached(): Promise<void> {
    this.checkNotificationPermissions();
    // initialise phone service with phone audio element for playback
    this.phoneService.setPhoneAudioElement(this.phoneAudio);
    this._activateSubscriptions();
    this.updateState();
    this.subscribeToWindowEvents();
  }

  private _activateSubscriptions() {
    this.appStore.onChange('app-background', () => this.updateState());
  }
  
  public updateState(): void {
    const settings = this.appStore.settings;
    const autoAnswerFeatureFlag = this.appStore.featureFlags.autoAnswer;
    const incomingCallPopFeatureFlag = this.appStore.featureFlags.incomingCallPop;
    const callInfo = this.appStore.callInfo;

    if (autoAnswerFeatureFlag) {
      this.autoAnswer = true;
    } else {
      if (settings && settings.autoAnswer !== undefined) {
        this.autoAnswer = settings.autoAnswer;
      }
    }
    if (incomingCallPopFeatureFlag) {
      this.incomingCall = true;
    } else {
      if (settings && settings.incomingCall !== undefined) {
        this.incomingCall = settings.incomingCall;
      }
    }
    
    this.phoneAudio.volume = settings && settings.volume ? settings.volume : 0.7;
    if (callInfo) {

      switch(callInfo.title) {
        case 'Ready for Calls':
        case 'Cancelled':
        case 'On Call':
        case 'Call Ended':
          this.closeWindow(callInfo.interactionId, callInfo.remote);
        default:
          break;
      }
    }
  }

  private subscribeToWindowEvents(): void {
    window.addEventListener("message", (event) => {
      console.log(' WP | MESSAGE | event received ', event);

      switch(event.data) {
        case 'acceptCall':
          console.log(' WP | MESSAGE | accept clicked ');
          this._handleAcceptInboundCall('Incoming Call Pop');
          this.closeWindow();
          break;
        case 'rejectCall':
          console.log(' WP | MESSAGE | reject clicked ');
          this._handleEndInboundCall('Incoming Call Pop');
          this.closeWindow();
          break;
        default:
          break;
      }
    }, false);

    window.addEventListener('unload', () => {
      const memberId = this.appStore.user.memberId;
      if (!memberId) return;

      let logs: any = localStorage.getItem('wp-unload');
      const newLog = moment().format('DD/MM/YYYY HH:mm:ss');
      
      try {
        logs = JSON.parse(logs);
        logs.push(newLog);
      } catch(e) {
        logs = [newLog];
      }
      localStorage.setItem('wp-unload', JSON.stringify(logs));
    })
  }

  private async checkNotificationPermissions(): Promise<void> {
    if (!("Notification" in window)) {
      logger.warn("This browser does not support desktop notifications");
    }
  
    // Let's check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {
      logger.info('Permission to view notification');
      // If it's okay let's create a notification
      this.registerServiceWorker();
    }
  
    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        // If the user accepts, let's create a notification
        if (permission === "granted") {
          this.registerServiceWorker();
        }
      });
    }
  }

  private registerServiceWorker(): void {
    
    this.serviceWorker = new Workbox('/sw.js'); 
    this.serviceWorker.register();

    navigator.serviceWorker.ready.then((sw) =>  {
      const channel = new BroadcastChannel('sw-messages');

      console.log('Channel registered', channel);

      channel.addEventListener('message', event => {
        console.log('Received', event.data);

        switch(event.data.action) {
          case 'accept':
            this._handleAcceptInboundCall('Desktop Notification');
            break;
          case 'reject':
            this._handleEndInboundCall('Desktop Notification');
            break;
          default:
            break;
        }
      });
      
      this.serviceWorker.addEventListener('message', event => {
        // This creates the client in sw
        console.log(`The service worker sent me a message:`, event.data);
      });
    });
  }

  detached() {
    this.telephonySubscription.dispose();
    this.applicationSubscription.dispose();
    this.connectivitySubscription.dispose();
  }

  private _handleAcceptInboundCall = (acceptedFrom: string) => {
    this.logController.logInfo({ action: 'Attempting answer an inbound call', data: { sessionId: this.appStore.sessionId, autoAnswer: this.autoAnswer }});
    this.phoneService.acceptInboundCall();
  };
  private _handleEndInboundCall = (endedFrom: string) => {
    this.phoneService.endCall();
  };

  private closeWindow(interactionId?: string, remote?: string): void {
    if (this.newWindow && !this.newWindow.closed) {
      this.logController.logInfo({ action: 'Close Incoming Call Pop', data: { interactionId, remote, sessionId: this.appStore.sessionId, autoAnswer: this.autoAnswer }});
      this.newWindow.postMessage({
        type: 'close'
      });
      try {
        // in case of slow network
        this.newWindow.close();
      } catch(error) {
        this.logController.logError({ errorCode: 'Error closing Incoming Call Pop', data: { error: { message: error.message } } });
      }
    }
  }

  public showReconnectNotification(): void {
    const options = {
      type: 'basic',
      title: 'Connection error.',
      message: '',
      contextMessage: '',
      iconUrl: zaiIcon
    };
    this.createChromeNotification('manual-reconnect', options);
  }

  public showInboundNotification(data): void {
    if (this.incomingCall) {
      this.popupCenter({ title: 'Incoming Call', w: 277, h: 365, data });
    }

    const source = data.source;
    const options = {
      type: 'basic',
      title: 'Incoming Call',
      message: '',
      contextMessage: source,
      iconUrl: zaiIcon,

      requireInteraction: true,
      actions: [
        {
          title: 'Answer',
          icon: acceptIcon,
          action: 'accept'
        },
        {
          title: 'Reject',
          icon: rejectIcon,
          action: 'reject'
        },
      ],
    };
    this.createChromeNotification('Incoming Call', options, true);
  }

  popupCenter({title, w, h, data}) {
    try {
      const dualScreenLeft = window.screenLeft !==  undefined ? window.screenLeft : window.screenX;
      const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;

      const systemZoom = width / window.screen.availWidth;
      const left = (width - w) / 2 / systemZoom + dualScreenLeft

      // @ts-ignore
      const env = this.config.environment;
      // @ts-ignore
      let url = `${this.config._config_object[env].frontEnd}`;
      
      // @ts-ignore
      if (this.config.window.hostName === 'localhost') {
        // @ts-ignore
        url = `http://${this.config.window.hostName}:${this.config.window.port}`
      }

      const callInfo = data.callInfo;

      this.logController.logInfo({ action: 'Open Incoming Call Pop', data: { interactionId: callInfo.interactionId, sessionId: this.appStore.sessionId, autoAnswer: this.autoAnswer }});
      this.closeWindow(callInfo.interactionId, callInfo.remote);

      let formattedHtml = 
        html
          .replace('{{remote}}', callInfo.remote)
          .replace('{{workType}}', callInfo.workType || '');
      if (this.autoAnswer) {
        formattedHtml = formattedHtml.replace('{{endCallBtnClass}}', 'is-hidden')
      }

      this.newWindow = window.open('', '_blank', `scrollbars=yes, width=${w}, height=${h}, top=30, left=${left}`);
      console.log('::>> this.newWindow >>>> ', this.newWindow);
      if (this.newWindow) {
        let body = this.newWindow.document.querySelector('body');
        body.insertAdjacentHTML('beforeend', formattedHtml);

        if (this.newWindow.focus) this.newWindow.focus();
      } else if(!this.newWindow || this.newWindow.closed || typeof this.newWindow.closed === 'undefined') { 
        throw new Error('Popup has been blocked by browser');
      } else {
        throw new Error('Failed to create incomping call popup');
      }
    } catch(error) {
      console.error(' Incoming Call Pop Error ', { error });
      this.logController.logError({ errorCode: 'Incoming Call Pop Error', data: { error: { message: error.message } } });
      this.stateService.triggerError.incomingCallPop();
    }
  }

  private triggerAutoAnswer(): void {
    this.logController.logInfo({ action: 'Checking if user has auto answer enabled', data: { sessionId: this.appStore.sessionId, autoAnswer: this.autoAnswer }});
    if (this.autoAnswer) {
      this.logController.logInfo({ action: 'Auto answer has been enabled. This call will be answered in 3 seconds', data: { sessionId: this.appStore.sessionId, autoAnswer: this.autoAnswer }});
      setTimeout(() => {
        this._handleAcceptInboundCall('Auto Answer');
      }, 3000);
    }
  }

  public showNoMediaAccessNotification(): void {
    const options = {
      type: 'basic',
      title: 'To continue, please try:',
      // message: '1. Grant ZaiCommunicator permission to access media devices, or',
      message: '1. Grant ZaiCommunicator permission to access media devices, or 2. Connect a working microphone and speaker/headphones',
      // contextMessage: '2. Connect a working microphone',
      iconUrl: 'images/icon-128.png',
      requireInteraction: false,
    };
    this.createChromeNotification('no-media-access', options);
    //TODO: Model as well
  }

  public async createChromeNotification(title: string, options, highlightAndFocus?): Promise<void> {
    await this.clearNotifications();
    
    if (!('Notification' in window) || !('ServiceWorkerRegistration' in window)) {
      console.warn('Persistent Notification API not supported!');
      return;
    }

    if (Notification.permission == 'granted') {
      try {
        navigator.serviceWorker.getRegistration().then(function(reg) {
          reg.showNotification(title, options);
        });
      } catch(e) {
        this.logController.logError({ errorCode: 'Failed to show notification due to cause', error: { message: e.message } });
      }
    }
  }

  private closeNotification(notification): Promise<void> {
    return new Promise(resolve => {
      if (notification.onclose) {
        notification.onclose(resolve);
      }
      notification.close();
      resolve();
    });
  }

  public clearNotifications(): Promise<void> {
    return new Promise(resolve => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          return;
        }
        try {
          registration.getNotifications().then((notifications) => {

            let promises = [];
            notifications.forEach(notification => promises.push(this.closeNotification(notification)));
            Promise.all(promises).then(() => resolve());
          })
        } catch(e) {}
      })
    })
  }
}
