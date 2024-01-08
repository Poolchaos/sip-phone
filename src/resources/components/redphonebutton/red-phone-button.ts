import { inject, containerless, customElement, bindable } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

// import { Constants } from '../../../abstract/constants';
// import { RuntimeState } from 'runtime-state/RuntimeState';

// const logger = LogManager.getLogger('RedPhoneButton');

@containerless()
@customElement('red-phone-button')
@inject(EventAggregator)
export class RedPhoneButton {
  @bindable({ attribute: 'click-handler' }) private clickHandler: Function;
  @bindable public disabled: boolean;

  public onClick(): void {
    if (this.clickHandler && typeof this.clickHandler === 'function') {
      this.clickHandler();
    }
  }
}
