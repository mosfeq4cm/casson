var vm = require('vm'),
    util = require('util');

/**
 * Table is essentially the main entry point of `Casson` Object Mapping.
 *
 * @class Table
 * @constructor
 * They simplest way to do this is:
 * @example
 *      Table.contruct('mytable', {'a' : 5, 'b' : 'str', '_PRIMARY_KEYS' : ['a']});
 *
 * A table called 'mytable' will be created in Cassandra with two
 * columns named a and b of types integer and text, where a is the
 * primary key. The types are derived from values of the
 * variables. The default derived types are text, int, bigint, float, boolean, timeuuid, or otherwise blob. The collection types list, set, and map, for example, are given like `['set', 'int']`, `['list', 'text']` or `['map', 'text', 'float']`.
 *
 * You can use mytable like any regular javascirpt Object, but with the full
 * power of Cassandra behind it.
 *
  This simple case might enough for many situations. Of course, to do much more
  please keep reading.  A more multi-step approach would be:
 * @example
 *      t = Table.contruct('mytable', {'_PRIMARY_KEYS' : [ 'a' ]);
 *      t.a = 1;
 *      t.b = 3;
 *      t.setColumnType({'b' : 'float'});
 *
 * <a href='#method_getBasicType'>getBasicType</a> and <a href='#method_setColumnTypes'>setColumnTypes</a> have more information.
 *
 * The versatility of the Table will becomes more obvious when you
 * look at {{#crossLink "Select"}}{{/crossLink}}, {{#crossLink "Insert"}}{{/crossLink}}, and {{#crossLink "Update"}}{{/crossLink}}.
 *
 * @param {key/value} init_columns initializes the columns
 * @constructor
 */
