var net = require('net'),
    util = require('util'),
    events = require('events'),
    Frame = require('./frame'),
    Table = require('./table'),
    UUID = require('./uuid'),
    KeySpace = require('./keyspace'),
    Parser = require('./parser');

// var DEFAULT_CONNECTION_IDLE_TIMEOUT = 300000;      // 5 min
var DEFAULT_CONNECTIONS_PER_HOST = 2;
var DEFAULT_RESPONSE_TIMEOUT = 3000;
var DEFAULT_RETRY_INTERVAL = 1000;
var DEFAULT_SELECT_POLICY = 'round-robin'; // or 'random

var consoleErrorData = function(err, data) {

  console.log ((err) ? err : data);
}

var available_stream_ids = [];

for (var i = 255; i > 0; i--) {
  available_stream_ids.push(i);
}

var pendingActiviy = {};

var getStreamID = function(conn, time, callback) {

  var t_out = time || DEFAULT_RESPONSE_TIMEOUT;
  var id = available_stream_ids.pop();
  pendingActiviy[id] = {};
  pendingActiviy[id]['connector'] = conn;
  pendingActiviy[id]['callback'] = callback;
  pendingActiviy[id]['timer'] = setTimeout(
    function() {
    if (callback) {
      callback(new Error('Request timed out'));
    }
    returnStreamID(id);
  }, t_out);
  return id;
};

var returnStreamID = function(id) {

  clearTimeout(pendingActiviy[id]['timer']);
  delete pendingActiviy[id];
  available_stream_ids.push(id);
};

/**
 * Create a pool of connections to Cassandra. Only one instance with a
 * single keyspace is assumed. The keyspace can changed after intialization.
 * @class Pool
 * @constructor
 * @param {key/value} config parameters
 * @example
 *        { 'hosts'                    : ['localhost:9042'] ,
 *          'username'                 : <db_username>      ,
 *          'password'                 : <db_password>      ,
 *          'keyspace'                 : <keyspace_name>    ,
 *          'connection_per_host'      : 2                  ,
 *          'select_policy'            : round-robin        ,
 *          'retry_internal'           : 1000               ,
 *          'respnse_timeout'          : 2000               }
 *
 * The default hostname is `localhost` when it is not specified as `:9042`,
 * and port 9042 (the default CQL 3 native port). There can be mulitple hosts.
 * `hosts`, `username` and `password` are required, and others are optional.
 * The select_policy can be `round-robin` or `random`.
 */
