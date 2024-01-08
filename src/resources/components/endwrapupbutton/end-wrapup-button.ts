import { bindable, containerless, customElement } from 'aurelia-framework';

@containerless()
@customElement('end-wrapup-button')
export class EndWrapupButton {
  @bindable({ attribute: 'click-handler' })
  private clickHandler: Function;

  @bindable disabled: boolean = false;

  private endWrapup(): void {}

  private onClick(): void {
    if (this.clickHandler && typeof this.clickHandler === 'function') {
      this.clickHandler();
    }
  }
}
