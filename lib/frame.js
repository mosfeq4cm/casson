var uuid = require('./uuid'),
    Decimal = require('./decimal'),
    util = require('util'),
    BigInteger = require('jsbn');

/**
 * Frame outgoing request of the interaction in native CQL
 *
 * @class Frame
 * @constructor
 * @param {String} type of the request
 * @param {String} data payload
 * @param {String} [consistency] level (default='ONE')
 */
Frame = function(type, data, consistency) {

  /*
   * Frame flags (not used)
   */
  var FLAGS = {'COMPRESSION' : 0x01, 'TRACING' : 0x02};

  /**
   * Types of messages
   * @property MESG_TYPES;
   * @type Object
   * @readOnly
   */
  var MESG_TYPES = {
    'Startup'     : 0x01
  , 'Credentials' : 0x04
  , 'Options'     : 0x05
  , 'Query'       : 0x07
  , 'Prepare'     : 0x09
  , 'Execute'     : 0x0A
  , 'Register'    : 0x0A
  };
  Object.freeze(MESG_TYPES);

  /**
   * Available consistency levels
   * @property CONSISTENCIES
   * @type Object
   * @readOnly
   */
  var CONSISTENCIES = {
    'ANY'          : 0x0000
  , 'ONE'          : 0x0001
  , 'TWO'          : 0x0002
  , 'THREE'        : 0x0003
  , 'QUORUM'       : 0x0004
  , 'ALL'          : 0x0005
  , 'LOCAL_QUORUM' : 0x0006
  , 'EACH_QUORUM'  : 0x0007
  };
  Object.freeze(CONSISTENCIES);

  /**
   * Available Events for client to register
   * @property CASSANDRA_EVENTS
   * @type Array
   * @readOnly
   */
  var CASSANDRA_EVENTS =
    ['TOPOLOGY_CHANGE', 'STATUS_CHANGE', 'SCHEMA_CHANGE'];
  Object.freeze(CASSANDRA_EVENTS);

  consistency = consistency || CONSISTENCIES['ONE'];

  this.dbuf = false;
  this.result = {};
  this.tracing = false;

  this.type = MESG_TYPES[type];
  switch (this.type) {
    case 0x01:                  // startup
    this.dbuf = Frame.bufferKeyValueStrs(
      {'CQL_VERSION' : Frame.defaults['CQL_VERSION']});
    break;
    case 0x04:                  // credentials
    if (data.username && data.password) {
      this.dbuf = Frame.bufferKeyValueStrs(data);
    }
    break;
    case 0x05:                  // options
    this.dbuf = new Buffer(0);
    break;
    case 0x07:                  // query
    if (typeof(data) === 'string') {
      var c = new Buffer(4);
      c.writeInt16BE(consistency, 0);
      this.dbuf = Buffer.concat([Frame.bufferString(data, true), c]);
    }
    break;
    default:
    break;
  };

  this.send = function(opc, conn) {
    if (this.dbuf) {
      var fp = Frame.fullPackage(opc, this.type, this.dbuf);
      if (this.tracing) {
        console.log(Frame.prettyString(fp));
      }
      conn.write(fp);
    } else {
      console.log(new Error('No data to send'));
    }
  };
};

/**
 * Current Default values
 * @attribute defaults;
 * @readOnly
 */
Frame.defaults = {
  'VERSION'     : 0x01
, 'CQL_VERSION' : '3.0.0'
, 'FLAGS'       : 0x00          // no flags
};
Object.freeze(Frame.defaults);

/**
 * Check for supported version, flag, etc.
 * @method checkSupported
 * @static
 * @param {key/value} supp supported version received from Cassandra
 * @return {boolean}
 */
Frame.checkSupported = function(supp) {
  var m = false;
  for (var k in supp) {
    if (Frame.defaults[k]) {
      if (supp[k].indexOf(Frame.defaults[k] >= 0)) {
        m |= true;
      } else {
        m &= false;
      }
    }
  }
  return m;
};

/**
 * Kind of pretty print buffer
 * @method prettyString
 * @static
 * @return {String}
 */
Frame.prettyString = function(buf) {
  return buf.toString('hex', 0, 8) + '\n' + buf.toString('utf8', 8);
};

/**
 * Create the complete binary package
 * @method fullPackage
 * @static
 * @param {streamid} Id of the package
 * @param {short} opcode Code for the package
 * @param {Buffer} body of the package
 * @return {Buffer}
 */
Frame.fullPackage = function(streamid, opcode, body) {
  var bodylen = new Buffer(4);
  bodylen.writeInt32BE(body.length, 0);
  return Buffer.concat([new Buffer([Frame.defaults['VERSION'],
                                    Frame.defaults['FLAGS'],
                                    streamid, opcode]),
                        bodylen, body]);
};

