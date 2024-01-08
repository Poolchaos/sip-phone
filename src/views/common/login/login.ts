import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { Router } from 'aurelia-router';

import { ApiService } from 'services/api-service';
import { AppStore } from 'services/app-store';
import { ACTIONS } from 'services/event-constants';

declare var __APP_VERSION__: string;
declare var __APP_BUILD__: string;
declare var __DEV__: boolean;
declare var __APP_BETA__: boolean;
@autoinject()
export class Login {
  public identity: string = '';
  public password: string = '';

  public autoLoginEnabled: boolean = false;
  public submitting: boolean = false;
  public appVersion: string = '';
  public appBuild: string = '';

  private unsubscribeState: Function;

  constructor(
    private aureliaConfiguration: AureliaConfiguration,
    private eventAggregator: EventAggregator,
    private apiService: ApiService,
    public appStore: AppStore
  ) {
    const accessCode = sessionStorage.getItem('z-accessCode');
    if (accessCode) {
      this.autoLoginEnabled = true;
    }
  }

  public activate(): void {
    if (__APP_VERSION__) {
      this.appVersion = __APP_VERSION__;
    }
    if (__APP_BUILD__ && (__APP_BETA__ || __DEV__)) {
      this.appBuild = __APP_BUILD__.substring(0, 8);
    }
    this.eventAggregator.subscribe(ACTIONS.LOGIN.FAILED, () => this.submitting = false);
  }

  public login(): void {
    this.submitting = true;
    this.apiService.login(this.identity, this.password);
  }

  public openForgotPassword(): void {
    // @ts-ignore
    const env = this.aureliaConfiguration.environment;
    const frontEndEndpoint = this.aureliaConfiguration.obj[env].frontEndConversations;
    const url: string = frontEndEndpoint + '/password';
    window.open(url, '_blank');
  }

  protected detached(): void {
    if (this.unsubscribeState && typeof this.unsubscribeState === 'function') {
      this.unsubscribeState();
    }
  }
}
