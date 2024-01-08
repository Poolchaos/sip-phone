import { EventAggregator } from 'aurelia-event-aggregator';
import { Container, LogManager } from 'aurelia-framework';
import { AppStore } from './app-store';
import { ACTIONS } from './event-constants';

const logger = LogManager.getLogger('audio-service');

export class AudioService {
  // private audioId: string = uuid();
  private audio: any;
  private appStore: AppStore = Container.instance.get(AppStore);
  private eventAggregator: EventAggregator = Container.instance.get(EventAggregator);
  private storeUnsubscribe: Function;
  private deviceId: string;
  private ignoreVolume: boolean;

  // FIXME: this can be implemented more efficiently
  constructor(url: string, repeat: boolean, deviceId?: string, ignoreVolume?: boolean) {
    this.setupAudio(url, repeat, deviceId, ignoreVolume);
  }

  private async setupAudio(url: string, repeat: boolean, deviceId?: string, ignoreVolume?: boolean): Promise<void> {
    this.audio = new Audio(url);
    this.ignoreVolume = ignoreVolume;

    if (this.ignoreVolume && this.audio) {
      this.audio.volume = 0.7;
    } else if (this.audio) {
      const settings = this.appStore.settings;
      if (settings) {
        if (settings.volume && !this.ignoreVolume) {
          this.audio.volume = settings.volume;
        }
      }
    }

    if (deviceId) {
      await this.audio.setSinkId(deviceId);
    } else {
      const settings = this.appStore.settings;
      if (settings && settings.outputDevice) {
        this.audio
          .setSinkId(settings.outputDevice.deviceId)
          .catch(error => {
            console.log(' > failed to update device due to cause', error);
          });
      }
    }

    this._activateSubscriptions();
    this.audio.loop = !!repeat;
    this.play();
  }

  private _activateSubscriptions() {
    this.eventAggregator.subscribe(ACTIONS.VOLUME, (data) => this.updateState(data));
  }
  
  public updateState(volume?): void {
    const settings = this.appStore.settings;
    if (settings) {
      if (volume) {
        this.audio.volume = volume;
      } else if (settings.volume && !this.ignoreVolume) {
        this.audio.volume = settings.volume;
      } else {
        this.audio.volume = 0.7;
      }
      if (settings.outputDevice) {
        this.audio
          .setSinkId(settings.outputDevice.deviceId)
          .catch(error => {
            console.log(' > failed to update device due to cause', error);
          });
      }
    }
  }

  private play(): void {
    if (this.audio) {
      this.audio.play();
    }
  }

  public stop(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  public pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }
}
