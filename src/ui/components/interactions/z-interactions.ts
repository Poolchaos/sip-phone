import { LogManager, inject, containerless, customElement, bindable, computedFrom } from 'aurelia-framework';

const logger = LogManager.getLogger('Z-Interactions');

@containerless()
@customElement('z-interactions')
@inject(Element)
export class ZInteractions {
  callToTransfer;
  @bindable private interactions: any = [];
  @bindable toggleHoldHandler: Function;
  @bindable toggleMuteHandler: Function;
  @bindable doTransferHandler: Function;
  @bindable transferEnabled: boolean;
  @bindable wrapUpSubmitting: boolean;
  @bindable submitTransferHandler: Function;
  @bindable cancelTransferHandler: Function;
  @bindable transferDialpadDtmfHandler: Function;

  @bindable doStartCallHandler: Function;
  @bindable doEndCallHandler: Function;
  @bindable doEndWrapupHandler: Function;

  @bindable({ attribute: 'rtc-session' }) callInfo: any;
  @bindable({ attribute: 'is-wrap-up' }) isWrapUp: boolean;

  constructor(private element: Element) {}

  public bind(): void {}

  protected async attached(): Promise<any> {}

  private enableTransfer(call): void {
    if (call) {
      call.showTransfer();
      this.callToTransfer = call;
      this.triggerCustomEvent('enabletransfer', {});
    }
  }

  private hideTransfer(): void {
    if (this.callToTransfer) {
      this.callToTransfer.cancelTransfer();
    }
    this.callToTransfer = null;
    this.triggerCustomEvent('hidetransfer', {});
  }

  private triggerCustomEvent(eventName: string, data): void {
    this.element.dispatchEvent(
      new CustomEvent(eventName, {
        bubbles: true,
        detail: data,
      })
    );
  }

  private disableTransferState(): void {
    this.element.dispatchEvent(
      new CustomEvent('hidetransfer', {
        bubbles: true,
        detail: {},
      })
    );
  }

  @computedFrom('callToTransfer')
  get isOnTransfer(): boolean {
    return this.callToTransfer && this.callToTransfer.state.onTransfer;
  }

  protected detached(): void {}
}
