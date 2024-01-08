import { containerless, customElement, inject } from 'aurelia-framework';

// const logger = LogManager.getLogger('CancelTransferButton');
@containerless()
@customElement('cancel-transfer-button')
@inject(Element)
export class CancelTransferButton {
  constructor(private element: Element) {}

  public cancel(): void {
    this.element.dispatchEvent(
      new CustomEvent('canceltransfer', {
        bubbles: true,
        detail: {},
      })
    );
  }
}
