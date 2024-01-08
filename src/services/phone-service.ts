import { autoinject } from "aurelia-dependency-injection";
import { EventAggregator } from "aurelia-event-aggregator";

import { AppStore } from "./app-store";
import { AudioService } from "./audio-service";
import { ACTIONS } from "./event-constants";
import { JsSipController } from "./JsSipController";
import { LogController } from 'services/LogController';

const webphone_call = require('../assets/audio/ringtones/webphone_call.wav');
const dtmf0 = require('../assets/audio/dtmf/dtmf-0.mp3');
const dtmf1 = require('../assets/audio/dtmf/dtmf-1.mp3');
const dtmf2 = require('../assets/audio/dtmf/dtmf-2.mp3');
const dtmf3 = require('../assets/audio/dtmf/dtmf-3.mp3');
const dtmf4 = require('../assets/audio/dtmf/dtmf-4.mp3');
const dtmf5 = require('../assets/audio/dtmf/dtmf-5.mp3');
const dtmf6 = require('../assets/audio/dtmf/dtmf-6.mp3');
const dtmf7 = require('../assets/audio/dtmf/dtmf-7.mp3');
const dtmf8 = require('../assets/audio/dtmf/dtmf-8.mp3');
const dtmf9 = require('../assets/audio/dtmf/dtmf-9.mp3');
const dtmfHash = require('../assets/audio/dtmf/dtmf-hash.mp3');
const dtmfStar = require('../assets/audio/dtmf/dtmf-star.mp3');

@autoinject()
export class PhoneService {
  private dtmfStrategy = {
    0: dtmf0,
    1: dtmf1,
    2: dtmf2,
    3: dtmf3,
    4: dtmf4,
    5: dtmf5,
    6: dtmf6,
    7: dtmf7,
    8: dtmf8,
    9: dtmf9,
    hash: dtmfHash,
    asterisk: dtmfStar,
  };
  private dialMessageAudio: AudioService;
  
  private telephonyEventHandlers = {
    [ACTIONS.SIP.CALL.CONNECTING]: () => this.playRingingAudio(),
    [ACTIONS.SIP.CALL.ACCEPTED]: () => this.stopRingingAudio(),
    [ACTIONS.SIP.CALL.CONFIRMED]: () => this.stopRingingAudio(),
    [ACTIONS.SIP.CALL.ENDED]: () => this.stopRingingAudio(),
    [ACTIONS.SIP.CALL.FAILED]: () => this.stopRingingAudio()
  };

  constructor(
    private jsSipController: JsSipController,
    private appStore: AppStore,
    private eventAggregator: EventAggregator,
    private logController: LogController
  ) {
    Object.entries(this.telephonyEventHandlers).forEach(event => {
      eventAggregator.subscribe(event[0], () => event[1]());
    });
    this.eventAggregator.subscribe('SIP:STOP', (erorr) => this.stopSip(erorr));
  }
  
  public setPhoneAudioElement(phoneAudio: HTMLAudioElement) {
    this.jsSipController.setPhoneAudioElement(phoneAudio);
  }

  public callSip(numberOrSip: string, extraData: any): void {
    this.jsSipController.callSip(numberOrSip, extraData);
  }

  public acceptInboundCall(): void {
    this.jsSipController.answer();
  }

  public endCall(): void {
    this.jsSipController.endCall();
  }

  public unmute(): void {
    this.jsSipController.unmute();
  }

  public mute(): void {
    this.jsSipController.mute();
  }

  public hold(): void {
    this.jsSipController.hold();
  }
  public unhold(): void {
    this.jsSipController.unhold();
  }

  public transferBlind(_numberOrSip: string): void {
    this.jsSipController.transferBlind(_numberOrSip);
  }

  public sendDTMF(tone: string | number, noSend?: boolean): void {
    if (!noSend) {
      this.jsSipController.sendDTMF(tone);
    }
    this.playDTMFAudio(tone);
  }

  private playDTMFAudio(char: string | number): void {
    let dtmf = this.dtmfStrategy[char];

    if (dtmf) {
      let dtmfSound: any = new Audio(dtmf);
      dtmfSound.volume = 0.1;
      dtmfSound.loop = false;

      const settings = this.appStore.settings;
      if (settings && settings.outputDevice) {
        const deviceId = settings.outputDevice.deviceId;
        if (deviceId) {
          dtmfSound
            .setSinkId(deviceId)
            .catch(error => {
              console.log(' > failed to update device due to cause', error);
            });
        }
      }

      dtmfSound.play();
    }
  }

  public async playRingingAudio(): Promise<void> {
    await this.stopRingingAudio();
    this.dialMessageAudio = new AudioService(webphone_call, true);
  }

  public stopRingingAudio(): void {
    try {
      if (this.dialMessageAudio) {
        this.dialMessageAudio.stop();
      }
    } catch (e) {}
    this.dialMessageAudio = null;
  }

  public stopSip(error?: string): void {
    this.logController.logInfo({ action: 'Closing sip connections.' });
    this.appStore.connectionStopForced(error);
    this.jsSipController.destroyUserAgent();
  }
}
