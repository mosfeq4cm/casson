var Dissolve = require("dissolve"),
    util = require("util"),
    BigInteger = require("jsbn"),
    uuid = require("./uuid");

/**
 * Class to parse CQL binary data from Cassandra
 * @class Parser
 */
Parser = function() {
  // May want remove Dissolve later.
  Dissolve.call(this);

  /**
   * Parsed result is stored here
   * @attribute result
   */
  this.result = {};

  /*
   * The main parsing loop
   */
  this.loop(
    function(end) {
      this.uint8be('version').uint8be('flags').uint8be(
        'stream').uint8be('opcode').uint32be('meg_len').tap
      (function() {
        switch (this.vars.opcode) {
          case 0x00:      // ERROR
          this.uint32be('err_code').readnstr(
            'err_str').tap(
              function() {
                this.result['error'] = [this.vars.err_code,
                                        this.vars.err_str];
                this.handleErrorOptions();
              });
          break;
          case 0x02:      // READY
          this.result['ready'] = true;
          break;
          case 0x03:      // AUTHENTICATE
          this.readnstr('authenticator').tap
          (function() {
            this.result['authenticator'] =
              this.vars.authenticator;
          });
          break;
          case 0x06:      // SUPPORTED
          this.readnstrmmap('supported');
          this.result['supported'] = this.vars.supported;
          break;
          case 0x08:      // RESULT
          this.readResult();
          break;
          case 0x0C:      // EVENT
          break;
          default:
          break;
        }
        return end(true);
      });
    }).tap(
      function() {
        this.push(this.vars);
        this.push(this.result);
      });
}

util.inherits(Parser, Dissolve);

/**
 * @attribute Error codes
 */
Parser.error_codes = {
  0x0000 : 'Server error'
, 0x000A : 'Protocol error'
, 0x0100 : 'Bad credentials'
, 0x1000 : 'Unavailable exception'
, 0x1001 : 'Overloaded'
, 0x1002 : 'Is bootstrapping'
, 0x1003 : 'Truncate error'
, 0x1100 : 'Write timeout'
, 0x1200 : 'Read timeout'
, 0x2000 : 'Syntax error'
, 0x2100 : 'Unauthorized'
, 0x2200 : 'Invalid'
, 0x2300 : 'Config error'
, 0x2400 : 'Already exists'
, 0x2500 : 'Unprepared'
};

/**
 * Retrieve optional data associated with errors
 * @private
 * @method handleErrorOptions
 */
Parser.prototype.handleErrorOptions = function() {

  if (this.vars.err_code == 0x1000) {
    this.uint16be('consistency').uint32be('node_reqd').uint32be(
      'node_alive').tap(
        function() {
          this.result['error'].push({
            'consistency' : this.vars.consistency,
            'node_required' : this.vars.node_reqd,
            'node_alive' : this.vars.node_alive });

        });
  } else if (this.vars.err_code == 0x1100) {
    this.uint16be('consistency').uint32be('node_recvd').uint32be(
      'node_bf').readnstr('write_typ').tap(
        function() {
          this.result['error'].push({
            'consistency' : this.vars.consistency,
            'node_received' : this.vars.node_recvd,
            'node_blockfor' : this.vars.node_bf,
            'write_type' : this.vars.write_typ });
        });
  } else if (this.vars.err_code == 0x1200) {
    this.uint16be('consistency') .uint32be('node_recvd') .uint32be(
      'node_bf') .uint8be('data_p').tap(
        function() {
          this.result['error'].push({
            'consistency' : this.vars.consistency,
            'node_received' : this.vars.node_recvd,
            'node_blockfor' : this.vars.node_bf,
            'data_present' : (this.vars.data_p != 0) ? true : false});
        });
  } else if (this.vars.err_code == 0x2400) {
    this.readnstr('keyspace').readnstr('table').tap(
      function() {
        this.result['error'].push({
          'keyspace' : this.vars.keyspace,
          'table' : this.vars.table });
      });
  }
};

/**
 * Read a string with short length
 * @private
 * @method readnstr
 * @param {String} name
 * @return {Parser}
 */
Parser.prototype.readnstr = function(name) {

  var n = 'slen';
  return this.uint16be(n).tap(
    function() {
      this.string(name, this.vars[n]).tap(
        function() { delete this.vars[n]; });
    });
};

/**
 * Read a string list with short length and short strings
 * @private
 * @method readnstrlst
 * @param {String} name
 * @return {Parser}
 */
Parser.prototype.readnstrlst = function(name) {

  this.vars[name] = [];
  return this.uint16be('slen').tap(function() {
    var n = this.vars.slen;
    _rsl_inner(this, name, --n);
  });
};

/**
 * Read a string map with short length with short strings
 * @private
 * @method readnstrmmap
 * @param {String} name
 * @return {Parser}
 */
Parser.prototype.readnstrmmap = function(name) {

  this.vars[name] = {};
  return this.uint16be('slen').tap(
    function() {
      var n = this.vars.slen;
      _rmap_inner(this, name, --n);
    });
};

/**
 * Read column specification
 * @private
 * @method readColspec
 * @param {String} name
 * @return {Parser}
 */
