import { LogManager, customElement, bindable, computedFrom } from 'aurelia-framework';

const logger = LogManager.getLogger('z-SingleInteractions');


@customElement('z-single-interaction')
export class ZSingleInteractions {
  @bindable interaction;
  @bindable public interactions: any = [];
  @bindable({ attribute: 'rtc-session' }) public callInfo: any;
  @bindable({ attribute: 'is-wrap-up' }) public isWrapUp: boolean;
  @bindable wrapUpSubmitting: boolean;
  number: string;

  @bindable toggleMuteHandler: Function;
  @bindable toggleHoldHandler: Function;
  @bindable doTransferHandler: Function;

  @bindable doStartCallHandler: Function;
  @bindable doEndCallHandler: Function;
  @bindable doEndWrapupHandler: Function;

  attached(): void {}

  public wrapUpInteractions = [];

  interactionChanged() {
    if (this.interaction) {
      this.setNumber(this.interaction.source || this.interaction.dest);
    }
    if (this.interactions && Array.isArray(this.interactions)) {
      this.wrapUpInteractions = this.interactions.filter(interaction => interaction.state === 'WRAP_UP')
    }
  }

  private setNumber(number): void {
    if (number) {
      this.number = number;
    }
  }
}
