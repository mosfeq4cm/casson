var Table = require('./table'),
    util = require('util');

var Batch = require('./batch');

var VALID_OPS = ['>', '<', '<=', '>='];

/**
 * Turns a javascirpt array into Cassandra set
 * @class Set
 * @constructor
 * @param {Array} arr
 */
Set = function(arr) {

  this.str = null;
  if (arr instanceof Array) {
    var a = [];
    for (var i = 0; i < arr.length; i++) {
      a.push((typeof(arr[i]) === 'string') ?
             quoteString(arr[i]) : arr[i].toString());
    }
    this.str = '{' + a.toString() + '}';
  }

  /**
   * String represntation
   * @method toString
   */
  this.toString = function() {
    return this.str;
  }
}

/**
 * Turns a javascirpt array into Cassandra list
 * @class List
 * @constructor
 * @param {Array} arr
 */
List = function(arr) {

  this.str = null;
  if (arr instanceof Array) {
    var a = [];
    for (var i = 0; i < arr.length; i++) {
      a.push((typeof(arr[i]) === 'string') ?
             quoteString(arr[i]) : arr[i].toString());
    }
    this.str = '[' + a.toString() + ']';
  }

  /**
   * String represntation
   * @method toString
   */
  this.toString = function() {
    return this.str;
  }
}

/**
 * Turns a javascirpt object into Cassandra map
 * @class Map
 * @constructor
 * @param {Object} kv
 */
Map = function(kv) {

  this.str = null;
  if (kv instanceof Object) {
    var a = [], qk, qv;
    for (var k in kv) {
      qk = (typeof(k) === 'string') ? quoteString(k) : k.toString();
      qv = (typeof(kv[k]) === 'string') ?
        quoteString(kv[k]) : kv[k].toString();
      a.push(qk + ' : ' + qv);
    }
    this.str = '{' + a.toString() + '}';
  }

  /**
   * String represntation
   * @method toString
   */
  this.toString = function() {
    return this.str;
  }
}

/**
 * Create CQL Select statement
 * @class Select
 * @constructor
 * @param {String|Table} table_or_name a Table instance or a table name
 * @param {key/value} columns
 */
Select = function(table_or_name, columns) {

  this.wstr = '';
  this.ostr = '';
  this.lstr = '';
  this.astr = '';
  this.table =
    (typeof(table_or_name) === 'object' && table_or_name instanceof Table) ?
    table_or_name : null;

  this.qstr = 'SELECT ';
  if (columns) {
    if (columns.length && columns.length > 0) {
      this.qstr += columns.join(',');
    }
  } else {
    this.qstr += '*';
  }
  this.qstr += ' FROM ' + ((this.table !== null) ?
                           this.table._table_name : table_or_name);

  /**
   * Add where clause
   * @chainable
   * @method where
   * @param {key/value} wmap <column,value> map
   * @param {boolean} [where_and]  And with where
   * @example
   *       {'col1' : '5', 'col2' : 'p'}  // col1 = 5 and col2 = 'p'
   *       {'col1' : [3, 5]}             // col1 IN [3, 5]
   *       {'col1' : {'>=' : 5}}         // col1 >= 5
   *       {'col1' : {'>' : 5, '<' : 9}} // col1 > 5 and col1 < 9
   *
   */
  this.where = function(wmap, where_and) {
    var a = [];
    for (var k in wmap) {
      _inwhere(k, wmap[k], a)
    }
    if (a.length) {
      if (where_and) {
        this.wstr += ' AND ' + a.join(' AND ');
      } else {
        this.wstr =  ' WHERE ' + a.join(' AND ');
      }
    }
    return this;
  };

  /**
   * Add more things to where (see where)
   * @chainable
   * @method and
   * @param {key/value} wmap <column,value> map
   */
  this.and = function(wmap) {
    if (this.where) {
      this.where(wmap, true);
    } else {
      console.log('IGNORING ... and is only specified after where');
      return this;
    }
  };

  /**
   * Add order by columns
   * @chainable
   * @method orderby
   * @param {List} clist list of order by column names
   */
  this.orderby = function(clist) {
    var a = [];
    for (var k in clist) {
      if (clist[k].toUpperCase() === 'ASC' ||
          clist[k].toUpperCase() === 'DESC')
        a.push(' ' + k + ' ' + clist[k].toUpperCase());
    }
    if (a.length) {
      this.ostr = ' ORDER BY' + a.join(',');
    }
    return this;
  };

  /**
   * Add limit of rows
   * @chainable
   * @method limit
   * @param {integer} n number of rows
   */
  this.limit = function(n) {
    if (String(n).match(/^\d+$/)) {
      this.lstr = ' LIMIT ' + n;
    }
    return this;
  };

  /**
   * Allow filtering
   * @chainable
   * @method allowFiltering
   */
  this.allowFiltering = function(n) {
    this.astr = " ALLOW FILTERING";
    return this;
  };

  /**
   * Complete statement
   * @chainable
   * @method query
   * @return {String} the query
   */
  this.query = function() {
    return this.qstr + this.wstr + this.ostr + this.lstr + this.astr;
  };
}

