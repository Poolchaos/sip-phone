import { Router, RouterConfiguration } from 'aurelia-router';
import { PLATFORM } from 'aurelia-pal';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, LogManager } from 'aurelia-framework';
import { DialogService } from 'aurelia-dialog';

import './app.less';
import { AppStore } from 'services/app-store';
import { ApiService } from 'services/api-service';
import { PhoneService } from 'services/phone-service';
import { LogController } from 'services/LogController';
import { StateService } from 'services/state-service';

const logger = LogManager.getLogger('app');

declare var __APP_VERSION__: string;

@autoinject()
export class App {
  private routerConfig: RouterConfiguration;

  private appVersion: string;

  constructor(
    private logController: LogController,
    private router: Router,
    private eventAggregator: EventAggregator,
    private dialogService: DialogService,
    private appStore: AppStore,
    private apiService: ApiService,
    private phoneService: PhoneService,
    private stateService: StateService,
  ) {
    this.appStore.onReady('app', () => {
      this.updateState();
      this.apiService.reportIsActive();
        
      this.appStore.onLogReady('app', () => {
        this.logStoredLogs();
      });
    });
    this.appStore.onChange('app', () => this.updateState());
    this.appStore.addNoConnectionHandler(() => {
      console.log(' WP | no connection, reconnect all ');
      const autoTriggerRoutingStatus = sessionStorage.getItem('z-autoTriggerRoutingStatus');
      const setOffDuty = autoTriggerRoutingStatus && autoTriggerRoutingStatus !== 'undefined';
      const accessCode = sessionStorage.getItem('z-accessCode');
      if (accessCode) {
        this.apiService.loginWithToken(accessCode, setOffDuty);
        sessionStorage.removeItem('z-accessCode');
      } else if (this.appStore.user && !this.appStore.sip && !this.appStore.oplog) {
        this.apiService.initiateMember(this.appStore.user);
      }
    });
  }

  private logStoredLogs(): void {
    const logs: any = localStorage.getItem('wp-unload');
    try {
      let parsedLogs = JSON.parse(logs);

      parsedLogs.forEach(log => {
        this.logController.logInfo({ action: 'App closed or reloaded', timeOfAction: `${log}` });
      });

      parsedLogs = [];
      localStorage.setItem('wp-unload', '');
    } catch(e) {}
  }

  public configureRouter(config: RouterConfiguration, router: Router): void {
    this.router = router;
    this.routerConfig = config;
    this.routerConfig.title = 'Zai Communicator';
    const routes = [
      {
        route: 'initialise',
        name: 'initialise',
        title: 'initialise',
        nav: true,
        moduleId: PLATFORM.moduleName('views/chrome/initialise/initialise'),
        settings: {},
      },
      {
        route: ['', 'app'],
        name: 'popup',
        nav: true,
        moduleId: PLATFORM.moduleName('views/chrome/widget/widget'),
        settings: {},
      },
      {
        route: 'options',
        title: 'options',
        nav: true,
        moduleId: PLATFORM.moduleName('views/chrome/options/options'),
        settings: {},
      }
    ];

    this.routerConfig.map(routes);
  }

  public activate(): void {
    if (__APP_VERSION__) {
      this.appVersion = __APP_VERSION__;
    }
  }

  private updateState() {
    const sip = this.appStore.sip;
    const user = this.appStore.user;

    if (user) {
      if (sip) {
        if (location.href.indexOf('app/phone') === -1) {
          this.router.navigate('app/phone', { replace: false });
        }
      } else {
        if (location.href.indexOf('app/disconnected') === -1) {
          this.router.navigate('app/disconnected', { replace: false });
        }
      }
    } else {
      this.router.navigate('');
    }
  }

  onToggleUpdate(): void {
    this.dialogService
      .open({
        viewModel: PLATFORM.moduleName('resources/components/dialogs/upgradeversiondialog/upgrade-version-dialog'),
        model: {},
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .whenClosed(response => {
        if (!response.wasCancelled) {
          this._doInstallUpdate();
        }
      });
  }

  private async _doInstallUpdate(): Promise<void> {
    const emdedded = sessionStorage.getItem('z-embedded');
    if (emdedded) {
      parent.postMessage('webphone-reload', '*');
    } else {
      // @ts-ignore
      window.location = location.href + '?v=' + this.appVersion;
      // @ts-ignore
      window.location.reload(true);
    }
  }
}