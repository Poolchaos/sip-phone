import { autoinject, containerless, bindable, PLATFORM, LogManager, observable } from 'aurelia-framework';
import { DialogService } from 'aurelia-dialog';

const logger = LogManager.getLogger('activity');

@containerless()
@autoinject()
export class Activity {
  @bindable private activity: any;
  @bindable({attribute: 'router-status-activity'}) @observable private routingStatusActivity: any;

  constructor() {}

  protected detached(): void {
    // super.detached();
  }
}

interface IActivity {
  wrapup: boolean;
  notResponding: boolean;
}
