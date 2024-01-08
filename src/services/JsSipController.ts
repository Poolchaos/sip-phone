import { LogManager, autoinject } from 'aurelia-framework';

import * as sipController from 'jssip';
import { LogController } from './LogController';
import { StateService } from './state-service';

import * as moment from 'moment';
import { AppStore } from './app-store';
import { DeviceManagementService } from './device-management-service';
import { EventAggregator } from 'aurelia-event-aggregator';
import { ACTIONS } from './event-constants';

const logger = LogManager.getLogger('JsSipController');

export enum JsSIPErrorType {
  GENERIC = 'GENERIC',
  SIP_ERROR = 'SIP_ERROR',
  SESSION_ERROR = 'SESSION_ERROR',
}

export class PhoneServiceConstants {
  static readonly TELEPHONY_CONSTANTS = {
    DIRECTION_OUTBOUND: 'outbound',
    DIRECTION_INBOUND: 'inbound',
    CALL_TYPE_CLICK_TO_DIAL: 'ClickToDial',
    CALL_TYPE_OUTBOUND_REGULAR: 'RegularOutbound',
    CALL_TYPE_INBOUND_INTERNAL: 'Internal',
    CALL_TYPE_INBOUND_FLOW: 'Flow',
    CALL_TYPE_INBOUND_UNKNOWN: 'InboundUnknown',
  };
}

export class PhoneServiceImplementationEvent {
  static readonly CHANNEL = 'channel:phone-service-implementation';
  static readonly SIP = {
    JSSIP_USER_AGENT: {
      CONNECTING: 'events:sip:user-agent:connecting',
      CONNECTED: 'events:sip:user-agent:connected',
      DISCONNECTED: 'events:sip:user-agent:disconnected',
      REGISTERED: 'events:sip:user-agent:registered',
      UNREGISTERED: 'events:sip:user-agent:unregistered',
      REGISTRATION_FAILED: 'events:sip:user-agent:registration-failed',
      REGISTRATION_EXPIRING: 'events:sip:user-agent:registration-expiring',
      NEW_RTC_SESSION: 'events:sip:user-agent:new-rtc-session',
      NEW_MESSAGE: 'events:sip:user-agent:new-message',
    },
    JSSIP_RTC_SESSION: {
      CONNECTING: 'events:sip:rtcsession:connecting',
      PEERCONNECTION: 'events:sip:rtcsession:peerconnection',
      SENDING: 'events:sip:rtcsession:sending',
      PROGRESS: 'events:sip:rtcsession:progress',
      ACCEPTED: 'events:sip:rtcsession:accepted',
      CONFIRMED: 'events:sip:rtcsession:confirmed',
      ENDED: 'events:sip:rtcsession:ended',
      FAILED: 'events:sip:rtcsession:failed',
      NEWDTMF: 'events:sip:rtcsession:newDTMF',
      NEWINFO: 'events:sip:rtcsession:newInfo',
      HOLD: 'events:sip:rtcsession:hold',
      UNHOLD: 'events:sip:rtcsession:unhold',
      MUTED: 'events:sip:rtcsession:muted',
      UNMUTED: 'events:sip:rtcsession:unmuted',
      REINVITE: 'events:sip:rtcsession:reinvite',
      UPDATE: 'events:sip:rtcsession:update',
      REFER: 'events:sip:rtcsession:refer',
      REPLACES: 'events:sip:rtcsession:replaces',
      SDP: 'events:sip:rtcsession:sdp',
      ICE_CANDIDATE: 'events:sip:rtcsession:icecandidate',
      GET_USER_MEDIA_FAILED: 'events:sip:rtcsession:getusermediafailed',
      PEER_CONNECTION__CREATEOFFERFAILED: 'events:sip:rtcsession:peerconnection:createofferfailed',
      PEER_CONNECTION__CREATEANSWERFAILED: 'events:sip:rtcsession:peerconnection:createanswerfailed',
      PEER_CONNECTION__SETLOCALDESCRIPTIONFAILED: 'events:sip:rtcsession:peerconnection:setlocaldescriptionfailed',
      PEER_CONNECTION__SETREMOTEDESCRIPTIONFAILED: 'events:sip:rtcsession:peerconnection:setremotedescriptionfailed',
    },
  };
}

@autoinject()
export class JsSipController {
  private CONNECTION_TIMEOUT_MS = 10000;
  private sipSocket: any;
  private userAgent: sipController.UA;
  private peerConnection: RTCPeerConnection;

  private callEventHandlers: any = {};
  private callOptions: any = {};
  private sipSession: any;
  private originId: string = 'JsSIPController';
  private pingInterval: any;
  private pingTimeout;

  private sipConfig: ISipConfig;

  // primary audio channel
  private phoneAudio: HTMLAudioElement;

  constructor(
    private stateService: StateService,
    private eventAggregator: EventAggregator,
    private logController: LogController,
    private appStore: AppStore
  ) {}

  // TODO: There has to be a better way to do this
  public setPhoneAudioElement(phoneAudio: HTMLAudioElement) {
    this.phoneAudio = phoneAudio;
  }

  private _initializeUserAgent(_config) {
    logger.debug('WP | SIP | initialise Sip | initialise UserAgent', _config);
    this.sipSocket = new sipController.WebSocketInterface(`wss://${_config.host}:${_config.port}`);
    this.userAgent = new sipController.UA({
      sockets: [this.sipSocket],
      uri: `sip:${_config.userName}@${_config.domain}`,
      password: _config.password,
    });
    this._registerUserAgentListeners();
    this.sipConfig = _config;
  }