Parser.prototype.readColspec = function(name) {

  this.vars[name] = [];
  var n = this.vars['col_count'];
  for (var i = 0; i < n; i++) {
    var c = {};
    if (this.vars.r_flags != 0x0001) {
      this.readnstr('c_keyspace').readnstr('c_table').tap(
        function() {
          c['keyspace'] = this.vars.c_keyspace;
          c['table'] = this.vars.c_table;
        });
    } else {
      c['keyspace'] = this.vars.g_keyspace;
      c['table'] = this.vars.g_table;
    }
    this.readnstr('c_col').uint16be('c_type').tap(
      function() {
        c['name'] = this.vars.c_col;
        c['type'] = this.vars.c_type;

        // Options for custom and collection type
        if (((this.vars.c_type & 0x0020) != 0) ||
            (this.vars.c_type === 0x0000)) {
          this.uint16be('c_opt').tap(
            function() {
              c['opt'] = this.vars.c_opt;
              if (this.vars.c_type === 0x0021) {
                this.uint16be('c_opt2').tap(
                  function() {
                    c['opt2'] = this.vars.c_opt2;
                    this.vars[name].push(JSON.parse(JSON.stringify(c)));
                  });
              } else {
                this.vars[name].push(JSON.parse(JSON.stringify(c)));
              }
            });
        } else {
          this.vars[name].push(JSON.parse(JSON.stringify(c)));
        }
      });
  }
  return this;
};

/**
 * Read basic data types
 * @private
 * @method readBasic
 * @param {String} val variable name
 * @param {short} type
 * @param {int} len length
 * @return {Parser}
 */
Parser.prototype.readBasic = function(val, type, len) {
  this.vars[val] = 'NULL';
  if (len < 0) {return this;}

  switch (type) {
    case 0x0000:    // Custom ?
    break;
    case 0x0001:    // ascii
    this.binary('v_buf', len).tap(
      function() {
        this.vars.v_buf.read(
          this.vars[val], 0, len, 'ascii');
      });
    break;
    case 0x0003:    // blob
    this.binary('v_buf', len).tap(
      function() {
        this.vars[val] = this.vars.v_buf;
      });
    break;
    case 0x0004:    // boolean
    this.uint8be('a_boolean').tap(function() {
      this.vars[val] = (this.vars.a_boolean) ? true : false;
    });
    break;
    case 0x0007:    // double
    this.doublebe('a_double').tap(function() {
      this.vars[val] = this.vars.a_double;
    });
    break;
    case 0x0006:    // decimal
    this.int32be('a_int').buffer('v_buf', len - 4).tap(function() {
      this.vars[val] = Number(new BigInteger(this.vars.v_buf)) *
        Number(util.format('1e-%d', this.vars.a_int));
    });
    break;
    case 0x0008:    // float
    this.floatbe('a_float').tap(function() {
      this.vars[val] = this.vars.a_float;
    });
    break;
    case 0x0002:    // bigint
    case 0x0005:    // counter
    this.int64be('v_int').tap(function() {
      this.vars[val] = this.vars.v_int;
    });
    case 0x000B:    // timestamp
    this.int64be('v_int').tap(function() {
      this.vars[val] = new Date(this.vars.v_int);
    });
    break;
    case 0x000E:    // varint
    this.buffer('v_buf', len).tap(function() {
      this.vars[val] = Number(new BigInteger(this.vars.v_buf));
    });
    break;
    case 0x0009:    // int
    this.int32be('a_int').tap(function() {
      this.vars[val] = this.vars.a_int;
    });
    break;
    case 0x000A:    // text
    case 0x000D:    // varchar
    this.string('a_text', len).tap(function() {
      this.vars[val] = this.vars.a_text;
    });
    break;
    case 0x000C:    // uuid
    case 0x000F:    // Timeuuid
    this.buffer('v_buf', len).tap(
      function() {
        this.vars[val] = uuid.readBuffer(this.vars.v_buf);
      });
    break;
    case 0x0010:    // inet (no port in actual data)
    this.vars[val] = '';
    this.buffer('v_buf', len).tap(
      function() {
        if (len === 4) {
          for (var i = 0; i < len; i++) {
            this.vars[val] += ((i == 0) ? '' : ',') + this.vars.v_buf[i];
          }
        } else if (len === 16) {
          for (var i = 0; i < len; i += 2) {
            this.vars[val] += ((i == 0) ? '' : ':') +
              this.vars.v_buf.readUInt16(i);
          }
        }
    });
    break;
  }
  return this;
};

/**
 * Read a collection item
 * @private
 * @method readCollectionPiece
 * @param {key/value} colspec value spec
 * @param {short} vs value array or map
 * @return {Parser}
 */
Parser.prototype.readCollectionPiece = function(colspec, vs) {

  return this.int16be('klen').tap(
    function() {
      this.readBasic('optk', colspec['opt'], this.vars.klen).tap(
        function() {

          if (colspec['opt2']) {
            this.int16be('vlen').tap(
              function() {
                this.readBasic('optv', colspec['opt2'], this.vars.vlen).tap(
                  function() {
                    vs[this.vars.optk] = this.vars.optv;
                  });
              });

          } else {
            vs.push(this.vars.optk);
          }
        });
    });
}

