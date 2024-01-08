import { inject, LogManager } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';

// import { Constants } from '../../../abstract/constants';
// import { RuntimeState } from './../../../runtime-state/RuntimeState';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const logger = LogManager.getLogger('NotRespondingDialog');

@inject(DialogController)
export class NotRespondingDialog {
  dialogHeader = 'Not Responding';

  constructor(private dialogController: DialogController) {}

  ready() {
    // this.sendAcrossDtlPipe(Constants.USER_EVENTS.USER_MARK_AS_RESPONSIVE, {});
    // this.dialogController.ok();
    this.dialogController.close(true, {
      ready: true,
    });
  }

  notReady() {
    // this.sendAcrossDtlPipe(Constants.USER_EVENTS.USER_CHANGE_ROUTING_STATUS, 'NOT_READY');
    // this.dialogController.ok();
    this.dialogController.close(true, {
      ready: false,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // private sendAcrossDtlPipe(event: string, payload: any): void {
  //   logger.info('not-responding-dialog.sendAcrossDtlPipe I DO NOTHING');
  //   // RuntimeState.dtlController.sendAcrossDtlPipe(<ICustomMessage>{
  //   //   messagePipe: Constants.APP_EVENTS.PHONE_EVENT,
  //   //   originator: this.constructor.name,
  //   //   messageType: event,
  //   //   timeStamp: new Date().getTime(),
  //   //   messagePayload: payload
  //   // });
  // }
}
