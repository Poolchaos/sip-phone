import { LogManager } from 'aurelia-framework';

import * as moment from 'moment';

const logger = LogManager.getLogger('OplogWebsocket');

export class OplogWebsocket {
  public io = {
    uri: '',
  };
  public ws: WebSocket;
  private callback: Function;
  private closeTriggered: boolean;
  private lastmessageReceivedTimestamp;

  // TODO: Place me in global constants/config and inject value
  private readonly WS_TIMEOUT: number = 15000;

  constructor() {
    this.io.uri = ''; // mimic socket.io
  }

  async connect(failCallback) {
    let timeoutTimer;
    try {
      await new Promise((resolve, reject) => {
        let closeListener;
        let errorListener;
        let successListener;

        logger.debug('WS | URI', this.io.uri);
        this.ws = new WebSocket(this.io.uri);

        closeListener = msg => {
          logger.debug('WS | CLOSE LISTENER msg', msg);
          if (!this.closeTriggered) {
            failCallback();
            this.clearDisconnectedTimeout();
          }
        };
        errorListener = err => {
          logger.debug('WS | ERROR ON CONNECTION', err);
          reject(new Error('CONNECTION ERROR'));
        };
        successListener = () => {
          logger.debug('WS | OPEN LISTENER - successful websocket opened', this.ws);
          resolve({});
        };

        this.ws.onclose = closeListener;
        this.ws.onerror = errorListener;
        this.ws.onopen = successListener;

        timeoutTimer = setTimeout(() => {
          reject();
        }, this.WS_TIMEOUT);
      });

      // SUCCESS, clear that timer
      logger.debug('WS | CONNECTION SUCCESSFUL, so continuing');
      if (timeoutTimer) {
        clearInterval(timeoutTimer);
      }

      logger.debug('WS | OKAY, so remove your login listeners, and hookup your runtime listeners');

      this.ws.onmessage = env => {
        let data;

        // tmp solution to deal with malformed messages
        try {
          data = JSON.parse(env.data);
        } catch (e) {
          logger.error('connect() JSON.parse error = ', { error: e, data: env.data }, 'error message:', e.message);
        } finally {
          data = {
            type: data && data.type ? data.type : {},
            payload: data && data.payload ? data.payload : {},
          };
        }

        // convert messsage
        this.callback &&
          this.callback({
            name: data.type,
            state: data.payload,
          });
        this.lastmessageReceivedTimestamp = moment();
        this.checkLiveState(failCallback);
      };
    } catch (err) {
      logger.error('WS | CONNECTION ERROR', err);
      this.close();
      throw err;
    }
  }

  private disconnectedTimeout;
  private checkLiveState(failCallback: Function): void {
    this.clearDisconnectedTimeout();

    this.disconnectedTimeout = setInterval(() => {
      const timeDiff = moment(moment().diff(moment(this.lastmessageReceivedTimestamp))).unix();
      if (timeDiff > 40) {
        this.clearDisconnectedTimeout();
      }
    }, 3000);
  }

  private clearDisconnectedTimeout(): void {
    if (this.disconnectedTimeout) {
      window.clearInterval(this.disconnectedTimeout);
    }
  }

  // TODO: and error situations?
  close() {
    this.clearDisconnectedTimeout();
    logger.debug('WS | connect closed ws readyState', this.ws && this.ws.readyState);
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.closeTriggered = true;
        /*
        FIXME: does the "else if (this.ws.readyState === 1)" work against the this.ws.onclose = () => {} ?
        Was the only way I could emulate a "quick" "close"
         */
        this.ws.onclose = () => {
          logger.debug('WS | debug websocket-client2 close() in .ws.onclose');
          this.callback = null;
          resolve({});
        };

        if (this.ws.readyState === 0) {
          logger.debug('WS | debug websocket-client2 before OplogWebsockConnectionClosingError');

          resolve({});
        } else if (this.ws.readyState === 1) {
          this.ws.close();
          this.ws = null;
          logger.debug('WS | debug websocket-client2 before normal close');
          resolve({});
        } else if (this.ws.readyState === 2) {
          // closing
          this.ws = null;
          logger.debug('WS | debug websocket-client2 before closing');
          reject();
        } else if (this.ws.readyState === 3) {
          // closed
          this.ws = null;
          logger.debug('WS | debug websocket-client2 clsed');
          resolve({});
        }
      } else {
        logger.debug('WS | debug websocket-client2 - NO WS');
        resolve({});
      }
    });
  }

  emit(topic, env) {
    // convert and serialise messsage

    try {
      this.ws.send(
        JSON.stringify({
          authorization: env.Authorization,
          root: env.feature,
          type: env.name,
          payload: env.state,
          requestId: env.trackingId,
        })
      );
    } catch (e) {
      logger.error('emit() unable to send event over websocket. error = ', e, 'env', env, 'error message:', e.message);
    }
  }

  on(topic, callback) {
    this.callback = callback;
  }
}
