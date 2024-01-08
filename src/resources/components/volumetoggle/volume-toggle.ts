import {
  autoinject,
  computedFrom,
  containerless,
  customElement,
  LogManager,
  observable,
  bindable
} from 'aurelia-framework';
import { ApiService } from 'services/api-service';
import { AppStore } from 'services/app-store';

import './volume-toggle.less';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logger = LogManager.getLogger('GreenPhoneButton');

@containerless()
@customElement('z-volume-toggle')
@autoinject()
export class GreenPhoneButton {
  @bindable({ attribute: 'on-call' }) private onCall: Function;
  @observable public volume;

  private previousVolume;
  private isManual;

  constructor(
    private appStore: AppStore,
    private apiService: ApiService
  ) {}

  public bind(): void {
    this.appStore.onReady('volume-toggle', () => this.checkStoreData());
  }

  public checkStoreData(): void {
    if (this.appStore.settings && this.appStore.settings.volume) {
      this.volume = this.appStore.settings.volume;
    } else {
      this.volume = 0.7;
    }
  }

  public toggleMute(): void {
    this.isManual = true;
    setTimeout(() => {
      this.isManual = false;
    }, 100)
    if (this.previousVolume === undefined) {
      this.previousVolume = this.volume.toString();
      this.volume = 0;
    } else {
      this.volume = this.previousVolume.toString();
      this.previousVolume = undefined;
    }
  }

  public volumeChanged(newValue: any): void {
    if (!newValue) return;
    if (!this.isManual) {
      this.previousVolume = undefined;
    }
    if (this.appStore.isInitiated) {
      this.apiService.changeVolume(newValue);
    }
  }

  @computedFrom('volume')
  public get isMuted() {
    return this.volume <= 0;
  }

  @computedFrom('volume')
  public get isMedium() {
    return this.volume > 0 && this.volume < 0.7;
  }

  @computedFrom('volume')
  public get isFull() {
    return this.volume >= 0.7 && this.volume <= 1;
  }
}
