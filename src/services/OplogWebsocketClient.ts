import { LogManager } from 'aurelia-framework';

import { OplogWebsocket } from './oplog-websocket';

import uuid from 'uuid';
import { AureliaConfiguration } from 'aurelia-configuration';
import { StateService } from './state-service';
import { AppStore } from './app-store';
import { ERROR_MESSAGES } from './error-messages';

const logger = LogManager.getLogger('OplogWebsocketClient');

export class OplogWebsocketClient {
  subscribers = {};
  queue = [];
  private loggedInUser: any;
  private sipConfig: any;
  private softconfig: any;

  private socket: OplogWebsocket;

  constructor(
    private aureliaConfiguration: AureliaConfiguration,
    private stateService: StateService,
    private appStore: AppStore
  ) {
    this.socket = new OplogWebsocket();
  }
  async start(userId) {
    return this.init(userId);
  }

  async stop() {
    return await this.closeWebsocket();
  }

  /**
   * If I throw an error, connection attempts must stop - we want to reconnect manually, and explicitly
   * @param userId
   * @param websocketOpenCallback
   */
  async init(userId?) {
    logger.debug('WP | OPLOG | init this.socket.ws && this.socket.ws.readyState :', this.socket.ws && this.socket.ws.readyState);
    if (this.socket.ws && this.socket.ws.readyState === 0) {
      return;
    }

    // @ts-ignore;
    const env = this.aureliaConfiguration.environment;
    const apiCommandEndpoint = this.aureliaConfiguration.obj[env].ws;
    logger.debug('WP | OPLOG | apiCommandEndpoint ', apiCommandEndpoint);

    const appId = uuid();

    // CORRECT
    this.socket.io.uri = `${apiCommandEndpoint}?appId=${appId}${userId ? '&userid=' + userId : ''}`;
    logger.debug('WP | OPLOG | creating new connection for ', this.socket.io.uri);

    try {
      logger.debug('WP | OPLOG | creating new connection | connect to uri', this.socket.io.uri);
      await this.socket.connect((err) => {
        if (this.appStore.user) {
          this.handleDisconnected(userId);
        }
        this.stateService.triggerOplog.failed(err);
        this.stateService.triggerLogin.failed(ERROR_MESSAGES.OPLOG.REGISTRATION_ERROR);
      });

      this.subscribe({
        name: 'OPEN',
        callback: () => {
          this.onOpen();
          logger.debug('WP | OPLOG | ON OPEN and gonna call websocket open callback');
        },
      });

      this.socket.on('message-SUB', emittedMessage => {
        // this.checkConnection();

        if (emittedMessage.name && emittedMessage.state) {
          logger.debug('WP | OPLOG | incoming ', emittedMessage, ' on message-SUB');
        }

        let subscriber = this.subscribers[emittedMessage.name];
        if (subscriber && subscriber.callback) {
          if (emittedMessage.state) {
            logger.debug('WP | OPLOG | ws debug :: we are going to try to parse emittedMessage.state', emittedMessage.state);
            // let data = JSON.parse(emittedMessage.state);
            let data = emittedMessage.state;
            emittedMessage.state = data;
          }
          subscriber.callback(emittedMessage);
        }
      });
    } catch (err) {
      logger.debug('WP | OPLOG | this.socket.connectFAILURE', err);
      this.handleDisconnected(userId);
    }
  }

  private failureCount: number = 0;
  public handleDisconnected(userId: string): void {
    logger.debug('WP | OPLOG | DISCONNECT | handleDisconnected ', this.failureCount);
    
    if (this.appStore.user) {
      // is logged in
        logger.debug('WP | OPLOG | DISCONNECT | is logged in');
      if (this.appStore.connectionStopped) {
        // disconnect forced due to invalid device
        logger.debug('WP | OPLOG | DISCONNECT | forced disconnect');
        this.failureCount = 0;
        return;
      }
      this.failureCount++;
      // was disconnected, attempting reconnect
      logger.debug('WP | OPLOG | DISCONNECT | was disconnected, attempting reconnect');

      const reconnectDelay = this.calculateReconnectDelayMS(this.failureCount);

      if (this.failureCount > 1) {
        setTimeout(() => {
          logger.debug('WP | OPLOG | DISCONNECT | next reconnect attempts ');
          this.resetWebsocket(userId);
        }, reconnectDelay);
      } else if (this.failureCount === 1) {
        this.resetWebsocket(userId);
      }
    }
  }

  private calculateReconnectDelayMS(failureCount): number {
    return Math.pow(2, failureCount) * 1000;
  }

  async resetWebsocket(userId) {
    logger.debug('WP | resetWebsocket');
    await this.closeWebsocket();
    await this.init(userId);
  }

  async closeWebsocket() {
    if (!this.socket) {
      return;
    }
    logger.debug('WP | closeWebsocket');
    return this.socket.close();
  }

  onOpen() {
    this.publish({ name: 'OPENED' });
    console.log('WP | websocket open ');
    this.stateService.triggerOplog.success();

    for (let message of this.queue) {
      this.publish(message);
    }
    // TODO: We must remove items from queue when successfully published
    //this.queue = [];
  }

  publish(message) {
    if (this.socket.ws && this.socket.ws.readyState === 1) {
      // if (this.open) {
      message.trackingId = uuid.v4();
      message.Authorization = this.loggedInUser && this.loggedInUser.token ? 'Bearer ' + this.loggedInUser.token : '';

      this.socket.emit('message-PUB', message);
    } else {
      this.queue.push(message);
    }
  }

  subscribe(params) {
    this.subscribers[params.name] = {
      callback: params.callback,
    };
  }

  unSubscribe(name) {
    delete this.subscribers[name];
  }
}
