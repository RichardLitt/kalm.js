/** @module defaults */

'use strict';

/* Requires ------------------------------------------------------------------*/

const profiles = require('./profiles');
const serials = require('./serials');
const transports = require('./transports');

/* Local variables -----------------------------------------------------------*/

const defaults = {
  port: 3000,
  transport: transports.TCP,
  serial: serials.JSON,
  secretKey: null,
  profile: profiles.dynamic
};

/* Exports -------------------------------------------------------------------*/

module.exports = defaults;