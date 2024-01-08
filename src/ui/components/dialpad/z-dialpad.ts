// import { ObserverLocator } from 'aurelia-binding';
import {
  bindable,
  containerless,
  customElement,
  LogManager,
  inject,
  computedFrom,
  ObserverLocator,
} from 'aurelia-framework';

// import { RuntimeState } from '../../../../../runtime-state/RuntimeState';
// import { Constants } from '../../../../../abstract/constants';

const logger = LogManager.getLogger('ZDialpad');

class ZaiEventListener {
  private enterPressed: boolean = false;
  private keypressTriggered: (e: { keyCode: number; preventDefault: () => void }) => void;

  constructor(callback) {
    this.keypressTriggered = e => {
      if (e.keyCode === 13 && !this.enterPressed) {
        this.enterPressed = true;
        e.preventDefault();
        callback();

        setTimeout(() => {
          this.enterPressed = false;
        }, 1000);
      }
    };
  }

  public add(eventName): { to: (targetElement: Element) => void } {
    const keypressTriggered = this.keypressTriggered;
    return {
      to: targetElement => {
        targetElement.addEventListener(eventName, keypressTriggered);
      },
    };
  }

  public remove(eventName): { from: (targetElement: Element) => void } {
    const keypressTriggered = this.keypressTriggered;
    return {
      from: targetElement => {
        targetElement.removeEventListener(eventName, keypressTriggered);
      },
    };
  }
}

@containerless()
@customElement('z-dialpad')
@inject(ObserverLocator)
export class ZDialpad {
  @bindable number;
  @bindable({ attribute: 'name' }) name: string;
  @bindable({ attribute: 'on-call' }) onCall: boolean;
  @bindable({ attribute: 'call-history' }) callHistory: IHistoryItem[];
  private isEvent: boolean = false;
  private targetNumber: any;
  private zaiEventListener: ZaiEventListener;
  private observerSubscription: any;
  private showDropdown: boolean = false;
  private isHovering: boolean = false;
  private hoverTimeout: any;
  private longpress: number = 1000;
  private delay: any;

  @bindable
  dtmfKeyHandler: (char: string) => void;
  @bindable
  submitNumberHandler: (number: string) => void;

  constructor(private observerLocator: ObserverLocator) {
    this.zaiEventListener = new ZaiEventListener(() => this.notifyToStartCall());
    this.subscribeToNumberChanges();
  }

  private subscribeToNumberChanges(): void {
    this.observerSubscription = this.observerLocator //
      .getObserver(this, 'number')
      .subscribe((newValue, oldValue) => {
        if (this.isEvent) {
          return;
        }
        if (this.isPasted(newValue, oldValue)) {
          this.isEvent = true;
          this.number = newValue.replace(/[^0-9+*#]/g, '');
          setTimeout(() => {
            this.isEvent = false;
          }, 50);
          return;
        }
        this.activateAnimation(newValue, oldValue);
      });
  }

  private isPasted(newValue: string, oldValue: string): boolean {
    if (newValue && oldValue && newValue.length > oldValue.length + 1) {
      return true;
    }
    if (!oldValue && newValue.length > 1) {
      return true;
    }
    return false;
  }

  private activateAnimation(newValue: string, oldValue: string) {
    if ((newValue && oldValue && newValue.length > oldValue.length) || (newValue && newValue.length > 0 && !oldValue)) {
      let character = newValue[newValue.length - 1];

      if (character === '#') {
        character = 'hash';
      } else if (character === '*') {
        character = 'asterisk';
      } else if (character === '+') {
        character = 'plus';
      }

      this.sendDTMF(character);
      if (!character) {
        return;
      }

      this.allKeys().forEach(element => {
        element.className = element.className.replace(' active', '');
      });
      try {
        let key: any = document.querySelector(`#${this.name}-js-key-${character} .holder`);
        if (key) {
          key.className += ' active';
          setTimeout(() => {
            key.className = key.className.replace(' active', '');
          }, 200);
        }
      } catch(e) {}
    }
  }

  private allKeys(): any {
    let keys = document.querySelectorAll(`#dialpad-${this.name} .keypad .holder`);
    return keys;
  }

  private updateNumberFromEvent(number): void {
    this.isEvent = true; // used so that observer ignores this value change
    this.number = number;
    setTimeout(() => {
      this.isEvent = false;
    }, 20);
  }

  private addListenerForEnter(): void {
    if (this.onCall) {
      return;
    }

    let targetInput = document.querySelector(`#dialpad-${this.name} .js-number-input`);

    if (targetInput) {
      this.zaiEventListener.add('keyup').to(targetInput);
    }
  }

  private attached(): void {
    this.addListenerForEnter();
    this.targetNumber.focus();
  }

  private notifyToStartCall(): void {
    if (this.number.replace(/ /g, '').length > 0) {
      if (this.submitNumberHandler && typeof this.submitNumberHandler === 'function') {
        this.submitNumberHandler(this.number);
      }
    }
  }

  private toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  private selectExisting(number): void {
    this.number = number;
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
      }, 1000);
    }
    this.isHovering = false;
  }

  private select(char): void {
    // logger.debug('select char', char);
    this.number += char;
    this.targetNumber.focus();
    // this.sendDTMF(char);
  }

  private mouseDown(): void {
    let check = () => {
      this.select('+');
      this.clearDelay();
    };
    this.delay = setTimeout(() => check(), this.longpress);
  }

  private mouseUp(): void {
    if (this.delay) {
      this.select('0');
    }
    this.clearDelay();
  }

  private mouseLeave(): void {
    this.clearDelay();
  }

  private clearDelay(): void {
    clearTimeout(this.delay);
    this.delay = null;
  }

  private sendDTMF(char): void {
    if (char === '+' || char === ' ') {
      return;
    }

    if (this.dtmfKeyHandler && typeof this.dtmfKeyHandler === 'function') {
      // logger.debug(`Dialpad :: user-action :: keystroke ${char} to dtmfKeyHandler`);
      this.dtmfKeyHandler(char);
    }
    // this.sendAcrossDtlPipe(Constants.USER_EVENTS.USER_DTMF_TONE_SELECT, char);
  }

  private unbind() {
    this.removeListenerForEnter();
    if (this.observerSubscription) {
      this.observerSubscription.dispose();
    }
  }

  private removeListenerForEnter() {
    let targetInput = document.querySelector(`#dialpad-${this.name} .js-number-input`);
    if (targetInput) {
      this.zaiEventListener.remove('keyup').from(targetInput);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private sendAcrossDtlPipe(event: string, payload: any): void {
    // logger.debug('dialpad.sendAcrossDtlPipe I DO NOTHING');
    // RuntimeState.dtlController.sendAcrossDtlPipe(<ICustomMessage>{
    //   messagePipe: Constants.APP_EVENTS.PHONE_EVENT,
    //   originator: this.constructor.name,
    //   messageType: event,
    //   timeStamp: new Date().getTime(),
    //   messagePayload: payload
    // });
  }

  @computedFrom('callHistory')
  private get hasCallHistory(): boolean {
    return this.callHistory && this.callHistory.length > 0;
  }
}