Pool = function(config) {

  var _one = null;
  var connectors = {};
  var keyspace_name = config['keyspace'];
  var keyspace;

  if (!_one) {
    _one = this;
  } else {
    return _one;
  };

  this.username = config['username'];
  this.password = config['password'];
  this.hostspec = null;
  this.n_connect = config['connection_per_host'] ||
    DEFAULT_CONNECTIONS_PER_HOST;
  this.retry_t = config['retry_interval'] ||
    DEFAULT_RETRY_INTERVAL;
  this.respnse_t = config['response_timeout'] ||
    DEFAULT_RESPONSE_TIMEOUT;
  this.select_policy = config['select_policy'] ||
    DEFAULT_SELECT_POLICY;
  this.selected_c = 0;

  var available_connections = {};
  if (config['hosts']) {
    this.hostspec = [];
    for (i in config['hosts']) {
      var hp = config['hosts'][i].split(':');
      if (hp.length == 1) {hp[1] = 9042;}
      if (hp[0] === '') {hp[0] = 'localhost'}
      if (hp[0].match(/^[\w\.]+$/) || hp[0].match(/[\d+\.]+/)) {
        if (String(hp[1]).match(/^\d+$/)) {
          this.hostspec.push({'host' : hp[0], 'port' : hp[1]});
        } else {
          return new Error('port number = ', hp[1]);
        }
      } else {
        return new Error('Host name = ', hp[0]);
      }
    }
  } else {
    return new Error('No Host speicified');
  }

  /**
   * Get connection from the pool
   * @method getConnection
   * @return {Pool.Connector}
   */
  this.getConnection = function() {

    /* If total available number of available connection is
     * add one more from random host spec.
     */
    var uids = Object.keys(connectors);
    if (uids.length < this.hostspec.length * this.n_connects) {
      var i = Math.floor(Math.random() * this.hostspec.length);
      this.setConnector(this.hostspec[i]);
    }

    var c = null;
    if (uids.length) {
      if (this.select_policy === 'round-robin') {
        c = uids[this.selected_c];
        this.selected_c = (this.selected_c + 1) % uids.length;
      } else if (this.select_policy === 'random') {
        c = uids[Math.floor(Math.random() * uids.length)];
      }
    }
    if (!c) {
      console.log(new Error('No Connector available'));
    }
    return connectors[c];
  };

  /**
   * Frame an outgoing message
   * @async
   * @method frameMesg
   * @param {Frame} frame
   * @param {Function} callback
   * @param {Pool.Connectors} conn send through a specified connector
   */
  this.frameMesg = function (frame, callback, conn) {

    var c = conn || _one.getConnection();
    var id = getStreamID(c, 0, callback);
    frame.send(id, c);
  };

  /**
   * Listener for the result event from connections
   * @method resultListener
   * @param {short} opcode Code sent outgoing message to Cassandra
   * @param {key/value} result  Parsed results including error
   */
  this.resultListener = function(data) {

    var p = new Parser();
    p.write(new Buffer(data));
    // console.log(this.uuid.hex_uuid + ' [' + p.vars.stream + '] ' + Object.keys(p.result));
    var ans = pendingActiviy[p.vars.stream];
    if (p.result['ready']) {
      ans['connector'].ready = true;
      _one.sendForOptions(this);
      _one.setKeyspace(null, this);
    } else if (p.result['supported']) {
      // console.log('Supported: ' + Frame.checkSupported(p.result['supported']));
    } else if (p.result['authenticator']) {
      _one.sendCredentials(this);
    } else {
      if (ans['callback']) {
        ans.callback(p.result['error'], p.result);
      }
    }
    returnStreamID(p.vars.stream);
  }

  /**
   * Set Pool.Connector and receive events from connection
   * @method setConnector
   * @param {key/value} spec
   */
  this.setConnector = function(spec) {

    var c = new Pool.Connector(spec);
    connectors[c.uuid.hex_uuid] = c;
    c.on('connect', function() {
      var id = getStreamID(this, 0, consoleErrorData);
      new Frame('Startup').send(id, this.conn);
    });
    c.on('result', _one.resultListener);
    c.on('end', function() {
      console.log('Connector' + c.uuid.hex_uuid + ' dissconnected');
      delete connectors[c.uuid.hex_uuid] });
  };

  // ***
  // More initialization code down here -- need setConnector
  // ***
  for (i in this.hostspec) {
    for (var j = 0; j < this.n_connect; j++) {
      _one.setConnector(_one.hostspec[i]);
    }
  }
  // ***

  /**
   * get the options served by Cassandra
   * @method sendForOptions
   * @param {Pool.Connectors} conn send through a specified connector
   */
  this.sendForOptions = function(conn) {

    _one.frameMesg(new Frame('Options'), consoleErrorData, conn);
  };

  /**
   * Set keyspace to use
   * @method setKeyspace
   * @return {String|KeySpace} name/keyspace
   * @param {Pool.Connectors} conn send through a specified connector
   */
  this.setKeyspace = function(keyspace, conn) {


    var name;
    if (keyspace instanceof KeySpace) {
      _one.keyspace = keyspace;
      name = keyspace.name;
    } else if (typeof(keyspace) === 'string') {
      name = keyspace;
      _one.keyspace = new KeySpace(name);
    } else if (keyspace_name) {
      name = keyspace_name;
      _one.keyspace = new KeySpace(name);
    }
    if (_one.keyspace) {
      var f = new Frame('Query', _one.keyspace.dbUse());
      _one.frameMesg(f, function(err, data) {
        if (!err) {
          _one.keyspace.activate();
        }
        consoleErrorData(err, data);
      }, conn);
    }
  };

  /**
   * Send user/pw credentials
   * @method sendCredentials
   * @param {Pool.Connectors} conn send through a specified connector
   */
  this.sendCredentials = function(conn) {

    var f = new Frame('Credentials', {
      'username' : this.username, 'password' : this.password});
    _one.frameMesg(f, consoleErrorData, conn);
  };

  /**
   * Send a query
   *
   * @method sendQuery
   * @async
   * @param {String|Select|Insert|Update|Delete|Table} query if it is a Table, dbCreate() method is invoked. if it is a query object, query() method is invoked. Otherwise, query string is sent directly.
   * @param {Function} [callback]
   * @param {short} [consistency]
   * @param {boolean} [raw] Send back raw result instead of array of Table instances for Select.
   */
  this.sendQuery = function(query, callback, consistency, raw) {

    callback = callback || consoleErrorData;
    var framed;
    if (typeof(query) === 'string') {
      framed = new Frame('Query', query, consistency);
    } else if (Object.keys(query).indexOf('query') >= 0) {
      framed = new Frame('Query', query.query(), consistency);
    } else if (Object.keys(query).indexOf('dbCreate') >= 0) {
      framed = new Frame('Query', query.dbCreate(), consistency);
    }
    var wrapped_cb = function(err, result) {
      if (!err) {
        var instable = null;
        if (result.colspec && !raw) {
          var i, j, t, cs = [];
          var nc = result.colspec.length;
          for (i = 0; i < nc; i++) {
            if (i == 0) {
              t = result.colspec[0]['table'];
            }
            cs.push(result['colspec'][i]['name']);
          }

          var tb, rc;
          instable = [];
          for (i = 0; i < result['row_count']; i++) {
            tb = Table.construct(t);
            rc = result.rows[i];
            for (j = 0; j < nc; j++) {
              tb[cs[j]] = rc[j];
            }
            instable.push(tb);
          }
        }
        callback(null, (instable) ? instable : result);
      } else {
        callback(err);
      }
    }
    if (framed) {
      _one.frameMesg(framed, wrapped_cb);
    } else {
      callback(new Error('Incompatitible query'));
    }
  };

};

