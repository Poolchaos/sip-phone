import {
  containerless,
  customElement,
  computedFrom,
  Container,
  LogManager,
  autoinject,
  PLATFORM,
  ObserverLocator,
} from 'aurelia-framework';
import { Subscription } from 'aurelia-event-aggregator';
import { DialogService } from 'aurelia-dialog';
import { AppStore } from 'services/app-store';
import { PhoneService } from 'services/phone-service';
import { ApiService } from 'services/api-service';

const logger = LogManager.getLogger('tabs');

@autoinject()
@containerless()
@customElement('tabs')
export class Tabs {
  private dialogService: DialogService = Container.instance.get(DialogService);

  private targetNumber: string = ' '; // needed for aurelia binding behaviour

  public showDefaultTab: boolean = true;
  public showVolume: boolean = false;
  public transferEnabled: boolean = false;
  public autoAnswer: boolean;
  public isWrapUp: boolean;
  private isNotResponding: boolean;
  public wrapUpSubmitting: boolean;
  public forceAnswerEnabled: boolean = false;

  constructor(
    public appStore: AppStore,
    private phoneService: PhoneService,
    private apiService: ApiService
  ) {}

  public bind(): void {
    this.updateState();
    this.appStore.onReady('tabs', () => this.updateState())
    this.appStore.onChange('tabs', () => this.updateState());
  }

  private updateState() {
    const settings = this.appStore.settings;
    const autoAnswerFeatureFlag = this.appStore.featureFlags.autoAnswer;
    const activeInteractions = this.appStore.activeInteractions;
    const routingStatusActivity = this.appStore.routingStatusActivity;

    if (autoAnswerFeatureFlag) {
      this.autoAnswer = true;
    } else {
      if (settings && settings.autoAnswer !== null && settings.autoAnswer !== undefined) {
        this.autoAnswer = settings.autoAnswer;
      }
    }
    this.wrapUpSubmitting = !!routingStatusActivity.endingWrapup;

    if (!this.appStore.callInfo.onCall) {
      this.showVolume = false;
    }

    this.isWrapUp = routingStatusActivity && !!routingStatusActivity.wrapUp && activeInteractions && activeInteractions.length > 0;
    if (this.isWrapUp) {
      let activeInteraction = this.appStore.activeInteractions.find(interaction => interaction.state !== 'WRAP_UP');
      if (activeInteraction) {
        this.changeTab('dialpad');
      } else {
        this.changeTab('calls');
      }
    } else {
      this.changeTab('dialpad');
    }

    if (this.isNotResponding && !routingStatusActivity.notResponding) {
      if (this.dialogService.hasActiveDialog) {
        this.dialogService.closeAll();
      }
    }
    this.isNotResponding = !!routingStatusActivity.notResponding;
  }

  private changeTab(tab): void {
    this.showDefaultTab = tab === 'dialpad';
  }

  public doStartOutboundCall = (): void => {
    if (this.appStore.callInfo) {
      this.startCallUsingDialpadNumber();
    }
  };
  private startCallUsingDialpadNumber() {
    let outboundFlowOptions = this.appStore.interactionFlows.outboundFlowOptions;
    let flow;
    if (outboundFlowOptions && outboundFlowOptions.length > 0) {
      flow = outboundFlowOptions.find(it => it.selected);
    }

    if (this.targetNumber.trim() === '') return;

    this.phoneService.callSip(
      this.targetNumber,
      flow ? { workType: flow.flowName } : null
    );
    this.targetNumber = ' ';
  }

  public doStartCall = (): void => {
    if (this.appStore.callInfo && this.isPendingInbound) {
      this.phoneService.acceptInboundCall();
    }
  };

  public doEndCall = (): void => {
    this.phoneService.endCall();
  };

  public toggleVolume(): void {
    this.showVolume = !this.showVolume;
  }

  public toggleMute = (): void => {
    if (this.appStore.callInfo.onCall) {
      if (this.appStore.callInfo.muted) {
        this.phoneService.unmute();
      } else {
        this.phoneService.mute();
      }
    }
  };

  public dialpadDtmfHandler = (char: string): void => {
    this.phoneService.sendDTMF(char);
  };

  public transferDialpadDtmfHandler = (char: string): void => {
    this.phoneService.sendDTMF(char, true);
  };

  public toggleHold = (): void => {
    if (this.appStore.callInfo.onCall) {
      if (this.appStore.callInfo.hold) {
        this.phoneService.unhold();
      } else {
        this.phoneService.hold();
      }
    }
  };
  
  public doTransferHandler = (): void => {
    this.transferEnabled = true;
  };

  public submitTransferHandler = (number: string): void => {
    this.phoneService.transferBlind(number);
    this.transferEnabled = false;
  };

  public cancelTransferHandler = (): void => {
    this.transferEnabled = false;
  };

  public doEndWrapupHandler = (): void => {
    const organisation = this.appStore.organisation;
    let countryCode;
    if (organisation && organisation.country && organisation.country.code) {
      countryCode = organisation.country.code;
    }
    this.apiService.wrapUpAllInteractions(countryCode);
  };

  private checkAnswerButtonState(hasInbound: boolean): void {
    if (hasInbound) {
      if (this.pendingTimeout || !this.autoAnswer) return;
      this.pendingTimeout = setTimeout(() => {
        this.enforceAllowAnswer();
      }, 3000);
    } else {
      if (this.pendingTimeout) {
        window.clearInterval(this.pendingTimeout);
        this.pendingTimeout = null;
        this.disableForceAllowAnswer();
      }
    }
  }

  private enforceAllowAnswer(): void {
    this.forceAnswerEnabled = true;
  }

  private disableForceAllowAnswer(): void {
    this.forceAnswerEnabled = false;
  }

  @computedFrom('appStore.callInfo', 'appStore.activeInteractions')
  public get endCallEnabled(): boolean {
    let onCall = this.appStore.callInfo.onCall || this.appStore.callInfo.ringing;
    return this.isPendingInbound || this.isPendingOutbound || onCall;
  }

  @computedFrom('appStore.callInfo', 'appStore.callInfo.status')
  public get endCallOutcomeEnabled() {
    return this.appStore.callInfo.status === 50;
  };

  @computedFrom('appStore.callInfo', 'appStore.callInfo.status')
  public get canMakeCall(): boolean {
    const onCall = this.appStore.callInfo.status === 30; // todo: clean up these magic numbers
    const isPending = this.appStore.callInfo.status === 20;
    return !onCall && !isPending;
  }

  @computedFrom('appStore.callInfo', 'appStore.callInfo.status', 'appStore.callInfo.direction')
  public get isPendingInbound(): boolean {
    const hasInbound = (
      this.appStore.callInfo &&
      this.appStore.callInfo.status === 20 &&
      this.appStore.callInfo.direction &&
      this.appStore.callInfo.direction === 'inbound'
    );
    setTimeout(() => {
      this.checkAnswerButtonState(hasInbound);
    });
    return hasInbound;
  }

  private pendingTimeout;
  @computedFrom('appStore.callInfo', 'appStore.callInfo.status', 'appStore.callInfo.direction')
  public get isPendingOutbound(): boolean {
    return (
      this.appStore.callInfo &&
      this.appStore.callInfo.status === 20 &&
      this.appStore.callInfo.direction &&
      this.appStore.callInfo.direction === 'outbound'
    );
  }
}
