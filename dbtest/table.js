var assert = require('assert'),
    util = require('util'),
    Table = require('../lib/table'),
    Q = require('../lib/query'),
    Pool = require('../lib/pool');

describe('Table ', function() {
  var pool = new Pool({hosts    : ['localhost:9042'],
                       keyspace : 'casson_test',
                       username : 'u_tester',
                       password : 'pw_test' });
  var t1 = new Table.construct(
    'T1', { 'a' : 3, 'b' : 'a string', 'd' : '2 string',
            '_PRIMARY_KEYS' : [ 'a', 'b' ] });
  var t2 = new Table.construct(
    'T2', { 'a' : 1, 'b' : [ 1 ], 'c' : { 'a': 'str'},
            '_PRIMARY_KEYS' : [ 'a' ]});
  var t3 = Table.construct('T3',
                           {'a' : 1, 'bool' : true, 'cdouble' : 2.5,
                            'ddecimal' : 3.15, ets : 1376689600368,
                            fbint : 137668960036800, ngcount : 1,
                            hvarchar : 'some text',
                            iuid : 'c5abea64-881d-4381-bc51-0d5ac881bd08',
                            jip : '192.168.8.101',
                            '_PRIMARY_KEYS' : ['a']})
  t3.setColumnTypes({'cdouble' : 'double', 'ddecimal' : 'decimal',
                     'ets' : 'timestamp', 'hvarchar' : 'varchar',
                     'fbint' : 'varint', 'iuid' : 'uuid', 'jip' : 'inet'});
  t1.c = 3.1415926;
  setTimeout(function() {pool.sendQuery(t2, function(err, result) {});},
             1000);
  setTimeout(function() {pool.sendQuery(t3, function(err, result) {});},
             1000);

  describe('Table', function() {
    it('create', function(done) {
      setTimeout(function() {
        pool.sendQuery(t1, function(err, result) {
          if (result['changed_schema']) {
            assert.equal(result['changed_schema'][0], 'CREATED');
            assert.equal(result['changed_schema'][2], 't1');
          }
          done(err);
        });
      }, 1000);
    });
    it('re-create failure', function(done) {
      setTimeout(function() {
        pool.sendQuery(t1, function(err, result) {
          if (err) {
            assert.equal(err[0], 9216);
            assert.equal(err[2]['table'], 't1');
            done();
          }
        });
      }, 1000);
    });
    describe('inserts', function(done) {
      var i1 = new Q.Insert(t1, { 'a' : 1, 'b' : 'foo' });
      var i2 = new Q.Insert('T1', { 'a' : 2, 'b' : 'bar', 'c' : 3.1 });
      var i3 = new Q.Insert(t2, { 'a' : 3, 'b' : [ 2, 3, 4, 5 ],
                                  'c' : { 'p' : 'some', 'q' : 'string' }});
      var i4 = new Q.Insert('T2', { 'a' : 4, 'b' : [ 2222, 44444 ],
                                    'c' : { 'p' : 'another', 'q' : 'one' }});
      var i5 = new Q.Insert(t3, {'a' : 1, 'bool' : true, 'cdouble' : 2.5,
                                 'ddecimal' : 3.15, ets : 1376689600368,
                                 fbint : 137668960036800,
                                 hvarchar : 'some text',
                                 iuid : 'c5abea64-881d-4381-bc51-0d5ac881bd08',
                                 jip : '192.168.8.101'});
      var ic = 0;
      var icplus = function(err, result) {if (!err) {ic++;}};
      setTimeout(function() {
          pool.sendQuery(i1, icplus);
          pool.sendQuery(i2, icplus);
          pool.sendQuery(i3, icplus);
          pool.sendQuery(i4, icplus);
          pool.sendQuery(i5, icplus);
        }, 2500);

      it('inserts', function(done) {
        setTimeout(function() {if (ic === 5) {done();}}, 2800);
      });
    });
    describe('updates', function() {
      var u1 = new Q.Update(t1, {'d' : 'foo2'}).where({'a' : 1, 'b' : 'foo'});
      var u2 = new Q.Update(t2, {'b' : {'list+' : [6]}}).where({'a' : 3});
      var ic = 0;
      var icplus = function(err, result) {if (!err) {ic++;}};
      setTimeout(function() {
        pool.sendQuery(u1, icplus);
        pool.sendQuery(u2, icplus);
      }, 2600);
      it('updates', function(done) {
        setTimeout(function() {if (ic === 2) {done();}}, 3000);
      });
    });
    describe('selects', function() {
      var s1 = new Q.Select(t1).where({'a' : 1});
      var s2 = new Q.Select(t2, ['a', 'c']).where({'a' : 4});
      var s3 = new Q.Select(t3);
      var r1, r2, r3;
      setTimeout(function() {
          pool.sendQuery(s1, function(err, result) {
            if (!err) {r1 = result[0]; }});
          pool.sendQuery(s2, function(err, result) {
            if (!err) {r2 = result; } }, null, true);
          pool.sendQuery(s3, function(err, result) {
            if (!err) {r3 = result; } }, null, true);
        }, 3000);
      it('one', function(done) {
        setTimeout(function() {if (r1.a === 1 && r1.d === 'foo2') {
          done();}}, 3400);
      });
      it('two', function(done) {
        setTimeout(function() {if (r2['rows'][0][0] === 4 &&
                                   r2['rows'][0][1].q === 'one') {
          done();}}, 3400);
      });
      it('three', function(done) {
        setTimeout(function() {if (r3['rows'][0]) {
          done();}}, 4500);
      });
    });
    describe('Drops', function() {
      it('drop', function(done) {
        setTimeout(function() {
          pool.sendQuery(t1.dbDrop(), function(err, result) {
            if (result['changed_schema']) {
              assert.equal(result['changed_schema'][0], 'DROPPED');
              assert.equal(result['changed_schema'][2], 't1');
            }
            pool.sendQuery(t2.dbDrop(), function(err, result) {});
            pool.sendQuery(t3.dbDrop(), function(err, result) {});
            done(err);
          });
        }, 500);
      });
      it('re-drop failure', function(done) {
        setTimeout(function() {
          pool.sendQuery(t1.dbDrop(), function(err, result) {
            if (err) {
              assert.equal(err[0], 8960);
              assert.equal(err[1].match('t1')[0], 't1');
              done();
            }
          });
        }, 500);
      });
    });
  });
})
