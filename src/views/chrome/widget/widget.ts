import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { autoinject, computedFrom, LogManager } from 'aurelia-framework';
import { Router, RouterConfiguration } from 'aurelia-router';
import { PLATFORM } from 'aurelia-pal';
import { AppStore } from 'services/app-store';
import { ApiService } from 'services/api-service';
import { DialogService } from 'aurelia-dialog';

const logger = LogManager.getLogger('widget');

declare var __APP_VERSION__: string;
@autoinject()
export class Widget {
  public appVersion: string = '';
  protected state: IState = {
    sipConnected: false,
    phoneConnected: false,
    loggedInUser: null,
    organisation: null,
    interactions: [],
    callHistory: [],
  };
  // todo: clean up unused variables
  private loggedInUser: any;
  private deviceDetails: any;
  private user: any;
  private tempErrorMessage: any;
  private loggingIn: boolean = false;
  private loggedIn: boolean = false;
  // private tempWidgetDebug: any;
  private wsConnected: boolean = false;
  private sipConnected: boolean = false;
  private status: any;

  private ignoreDisconnect: boolean = false;
  private showDropdown = false;
  private dropdownEnabled: boolean = false;
  private isHovering: boolean = false;
  private hoverTimeout: any;

  // start select outbound flows (ugly)
  private outboundFlows: Array<any>;
  private outboundFlowOptions: Array<any>;
  // end select outbound flows (ugly)

  private routingStatus: string;
  private routingStatusChanging: boolean;
  private presenceChanging: boolean;

  // FIXME: Gerard - get presences from Redux
  private presences;
  private presence;
  private isWorkingPresence;

  private router: Router;
  private reconnecting: boolean;
  private manual: boolean;
  private fullyOnline: boolean;

  private logoutTriggered: boolean;

  private clearTimeout: any;
  public isEmbedded: boolean;
  public noMicDetected: boolean;
  public noSpeakerDetected: boolean;
  public disconnected: boolean = true;

  private subscribers: any[] = [];

  constructor(
    protected eventAggregator: EventAggregator,
    private dialogService: DialogService,
    private appStore: AppStore,
    private apiService: ApiService
  ) {
      
    const embedded = sessionStorage.getItem('z-embedded');
    if (embedded) {
      this.isEmbedded = true;
    }
    for (let key in this.presences) {
      this.presences[key] = this.presences[key].toLowerCase();
    }
    this.listenForMediaChanges();
  }

  public activate(): void {
    this.updateState();
    this.appStore.onReady('widget', () => this.updateState());
    this.appStore.onChange('widget', () => this.updateState());

    if (__APP_VERSION__) {
      this.appVersion = __APP_VERSION__;
    }
  }

  private updateState() {
    if (this.logoutTriggered) {
      return;
    }
    const user = this.appStore.user;
    const selectedPresence = this.appStore.selectedPresence;
    const sharedLogoutFeatureFlag = this.appStore.featureFlags.sharedLogout;

    if (sharedLogoutFeatureFlag && user && selectedPresence === 'Offline' && this.presence && selectedPresence && this.presence !== selectedPresence) {
      this.presence = null;
      this.logout();
      return;
    }
    this.presence = selectedPresence;
  }

  private listenForMediaChanges(): void {
    this.subscribers.push(this.eventAggregator.subscribe('media:devices:changed', data => this.handleDeviceChange(data)));
  }

  private handleDeviceChange(data): void {
    this.noMicDetected = data.micDetected === false;
    this.noSpeakerDetected = data.speakerDetected === false;
  }

  // Called automatically
  public configureRouter(config: RouterConfiguration, router: Router): void {
    config.title = 'Zai Communicator';
    config.map([
      {
        route: ['', 'login'],
        name: 'login',
        moduleId: PLATFORM.moduleName('../../common/login/login'),
        settings: {
          // context: 'login',
        },
      },
      {
        route: 'phone',
        name: 'phone',
        moduleId: PLATFORM.moduleName('../../common/phone/phone'),
        settings: {
          // context: 'phone',
        },
      },
      {
        route: 'disconnected',
        name: 'disconnected',
        moduleId: PLATFORM.moduleName('../../common/disconnected/disconnected'),
        settings: {
          // context: 'disconnected',
        },
      },
    ]);
    this.router = router;
  }

  public selectPresenceHandler = (presence: any): void => {
    if (this.appStore.user) {
      this.apiService.changePresence(presence);
    }
  };

  private triggerAutoChangeRoutingStatus() {
    if (this.appStore.isFullyOnline) {
      this.changeRoutingStatus({
        detail: {
          checked: false
        }
      }, true);
      sessionStorage.removeItem('z-autoTriggerRoutingStatus');
    } else {
      setTimeout(() => {
        this.triggerAutoChangeRoutingStatus();
      }, 300);
    }
  };

  private changeRoutingStatus(e, autoTrigger) {
    if (!this.routingStatusChanging || autoTrigger) {
      const { checked } = e.detail;

      if (!checked) {
        this.apiService.changeRoutingStatus('READY');
      } else {
        this.apiService.changeRoutingStatus('NOT_READY');
      }
    }
  }

  public selectFlowHandler = (flow: any): void => {
    if (flow !== this.appStore.interactionFlows.selectedFlow) {
      this.apiService.changeOutboundFlow(flow.flowId);
    }
  };

  public deactivate(): void {
    this.deactivateSubscriptions();
  }

  private deactivateSubscriptions(): void {
    this.subscribers.forEach(subscription => subscription.dispose());
  }

  public toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  public logout(): void {
    if (this.logoutTriggered) {
      return;
    }
    setTimeout(() => {
      this.logoutTriggered = false;
    }, 400);;
    if (this.clearTimeout) {
      window.clearTimeout(this.clearTimeout);
    }
    this.logoutTriggered = true;
    this.showDropdown = false;
    this.apiService.logout();
    if (location.href.indexOf('app/') === -1){
      this.router.navigate('app/login', { replace: false });
    } else {
      this.router.navigate('login', { replace: false });
    }
  }

  public hasHover(): void {
    this.isHovering = true;
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  public noHover(): void {
    if (this.showDropdown) {
      this.hoverTimeout = setTimeout(() => {
        if (!this.isHovering) {
          this.showDropdown = false;
        }
      }, 1500);
    }
    this.isHovering = false;
  }

  public viewSettings(message: string, reloadOnUpdate?: boolean): void {
    this.showDropdown = false;
    this.dialogService
      .open({
        viewModel: PLATFORM.moduleName('views/chrome/options/options'),
        model: { message, reloadOnUpdate },
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .whenClosed(response => {});
  }

  @computedFrom('appStore.user')
  get callerId(): string {
    try {
      if (!this.appStore.user.firstName && !this.appStore.user.surname) {
        return null;
      }
      return `${this.appStore.user.firstName} ${this.appStore.user.surname}`;
    } catch (e) {
      return null;
    }
  }
}
