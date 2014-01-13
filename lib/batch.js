
/**
 * Create CQL Batch 
 * @class Batch
 * @constructor
 */
var Batch = function() {
    this.usingStr = '';
    this.unloggedStr = '';
    this.counterStr = '';
    this.statementsStr = '\n';

    /**
    * Adds a statement to this batch. The only valid statements are INSERT, DELETE and UPDATE,
    *  but this method doesn't perform any checks, and also accepts strings.
    * @chainable
    * @method unlogged
    */
    this.addStatement = function(statement) {
        if (typeof(statement) === 'string') {
              this.statementsStr += statement;
        } 
        else if (Object.keys(statement).indexOf('query') >= 0) {
              this.statementsStr += statement.query() + ';\n';
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
            this.usingStr = ' USING TIMESTAMP ' + timestamp;
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
        var retVal = 'BEGIN'+ this.unloggedStr + this.counterStr+' BATCH' + this.usingStr + this.statementsStr + 'APPLY BATCH;';
        return retVal;
    };
};

module.exports = Batch;
 