/**
 * Context for reading a collection
 * @private
 * @method contextCollection
 * @param {key/value} colspec column specification for the collection
 * @param {int} i row index
 * @param {int} j column index
 * @return {Parser}
 */
Parser.prototype.contextCollection = function(colspec, i, j) {

  return this.int32be('len').tap(
    function () {
      if (this.vars.len > 0) {
        this.int16be('b_len').tap(
          function() {
            this.vars['rows'][i][j] = (colspec['opt2']) ? {} : [];
            var len = this.vars.b_len;
            while (len--) {
              this.readCollectionPiece(colspec, this.vars['rows'][i][j]);
            }
          });
      } else {
        this.vars['rows'][i][j] = null;
      }
    });
};

/**
 * Context for reading a row value
 * @private
 * @method contextBasic
 * @param {int} t column type
 * @param {int} i row index
 * @param {int} j column index
 * @return {Parser}
 */
Parser.prototype.contextBasic = function(t, i, j) {

  var ln = 'len';
  var vn = 'val';
  this.int32be(ln).tap(
    function () {
      if (this.vars.len > 0) {
        this.readBasic(vn, t, this.vars[ln]).tap(
          function () {
            /*
            console.log('VAL (' + this.vars[ln] + ') : ' +
                        util.inspect(this.vars[vn]));
             */
            this.vars['rows'][i][j] = this.vars[vn];
          });
      } else {
        this.vars['rows'][i][j] = null;
      }
    });
};

/**
 * Read row data using just read column specification
 * @private
 * @method readRows
 * @return {Parser}
 */
Parser.prototype.readRows = function() {

  this.vars['rows'] = [];
  this.result['row_count'] = this.vars.row_count;
  for (var i = 0; i < this.vars.row_count; i++) {
    this.vars['rows'].push([]);
    for (var j = 0; j < this.vars.col_count; j++) {
      if (this.vars.colspec[j]['opt']) {
        this.contextCollection(this.vars.colspec[j], i, j).tap(
          function() {
            // console.log('readRows: ' + util.inspect(this.vars.rows))
          });;
      } else {
        this.contextBasic(this.vars.colspec[j]['type'], i, j)
      }
    }
  }
  return this;
};

/**
 * Read the whole column specifications (metadata)
 * @private
 * @method readMetadata
 * @return {Parser}
 */
Parser.prototype.readMetadata = function() {

  if (this.vars.r_flags === 0x0001) {
    this.readnstr('g_keyspace').readnstr('g_table').tap(
      function() {
        this.readColspec('colspec');
      });
  } else {
    this.readColspec('colspec');
  }
  return this;
};

/**
 * Read result data of different types
 * @private
 * @method readResult
 * @return {Parser}
 */
Parser.prototype.readResult = function() {

  return this.uint32be('kind').tap(
    function() {
      switch (this.vars.kind) {
        case 0x0001:        // Void
        break;
        case 0x002:         // Rows
        this.uint32be('r_flags').uint32be('col_count').tap(
          function() {
            this.readMetadata().uint32be('row_count').tap(
              function() {
                this.readRows().tap(function() {
                  this.result['colspec'] = this.vars.colspec;
                  this.result['rows'] = this.vars.rows;
                  // console.log(this.result);
                })
              });
          });
        break;
        case 0x0003:        // Set keyspace
        this.readnstr('set_keyspace').tap(
          function() {
            this.result['keyspace'] = this.vars.set_keyspace;
          });
        break;
        case 0x0004:        // Prepared
        this.uint8('prepared_id').uint32be('r_flags').uint32be('col_count').tap(
          function() {
            this.readMetadata().tap(
              function() {
                  this.result['prepared_id'] = this.vars.prepared_id;
                  this.result['rows'] = this.vars.rows;
                  // console.log(this.result);
              })
          });
        break;
        case 0x0005:        // Schema change
        this.readnstr('sc_change').readnstr('sc_keyspace').readnstr(
          'sc_table').tap(
            function() {
              this.result['changed_schema'] =
                [this.vars.sc_change, this.vars.sc_keyspace,
                 this.vars.sc_table];
            });
        break;
      }
    });
};

/*
 * Helper function for reading string list
 * @private
 */
var _rsl_inner = function(t, name, n) {

  if (n >= 0) {
    t.readnstr('sn', t.vars[name]).tap(
      function() {
        this.vars[name].push(t.vars.sn);
        delete t.vars['sn'];
        _rsl_inner(t, name, --n);
      });
  }
};

/*
 * Helper function for reading string map
 * @private
 */
var _rmap_inner = function(t, name, n) {

  if (n >= 0) {
    t.readnstr('sk').readnstrlst('vsl').tap(
      function() {
        t.vars[name][t.vars.sk] = t.vars.vsl;
        delete t.vars['sk'];
        delete t.vars['vsl'];
        _rmap_inner(t, name, --n);
      });
  }
};

module.exports = Parser;