var readableBuffer = function(s) {
  var rs = '';
  for (var i = 0; i < s.length; i++) {
    if (i != 0) {
      if ((i % 32) == 0) rs += '\n';
      else if ((i % 8) == 0) rs += ' ';
    }
    rs += s[i];
  }
  return rs;
};

/**
 * Connector encapsulate each connection
 * @class Pool.Connector
 * @for Pool
 * @constructor
 * @param {key/value} options
 * @example
 *    options = {'host' : host-name, 'port' : port#, 'retry_t' : retry-interval}
 */
Pool.Connector = function(options) {

  var MAX_ATTEMPTS = 3;

  this.ready = false;
  this.rt = options['retry_t'];
  this.attempts = 0;

  this.uuid = new UUID();
  var ctor = this;
  this.conn = net.connect(options, function() {
                // console.log('conn connected');
                ctor.emit('connect', ctor.uuid.hex_uuid);

              });
  this.conn.on('data', function(data) {
    // console.log('data received');
    // console.log(new Buffer(data).toString('hex'));
    ctor.emit('result', data);
  });
  this.conn.on('end', function() {
    ctor.emit('end');
  });
  this.conn.on('error', function (err) {
    ctor.ready = false;
    console.log('error: ' + ctor.uuid + " ; attempting reopen.");
    if (ctor.rt || ctor.attempts < MAX_ATTEMPTS) {
      setTimeout(net.connect, ctor.rt, options);
      ctor.attempts++;
      ctor.rt = ctor.rt << ctor.attempts;
    }
  });

  /**
   * write Pass through
   * @method write
   * @for Pool.Connector
   * @param {Buffer} data
   */
  this.write = function(data) {
    this.conn.write(data);
  };
  // this.conn.setTimeout(this.conn.end, DEFAULT_CONNECTION_IDLE_TIMEOUT);
};

util.inherits(Pool.Connector, events.EventEmitter);

module.exports = Pool;
