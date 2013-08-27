/**
 * Casson is a Object Data Model with asynchronous CQL binary protocol
 * library to interact with Cassandra.
 *
 * {{#crossLink "Pool"}}{{/crossLink}}, {{#crossLink "Table"}}{{/crossLink}} and
 * {{#crossLink "Select"}}{{/crossLink}}, {{#crossLink "Insert"}}{{/crossLink}},
 * and {{#crossLink "Update"}}{{/crossLink}} are the core set of classes
 * for `Casson`.
 *
 * @module casson
 * @class casson
 * @main
 */

var casson = {};

/**
 * @static
 * @attribute Pool
 * @type Object
 */
casson.Pool = require('./pool');
/**
 * Short alias for Pool
 * @static
 * @attribute P
 * @type Object
 */
casson.P = casson.Pool;

/**
 * @static
 * @attribute Table
 * @type Object
 */
casson.Table = require('./table');
/**
 * Short alias for Table
 * @static
 * @attribute T
 * @type Object
 */
casson.T = casson.Table;

/**
 * @static
 * @attribute Query
 * @type Object
 */
casson.Query = require('./query');
/**
 * Short alias for Query
 * @static
 * @attribute Q
 * @type Object
 */
casson.Q = casson.Query;

/**
 * @static
 * @attribute KeySpace
 * @type Object
 */
casson.KeySpace = require('./keyspace');

/**
 * @static
 * @attribute Uuid
 * @type Object
 */
casson.Uuid = require('./uuid');

module.exports = casson;