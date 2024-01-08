import { bindable, containerless, customElement, inject } from 'aurelia-framework';

// const logger = LogManager.getLogger('TransferButton');

@containerless()
@customElement('transfer-button')
@inject(Element)
export class TransferButton {
  // @bindable private interaction: any;

  @bindable({ attribute: 'click-handler' })
  private clickHandler: Function;

  constructor(private element: Element) {}

  private showTransfer(): void {
    if (this.clickHandler && typeof this.clickHandler === 'function') {
      this.clickHandler();
    }
  }
}
