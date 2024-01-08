import { bindable, containerless, customElement, inject } from 'aurelia-framework';

// const logger = LogManager.getLogger('AcceptTransferButton');
@containerless()
@customElement('accept-transfer-button')
@inject(Element)
export class AcceptTransferButton {
  @bindable private disabled: boolean;

  constructor(private element: Element) {}

  public transfer(): void {
    this.element.dispatchEvent(
      new CustomEvent('transfer', {
        bubbles: true,
        detail: {},
      })
    );
  }
}
