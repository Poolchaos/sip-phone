import { autoinject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';

// const logger = LogManager.getLogger('ManualReconnectFailedDialog');

@autoinject()
export class ManualReconnectFailedDialog {
  constructor(private dialogController: DialogController) {}

  confirm() {
    this.dialogController.ok();
  }
}
