var assert = require('assert'),
    Batch = require('../lib/batch');

describe('Batch itself: ', function() {

    it('empty', function() {
		var b = new Batch();
		assert.equal(b.query(), 'BEGIN BATCH APPLY BATCH;');
    });

}); 