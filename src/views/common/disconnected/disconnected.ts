import { autoinject } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { AppStore } from 'services/app-store';
import { StateService } from 'services/state-service';

@autoinject()
export class Disconnected {

  constructor(
    public appStore: AppStore,
    private stateService: StateService
  ) {}

  public reconnectDevice(): void {
    this.appStore.clearConnectionStopForced();
    this.stateService.handleDisconnected();
  }
}
