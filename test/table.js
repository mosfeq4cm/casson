var assert = require('assert')
  , Table = require('../lib/table');

describe('Table: ', function() {
  describe('Construct simplest', function() {
    var t = Table.construct('TestTable',
                            {a : 3, b : 'str',
                             c : '62c36092-82a1-3a00-93d1-46196ee77204',
                             d : 1.2, _PRIMARY_KEYS : ['c', 'a']});
    it('columns values', function() {
      var p = (t.a === 3) && (t.d === 1.2) && (t.b === 'str') &&
        (t.c === '62c36092-82a1-3a00-93d1-46196ee77204');
      assert.equal(p, true);
    })
    it('primary keys', function() {
      var p = (t._primary_keys[0] === 'c') && (t._primary_keys[1] === 'a');
      assert.equal(p, true);
    })
    it('column types', function() {
      var p = (t._column_types.a === 'int') &&
        (t._column_types.b === 'text') &&
        (t._column_types.c === 'timeuuid') &&
        (t._column_types.d === 'float');
      assert.equal(p, true);
    })
  })
  describe('Construct simpler', function() {
    var t = Table.construct('TestTable');
    t.a = 3;
    t.b = 'str';
    t.d = 1.2;
    t.c = '62c36092-82a1-3a00-93d1-46196ee77204';
    t.setPrimaryKeys(['c', 'a']);
    it('columns values', function() {
      var p = (t.a === 3) && (t.d === 1.2) && (t.b === 'str') &&
        (t.c === '62c36092-82a1-3a00-93d1-46196ee77204');
      assert.equal(p, true);
    })
    it('change column type', function() {
      t.setColumnType('c', 'uuid');
      assert.equal(t._column_types.c, 'uuid');
    })
  })
  describe('Create simple', function() {
    var t = Table.construct('TestTable',
                            {a : 3, b : 'str', _PRIMARY_KEYS : ['a']});
    it('default int type', function() {
      assert.equal(t._column_types['a'], 'int');
    });
    it('default text type', function() {
      assert.equal(t._column_types['b'], 'text');
    });
    it('simple primary key', function() {
      assert.equal(t._primary_keys[0], 'a');
    });
    it('query statement ', function() {
      assert.equal(t.dbCreate(), 'CREATE TABLE testtable(\n\ta int,\n\tb text,\n\tPRIMARY KEY (a)\n)');
    });
  });
  describe('Create complex', function() {
    var t2 = Table.construct('TestTable2',
                             {'a' : 1, 'bool' : true, 'cdouble' : 2.5,
                              'ddecimal' : 3.15, ets : 1376689600368,
                              gcount : 1, hvarchar : 'some text',
                              iuid : 'c5abea64-881d-4381-bc51-0d5ac881bd08',
                              jip : '192.168.8.101:9042',
                              '_PRIMARY_KEYS' : ['a', 'fbint']})
    var t = Table.construct('TestTable',
                            {a : 3, b : 'str', _PRIMARY_KEYS : ['a']});
    it('default boolean type', function() {
      assert.equal(t2._column_types['bool'], 'boolean');
    });
    it('default float type', function() {
      assert.equal(t2._column_types['cdouble'], 'float');
    });
    it('default bigint type', function() {
      assert.equal(t2._column_types['ets'], 'bigint');
    });
    it('default timeuuid type', function() {
      assert.equal(t2._column_types['iuid'], 'timeuuid');
    });
    it('query statement ', function() {
      assert.equal(t2.dbCreate(), 'CREATE TABLE testtable2(\n\ta int,\n\tbool boolean,\n\tcdouble float,\n\tddecimal float,\n\tets bigint,\n\tgcount int,\n\thvarchar text,\n\tiuid timeuuid,\n\tjip text,\n\tPRIMARY KEY (a,fbint)\n)');
    })
  });
  describe('Create more complex', function() {
    var t2 = Table.construct('TestTable2',
                             {'a' : 1, 'bool' : true, 'cdouble' : 2.5,
                              'ddecimal' : 3.15, ets : 1376689600368,
                              gcount : 1, hvarchar : 'some text',
                              iuid : 'c5abea64-881d-4381-bc51-0d5ac881bd08',
                              jip : '192.168.8.101:9042',
                              '_PRIMARY_KEYS' : ['a', 'fbint']})
    t2.setColumnTypes({'cdouble' : 'double', 'ddecimal' : 'decimal',
                       'ets' : 'timestamp', 'hvarchar' : 'varchar',
                       'iuid' : 'uuid', 'jip' : 'inet'});
    t2.setColumnTypes({'gcount' : 'counter'});
    it('changing float to double type', function() {
      assert.equal(t2._column_types['cdouble'], 'double');
    });
    it('changing float to decimal type', function() {
      assert.equal(t2._column_types['ddecimal'], 'decimal');
    });
    it('changing bigint to timestamp type', function() {
      assert.equal(t2._column_types['ets'], 'timestamp');
    });
    it('changing text to varchar type', function() {
      assert.equal(t2._column_types['hvarchar'], 'varchar');
    });
    it('changing string to inet type', function() {
      assert.equal(t2._column_types['jip'], 'inet');
    });
    it('changing timeuuid to uuid type', function() {
      assert.equal(t2._column_types['iuid'], 'uuid');
    });
  });
  describe('Create collection 1', function() {
    var t3 = Table.construct('TestTable3',
                             {'a' : 1, 'blist' : [], 'cmap' : {},
                              '_PRIMARY_KEYS' : ['a']})
    it('default list type', function() {
      assert.equal(t3._column_types['blist'][0], 'list');
      assert.equal(t3._column_types['blist'][1], 'text');
    });
    it('default map type', function() {
      assert.equal(t3._column_types['cmap'][0], 'map');
      assert.equal(t3._column_types['cmap'][1], 'text');
      assert.equal(t3._column_types['cmap'][2], 'text');
    });
    it('query statement ', function() {
      assert.equal(t3.dbCreate(), 'CREATE TABLE testtable3(\n\ta int,\n\tblist list<text>,\n\tcmap map<text,text>,\n\tPRIMARY KEY (a)\n)');
    })
  });
  describe('Create collection 2', function() {
    var t4 = Table.construct('TestTable4',
                             {'a' : 1, 'blist' : [1], 'cmap' : {
                               'c5abea64-881d-4381-bc51-0d5ac881bd08' : 2.5},
                              '_PRIMARY_KEYS' : ['a']})
    it('list type with values', function() {
      assert.equal(t4._column_types['blist'][0], 'list');
      assert.equal(t4._column_types['blist'][1], 'int');
    });
    it('map type with values', function() {
      assert.equal(t4._column_types['cmap'][0], 'map');
      assert.equal(t4._column_types['cmap'][1], 'timeuuid');
      assert.equal(t4._column_types['cmap'][2], 'float');
    });
    it('query statement ', function() {
      assert.equal(t4.dbCreate(), 'CREATE TABLE testtable4(\n\ta int,\n\tblist list<int>,\n\tcmap map<timeuuid,float>,\n\tPRIMARY KEY (a)\n)');
    })
  });
  describe('Options', function() {
    it('a basic option', function() {
      var t3 = Table.construct('TestTable3', {'a' : 1, 'b' : 2.5,
                                              _PRIMARY_KEYS : ['a']});
      t3.setOptions({'tombstone_threshold' : 0.3});
      assert.equal(t3.dbCreate(), 'CREATE TABLE testtable3(\n\ta int,\n\tb float,\n\tPRIMARY KEY (a)\n)\tWITH\ntombstone_threshold = 0.3');
    });
    it('two options', function() {
      var t3 = Table.construct('TestTable3', {'a' : 1, 'b' : 2.5,
                                              _PRIMARY_KEYS : ['a']});
      t3.setOptions({'compact storage' : '', 'compression' :
                     "{ 'sstable_compression' : 'DeflateCompressor', 'chunk_length_kb' : 64 }"});
    assert.equal(t3.dbCreate(), 'CREATE TABLE testtable3(\n\ta int,\n\tb float,\n\tPRIMARY KEY (a)\n)\tWITH\ncompact storage  AND\ncompression = { \'sstable_compression\' : \'DeflateCompressor\', \'chunk_length_kb\' : 64 }');
    });
    it('cluster order by', function() {
      var t3 = Table.construct('TestTable3', {'a' : 1, 'b' : 2.5,
                                              _PRIMARY_KEYS : ['a']});
      t3.setOptions({'cluserting order by' : "b ASC"});
      assert.equal(t3.dbCreate(), 'CREATE TABLE testtable3(\n\ta int,\n\tb float,\n\tPRIMARY KEY (a)\n)\tWITH\ncluserting order by (b ASC)');
    });
  });
});