/**
 * Buffer a strings and its size
 * @method bufferString
 * @static
 * @param {Array} slst string list
 * @return {Buffer}
 */
Frame.bufferString = function(str, long_str) {
  long_str = long_str || false;
  var bs = new Buffer(str);
  var l_bs;
  if (long_str) {
    l_bs = new Buffer(4);
    l_bs.writeInt32BE(str.length, 0);
  } else {
    l_bs = new Buffer(2);
    l_bs.writeInt16BE(str.length, 0);
  }
  return Buffer.concat([l_bs, bs]);
};

/**
 * Buffer a list of strings and its size
 * @method bufferStringList
 * @static
 * @param {Array} slst string list
 * @return {Buffer}
 */
Frame.bufferStringList = function(slst) {
  var bufs = [];
  var l_bs = new Buffer(2);
  l_bs.writeInt16BE(slst.length, 0);
  bufs.push(l_bs);
  for (var i in slst) {
    bufs.push(Frame.bufferString(slst[i]));
  }
  return Buffer.concat(bufs);
};

/**
 * Buffer a key/value pairs, where key is a string and value is a string or
 * a list of strings and its size
 * @method bufferKeyValueStrs
 * @static
 * @param {key/value} bmap key/value pairs
 * @return {Buffer}
 */
Frame.bufferKeyValueStrs = function(bmap) {
  var bufs = [];
  var l_bs = new Buffer(2);
  l_bs.writeInt16BE(Object.keys(bmap).length, 0);
  bufs.push(l_bs);
  for (var k in bmap) {
    bufs.push(Frame.bufferString(k));
    bufs.push((bmap[k] instanceof Array) ?
              Frame.bufferStringList(bmap[k])
            : Frame.bufferString(bmap[k].toString()));
  }
  return Buffer.concat(bufs);
};

/**
 * Get size of simple types
 * @method getSimpleTypeSize
 * @static
 * @param {short} vtype
 * @param {any} value
 * @return {int} length
 */
Frame.getSimpleTypeSize = function(vtype, value) {
  switch (vtype) {
    case 0x0000:                // Custom ?
    case 0x0001:                // ascii
    case 0x0003:                // blob
    case 0x000A:                // text
    case 0x000D:                // varchar
    return value.length
    case 0x0004:                // boolean
    case 0x0008:                // float
    case 0x0009:                // int
    return 4;
    case 0x0006:                // decimal
    var d = new Decimal(value)
    return new BigInteger(
      String(d.ints['value'])).toByteArray().length + 4;
    case 0x000E:                // varint
    return new BigInteger(String(value)).toByteArray().length;
    case 0x0007:                // double
    case 0x0002:                // bigint
    case 0x000B:                // timestamp
    case 0x0005:                // counter
    return 8;
    case 0x000C:                // UUID
    case 0x000F:                // TimeUUID
    return 16;
    case 0x0010:                // inet
    return (value.split('.').length === 4) ? 4 : 16;
  }
  return 0;
};

/**
 * Write short length and value in a buffer
 * @method bufferShortValue
 * @static
 * @param {any} value of simple type
 * @param {short} type
 * @param {Buffer} buf
 */
Frame.bufferShortValue = function(type, value, buf) {
  var ln = new Buffer(2);
  ln.writeInt16BE(Frame.getSimpleTypeSize(type, value), 0, 2);
  buf.push(ln,  Frame.writeValue(value, {'type' : type }));
};

/**
 * Write a List or Set out
 * @method writeListSet
 * @static
 * @param {List/Set} value
 * @param {short} type of value
 * @return {Buffer}
 */
Frame.writeListSet = function(value, type) {
  var bufs = [];
  var ln = new Buffer(2); ln.writeInt16BE(value.length, 0, 2);
  bufs.push(ln);
  for (var i in value) {
    if (typeof(value[i]) ==='string') {
      bufs.push(Frame.bufferString(value[i]));
    } else {
      Frame.bufferShortValue(type, value[i], bufs);
    }
  }
  return Buffer.concat(bufs);
};

/**
 * Write key/value pairs out
 * @method writeMap
 * @static
 * @param {key/value} value
 * @param {short} ktype key type
 * @param {short} vtype value type
 * @return {Buffer}
 */
