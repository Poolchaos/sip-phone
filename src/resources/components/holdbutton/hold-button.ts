import { bindable, containerless, customElement } from 'aurelia-framework';

// const logger = LogManager.getLogger('HoldButton');

@containerless()
@customElement('hold-button')
export class HoldButton {
  @bindable({ attribute: 'is-hold' })
  private isHold: any;

  @bindable({ attribute: 'click-handler' })
  private clickHandler: Function;

  private toggleHold(): void {
    if (this.clickHandler && typeof this.clickHandler === 'function') {
      this.clickHandler();
    }
  }
}
