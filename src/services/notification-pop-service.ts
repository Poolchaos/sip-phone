import { DialogService } from 'aurelia-dialog';
import { autoinject, PLATFORM } from 'aurelia-framework';

import { LogController } from './LogController';
import { PhoneService } from './phone-service';

@autoinject
export class NotificationPopService {
  
  constructor(
    private logController: LogController,
    private dialogService: DialogService,
    private phoneService: PhoneService
  ) {}

  public showInvalidDevices(error): void {
    this.logController.logInfo({ action: 'Show invalid device.' });
    this.phoneService.stopSip();
    this.dialogService
      .open({
        viewModel: PLATFORM.moduleName('resources/components/dialogs/nomediaaccessdialog/no-media-access-dialog'),
        model: { error },
      })
      .whenClosed(response => {});
  }

  public closeAllDialogs(): Promise<void> {
    return new Promise(resolve => {
      if (this.dialogService.controllers && this.dialogService.controllers.length > 0) {
        
        let promises = [];
        promises.push(this.dialogService.controllers.forEach(controller => {
          controller.cancel();
        }));

        Promise.all(promises).then(() => resolve());
      } else {
        resolve();
      }
    });
  }
}