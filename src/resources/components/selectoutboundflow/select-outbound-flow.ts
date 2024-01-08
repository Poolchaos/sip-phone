import { autoinject, customElement, containerless, bindable } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';

import { Store } from 'aurelia-store';

// const logger = LogManager.getLogger('SelectOutboundFlow');

@containerless()
@customElement('select-outbound-flow')
@autoinject()
export class SelectOutboundFlow {
  oplog;
  // outboundFlows;
  // selectedFlow = '';
  showDropdown;
  isHovering;
  hoverTimeout;

  // @observable
  @bindable({ attribute: 'outbound-flow-options' })
  private outboundFlowOptions;
  @bindable({ attribute: 'selected-flow' })
  private selectedFlow;

  @bindable() private reconnecting: boolean;
  @bindable() private manual: boolean;
  @bindable() private disconnected: boolean;

  @bindable({ attribute: 'outbound-flows' })
  private outboundFlows;

  @bindable({ attribute: 'select-handler' })
  private selectHandler: (item: any) => void;

  constructor(protected eventAggregator: EventAggregator, protected store: Store<IState>) {}

  public bind(): void {}

  protected async attached(): Promise<any> {}

  private selectItem(flow): void {
    if (this.selectHandler && typeof this.selectHandler === 'function') {
      this.selectHandler(flow);
    }
    this.showDropdown = false;
  }

  private hasHover(): void {
    this.isHovering = true;
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  private noHover(): void {
    if (this.showDropdown) {
      this.hoverTimeout = setTimeout(() => {
        if (!this.isHovering) {
          this.showDropdown = false;
        }
      }, 1500);
    }
    this.isHovering = false;
  }

  private toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  protected detached(): void {}
}
