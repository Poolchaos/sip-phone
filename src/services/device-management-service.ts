import { EventAggregator } from 'aurelia-event-aggregator';
import { LogManager, Container } from 'aurelia-framework';

import { NotificationPopService } from './notification-pop-service';
import { StateService } from './state-service';

const logger = LogManager.getLogger('DeviceManagementService');

export class DeviceManagementService {
  private static notificationPopService: NotificationPopService;
  private static stateService: StateService;
  private static eventAggregator: EventAggregator;

  private static getSettings(): Settings {
    let settings = localStorage.getItem('wp-settings');
    const _settings = settings ? JSON.parse(settings) : null;
    return _settings;
  }

  public static getDevicePermissions(): Promise<void | string> {
    this.notificationPopService = Container.instance.get(NotificationPopService);
    this.stateService = Container.instance.get(StateService);
    this.eventAggregator = Container.instance.get(EventAggregator);

    this.listenForMediaChanges();

    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => resolve())
        .catch(_error => {
          logger.error('Failed to get User Media', _error, 'error message:', _error.message);

          if(_error.message === 'Permission denied') {
            this.notificationPopService.showInvalidDevices(_error.message);
            return reject(_error.message);
          } else if (_error.message === 'Permission dismissed') {
            return resolve(this.getDevicePermissions());
          } else if (_error.message === 'Requested device not found') {
            this.triggerDeviceError();
            this.notificationPopService.showInvalidDevices('Missing input device');
            this.eventAggregator.publish('media:devices:changed', {
              micDetected: false
            });
            return reject(_error.message);
          }
        });
    });
  }

  public static listenForMediaChanges(): void {
    navigator.mediaDevices.ondevicechange = () => {

      this.debounce(() => this.stateService.triggerError.mediaDeviceChange());
      this.checkForValidDevices();
    }
  }

  
  private static timer;
  private static debounce(func, timeout = 300): any {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => func(), timeout);
  }

  public static checkForValidDevices(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug('WP | SIP | initialise Sip | checkForValidDevices 1');
      try {
        logger.debug('WP | SIP | initialise Sip | checkForValidDevices 2');
        navigator.mediaDevices
          .enumerateDevices()
          .then(devices => {
            logger.debug('WP | SIP | initialise Sip | checkForValidDevices | devices', devices);
            let _devices = {
              audioinput: [],
              audiooutput: []
            };
            devices.forEach(device => {
              if (_devices[device.kind]) {
                _devices[device.kind].push(device);
              }
            })
        
            const micDetected = _devices.audioinput.length > 0;
            const speakerDetected = _devices.audiooutput.length > 0;
            
            this.eventAggregator.publish('media:devices:changed', {
              micDetected,
              speakerDetected
            });

            if (micDetected && speakerDetected) {
              parent.postMessage('webphone-devices-found', '*');
              this.notificationPopService.closeAllDialogs();
              resolve();
            } else if (!micDetected && speakerDetected) {
              this.triggerDeviceError().then(() => {
                this.notificationPopService.showInvalidDevices('Missing input device');
                reject('No microphone detected')
              });
            } else if (!speakerDetected && micDetected) {
              this.triggerDeviceError().then(() => {
                this.notificationPopService.showInvalidDevices('Missing output device');
                reject('No speaker/headset detected');
              });
            } else if (!micDetected && !speakerDetected) {
              this.triggerDeviceError().then(() => {
                this.notificationPopService.showInvalidDevices('');
                reject('No microphone and speaker/headset detected');
              });
              
            }
          })
          .catch((err) => {
            logger.error('WP | checkForValidDevices | error1 ', err)
            throw new Error('Failed to get media devices due to ' + err.toString());
          });
      } catch(e) {
        logger.error('WP | checkForValidDevices | error2 ', e)
      }
    });
  }

  private static async triggerDeviceError(): Promise<void> {
    await this.notificationPopService.closeAllDialogs();
    parent.postMessage('webphone-missing-device', '*');
    this.stateService.triggerError.mediaDevice();
  }

  public static findDevice(device: MediaDeviceInfo): Promise<MediaDeviceInfo> {
    if (!device) return;
    return new Promise(resolve => {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {

          const foundDevice = devices.find(_device => {
            if (_device.deviceId && device.deviceId && _device.deviceId === device.deviceId) {
              return true;
            } else if (_device.label && device.label && _device.label === device.label) {
              return true;
            }
            return false;
          });
          resolve(foundDevice);
        })
        .catch(err => {
          resolve(null);
        });
      });
  }

  public static async checkIfDevicesExist(): Promise<void> {
    const settings = await this.getSettings();

    if (settings) {
      if (settings.inputDevice) {
        let existing = await this.findDevice(settings.inputDevice);
        if (existing) {
          settings.inputDevice = existing;
        } else {
          delete settings.inputDevice;
        }
      }

      if (settings.outputDevice) {
        let existing = await this.findDevice(settings.outputDevice);
        if (existing) {
          settings.outputDevice = existing;
        } else {
          delete settings.outputDevice;
        }
      }
    }
    localStorage.setItem('wp-settings', JSON.stringify(settings));
  }
}