Frame.writeMap = function(value, ktype, vtype) {

  var bufs = [];
  var keys = Object.keys(value);
  var ln = new Buffer(2); ln.writeInt16BE(keys.length, 0);
  bufs.push(ln);
  for (var k in value) {
    if (typeof(k) ==='string') {
      bufs.push(Frame.bufferString(k));
    } else {
      Frame.bufferShortValue(ktype, k, bufs);
    }
    if (typeof(value[k]) ==='string') {
      bufs.push(Frame.bufferString(value[k]));
    } else {
      Frame.bufferShortValue(vtype, value[k], bufs);
    }
  }
  return Buffer.concat(bufs);
};

/**
 * Write the value of various Cassandra types
 * @method writeValue
 * @static
 * @param {any} value of simple type
 * @param {short} colspec column spec
 * @example
v      0x0001:                // ascii
      0x0003:                // blob
      0x0004:                // boolean
      0x0007:                // double
      0x0006:                // decimal
      0x0008:                // float
      0x0002:                // bigint
      0x000B:                // timestamp
      0x0005:                // counter
      0x000E:                // varint
      0x0009:                // int
      0x000A:                // text
      0x000D:                // varchar
      0x000C:                // UUID
      0x000F:                // TimeUUID
      0x0010:                // inet
      0x0020:                // list
      0x0022:                // set
      0x0021:                // map
  * @return {Buffer}
 */
Frame.writeValue = function(value, colspec) {
  var ln, tb;
  switch (colspec['type']) {
    case 0x0000:                // Custom ?
    case 0x0003:                // blob
    tb = new Buffer(4 + value.length);
    tb.writeInt32BE(value.length, 0);
    tb.write(value, 4, tb.length);
    break;
    case 0x0001:                // ascii
    tb = new Buffer(4 + value.length);
    tb.writeInt32BE(value.length, 0);
    tb.write(value, 4, tb.length, 'ascii');
    break;
    case 0x0004:                // boolean
    tb = new Buffer(4);
    tb.writeInt32BE((value) ? 1 : 0, 0);
    break;
    case 0x0007:                // double
    tb = new Buffer(8);
    tb.writeDoubleBE(value, 0);
    break;
    case 0x0006:                // decimal
    var d = new Decimal(value);
    var vb = new BigInteger(String(d.ints['value'])).toByteArray();
    ln = new Buffer(8);
    ln.writeInt32BE(vb.length + 4, 0);
    ln.writeInt32BE(d.ints['exp'], 4);
    tb = Buffer.concat([ln, new Buffer(vb)]);
    break;
    case 0x0008:                // float
    tb = new Buffer(4);
    tb.writeFloatBE(value, 0);
    break;
    case 0x0002:                // bigint
    case 0x000B:                // timestamp
    case 0x0005:                // counter
    case 0x000E:                // varint
    tb = new Buffer(8);
    tb.writeInt32BE(value >> 8, 0);
    tb.writeInt32BE(value | 0XFFFF, 4);
    break;
    case 0x0009:                // int
    tb = new Buffer(4); tb.writeInt32BE(value, 0);
    break;
    case 0x000A:                // text
    case 0x000D:                // varchar
    tb = new Buffer(4 + value.length);
    tb.writeInt32BE(value.length, 0);
    tb.write(value, 4);
    break;
    case 0x000C:                // UUID
    case 0x000F:                // TimeUUID
    tb = value.toBuffer();
    break;
    case 0x0010:                // inet
    var ip_port = value.split(':');
    var ip_oct = ip_port[0].split('.');
    ln = new Buffer(1); ln.writeUInt8(ip_oct.length, 0, 1);
    var pb = new Buffer(4);
    if (ip_port.length > 1) {pb.writeInt32BE(ip_port[1], 0);}
    tb = Buffer.concat([ln, new Buffer(ip_oct), pb]);
    break;
    case 0x0020:                // list
    case 0x0022:                // set
    tb = Frame.writeListSet(value, colspec['opt']);
    break;
    case 0x0021:                // map
    tb = Frame.writeMap(value, colspec['opt'], colspec['opt2']);
    break;
  }
  return tb;
};

/**
 * Write list of values
 * @method writeValueList
 * @static
 * @param {key/value} colspecs Specification of column
 * @example
 *     {'type' : 0x0002, 'opt' : 0x000A, opt2 : 0x0009}
 *     'opt'                // used for collection type
 *     'opt2'                     // used only for maps
 * @param (any} values
 * @return {Buffer}
 */
Frame.writeValueList = function(colspecs, values) {
  var bufs = [];
  var ln = new Buffer(2);
  ln.writeInt16BE(values.length, 0);
  bufs.push(ln);
  for (var i in values) {
    bufs.push(Frame.writeValue(values[i], colspecs[i]));
  }
  return Buffer.concat(bufs);
};

module.exports = Frame;