/**
 * Create CQL Insert statement
 * @class Insert
 * @constructor
 * @param {String|Table} table_or_name a Table instance or a table name
 * @param {key/value} column_name_values
 */
Insert = function(table_or_name, column_name_values) {

  this.istr = '';
  this.istrp = '';
  this.ustr = ''
  this.table =
    (typeof(table_or_name) === 'object' && table_or_name instanceof Table) ?
    table_or_name : null;

  var cols = Object.keys(column_name_values)
  var vals = [], val;
  var qs = [];
  for (var k in column_name_values) {
    val = (typeof(column_name_values[k]) === 'string') ?
      quoteString(column_name_values[k]) : column_name_values[k];

    if (val instanceof Array) {
      val = new List(val);
    } else if (val instanceof Map || val instanceof List ||
               val instanceof Set) {
      ;
    } else if (val instanceof Object) {
      val = new Map(val);
    }
    vals.push(val);
    qs.push('?');
  }
  this.istr += 'INSERT INTO ';
  this.istr += (this.table !== null) ? this.table._table_name : table_or_name;

  this.istrp = this.istr + '(' + cols.toString() + ')  VALUES (' + qs + ')';
  this.istr += '(' + cols.toString() + ')  VALUES (' + vals + ')';

  /**
   * Add using statement
   * @chainable
   * @method using
   * @param {Array} options
   */
  this.using = function(options) {
    var a = [];
    for (var k in options) {
      if (['timestamp', 'ttl'].indexOf(k.toLowerCase()) >= 0) {
        a.push(k.toUpperCase() + ' ' + options[k]);
      }
    }
    if (a.length) {
      this.ustr = ' USING ' + a.join(' AND ');
    }
    return this;
  };

  /**
   * Query statement
   * @chainable
   * @method query
   * @return {String} the query
   */
  this.query = function(conn) {
    return this.istr + this.ustr;
  };

  /**
   * Prepared statement
   * @chainable prepared
   * @method
   * @return {String} the prepared
   */
  this.prepared = function(conn) {
    return this.istrp + this.ustr;
  };
}

/**
 * Create CQL Update statement
 * @class Update
 * @constructor
 * @param {String|Table} table_or_name a Table instance or a table name
 * @param {key/value} column_name_values
 */
Update = function(table_or_name, column_name_values) {

  var collectionOps = ['set+', 'set-', 'set=',
                       'list+', '+list', 'list-', 'list=',
                       'map+', 'map=', '.+', '+.', '.-', '='];
  this.pstr = '';
  this.wstr = '';
  this.sstr = '';
  this.ustr = '';
  this.table =
    (typeof(table_or_name) === 'object' && table_or_name instanceof Table) ?
    table_or_name : null;

  var cols = Object.keys(column_name_values)
  if (cols.length > 0) {
    // error: size mis
  }
  this.pstr += 'UPDATE ' + ((this.table !== null) ?
                            this.table._table_name : table_or_name);

  var a = [], ap = [], ct, val;
  for (var k in column_name_values) {
    if (column_name_values[k] instanceof Object) {
      var op = Object.keys(column_name_values[k]);
      if (op.length == 1) {
        val = column_name_values[k][op[0]];
        if(collectionOps.indexOf(op[0]) >= 0) {
          switch (op[0]) {
            case 'set+':
            a.push(k + ' = ' + k + ' + ' + new Set(val));
            ap.push(k + ' = ' + k + ' + ? ');
            break;
            case 'set-':
            a.push(k + ' = ' + k + ' - ' + new Set(val));
            ap.push(k + ' = ' + k + ' - ? ');
            break;
            case 'set=':
            a.push(k + ' = ' + new Set(val));
            ap.push(k + ' = ? ');
            break;
            case 'list+':
            a.push(k + ' = ' + k + ' + ' + new List(val));
            ap.push(k + ' = ' + k + ' + ? ');
            break;
            case 'list-':
            a.push(k + ' = ' + k + ' - ' + new List(val));
            ap.push(k + ' = ' + k + ' - ? ');
            break;
            case '+list':
            a.push(k + ' = ' + new List(val) + ' + ' + k + ' ');
            ap.push(k + ' = ? + ' + k + ' ');
            break;
            case 'list=':
            a.push(k + ' = ' + new List(val));
            ap.push(k + ' = ? ');
            break;
            case 'map+':
            a.push(k + ' = ' + k + ' + ' + new Map(val));
            ap.push(k + ' = ' + k + ' + ? ');
            break;
            case 'map=':
            a.push(k + ' = ' + new Map(val));
            ap.push(k + ' = ? ');
            break;
          }
        }
      }
    } else {
      val = (typeof(column_name_values[k]) === 'string') ?
        quoteString(column_name_values[k]) : column_name_values[k].toString();
      a.push(k + ' = ' + val);
      ap.push(k + ' = ?');
    }
  }
  if (a.length) {
    this.sstr = ' SET ' + a.join(', ');
    this.sstrp = ' SET ' + ap.join(', ');
  }

  /**
   * Add where statement
   * @chainable
   * @method where
   * @param {key/value} wmap the where relations
   * @param {boolean} restrict to primary key only
   */
  this.where = function(wmap, restrict) {
    var s = '', a = [], ap = [];
    if (this.table && restrict) {
      var pks = this.table.getPrimaryKeys();
      for (var c in wmap) {
        if (pks.indexOf(c) < 0) {
          return new Error('Not a primary key: ' + c);
        }
      }
    }
    for (var k in wmap) {
      _inwhere(k, wmap[k], a);
      _inwhere(k, '?', ap);
    }
    if (a.length) {
      this.wstr =  ' WHERE ' + a.join(' AND ');
      this.wstrp =  ' WHERE ' + ap.join(' AND ');
    }
    return this;
  };

  /**
   * Add using statement
   * @chainable
   * @method using
   * @param {Array} options
   */
  this.using = function(options) {
    var a = [];
    for (var k in options) {
      if (['timestamp', 'ttl'].indexOf(k.toLowerCase()) >= 0) {
        a.push(k.toUpperCase() + ' ' + options[k]);
      }
    }
    if (a.length) {
      this.ustr = ' USING ' + a.join(' AND ');
    }
    return this;
  };

  /**
   * Query statement
   * @method query
   * @return {String} the query
   */
  this.query = function() {
    return this.pstr + this.ustr + this.sstr + this.wstr;
  };

  /**
   * Prepared statement
   * @chainable prepared
   * @method
   * @return {String} the prepared
   */
  this.prepared = function(conn) {
    return this.pstr + this.ustr + this.sstrp + this.wstrp;
  };
};

