import { bindable, containerless, customElement } from 'aurelia-framework';

// const logger = LogManager.getLogger('MuteButton');

@containerless()
@customElement('mute-button')
export class MuteButton {
  @bindable({ attribute: 'is-muted' })
  private isMuted: any;

  @bindable({ attribute: 'click-handler' })
  private clickHandler: Function;

  private toggleMute(): void {
    if (this.clickHandler && typeof this.clickHandler === 'function') {
      this.clickHandler();
    }
  }
}
