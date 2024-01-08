import {Aurelia} from 'aurelia-framework';
import * as environment from '../config/environment.json';
import {PLATFORM} from 'aurelia-pal';
import atomComponents from 'ui/new-components/atoms';
import moleculeComponents from 'ui/new-components/molecules';
import templateComponents from 'ui/new-components/templates';
import { DeviceManagementService } from 'services/device-management-service';

declare var window: any;
declare const __webpack_hash__: boolean;
declare const __APP_VERSION__: string;

window.ZaiWebphone = {
  version: __APP_VERSION__,
  hash: __webpack_hash__
}

sessionStorage.removeItem('z-embedded');
sessionStorage.removeItem('z-autoTriggerRoutingStatus');

const urlParams = new URLSearchParams(window.location.search);
const accessCode = urlParams.get('accessCode');
const toggleRoutingStatus = urlParams.get('toggleRoutingStatus');
const embedded = urlParams.get('embedded');

if (embedded === 'isEmbedded') {
  sessionStorage.setItem('z-embedded', embedded);
}
if (toggleRoutingStatus) {
  sessionStorage.setItem('z-autoTriggerRoutingStatus', toggleRoutingStatus);
}
if (accessCode) {
  sessionStorage.setItem('z-accessCode', accessCode);
  // clear session
  sessionStorage.removeItem('state');
  sessionStorage.removeItem('wp-state');
}

// todo: remove on a next version
// used to transfer old settings
let oldSettings = localStorage.getItem('settings');
const parsedOldSettings = oldSettings ? JSON.parse(oldSettings) : null;

let settings;
if (parsedOldSettings) {
  settings = parsedOldSettings;
  delete settings.inputDeviceId;
  delete settings.outputDeviceId;
}
if (settings) {
  localStorage.setItem('wp-settings', JSON.stringify(settings));
}
localStorage.removeItem('settings');
// end of settings transfer logic

DeviceManagementService.checkIfDevicesExist();

export function configure(aurelia: Aurelia): void {
  aurelia.use
    .standardConfiguration()
    .feature(PLATFORM.moduleName('resources/index'))
    .plugin(PLATFORM.moduleName('aurelia-dialog'), config => {
      config.useDefaults();
      config.settings.ignoreTransitions = true;
      config.settings.startingZIndex = 9999;
    })
    .globalResources([
      PLATFORM.moduleName('ui/components/dialpad/z-dialpad'),
      PLATFORM.moduleName('ui/components/interactions/z-interactions'),

      PLATFORM.moduleName('ui/components/interactions/singleinteraction/z-single-interaction'),
      PLATFORM.moduleName('ui/components/interactions/transfer/z-transfer'),
      PLATFORM.moduleName('views/common/phone/tabs/tabs'),

      ...atomComponents,
      ...moleculeComponents,
      ...templateComponents,
    ])
    .plugin(PLATFORM.moduleName('aurelia-configuration'), config => {
      config.setEnvironments({
        'default': ['localhost:8080'],
        'dev1': ['phone.dev1.zailab.com'],
        'prod': ['phone.zailab.com']
      });
    });

  aurelia.use.developmentLogging(environment.debug ? 'debug' : 'warn');

  if (environment.testing) {
    aurelia.use.plugin(PLATFORM.moduleName('aurelia-testing'));
  }

  aurelia.start().then(() => aurelia.setRoot(PLATFORM.moduleName('app')));
}
