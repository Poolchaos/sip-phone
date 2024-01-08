import { bindable, containerless, customElement, inject, LogManager } from 'aurelia-framework';

// import { RuntimeState } from '../../../runtime-state/RuntimeState';
// import { Constants } from '../../../abstract/constants';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logger = LogManager.getLogger('GreenPhoneButton');

@containerless()
@customElement('green-phone-button')
@inject()
export class GreenPhoneButton {
  @bindable({ attribute: 'click-handler' })
  private clickHandler: Function;

  private isConnected: boolean;
  @bindable private disabled: boolean;

  private onClick(): void {
    if (this.clickHandler && typeof this.clickHandler === 'function') {
      this.clickHandler();
    }
  }
}
