import { autoinject, LogManager } from 'aurelia-framework';

import { ApiService } from 'services/api-service';

const logger = LogManager.getLogger('NoMediaAccessDialog');

@autoinject()
export class NoMediaAccessDialog {

  public permissionDenied: boolean = false;
  public inputDeviceNotFound: boolean = false;
  public outputDeviceNotFound: boolean = false;

  public activate(data): void {
    if (data.error) {
      if (data.error === 'Permission denied') {
        this.permissionDenied = true;
      } else if (data.error === 'Missing input device') {
        this.inputDeviceNotFound = true;
      } else if (data.error === 'Missing output device') {
        this.outputDeviceNotFound = true;
      }
    }
  }

  public async confirm(): Promise<void> {
    const emdedded = sessionStorage.getItem('z-embedded');
    if (emdedded) {
      parent.postMessage('webphone-reload', '*');
    } else {
      // @ts-ignore
      window.location = location.href + '?v=' + this.appVersion;
      window.location.reload();
    }
  }
}
