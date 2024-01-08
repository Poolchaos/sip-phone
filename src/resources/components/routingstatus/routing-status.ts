import { autoinject, computedFrom, containerless, bindable } from 'aurelia-framework';

// const logger = LogManager.getLogger('RoutingStatus');

@containerless()
@autoinject()
export class RoutingStatus {
  private activitySubscription;
  private routingStatus = '';
  private toggleValue = false;
  private statusChanged = false;
  private activity = 'Working';

  @bindable
  private status: any;

  private statusIsChanging: any;

  @bindable
  private value: string;

  // new props

  @bindable
  private reconnecting: boolean;
  @bindable
  private manual: boolean;
  @bindable
  private iAmChecked: boolean;
  @bindable
  private onLabel: string;
  @bindable
  private offLabel: string;

  @bindable
  private onChangeHandler: Function;

  constructor(private element: Element) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private changeRoutingStatus(evt): boolean {
    if (!this.statusIsChanging) {
      this.element.dispatchEvent(
        new CustomEvent('toggle', {
          bubbles: true,
          detail: {
            checked: this.iAmChecked,
          },
        })
      );
      this.statusIsChanging = true;
      setTimeout(() => {
        this.statusIsChanging = false;
      }, 3000);
    }
    return true;
  }

  @computedFrom('onLabel', 'offLabel', 'iAmChecked')
  private get displayText(): string {
    return this.iAmChecked ? this.onLabel : this.offLabel;
  }

  protected detached(): void {}
}
