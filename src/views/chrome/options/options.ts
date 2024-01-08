import { autoinject, LogManager } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';

import { AudioService } from 'services/audio-service';
import './options.less';
import { AppStore } from 'services/app-store';
import { ApiService } from 'services/api-service';

const logger = LogManager.getLogger('options');

const webphone_call = require('../../../assets/audio/sound_test.wav');

@autoinject()
export class Options {
  private testAudio: AudioService;
  private outputDevice: MediaDeviceInfo;
  private inputDevice: MediaDeviceInfo;
  private devices = {
    audioinput: [],
    audiooutput: []
  };
  public selectedInput;
  public selectedOutput;
  public autoAnswer: boolean = false;
  public incomingCall: boolean = true;
  public logs: boolean = false;
  
  public autoAnswerFeatureFlag: boolean = null;
  public incomingCallPopFeatureFlag: boolean = null;
  public logsFeatureFlag: boolean = null;
  
  public testingMic: boolean = false;
  public message: string;

  private subscribers: any[] = [];

  constructor(
    private dialogController: DialogController,
    private appStore: AppStore,
    private apiService: ApiService
  ) {}

  public attached(): void {
    this.getDevices();
  }
  private getDevices(): void {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        this.devicesRetrieved(devices);
        this.updateState();
      })
      .catch(err => this.errorCallback(err));
  }

  public updateState(): void {
    const featureFlags = this.appStore.featureFlags;
    const autoAnswerFeatureFlag = featureFlags.autoAnswer;
    const incomingCallPopFeatureFlag = featureFlags.incomingCallPop;
    this.logsFeatureFlag = featureFlags.logs;

    const settings = this.appStore.settings;

    if (settings) {
      this.logs = settings.logs;
      if (settings.inputDevice) {
        this.inputDevice = settings.inputDevice;
      }
      if (settings.outputDevice) {
        this.outputDevice = settings.outputDevice;
      }
      if (autoAnswerFeatureFlag) {
        this.autoAnswerFeatureFlag = true;
        this.autoAnswer = true;
      } else if (settings.autoAnswer) {
        this.autoAnswer = settings.autoAnswer;
      }
      if (incomingCallPopFeatureFlag) {
        this.incomingCallPopFeatureFlag = true;
        this.incomingCall = true;
      } else if (settings.incomingCall === null) {
        this.incomingCall = true;
      } else {
        this.incomingCall = settings.incomingCall;
      }
    }
    this.setSettingsLocalStorage();
  }
  
  private setSettingsLocalStorage(): void {
    this.setInputDevice();
    this.setoutputDevice();
    this.setAutoAnswer();
  }

  private setInputDevice(): void {
    const settings = this.appStore.settings;
    if (!settings || !settings.inputDevice) {
      return;
    }
    const selectedInput = this.devices.audioinput.find(device => device.deviceId === settings.inputDevice.deviceId);
    this.selectedInput = selectedInput ? selectedInput.displayLabel : null;
  }

  private setoutputDevice(): void {
    const settings = this.appStore.settings;
    if (!settings || !settings.outputDevice) {
      return;
    }
    const selectedOutput = this.devices.audiooutput.find(device => device.deviceId === settings.outputDevice.deviceId);
    this.selectedOutput = selectedOutput ? selectedOutput.displayLabel : null;
  }

  private setAutoAnswer(): void {
    const settings = this.appStore.settings;
    if (!settings) {
      return;
    }
    this.autoAnswer = this.autoAnswerFeatureFlag ? true : settings.autoAnswer;
  }

  private devicesRetrieved(devices): void {
    devices.forEach(_device => {
      let device: any = JSON.parse(JSON.stringify(_device));
      device.displayLabel = device.label.substring(0, 25) + '...';
      if (this.devices[device.kind]) {
        if (this.inputDevice && this.inputDevice.deviceId === device.deviceId) {
          device.selected = true;
          this.selectedInput = device.displayLabel;
        }
        if (this.outputDevice && this.outputDevice.deviceId === device.deviceId) {
          device.selected = true;
          this.selectedOutput = device.displayLabel;
        }
        this.devices[device.kind].push(device);
      }
    });
    if (!this.inputDevice && this.devices.audioinput.length) {
      this.selectedInput = this.devices.audioinput[0];
      this.devices.audioinput[0].selected = true;
    }
    if (!this.outputDevice && this.devices.audiooutput.length) {
      this.selectedOutput = this.devices.audiooutput[0];
      this.devices.audiooutput[0].selected = true;
    }
  }

  private errorCallback(err): void {
    console.log(' > Failed to enumerate devices ', err);
  }

  public stopTestInputDevice(): void {
    this.testingMic = false;
    // @ts-ignore
    if (window.stream) {
      // @ts-ignore
      window.stream.getAudioTracks().forEach(track => track.stop());
      // @ts-ignore
      window.stream = null;
    }
  }

  public testInputDevice(): void {
    this.testingMic = true;
  
    if (navigator.mediaDevices) {
      const device = this.devices.audioinput.find(device => device.displayLabel === this.selectedInput);
      // @ts-ignore
      const constraints = window.constraints = {
        audio: {
          deviceId: {
            exact: device ? device.deviceId : null
          }
        }, 
        video: false
      }
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => this.handleSuccess(stream))
        .catch(error => this.handleError(error));
    }
  }

  private handleSuccess(stream: any): void {
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.autoplay = true;
    // @ts-ignore
    window.stream = stream;
    audio.srcObject = stream;

    stream.oninactive = function() {
      console.log('Stream ended');
    };
  }
  
  private handleError(error: Error): void {
    console.log(' > Failed to get media devices', error.message);
  }

  public testOutputDevice(): void {
    if (this.testAudio) {
      this.testAudio.stop();
    }
    const device = this.devices.audiooutput.find(device => device.displayLabel === this.selectedOutput);
    this.testAudio = new AudioService(webphone_call, false, device.deviceId, true);
  }

  public ok(): void {
    this.saveState();
    this.stopTestInputDevice();
    this.dialogController.ok();
  }

  public cancel(): void {
    this.stopTestInputDevice();
    this.dialogController.cancel();
  }

  private saveState(): void {
    const inputDevice = this.devices.audioinput.find(device => device.displayLabel === this.selectedInput);
    const outputDevice = this.devices.audiooutput.find(device => device.displayLabel === this.selectedOutput);
    const settings = {
      autoAnswer: this.autoAnswerFeatureFlag ? true : this.autoAnswer || false,
      incomingCall: this.incomingCallPopFeatureFlag ? true : this.incomingCall,
      inputDevice: inputDevice,
      outputDevice: outputDevice,
      logs: this.logsFeatureFlag ? this.logs: false
    };
    this.apiService.updateSettings(settings);
  }

  public deactivate(): void {
    this.deactivateSubscriptions();
  }

  private deactivateSubscriptions(): void {
    this.subscribers.forEach(subscription => subscription.dispose());
  }
}
