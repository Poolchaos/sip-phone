import { autoinject, containerless, customElement, computedFrom, bindable } from 'aurelia-framework';
import { AppStore } from 'services/app-store';

@containerless()
@autoinject()
@customElement('sip-connection-state')
export class ConnectionState {

  constructor(
    private appStore: AppStore
  ) {}

  @computedFrom('appStore.sip', 'appStore.oplog', 'appStore.connecting', 'appStore.connectionStopped')
  public get status(): any {
    if (this.appStore.sip && this.appStore.oplog) {
      return {
        text: 'Connected',
        color: 'green',
      };
    } else if (this.appStore.sip && !this.appStore.oplog) {
      return {
        text: 'Connected',
        color: 'yellow',
      };
    } else if (!this.appStore.sip && this.appStore.connecting && !this.appStore.connectionStopped) {
      return {
        text: 'Connecting',
        color: 'yellow',
      };
    } else {
      return {
        text: 'Disconnected',
        color: 'red',
      };
    }
  }
}
