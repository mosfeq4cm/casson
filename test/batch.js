var assert = require('assert'),
    Query = require('../lib/query');

describe('Batch tests: ', function() {

    it('empty', function() {
		var b = new Query.Batch();
		assert.equal(b.query(), 'BEGIN BATCH\nAPPLY BATCH;');
    });

    it('using', function() {
		var b = new Query.Batch().using('123456');
		assert.equal(b.query(), 'BEGIN BATCH USING TIMESTAMP 123456\nAPPLY BATCH;');
    });

    it('counter', function() {
		var b = new Query.Batch().counter();
		assert.equal(b.query(), 'BEGIN COUNTER BATCH\nAPPLY BATCH;');
    });

    it('unlogged', function() {
		var b = new Query.Batch().unlogged();
		assert.equal(b.query(), 'BEGIN UNLOGGED BATCH\nAPPLY BATCH;');
    });

    it('one statement', function() {
		var b = new Query.Batch();
		var upd = new Query.Update('atable', {a : 1}).where({c : '20'});
		b.addStatement(upd);
		assert.equal(b.query(), 'BEGIN BATCH\nUPDATE atable SET a = 1 WHERE c = \'20\';\nAPPLY BATCH;');
    });

    it('several statements', function() {
		var b = new Query.Batch();
		var del1 = new Query.Delete('t1', ['b']).where({c : '20'});
		var upd = new Query.Update('atable', {a : 1}).where({c : '20'});
		var del2 = new Query.Delete('t2', ['b']).where({c : '20'});
		b.addStatement(del1).addStatement(upd).addStatement(del2);

		assert.equal(b.query(), "BEGIN BATCH\n"+
				"DELETE b FROM t1 WHERE c = '20';\n" +
				"UPDATE atable SET a = 1 WHERE c = '20';\n"+
				"DELETE b FROM t2 WHERE c = '20';\n"+
				"APPLY BATCH;");
    });

    it('everything', function() {
		var b = new Query.Batch();
		b.unlogged().counter().using('23456789');
		b.addStatement(new Query.Delete('t1', ['b']).where({c : '20'}));

		assert.equal(b.query(), 'BEGIN UNLOGGED COUNTER BATCH USING TIMESTAMP 23456789\nDELETE b FROM t1 WHERE c = \'20\';\nAPPLY BATCH;');
    });
}); 