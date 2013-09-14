var fs = require('fs'),
    Table = require('./table');

/**
 * Keyspace, like Cassandra keyspace, maintains a list of tables.
 * It can be stored as a JSON files
 * and loaded from it, and the application can thus maintain a simple
 * mirror Cassandra tables in javascript.
 *
 * @class KeySpace
 * @constructor
 * @param {String} name of the keyspace
 * @param {key/value} options for the keyspace options (see Cassandra documentation) and also the 'directory' to store JSON file (default = './').
 *
 */
function KeySpace(name, options) {

  this.name = name;
  this.saved = false;
  this.active = false;
  this.tables = [];
  this.options = options || {};
  this.directory = this.options['directory'] || './';

  /**
   * Create keyspace query;
   * @method dbCreate
   * @return {String} query
   */
  this.dbCreate = function() {
    var cstr = 'CREATE KEYSPACE ' + name;
    var iopt = 0;
    for (var k in options) {
      if (k === 'REPLICATION' || k === 'DURABLE_WRITES') {
          cstr += (iopt) ? ' AND' : ' WITH';
          cstr += ' ' + k + ' = ' + options[k];
          iopt++;
      }
    }
    return cstr;
  };

  /**
   * Use keyspace query;
   * @method dbUse
   * @return {String} query
   */
  this.dbUse = function() {
    return 'USE ' + this.name;
  };

  /**
   * Add a table to the Keyspace;
   * @method addTable
   * @param {Table} table to add
   */
  this.addTable = function(table) {
    if (this.tables.indexOf(table) === -1) {
      this.tables.push(table);
    }
  };

  /**
   * Keyspace is set to active or not
   * @method activate
   * @param {boolean} disactivate flag
   */
  this.activate = function(disactivate) {
    this.active = (disactivate) ? false : true;
  };

  /**
   * Store JSON in keyspace-name.json file.
   * @method storeJson
   * @async
   */
  this.storeJson = function() {

    fs.writeFile(this.directory + this.name + '.json', JSON.stringify(this),
                 function(err) {
                   if (!err) {
                     this.saved = true;
                   }
                 });
  };

}

/**
 * Load keyspace from keyspace-name.json file.
 * @method loadJson
 * @static
 * @param {String} name of the keyspace
 * @param {String} dir the direcotry (default = './'
 * @return {KeySpace}
 */
KeySpace.loadJson = function(name, dir) {

  var data = fs.readFileSync((dir || './') + name + '.json')
  return JSON.parse(data);
};

module.exports = KeySpace;
