var assert = require('assert')
  , Table = require('../lib/table')
  , KeySpace = require('../lib/keyspace');

describe('KeySpace: ', function() {
  describe('Create', function() {
    var ks = new KeySpace('ktest', {'directory' : '/tmp/'});
    var t2 = Table.construct('TestTable2',
                             {'a' : 1, 'bool' : true, 'cdouble' : 2.5,
                              'ddecimal' : 3.15, ets : 1376689600368,
                              fbint : 137668960036800, ngcount : 1,
                              hvarchar : 'some text',
                              iuid : 'c5abea64-881d-4381-bc51-0d5ac881bd08',
                              jip : '192.168.8.101',
                              '_PRIMARY_KEYS' : ['a']})
    var t3 = Table.construct('TestTable3',
                             {'a' : 1, 'blist' : [], 'cmap' : {},
                              '_PRIMARY_KEYS' : ['a']})
    it('name and dir', function() {
      assert.equal(ks.dbUse(), 'USE ktest');
      assert.equal(ks.directory, '/tmp/');
    });
    it('Add tables', function() {
      ks.addTable(t2);
      ks.addTable(t3);
      assert.equal(ks.tables[0]._table_name, 'TestTable2');
      assert.equal(ks.tables[1]._table_name, 'TestTable3');
    });
    it('Load/store Keyspace', function(done) {
      ks.storeJson();
      setTimeout(function() {
        var ks_loaded = KeySpace.loadJson('ktest', '/tmp/');
        assert.equal(ks.name, ks_loaded.name);
        done();
      }, 500);
    });
  });
})

