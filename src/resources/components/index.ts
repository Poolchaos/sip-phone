// import { FrameworkConfiguration } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';

export function configure(config) {
  config.globalResources([
    PLATFORM.moduleName('./endwrapupbutton/end-wrapup-button'),
    PLATFORM.moduleName('./mutebutton/mute-button'),
    PLATFORM.moduleName('./holdbutton/hold-button'),
    PLATFORM.moduleName('./transferbutton/transfer-button'),
    PLATFORM.moduleName('./greenphonebutton/green-phone-button'),
    PLATFORM.moduleName('./volumetoggle/volume-toggle'),
    PLATFORM.moduleName('./redphonebutton/red-phone-button'),
    PLATFORM.moduleName('./accepttransferbutton/accept-transfer-button'),
    PLATFORM.moduleName('./canceltransferbutton/cancel-transfer-button'),
    PLATFORM.moduleName('./activity/activity'),
    PLATFORM.moduleName('./routingstatus/routing-status'),
    PLATFORM.moduleName('./selectoutboundflow/select-outbound-flow'),
    PLATFORM.moduleName('./presence/presence'),
    PLATFORM.moduleName('./connectionstate/connection-state'),
    PLATFORM.moduleName('./calltimer/timer'),
  ]);
}