/**
 * Create CQL Delete statement
 * @class Delete
 * @constructor
 * @param {String|Table} table_or_name a Table instance or a table name
 * @param {Array} column_names
 */
Delete = function(table_or_name, column_names) {
  this.dstr = '';
  this.wstr = '';
  this.ustr = '';
  this.table =
    (typeof(table_or_name) === 'object' && table_or_name instanceof Table) ?
    table_or_name : null;

  this.dstr = 'DELETE ' + column_names.toString();
  this.dstr += ' FROM ' + ((this.table !== null) ?
                           this.table._table_name : table_or_name);

  /**
   * Add where statement
   * @chainable
   * @method where
   * @param {key/value} wmap the where relations
   * @param {boolean} restrict to primary key only
   */
  this.where = function(wmap, restrict) {
    var s = '', a = [];
    if (this.table && restrict) { // only pks
      var pks = this.table.getPrimaryKeys();
      for (var c in wmap) {
        if (pks.indexOf(c) < 0) {
          return new Error('Not a primary key: ' + c);
        }
      }
    }
    for (var k in wmap) {
      _inwhere(k, wmap[k], a)
    }
    if (a.length) {
      this.wstr =  ' WHERE ' + a.join(' AND ');
    }
    return this;
  };

  /**
   * Add using statement
   * @chainable
   * @method using
   * @param {value} timestamp
   */
  this.using = function(timestamp) {
    if (String(timestamp).match(/^\d+$/)) {
      this.ustr = 'USING TIMESTAMP ' + timestamp;
    }
    return this;
  };

  /**
   * Complete statement
   * @method query
   * @return {String} the query
   */
  this.query = function() {
    return this.dstr + this.ustr + this.wstr;
  };
};

var _inwhere = function(key, item, arr) {
  var val;
  if (item instanceof Array) {
    var aa = [];
    for (var i = 0; i < item.length; i++) {
      val = (typeof(item[i]) === 'string') ? quoteString(item[i]) : item[i];
      aa.push(val)
    }
    arr.push(key + ' IN [' + aa.join(',') + ']');
  } else if (item instanceof Object) {
    var a = [];
    for (var k in item) {
      if (VALID_OPS.indexOf(k) >= 0) {
        a.push(key + ' ' + k + ' ' + item[k]);
      }
    }
    if (a.length) {
      arr.push(a.join(' AND '));
    }
  } else {
    if (item === '?') {
      arr.push(key + ' = ?');
    } else {
      val = (typeof(item) === 'string') ? quoteString(item) : item;
      arr.push(key + ' = ' + val);
    }
  }
};

var _execute = function(query, conn, callback) {

  conn.sendQuery(query, callback);
};

// TODO: escaping strings!!!
// Avoid quoting UUIDs
// Enough?
var quoteString = function(str) {
  if (str.match (/[0-9a-f]{8}\-([0-9a-f]{4}\-){3}[0-9a-f]{12}/)) {
    return str;                  // don't quote uuids
  } else {
    return '\'' + str + '\'';
  }
};

exports.Select = Select;
exports.Insert = Insert;
exports.Update = Update;
exports.Delete = Delete;
exports.Batch = Batch;
exports.Set = Set;
exports.List = List;
exports.Map = Map;
