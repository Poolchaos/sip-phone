import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { AppStore } from './app-store';
import { ACTIONS } from './event-constants';

@autoinject()
export class LogController {
  constructor(
    private appStore: AppStore,
    private eventAggregator: EventAggregator
  ) {}

  private canLog(): boolean {
    const forcedLogsFeatureFlag = this.appStore.featureFlags ? this.appStore.featureFlags.forcedLogs : null;
    const logsFeatureFlag = this.appStore.featureFlags ? this.appStore.featureFlags.logs : null;
    const logs = this.appStore.settings ? this.appStore.settings.logs : null;

    if (forcedLogsFeatureFlag) {
      return true;
    }
    if (!logsFeatureFlag) {
      return false;
    }
    if (logs) {
      return true;
    }
    return false;
  }

  public logInfo(data: any): void {
    if (!this.canLog()) {
      return;
    }
    this.eventAggregator.publish(ACTIONS.LOG.INFO, data);
  }

  public logError(data: any): void {
    if (!this.canLog()) {
      return;
    }
    this.eventAggregator.publish(ACTIONS.LOG.ERROR, data);
  }

  public audit(action: string, description: string, data?: any): void {
    if (!this.canLog()) {
      return;
    }
    this.eventAggregator.publish(ACTIONS.LOG.INFO, {
      action,
      description,
      ...data
    });
  }
}
