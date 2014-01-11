
/**
 * Create CQL Batch 
 * @class Batch
 * @constructor
 */
var Batch = function() {
    this.usingStr = '';
    this.unloggedStr = '';
    this.counterStr = '';
    this.statementsStr = '';

    /**
    * Adds a statement to this batch
    * @chainable
    * @method unlogged
    */
    this.addStatement = function(statement) {
        if (typeof(statement) === 'string') {
              this.statementsStr += statement;
        } 
        else if (Object.keys(statement).indexOf('query') >= 0) {
              this.statementsStr += statement.query() + ';';
          }

        return this;
    };

	/**
	* Add using clause
	* @chainable
	* @method using
	* @param {value} timestamp
	*/
	this.using = function(timestamp) {
		if (String(timestamp).match(/^\d+$/)) {
            this.usingStr = 'USING TIMESTAMP ' + timestamp;
		}
		return this;
	};    

    /**
    * Makes unlogged batch
    * @chainable
    * @method unlogged
    */
    this.unlogged = function() {
        this.unloggedStr = ' UNLOGGED';
        return this;
    };

    /**
    * Makes counter update batch
    * @chainable
    * @method counter
    */
    this.counter = function() {
        this.counterStr = ' COUNTER';
        return this;
    };

    /**
    * Complete statement
    * @method query
    * @return {String} the query
    */
    this.query = function() {
        var retVal = 'BEGIN BATCH' + this.unloggedStr + this.counterStr + this.usingStr + this.statementsStr + ' APPLY BATCH;';
        return retVal;
    };
};

module.exports = Batch;
 