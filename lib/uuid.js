var nodeuuid = require('node-uuid');

/**
 * Generate version 1 or 4 UUID;
 *
 * @class Uuid
 * @constructor
 * @param {int} version 4 or 1
 */
var Uuid = function(version) {
  var v = version || 4;
  this.hex_uuid = (v === 4) ? nodeuuid.v4() : nodeuuid.v1();
};

/**
 * Reads buffered Uuid
 * @method readBuffer
 * @param {Buffer} buf
 * @static
 * @return Uuid
 */
Uuid.readBuffer = function (buf) {
    var uuid = new Uuid();
    uuid.hex_uuid = nodeuuid.unparse(buf);
    return uuid;
};

/**
 * Reads binary Uuid
 * @method readBinary
 * @param {binary} b
 * @static
 * @return Uuid
 */
Uuid.readBinary = function(b) {
    return Uuid.read(new Buffer(b, 'binary'));
};

/**
 * Reads buffered binary timeUUID
 * @method timeUuid
 * @param {timestamp} ts from Date.getTime()
 * @static
 * @return TimeUuid (version 1)
 */
Uuid.timeUuid = function(ts) {
    var uuid = new Uuid();
    uuid.hex_uuid = (ts === undefined) ?
        nodeuuid.v1() : nodeuuid.v1({ msecs: ts});
    return uuid;
};

/**
 * Writes to a Buffer and returns it.
 * @method toBuffer
 * @static
 * @return TimeUuid (version 4)
 */
Uuid.prototype.toBuffer = function() {
    return new Buffer(nodeuuid.parse(this.hex_uuid));
};

module.exports = Uuid;
