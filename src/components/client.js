/** Client class */

'use strict';

/* Requires ------------------------------------------------------------------*/

const serializer = require('../utils/serializer');
const debug = require('debug')('kalm');
const sessions = require('../utils/sessions');
const encrypter = require('../utils/encrypter');

/* Methods -------------------------------------------------------------------*/

function Client(scope) {
  
  /**
   * @memberof Client
   * @param {string} name The channel to send to data through
   * @param {string|object} payload The payload to send
   * @returns {Client} The client, for chaining
   */
  function write(name, message) {
    scope.queue(name)
      .add(scope.serial ? scope.serial.encode(message) : message);
    return scope;
  }

  /** @memberof Client */
  function destroy() {
    if (scope.connected) {
      for (let channel in scope.queues) {
        scope.queues[channel].step();   // Drain
      }
      setTimeout(scope.transport.disconnect.bind(null, scope, handleDisconnect), 0);
    }
  }

  /** @private */
  function wrap(queue, packets) {
    let payload = serializer.serialize(queue.frame, queue.name, packets);
    if (scope.secretKey !== null) payload = encrypter.encrypt(payload, scope.secretKey);
    if (scope.connected === 2) scope.transport.send(scope.socket, payload);
    else scope.backlog.push(payload);
  }

  /** @private */
  function handleConnect() {
    scope.connected = 2;
    scope.backlog.forEach(scope.transport.send.bind(null, scope.socket));
    scope.backlog.length = 0;
    scope.emit('connect', scope);
    scope.session = sessions.resolve(scope.id)
  }

  /** @private */
  function handleError(err) {
    debug(`error: ${err.message}`);
  }

  /** @private */
  function handleRequest(payload) {
    const frames = serializer.deserialize((scope.secretKey !== null) ? encrypter.decrypt(payload, scope.secretKey) : payload);
    frames.forEach((frame) => {
      frame.packets.forEach((packet, messageIndex) => {
        Promise.resolve()
          .then(() => scope.serial ? scope.serial.decode(packet) : packet)
          .catch(err => packet)
          .then(decodedPacket => scope.trigger(frame.channel, format(frame, decodedPacket, messageIndex)))
      });                 
    });
  }

  /** @private */
  function format(frame, body, messageIndex) {
    return {
      body,
      client: scope,
      reply: scope.write.bind(null, frame.channel),
      frame: {
        id: frame.frame,
        channel: frame.channel,
        payloadBytes: frame.payloadBytes,
        payloadMessages: frame.packets.length,
        messageIndex
      },
      session: scope.session
    }
  }

  /** @private */
  function handleDisconnect: () => {
    scope.connected = 0;
    scope.emit('disconnect', scope);
  }

  /** Init */
  scope.socket = scope.socket || scope.transport.createSocket(scope);
  scope.transport.attachSocket(scope.socket, { handleDisconnect, handleRequest, handleError, handleConnect });

  return { write, destroy, backlog: [], socketTimeout: 300000 };
}

/* Exports -------------------------------------------------------------------*/

module.exports = Client;