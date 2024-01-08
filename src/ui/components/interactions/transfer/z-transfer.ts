import { inject, customElement, bindable, containerless } from 'aurelia-framework';

// const logger = LogManager.getLogger('transfer');

@customElement('z-transfer')
@containerless
@inject()
export class ZTransfer {
  @bindable call;
  targetNumber = '';

  @bindable submitTransferHandler: Function;
  @bindable cancelTransferHandler: Function;
  @bindable transferDialpadDtmfHandler: Function;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(phoneClient) {
    // this.phoneClient = phoneClient;
  }

  // private submitNumberHandler = (_numberOrSip: string) => {
  //   this.submitTransferHandler()

  // }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private transfer(e): void {
    if (this.submitTransferHandler && typeof this.submitTransferHandler === 'function') {
      this.submitTransferHandler(this.targetNumber);
      this.targetNumber = '';
    }
    // if(this.call && this.targetNumber) {
    //   this.call.transfer(this.targetNumber);
    // }
  }

  private cancel(): void {
    if (this.cancelTransferHandler && typeof this.cancelTransferHandler === 'function') {
      this.cancelTransferHandler();
      this.targetNumber = '';
    }
    //   if(this.call) {
    //     this.call.cancelTransfer();
    //   }
    //   this.targetNumber = '';
    //   this.call = null;
  }
}
