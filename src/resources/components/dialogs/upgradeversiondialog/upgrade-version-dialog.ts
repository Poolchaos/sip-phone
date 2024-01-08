import { autoinject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';

// const logger = LogManager.getLogger('OptionsConfirmDialog');
//TODO: Rename to Install Update Dialog
@autoinject()
export class UpgradeVersionDialog {
  constructor(private dialogController: DialogController) {}

  confirm() {
    this.dialogController.ok();
  }

  cancel() {
    this.dialogController.cancel();
  }
}
