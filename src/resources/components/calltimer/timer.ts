import { bindable, containerless } from 'aurelia-framework';
import * as moment from 'moment';

@containerless
export class Timer {
  @bindable
  private startTime: Date;

  @bindable
  private endTime: Date;

  private elapsedTime: any;

  private intervalId;

  private attached(): void {
    this.updateTimer();
    this.startTimer();
  }
  private detached(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    this.intervalId = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private updateTimer(): void {
    if (this.startTime && !this.endTime) {
      this.elapsedTime = moment(moment().diff(moment(this.startTime))).format('mm:ss');
    } else if (this.startTime && this.endTime) {
      this.stopTimer();
      this.elapsedTime = moment(moment(this.endTime).diff(moment(this.startTime))).format('mm:ss');
    } else {
      this.elapsedTime = '';
    }
  }
}