  private _registerUserAgentListeners() {

    this.userAgent.on('connecting', (_details: any) => {
      this.logController.logInfo({ code: 'Sip websocket connecting' });
      this.stateService.triggerSip.connecting();
    });
    this.userAgent.on('connected', (_details: any) => {
      this.logController.logInfo({ code: 'Sip websocket connected' });
      this.stateService.triggerSip.connected();
      this.startSocketPing();

      if (this.sipSocket) {
        let socket = this.sipSocket._ws;
        if (socket) {

          socket.oldSend = socket.send;
          const logController = this.logController;
          const eventAggregator = this.eventAggregator;

          socket.send = function(data) {
            if (data !== '\r\n') {
              // logController.logInfo({ action: 'ws::send', data: { message: data } });
            }
            socket.oldSend.apply(this, [data]);
          };

          socket.oldOnmessage = socket.onmessage;
          const checkPing = () => {
            if (this.pingTimeout) {
              console.debug(' SIP | OPTIONS reveived - clearing ping ');
              window.clearTimeout(this.pingTimeout);
            }
            this.pingTimeout = setTimeout(() => {
              this.logController.logInfo({ action: 'Sip Websocket ping timedout. Closing connections...' });
              eventAggregator.publish('SIP:STOP', 'Error: Sip options');
              parent.postMessage('disconnected', '*'); // does parent want to be aware of this?
              console.log(' SIP | OPTIONS not reveived | CODE RED ');
            }, 120000);
          };
          socket.onmessage = function(event) {
            let hasOptions = event.data === '\r\n';
            if (hasOptions) {
              logger.debug(moment().format('DD/mm/YYYY hh:mm:ss') + ' - SIP | OPTIONS reveived ');
              checkPing();
            }
            socket.oldOnmessage.apply(this, [event]);
          };
        }
      }
    });
    let debounce = false;
    this.userAgent.on('disconnected', (_details: any) => {
      setTimeout(() => {
        debounce = false;
      }, 500);
      if (debounce) return;

      debounce = true;
      this.logController.logInfo({ code: 'Sip websocket disconnected' });
      this._doUserAgentDisconnected('Sip websocket disconnected');
      logger.debug('WP | DISCONNECT | SIPJS | disconnected');
      this.stateService.handleDisconnected();

      this.clearSocketPing();
    });

    // Registration Events
    this.userAgent.on('registered', (_details: any) => {
      this.logController.logInfo({ code: 'User agent registered' });
      this.stateService.triggerUA.registered();
    });
    this.userAgent.on('unregistered', (_details: any) => {
      this.logController.logInfo({ code: 'User agent unregistered' });
      this.stateService.triggerUA.unregistered();
    });
    this.userAgent.on('registrationFailed', (_details: any) => {
      this.logController.logInfo({ code: 'User agent registrationFailed' });
      this.stateService.triggerUA.failed();
      logger.debug('WP | DISCONNECT | SIPJS | registrationFailed ');
    });
    /*
    IMPORTANT: If you implement a listener for `registrationExpiring`, you will need to manually reconnect JSSIP UA after registration expires
     */
    // this.userAgent.on('registrationExpiring', (_details: any) => {
    // });

    // call events
    this.userAgent.on('newRTCSession', (_details: any) => {
      parent.postMessage('webphone-new-session', '*');
      const callInfo = this._analyzeCallType(_details);

      // this meta data can be used by other event handlers later. We specifically
      // use the `data` field of session, which is intended for custom data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      this._setRTCSessionMetaData(_details.session, {
        ...callInfo,
      });

      // "inbound" calls
      if (_details && _details.originator === 'remote') {
        this.stateService.triggerTelephony.notified(_details.request.call_id);
        const inboundMeta = this._analyzeCallType(_details);
        // OPTION 1 - accept the click to dial, but we have no events for ringing etc. (goes straight to On Call)
        if (inboundMeta.type === 'ClickToDial') {
          // for click to dial calls, only accept only the first
          if (!this.sipSession) {
            logger.debug('WP | SIP | newRTCSession :: call type "inbound" - ClickToDial :: answering. meta:', inboundMeta);
            this.addInboundSubscriptions(_details);
            this.answer();
          } else {
            if (this.sipSession !== _details.session) {
              logger.debug(
                'newRTCSession :: call type "inbound" - ClickToDial :: already on call so terminate new inbound. meta:',
                inboundMeta
              );
              _details.session.terminate();
            }
          }
        } else {
          // for our general inbound calls, only accept one
          if (!this.sipSession) {
            logger.debug(
              `newRTCSession :: call type "inbound" - ${inboundMeta.type} :: route to phone. meta:`,
              inboundMeta
            );
            this.addInboundSubscriptions(_details);
          }
        }
      }
      
      const req = _details.request;

      const logNewRTC = () => {
        
        if (!req.body) {
          setTimeout(() => {
            logNewRTC();
          }, 100);
          return;
        }

        let request = JSON.parse(JSON.stringify({
          body: req.body ? req.body.toString() : null,
          data: req.data ? req.data.toString() : null,
          call_id: req.call_id,
          from: req.from,
          method: req.method,
          ruri: req.ruri,
          sdp: req.sdp,
          to: req.to
        }));
        const session = {
          _connection: this.sipSession ? this.sipSession._connection : null
        };
        this.logController.logInfo({ action: 'newRTCSession',  data: {
          originator: _details.originator,
          request,
          session,
          ...this.getwebphoneStatus()
        }});
      }
      
      logNewRTC();
    });
  }

  private _doConnecting(): void {
    if (!this.sipSession) {
      return;
    }
    const payload = this._getRTCSessionMetaData();
    this.stateService.triggerTelephony.connecting(payload);
  }

  // TODO: Property Initializer syntax
  private _handlerRTCConnecting = (e): void => {
    parent.postMessage('webphone-connecting', '*');
    this._doConnecting();
  };

  // TODO: Property Initializer syntax
  private _handlerRTCSending = (e): void => {
    const payload = this._getRTCSessionMetaData();
    this.stateService.triggerTelephony.sending(payload);
    
    let request = JSON.parse(JSON.stringify({
      body: e.request.body ? e.request.body.toString() : null,
      data: e.request.data ? e.request.data.toString() : null,
      call_id: e.request.call_id,
      from: e.request.from,
      method: e.request.method,
      ruri: e.request.ruri,
      sdp: e.request.sdp,
      to: e.request.to
    }));
    this.logController.logInfo({ action: 'RTC Sending',  data: { request, ...this.getwebphoneStatus() } });
  };

  private _handlerRTCProgress = (e): void => {
    const payload = this._getRTCSessionMetaData();
    this.stateService.triggerTelephony.progress({
      ...payload,
      __progress: {
        reason_phrase: e.response && e.response.reason_phrase,
      },
    });
    let response = null;
    if (e.response) {
      response = JSON.parse(JSON.stringify({
          body: e.response.body ? e.response.body.toString() : null,
          data: e.response.data ? e.response.data.toString() : null,
          call_id: e.response.call_id,
          from: e.response.from,
          method: e.response.method,
          ruri: e.response.ruri,
          sdp: e.response.sdp,
          to: e.response.to
      }));
    }
    this.logController.logInfo({ action: 'RTC Progress',  data: { ...response, ...this.getwebphoneStatus() } });
  };

  private _handlerRTCAccepted = (e): void => {
    const payload = this._getRTCSessionMetaData();
    this.stateService.triggerTelephony.accepted({
      ...payload,
      __accepted: {},
    });
    let response = null;
    if (e) {
      response = JSON.parse(JSON.stringify({
          body: e.body ? e.body.toString() : null,
          data: e.data ? e.data.toString() : null,
          call_id: e.call_id,
          from: e.from,
          method: e.method,
          ruri: e.ruri,
          sdp: e.sdp,
          to: e.to
      }));
    }
    this.logController.logInfo({ action: 'RTC Accepted',  data: { ...response, ...this.getwebphoneStatus() } });
  };

  private _handlerRTCConfirmed = (e): void => {
    const payload = this._getRTCSessionMetaData();
    this.stateService.triggerTelephony.confirmed({
      ...payload,
      __confirmed: {},
    });

    let response = null;
    if (e.ack) {
      response = JSON.parse(JSON.stringify({
          body: e.ack.body ? e.ack.body.toString() : null,
          data: e.ack.data ? e.ack.data.toString() : null,
          call_id: e.ack.call_id,
          from: e.ack.from,
          method: e.ack.method,
          ruri: e.ack.ruri,
          sdp: e.ack.sdp,
          to: e.ack.to
      }));
    }
    this.logController.logInfo({ action: 'RTC Confirmed',  data: { response, ...this.getwebphoneStatus() }});
  };
  private _handlerRTCEnded = (e): void => {
    logger.debug(' WP | SIP | RTC Ended ', e);
    parent.postMessage('webphone-ended', '*');
    const payload = this._getRTCSessionMetaData();
    let formatedCause = causeFormatter(e.cause, e.originator, payload.callInfo.direction);
    Object.assign(payload.callInfo, formatedCause);
    this.logController.logInfo({ action: 'handlerRTCEnded', code: e.cause,  data: { ...payload, ...this.getwebphoneStatus() } });
    this.stateService.triggerTelephony.ended({
      ...payload
    });

    // !!! Important
    this._resetSipSession();
    let response = null;
    if (e.message) {
      response = {
        call_id: e.message.call_id,
        from: e.message.from,
        method: e.message.method,
        ruri: e.message.ruri,
        sdp: e.message.sdp,
        to: e.message.to
      };
    }
    this.logController.logInfo({ action: 'RTC Ended',  data: { cause: e.cause, response, ...this.getwebphoneStatus() }});
    this.logReport();
  };

  private logReport(): void {
    try {
      this.peerConnection.getStats(null).then(stats => {
        let statsOutput = '';

        stats.forEach(report => {
          
          statsOutput += `Report: ${report.type}\nID: ${report.id}\n` +
                        `Timestamp: ${report.timestamp}\n`;

          Object.keys(report).forEach(statName => {
            if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
              statsOutput += `${statName}: ${report[statName]}\n`;
            }
          });
        });
        this.logController.logInfo({ action: 'Peer Connection - stats',  statsOutput: statsOutput });
      });
    } catch(e) {
      this.logController.logInfo({ action: 'Peer Connection - Failed to log stats',  e });
    }
  }

  private _handlerRTCFailed = (e): void => {
    logger.debug(' WP | SIP | RTC Failed ', e);
    parent.postMessage('webphone-failed', '*');
    const payload = this._getRTCSessionMetaData();

    const formatedCause = causeFormatter(e.cause, e.originator, payload.callInfo.direction);
    Object.assign(payload.callInfo, formatedCause);

    this.stateService.triggerTelephony.failed({
      ...payload,
      cause: e.cause
    });

    // #!!! Important
    this._resetSipSession();
    let response = null;
    if (e.message) {
      response = {
        call_id: e.message.call_id,
        from: e.message.from,
        method: e.message.method,
        ruri: e.message.ruri,
        sdp: e.message.sdp,
        to: e.message.to
      };
    }
    logger.debug(' WP | SIP | RTC Failed ', e);
    this.logController.logInfo({ action: 'RTC Failed',  data: { ...response, ...this.getwebphoneStatus(), formatedCause, error: e } });
  };

  private _resetSipSession(): void {
    this.logController.logInfo({ action: 'Reset sip session', data: { sessionId: this.appStore.sessionId }});
    this.sipSession = null;
  }

  private _handlerRTCnewDTMF = (e): void => {
    // logger.debug('WP | SIP | call event: newDTMF', e);
  };
  private _handlerRTCnewInfo = (e): void => {
    // logger.debug('WP | SIP | call event: newInfo', e);
  };
  private _handlerRTCreinvite = (e): void => {
    // logger.debug('WP | SIP | call event: reinvite', e);
  };
  private _handlerRTCupdate = (e): void => {
    // logger.debug('WP | SIP | call event: update', e);
  };
  private _handlerRTCrefer = (e): void => {
    // logger.debug('WP | SIP | call event: refer', e);
  };
  private _handlerRTCreplaces = (e): void => {
    // logger.debug('WP | SIP | call event: replaces', e);
  };
  private _handlerRTCsdp = (e): void => {
    // logger.debug('WP | SIP | call event: sdp', e);
  };
  private _handlerRTCicecandidate = (e): void => {
    // logger.debug('WP | SIP | call event: icecandidate', e);
  };
  private _handlerRTCgetusermediafailed = (e, direction): void => {
    logger.debug('WP | SIP | call event: getusermediafailed', e);
    this.stateService.triggerError.mediaDevice();
    
    const settings = this.appStore.settings;
    let configuredDevice: MediaDeviceInfo = settings.inputDevice;
    try {
      this.logController.logError({ errorCode: 'Invalid media device', data: { error: { message: e.message }, direction, configuredDevice } });
    } catch(error) {
      this.logController.logError({ errorCode: 'Invalid media device log error', data: { error: { message: e.message }, direction, configuredDevice } });
    }
  };
  private _handlerRTCcreateofferfailed = (e): void => {
    // logger.debug('WP | SIP | call event: createofferfailed', e);
    this.logController.logError({ errorCode: 'Create offer failed' });
  };
  private _handlerRTCcreateanswerfailed = (e): void => {
    // logger.debug('WP | SIP | call event: createanswerfailed', e);
    this.logController.logError({ errorCode: 'Create answer failed', e });
  };
  private _handlerRTCsetlocaldescriptionfailed = (e): void => {
    // logger.debug('WP | SIP | call event: setlocaldescriptionfailed', e);
    this.logController.logError({ errorCode: 'Set local description failed' });
  };
  private _handlerRTCsetremotedescriptionfailed = (e): void => {
    //logger.debug('WP | SIP | call event: setremotedescriptionfailed', e);
    this.logController.logError({ errorCode: 'Set remote description failed' });
  };

  private _handleRTChold = (e): void => {
    this.stateService.triggerTelephony.hold();
  };
  private _handleRTCunhold = (e): void => {
    this.stateService.triggerTelephony.unhold();
  };
  private _handleRTCmuted = (e): void => {
    this.stateService.triggerTelephony.mute();
  };
  private _handleRTCunmuted = (e): void => {
    this.stateService.triggerTelephony.unmute();
  };

  // TODO: Perhaps make public, and provide dependencies
  private connectRemoteAudioToAudioElement(): void {
    this.sipSession.connection.onaddstream = (e): void => {
      this.phoneAudio.srcObject = e.stream;
      this.phoneAudio.play();
    };
  }

  private _handlerRTCPeerConnection = (e): void => {
    parent.postMessage('webphone-peerconnection', '*');

    this.peerConnection = e.peerconnection;
    this.logReport();
  };

  private _configureCallOptions() {
    // we'll leverage the fact that newRTCSession would have created
    this.callEventHandlers = {
      connecting: this._handlerRTCConnecting,
      peerconnection: this._handlerRTCPeerConnection,
      sending: this._handlerRTCSending,
      progress: this._handlerRTCProgress,
      accepted: this._handlerRTCAccepted,
      confirmed: this._handlerRTCConfirmed,
      ended: this._handlerRTCEnded,
      failed: this._handlerRTCFailed,
      hold: this._handleRTChold,
      unhold: this._handleRTCunhold,
      muted: this._handleRTCmuted,
      unmuted: this._handleRTCunmuted,

      newDTMF: this._handlerRTCnewDTMF,
      newInfo: this._handlerRTCnewInfo,
      reinvite: this._handlerRTCreinvite,
      update: this._handlerRTCupdate,
      refer: this._handlerRTCrefer,
      replaces: this._handlerRTCreplaces,
      sdp: this._handlerRTCsdp,
      icecandidate: this._handlerRTCicecandidate,
      getusermediafailed: e => this._handlerRTCgetusermediafailed(e, 'outbound'),
      createofferfailed: this._handlerRTCcreateofferfailed,
      createanswerfailed: this._handlerRTCcreateanswerfailed,
      setlocaldescriptionfailed: this._handlerRTCsetlocaldescriptionfailed,
      setremotedescriptionfailed: this._handlerRTCsetremotedescriptionfailed,
    };
    this.callOptions = {
      eventHandlers: this.callEventHandlers,
      mediaConstraints: { audio: true, video: false },
      pcConfig: {
        iceServers: [],
      },
    };
  }

  private _startConnection() {
    this.userAgent.start();
  }

  /**
   * Haha, lalala
   *
   * @throws TelephonyGeneralNetworkError asdfasdf
   * @throws TelephonyConnectionTimeoutError
   * @throws TelephonyRegistrationError
   * @param _config
   */
  public async initialise(_config: ISipConfig): Promise<any> {
    if (this.userAgent) return;
    try {
      await DeviceManagementService.getDevicePermissions();
      DeviceManagementService.listenForMediaChanges();
    } catch(error) {
      this.logController.logInfo({ action: 'Webphone initialisation error', error: error });
      logger.debug('WP | SIP | initialise Sip ', error.toString() );
      return Promise.reject(error.toString());
    }
    try {
      await DeviceManagementService.checkForValidDevices();
    } catch(error) {
      this.logController.logInfo({ action: 'Failed to get media devices', error: error });
      logger.debug('WP | SIP | initialise Sip ', error.toString() );
      this.stateService.triggerError.mediaDevice();
      return Promise.reject(error.toString());
    }
    logger.debug('WP | SIP | initialise Sip | valid devices');

    this._initializeUserAgent(_config);
    let disconnectedListener;
    let registrationFailedListener;
    let successListener;

    let timeoutTimer;
    try {
      await new Promise((resolve, reject) => {
        disconnectedListener = _details => {
          logger.debug('WP | SIP | initialize - disconnected', _details);
          this.logController.logInfo({ code: 'UserAgent disconnected',  data: { ..._details, ...this.getwebphoneStatus() } });
          this.stateService.triggerSip.disconnected();
          
          if (this.pingTimeout) {
            window.clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
          }
          reject();
        };
        registrationFailedListener = _details => {
          logger.debug('WP | SIP | initialize - registrationFailed', _details);
          this.stateService.triggerSip.failed(_details.request.call_id);
          this.logController.logInfo({ code: 'UserAgent registrationFailed',  data: { ..._details, ...this.getwebphoneStatus() } });
          
          if (this.pingTimeout) {
            window.clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
          }
          reject();
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        successListener = _details => {
          logger.debug('WP | SIP | initialize - success', _details);
          let response = null;
          if (_details.response) {
            response = {
              body: _details.response.body ? _details.response.body.toString() : null,
              data: _details.response.data ? _details.response.data.toString() : null,
              call_id: _details.response.call_id,
              from: _details.response.from,
              method: _details.response.method,
              ruri: _details.response.ruri,
              sdp: _details.response.sdp,
              to: _details.response.to
            };
          }
          this.logController.logInfo({ code: 'UserAgent initialized',  data: { ...response, ...this.getwebphoneStatus() } });
          this.stateService.triggerSip.connected();
          resolve({});
        };
        logger.debug('WP | SIP | initialize | adding connection event handlers');

        this.userAgent.addListener('disconnected', disconnectedListener);
        this.userAgent.addListener('registrationFailed', registrationFailedListener);
        this.userAgent.addListener('registered', successListener);

        this._startConnection();

        timeoutTimer = setTimeout(() => {
          reject();
        }, this.CONNECTION_TIMEOUT_MS);
      });

      if (timeoutTimer) {
        clearInterval(timeoutTimer);
      }
      this.userAgent.removeListener('disconnected', disconnectedListener);
      this.userAgent.removeListener('registrationFailed', registrationFailedListener);
      this.userAgent.removeListener('registered', successListener);

      // we are registered and have a connection, so continue
      this._configureCallOptions();
    } catch (err) {
      logger.error('WP |', err);
      if (timeoutTimer) {
        clearInterval(timeoutTimer);
      }
      this.userAgent.removeListener('disconnected', disconnectedListener);
      this.userAgent.removeListener('registrationFailed', registrationFailedListener);
      this.userAgent.removeListener('registered', successListener);

      this._doUserAgentDisconnected(err);
      throw 'Telephony error';
    }
  }

  private _doUserAgentDisconnected(err): void {
    if (this.userAgent) {
      this.userAgent.stop();
      this.logController.logInfo({ action: 'stop UserAgent', data: { err, ...this.getwebphoneStatus() } });
    }
  }

  private _analyzeCallType(_details): any {
    const { request, originator } = _details;
    let direction;
    let callType;

    let inboundType = '';

    // flow or internal
    const telephonyXReferencesHeaders = request.headers['X-References'];

    // FIXME: sebastian confirmed first element is always a call type, so we can split into array
    if (telephonyXReferencesHeaders && telephonyXReferencesHeaders[0] && telephonyXReferencesHeaders[0].raw) {
      const internalMatch = /internal/g;
      const flowMatch = /flow/g;
      const { raw } = telephonyXReferencesHeaders[0];
      if (raw.match(internalMatch)) {
        inboundType = PhoneServiceConstants.TELEPHONY_CONSTANTS.CALL_TYPE_INBOUND_INTERNAL;
      } else if (raw.match(flowMatch)) {
        inboundType = PhoneServiceConstants.TELEPHONY_CONSTANTS.CALL_TYPE_INBOUND_FLOW;
      } else {
        inboundType = PhoneServiceConstants.TELEPHONY_CONSTANTS.CALL_TYPE_INBOUND_UNKNOWN;
      }
    } else {
      // click to dial
      // MIGHT BE CLICK TO DIAL
      inboundType = PhoneServiceConstants.TELEPHONY_CONSTANTS.CALL_TYPE_CLICK_TO_DIAL;
    }

    const telephonyInteractionHeaders = request.headers['X-Telephonyinteraction-Id'];

    // try an early set of interactionId
    let interactionId;

    if (telephonyInteractionHeaders && telephonyInteractionHeaders.length > 0 && telephonyInteractionHeaders[0].raw) {
      interactionId = telephonyInteractionHeaders[0].raw;
    }

    if (originator === 'local') {
      // OUTBOUND "classic outbound"
      direction = PhoneServiceConstants.TELEPHONY_CONSTANTS.DIRECTION_OUTBOUND;
      callType = PhoneServiceConstants.TELEPHONY_CONSTANTS.CALL_TYPE_OUTBOUND_REGULAR;
    } else {
      // INBOUND
      direction =
        inboundType === PhoneServiceConstants.TELEPHONY_CONSTANTS.CALL_TYPE_CLICK_TO_DIAL
          ? PhoneServiceConstants.TELEPHONY_CONSTANTS.DIRECTION_OUTBOUND
          : PhoneServiceConstants.TELEPHONY_CONSTANTS.DIRECTION_INBOUND;
      callType = inboundType;
    }

    const isOutbound = originator === 'local';

    let remote;

    if (isOutbound) {
      remote = request.to.uri.user;
    } else {
      if (callType === PhoneServiceConstants.TELEPHONY_CONSTANTS.CALL_TYPE_INBOUND_INTERNAL) {
        remote = request.from.display_name;
      } else {
        remote = request.from.uri.user;
      }
    }

    const inboundCallMeta = {
      call_id: request.call_id,
      local: isOutbound ? request.from.uri.user : request.to.uri.user,
      remote: remote,
      originator,
      direction,
      type: callType,
      interactionId,
    };

    logger.debug('WP | SIP | _analyzerInboundType inboundCallMeta:', inboundCallMeta);

    let _request = JSON.parse(JSON.stringify({
      body: request.body ? request.body.toString() : null,
      data: request.data ? request.data.toString() : null,
      call_id: request.call_id,
      from: request.from,
      method: request.method,
      ruri: request.ruri,
      sdp: request.sdp,
      to: request.to
    }));
    this.logController.logInfo({ action: 'manage call',  data: { request: _request, ...this.getwebphoneStatus() }});

    return inboundCallMeta;
  }

  private _getRTCSessionMetaData(): any {
    logger.debug('WP | SIP | _getRTCSessionMetaData. this.sipSession', this.sipSession);
    if (!this.sipSession) {
      return;
    }
    const callData = {
      ...this.sipSession.data,
    };
    if (this.sipSession.start_time) {
      callData.start_time = this.sipSession.start_time.getTime();
    }
    if (this.sipSession.end_time) {
      callData.end_time = this.sipSession.end_time.getTime();
    }

    return {
      callInfo: callData,
    };
  }

  private _setRTCSessionMetaData(session, data): void {
    for (let prop in data) {
      // TODO: this.sipSession set slightly differently for outbound/inbound
      session.data[prop] = data[prop];
    }
  }

  private addInboundSubscriptions(_details): void {
    this.sipSession = _details.session;

    // we initialize "connecting" directly
    this._doConnecting();
    this.sipSession.on('peerconnection', this._handlerRTCPeerConnection);
    this.sipSession.on('sending', this._handlerRTCSending);
    this.sipSession.on('progress', this._handlerRTCProgress);
    this.sipSession.on('accepted', this._handlerRTCAccepted);
    this.sipSession.on('confirmed', this._handlerRTCConfirmed);
    this.sipSession.on('ended', this._handlerRTCEnded);
    this.sipSession.on('failed', this._handlerRTCFailed);

    this.sipSession.on('hold', this._handleRTChold);
    this.sipSession.on('unhold', this._handleRTCunhold);
    this.sipSession.on('muted', this._handleRTCmuted);
    this.sipSession.on('unmuted', this._handleRTCunmuted);

    this.sipSession.on('newDTMF', this._handlerRTCnewDTMF);
    this.sipSession.on('newInfo', this._handlerRTCnewInfo);
    this.sipSession.on('reinvite', this._handlerRTCreinvite);
    this.sipSession.on('update', this._handlerRTCupdate);
    this.sipSession.on('refer', this._handlerRTCrefer);
    this.sipSession.on('replaces', this._handlerRTCreplaces);
    this.sipSession.on('sdp', this._handlerRTCsdp);
    this.sipSession.on('icecandidate', this._handlerRTCicecandidate);
    this.sipSession.on('getusermediafailed', e => this._handlerRTCgetusermediafailed(e, 'inbound'));
    this.sipSession.on('createofferfailed', this._handlerRTCcreateofferfailed);
    this.sipSession.on('createanswerfailed', this._handlerRTCcreateanswerfailed);
    this.sipSession.on('setlocaldescriptionfailed', this._handlerRTCsetlocaldescriptionfailed);
    this.sipSession.on('setremotedescriptionfailed', this._handlerRTCsetremotedescriptionfailed);
  }

  public async callSip(_numberOrSip: string, extraData?: any): Promise<void> {
    if (!this.sipSession) {
      logger.debug(`user-action :: callSip :: number:'${_numberOrSip}'`);
      
      const settings = this.appStore.settings;
      if (settings) {
        let configuredDevice: MediaDeviceInfo = settings.inputDevice;
        let device = await DeviceManagementService.findDevice(configuredDevice);
        if (device && device.deviceId) {
          this.callOptions.mediaConstraints.audio = {
            deviceId: {
              exact: device.deviceId
            }
          }
        }
      }

      this.sipSession = this.userAgent.call(`sip:${_numberOrSip.trim()}@${this.sipConfig.domain}`, this.callOptions);
      if (extraData) {
        this._setRTCSessionMetaData(this.sipSession, extraData);
      }
      this.logController.logInfo({ action: 'start call',  data: {
        sipSession: { _connection: this.sipSession._connection },
        request: {
          body: this.sipSession._request.body ? this.sipSession._request.body.toString() : null,
          data: this.sipSession._request.data ? this.sipSession._request.data.toString() : null
        },
        ...this.getwebphoneStatus()
      }});
      this.connectRemoteAudioToAudioElement();
    }
  }

  public endCall(): void {
    if (this.sipSession) {
      logger.debug('WP | SIP | user-action :: end call ');
      try {
        this.sipSession.terminate();
        this.logController.logInfo({ action: 'agent terminates call',  data: {}});
      } catch (e) {
        logger.error('Failed to end call due to cause', e, 'error message:', e.message);
      }
    }
  }

  public async answer(): Promise<void> {
    if (this.sipSession) {
      logger.debug('WP | SIP | user action :: answer ', this.sipSession);

      let mediaConstraints: any = {
        audio: true,
        video: false
      };
      const settings = this.appStore.settings;
      let device;
      if (settings) {
        let configuredDevice: MediaDeviceInfo = settings.inputDevice;
        device = await DeviceManagementService.findDevice(configuredDevice);
        
        if (device && device.deviceId) {
          mediaConstraints.audio = {
            deviceId: {
              exact: device.deviceId
            }
          }
        }
      }

      try {
        this.sipSession.answer({
          mediaConstraints
        });
        this.stateService.triggerTelephony.answered(this.sipSession._data.call_id);
      } catch(e) {
        logger.debug(' WP | SIP | Answer threw exception ', { e });
        // INVALID_STATE_ERROR: Invalid status: 5 | STATUS_ANSWERED - already answered
        // INVALID_STATE_ERROR: Invalid status: 9 | STATUS_TERMINATED - already terminated

        this.logController.logInfo({ action: 'Failed to answer call',  data: { ...this.getwebphoneStatus(), error: e, device: device || 'No device set' } });
      }
      this.connectRemoteAudioToAudioElement();
      let _connection = this.sipSession ? this.sipSession._connection : null;
      this.logController.logInfo({ action: 'answer',  data: {
        sipSession: { _connection },
        request: {
          body: this.sipSession._request.body ? this.sipSession._request.body.toString() : null,
          data: this.sipSession._request.data ? this.sipSession._request.data.toString() : null
        },
        ...this.getwebphoneStatus()
      }});
    } else {
      this.logController.logInfo({ action: 'Failed to answer call due to not having an active sip session', data: { sessionId: this.appStore.sessionId }});
    }
  }

  public mute() {
    const muteOptions = { audio: true, video: false };

    if (this.sipSession) {
      logger.debug('WP | SIP | user action :: mute');
      this.sipSession.mute(muteOptions);
      this.logController.logInfo({ action: 'mute',  data: { ...this.getwebphoneStatus() } });
    }
  }

  public unmute() {
    // TODO: Extract to instance variable
    const muteOptions = { audio: true, video: false };

    if (this.sipSession) {
      logger.debug('WP | SIP | user action :: unmute');
      this.sipSession.unmute(muteOptions);
      this.logController.logInfo({ action: 'unmute',  data: { ...this.getwebphoneStatus() } });
    }
  }

  public hold() {
    const holdOptions = { useUpdate: true };
    if (this.sipSession) {
      logger.debug('WP | SIP | user action :: hold');
      this.sipSession.hold(holdOptions, done => {
        // on hold
      });
      this.logController.logInfo({ action: 'hold',  data: { ...this.getwebphoneStatus() } });
    }
  }

  public unhold() {
    const holdOptions = { useUpdate: true };
    if (this.sipSession) {
      logger.debug('WP | SIP | user action :: unhold');
      this.sipSession.unhold(holdOptions, done => {});
      this.logController.logInfo({ action: 'unhold',  data: { ...this.getwebphoneStatus() } });
    }
  }

  public isOnCall() {
    if (this.sipSession && this.sipSession.isEstablished()) {
      return true;
    }
    return false;
  }

  public isMuted(): boolean {
    if (this.sipSession) {
      return this.sipSession.isMuted().audio;
    }
    return false;
  }

  public isConnected(): boolean {
    if (this.userAgent) {
      return this.userAgent.isConnected();
    }
    return false;
  }

  public isRegistered(): boolean {
    if (this.userAgent) {
      return this.userAgent.isRegistered();
    }
    return false;
  }

  public isOnHold(): boolean {
    return this.sipSession.isOnHold().local;
  }

  public transferBlind(target) {
    logger.debug(`user action :: blind transfer to ${target}`);

    // this.sipSession = this.userAgent.call(`sip:${_numberOrSip}@${this.sipConfig.domain}`, this.callOptions);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let referSubscriber = this.sipSession.refer(`sip:${target}@${this.sipConfig.domain}`, {
      // TODO: can blind transfer have any errors?
      eventHandlers: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        requestSucceeded: e => {
          this.endCall();
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        requestFailed: e => {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        trying: e => {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        progress: e => {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        accepted: e => {},
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        failed: e => {},
      },
    });
    this.logController.logInfo({ action: 'blind transfer',  data: { referSubscriber, ...this.getwebphoneStatus() } });
  }

  public sendDTMF(tone: string | number) {
    if (this.sipSession) {
      try {
        let _tone = tone + '';
        switch (tone) {
          case 'asterisk':
            _tone = '*';
            break;
          case 'hash':
            _tone = '#';
            break;
        }
        logger.debug(`user action :: dtmf tone ${tone}`);
        if (_tone.match(/^[0-9*#]/g) && _tone.length === 1) {
          this.sipSession.sendDTMF(_tone);
        }
      } catch (e) {
        logger.error(`sendDTMF error for tone: '${tone}' error:`, e, 'tone:', tone, 'error message:', e.message);
      }
    }
  }

  public destroyUserAgent(): void {
    if (this.userAgent) {
      this.userAgent.terminateSessions();
      this.userAgent.stop();
      this.userAgent.unregister();
    }
    this.sipConfig = null;
    this.userAgent = null;
    this.logController.logInfo({ action: 'All sessions has been closed and unregistered', data: { ...this.getwebphoneStatus() } });
  }

  private startSocketPing(): void {
    this.clearSocketPing();
    if (this.sipSocket.isConnected()) {
      this.pingInterval = setInterval(() => {
        logger.debug('WP | SIP | system-action :: ping socket');
        this.sipSocket.send('\r\n');
      }, 5000);
    }
  }

  private clearSocketPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private getwebphoneStatus(): any {
    let status = {
      userAgent: null,
      sipSocket: null
    };

    if (this.userAgent) {
      status.userAgent = {
        isConnected: this.userAgent.isConnected(),
        isRegistered: this.userAgent.isRegistered()
      };
    }

    if (this.sipSocket) {
      status.sipSocket = {
        isConnecting: this.sipSocket.isConnecting(),
        isConnected: this.sipSocket.isConnected()
      };
    }
    return { currentStatus: status };
  }
}

// see https://jssip.net/documentation/3.2.x/api/causes/
const causeFormatter = (cause, originator, direction) => {
  switch (cause) {
    // Generic error causes.
    case sipController.C.causes.CONNECTION_ERROR:
      return {
        title: 'Error 2201',
        cause,
        cause_type: JsSIPErrorType.GENERIC,
      };
    case sipController.C.causes.REQUEST_TIMEOUT:
      return {
        title: 'Error 2202',
        cause,
        cause_type: JsSIPErrorType.GENERIC,
      };
    case sipController.C.causes.SIP_FAILURE_CODE:
      return {
        title: 'Error 2203',
        cause,
        cause_type: JsSIPErrorType.GENERIC,
      };
    case sipController.C.causes.INTERNAL_ERROR:
      return {
        title: 'Error 2204',
        cause,
        cause_type: JsSIPErrorType.GENERIC,
      };

    // SIP error causes.
    case sipController.C.causes.BUSY:
      return {
        title: 'Busy',
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.REJECTED:
      return {
        title: direction === PhoneServiceConstants.TELEPHONY_CONSTANTS.DIRECTION_OUTBOUND ? 'Rejected' : 'Call Ended',
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.REDIRECTED:
      return {
        title: 'Redirected',
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.UNAVAILABLE:
      return {
        title: sipController.C.causes.NOT_FOUND,
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.NOT_FOUND:
      return {
        title: sipController.C.causes.NOT_FOUND,
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.ADDRESS_INCOMPLETE:
      return {
        title: sipController.C.causes.ADDRESS_INCOMPLETE,
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.INCOMPATIBLE_SDP:
      return {
        title: 'Error 3301',
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.MISSING_SDP:
      return {
        title: 'Error 3302',
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };
    case sipController.C.causes.AUTHENTICATION_ERROR:
      return {
        title: 'Error 3303',
        cause,
        cause_type: JsSIPErrorType.SIP_ERROR,
      };

    // Session error causes.
    case sipController.C.causes.BYE:
      return {
        title: direction === PhoneServiceConstants.TELEPHONY_CONSTANTS.DIRECTION_OUTBOUND ? 'Call Ended' : 'Call Ended',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.WEBRTC_ERROR:
      return {
        title: 'Error 4401',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.CANCELED:
      return {
        title: direction === PhoneServiceConstants.TELEPHONY_CONSTANTS.DIRECTION_OUTBOUND ? 'Cancelled' : 'Cancelled',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.NO_ANSWER:
      return {
        title: 'No Answer',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.EXPIRES:
      return {
        title: 'Error 4402',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.NO_ACK:
      return {
        title: 'Error 4403',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.DIALOG_ERROR:
      return {
        title: 'Error 4404',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.USER_DENIED_MEDIA_ACCESS:
      return {
        title: 'Error 4405',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.BAD_MEDIA_DESCRIPTION:
      return {
        title: 'Error 4406',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
    case sipController.C.causes.RTP_TIMEOUT:
      return {
        title: 'Error 4407',
        cause,
        cause_type: JsSIPErrorType.SESSION_ERROR,
      };
  }
};