function Table(init_columns) {

  /**
   * @attribute CQL_STORAGE_PARAMTERS
   * @readonly
   */
  var CQL_STORAGE_PARAMTERS = {
    'compact storage' : false      // directive
  , 'cluserting order by' : {}    // directive
  , 'bloom_filter_fp_chance' : true //0.01 or 0.1 (Value depends on the compaction strategy.)
  , 'bucket_high' : true            // 1.5
  , 'bucket_low' : true             // 0.5
  , 'caching' : true                // keys_only
  , 'column_metadata' : true        //	N/A (container attribute)
  , 'column_type' : true            //	Standard
  , 'comment' : ''                  //	N/A
  , 'compaction' : {}
  , 'compaction_strategy' : true    //	SizeTieredCompactionStrategy
  , 'compaction_strategy_options' : true // N/A (container attribute)
  , 'comparator' : ''                  // BytesType
  , 'compare_subcolumns_with' : ''     // BytesType*
  , 'compression' :  {}
  , 'compression_options' : true // sstable_compression='SnappyCompressor'
  , 'default_validation_class' : true        // N/A
  , 'dclocal_read_repair_chance' : true // 0.0
  , 'gc_grace' : true                   // 864000 (10 days)
  , 'gc_grace_seconds' : true
  , 'key_validation_class' : true // N/A
  , 'max_compaction_threshold' : true // 32
  , 'min_compaction_threshold' : true // 4
  , 'memtable_flush_after_mins' : true // N/A*
  , 'memtable_operations_in_millions' : true // N/A*
  , 'memtable_throughput_in_mb' :true // N/A*
  , 'min_sstable_size' : true // 50MB
  , 'name' : true // N/A
  , 'read_repair_chance' : true // 0.1or 1 (See description below.)
  , 'replicate_on_write' : true // true
  , 'sstable_size_in_mb' : true // 5MB
  , 'tombstone_compaction_interval' : true // 1 day
  , 'tombstone_threshold' : true           // 0.2
  };
  Object.freeze(CQL_STORAGE_PARAMTERS);

  /**
   * @attribute AVAILABLE_COLUMN_TYPES
   * @type Array
   * @readonly
   */
  var AVAILABLE_COLUMN_TYPES = [
      'ascii', 'bigint', 'blob', 'boolean', 'counter', 'decimal', 'double',
    'float', 'inet', 'int', 'list', 'map', 'set', 'text', 'timestamp',
    'timeuuid', 'uuid', 'varchar', 'varint'
  ];
  Object.freeze(AVAILABLE_COLUMN_TYPES);

  /**
   * @attribute AVAILABLE_PK_TYPES
   * @type Array
   * @readonly
   */
  var AVAILABLE_PK_TYPES = [
    'ascii', 'bigint', 'blob', 'decimal', 'double', 'float', 'inet', 'int',
    'text', 'timestamp', 'timeuuid', 'uuid', 'varchar', 'varint'
  ];
  Object.freeze(AVAILABLE_PK_TYPES);

  this._column_types = {};
  this._primary_keys = [];
  this._created = false;

  var ct = {};
  for (var k in init_columns) {
    if (k == '_PRIMARY_KEYS') {
      this._primary_keys = init_columns[k];
    } else if (k == '_COLUMN_TYPES') {
      ct = init_columns[k];
    } else {
      this[k] = init_columns[k];
    }
  }

  /**
   * Get mapped column names
   * @private
   * @method getColumns
   * @return {Array}
   */
  this.getColumns = function() {

    var k = Object.keys(this).filter(function(x) { return(x[0] != '_'); });
    var kp, nk = [];
    while (k.length) {
      kp = k.pop();
      if (typeof(this[kp]) != 'function') {nk.push(kp);}
    }
    return nk;
  };

  /**
   * Get primary key array
   * @private
   * @method getPrimaryKeys
   * @return {Array}
   */
  this.getPrimaryKeys = function() {

    if (this._primary_keys instanceof Array) {
      return (this._primary_keys[0] instanceof Array) ?
        this._primary_keys[0] : [this._primary_keys[0]];
    } else {
      return [];
    }
  };

  /**
   * Basic column types are picked based on typeof and few a other
   * basic patterns and values:
   *
   * - `string` : With suitable hex string representation  `timeuuid`
   * picked instead of `text` for strings.
   *
   * - `number` : Numbers are `int` or `bigint` depending on whether it can be represented by 32 bits or not, otherwise it is a `float`.
   *
   * - `boolean` : Boolean is obvious.
   *
   * - `[ ]` : it is a `list` and each element is `text`, unless a first element is a value of one of the other basic types.
   *
   * - `{ }` : `map` is selected for objects with a sample key,value determining types, otherwise 'text' is picked for both.
   *
   * Of course, these can be overridden easily by
   * <a href='#method_setColumnTypes'>setColumnTypes</a>
   * @method getBasicType
   * @param {String} col the column
   * @param {boolean} collection type also considered
   * @return {String} indicating the type
   */
  var getBasicType = function(col, collection) {

    if (typeof(col) === 'string') {
      if (String(col).match(/[0-9a-f]{8}\-([0-9a-f]{4}\-){3}[0-9a-f]{12}/)) {
        return 'timeuuid';
      } else {
        return 'text';
      }
    } else if (typeof(col) === 'number') {
      if (String(col).match(/^[0-9]+$/)) {
        return (col > 2147483647 || col < -2147483648) ?
          'bigint' : 'int';
      } else {
        return 'float';
      }
    } else if (typeof(col) === 'boolean') {
      return 'boolean';
    } else if (collection) {
      if (col instanceof Array) {
        return ['list', (col.length > 0) ? getBasicType(col[0]) : 'text']
      } else if (col instanceof Object) {
        var ks = Object.keys(col);
        if (ks.length > 0) {
          return ['map', getBasicType(ks[0]), getBasicType(col[ks[0]])];
        } else {
          return ['map', 'text', 'text'];
        }
      }
    }
    return 'blob';
  };

  /**
   * Set or derive individual col types
   * @chainable
   * @method setColumnType
   * @param {String} column name
   * @param {String|Array} column type; Array when collection type
   */
  this.setColumnType = function(col, col_type) {

    var colnames = this.getColumns();
    if (col_type !== undefined) {
      if (AVAILABLE_COLUMN_TYPES.indexOf(col_type) >= 0) {
        this._column_types[col] = col_type;
      }
    } else if (!this._column_types[col]) {
      this._column_types[col] = getBasicType(this[col], true);
    }
    return this;
  };

  /**
   * Set the column types.
   *
   * In addition to the basic types mentioned in <a href='#method_getBasicType'>getBasicType</a>,
   * collection types (List, Set and Map) are available and
   * given as an array like `[list, (simple_type)]` or `[map, (simple_type), (simple_type)]`. It appears that are meant for small tasks in Cassandra and cannot be
   * bigger 256 items.
   *
   * @chainable
   * @method setColumnTypes
   * @param {key/value} column_types Property list with column name as the key
   * @return {Table}
   */
  this.setColumnTypes = function (column_types) {

    column_types = column_types || {};
    var k = this.getColumns();
    for (var i in k) {
      this.setColumnType(k[i], column_types[k[i]]);
    }
    return this;
  };

  this.setColumnTypes(ct);

  /**
   * Sets the primary keys. As per Cassandra requirement, it can be of
   * the following forms:
   *
   *   - `['p']`
   *
   *   - `['p', 'b', 'c']`, where 'b' and 'c' are clustering key
   *
   *   - `[['p', 'q'], 'b']`, where 'p' and 'q' together is a compoiste key and 'b' is a clustering key.
   *
   * Same convention is used to specify `_PRIMARY_KEYS` property during
   * intialization.
   *
   * @chainable
   * @method setPrimaryKeys
   * @param {Array} keys is an array of keys
   * @return {Table}
   */
  this.setPrimaryKeys = function(keys) {
    this._primary_keys = keys;
    return this;
  };

  /**
   * Set table options (see Cassandra documentation)
   * @chainable
   * @method setOptions
   * @param {key/value} option name, value pairs
   * @return {Table}
   */
  this.setOptions = function (options) {

    var sk;
    var ok = Object.keys(CQL_STORAGE_PARAMTERS);
    for (k in options) {
      if (ok.indexOf(k) >= 0) {
        this['_with_' + k.replace(/ /g, '-')] = options[k];
      }
    }
    return this;
  };

  /**
   * Append WITH properties to the create statement
   * @method appendWiths
   * @private
   */
  this.appendWiths = function() {

    var s = '';
    var wk = Object.keys(this).filter(
      function(v) { return v.match(/^_with_/); });
    if (wk.length > 1) {
      s = '\tWITH\n';
    }
    for (var i in wk) {
      s += wk[i].replace('_with_', '').replace(/\-/g, ' ');
      if (CQL_STORAGE_PARAMTERS[k]) {
        if (k === 'cluserting order by') {
          s += '(' + wk[i] + ')';
        } else {
          s += ' = ' + this[wk[i]];
        }
      }
      if (i < (wk.length - 1)) {
        s += ' AND\n';
      }
    }
    return s;
  };

  /**
   * Append primary keys to the create statement
   * @method appendPrimaryKeys
   * @private
   */
  this.appendPrimaryKeys = function() {

    var s = '\tPRIMARY KEY (';
    if (this._primary_keys[0] instanceof Array) {
      s += '(' + this._primary_keys[0].join(',') + ')';
      s += ',' + this._primary_keys.slice(1).join(',');
    } else {
      s += this._primary_keys.join(',');
    }
    return s + ')';
  };


  /**
   * Craate query statement
   * @method dbCreate
   * @return {String|Error} query
   */
  this.dbCreate = function() {

    var cstr;
    var k = this.getColumns();

    this.setColumnTypes();
    if (k.length >= 1 && this._primary_keys.length >= 1) {
      cstr = 'CREATE TABLE ' + this._table_name.toLowerCase() + '(\n';
      var kp, ty;
      while (k.length) {
        kp = k.pop();
        ty = this._column_types[kp];
        if (ty instanceof Array) {
          ty = ty[0] + '<' + ty.slice(1) + '>';
        }
        cstr += '\t' + kp + ' ' + ty + ',\n';
      }
      cstr += this.appendPrimaryKeys() + '\n)';
      cstr += this.appendWiths();
      return cstr;
    } else {
      if (k.length == 0) {
        return new Error('Object ' + this._table_name + ' has no variables');;
      }
      if (this._primary_keys.length == 0) {
        return new Error('Object ' + this._table_name +
                         ' doesn\'t have prmary key');
      }
    }
  };

  /**
   * Drop query
   * @method dbDrop
   * @return {String} query
   */
  this.dbDrop = function() {

    return 'DROP TABLE ' + this._table_name.toLowerCase();
  };

  /**
   * Craate index on a column
   * @method dbCreateIndex
   * @param {String} column_name
   * @param {String} index_name
   * @return {String} query
   */
  this.dbCreateIndex = function(column_name, index_name) {

    index_name = index_name || '';
    return cstr = 'CREATE INDEX ' + index_name + ' ON ' + this._table_name +
      '(' + column_name + ')';
  };

  /*
   * Get a table name generated from classname.  If is just a modified
   * 'Table' or 'Object', return a name with appended random number
   *
   * @method getTableName
   * @return {String}
   */
  this.getTableName = function() {

    var tn = this.constructor.toString().split();
    var tt = tn[1].replace(/\(\)$/, '');
    if (tt === 'Table' || tt === 'Object') {
      tt += String(Math.floor(Math.random() * 1000000));
    }
    return tt;
  };

  this.instance = function() {
    var colnames = this.getColumns();
    var sa = []
    for (var i = 0; i < colnames.length; i++) {
      sa.push(colnames[i] + ' : ' + this[colnames[i]]);
    }
    return '{ ' + sa.join(', ') + ' }';
  }
}

/**
 * Construct a class using the supplied table name
 * @method construct
 * @static
 * @param {String} table_name
 * @param {key/value} init_columns column names and example values
 */
Table.construct = function(table_name, init_cols) {

  var sb = {
    'Table' : Table,
    'util'  : util,
    'cols'  : init_cols }
    , vs = '%s = function() {Table.call(this,cols)}; util.inherits(%s, Table); new %s()';

  var t = vm.runInNewContext(
    util.format(vs, table_name, table_name, table_name), sb);
  t._table_name = table_name;
  return t;
}

module.exports = Table;
