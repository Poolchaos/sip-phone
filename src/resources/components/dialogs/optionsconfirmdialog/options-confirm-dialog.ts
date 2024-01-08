import { autoinject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';

// const logger = LogManager.getLogger('OptionsConfirmDialog');

@autoinject()
export class OptionsConfirmDialog {
  constructor(private dialogController: DialogController) {}

  confirm() {
    this.dialogController.ok();
  }

  cancel() {
    this.dialogController.cancel();
  }
}
