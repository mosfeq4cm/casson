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
  describe('Table', function() {

    before(function(done) {
      var cc = 0;
      var ccf = function(err, result) {
        if (++cc === 2) {done();}
      }
      setTimeout(function() {
        pool.sendQuery(t2, ccf);
        pool.sendQuery(t3, ccf);
      }, 1000);
    });
    it('create', function(done) {
      pool.sendQuery(t1, function(err, result) {
        if (result['changed_schema']) {
          assert.equal(result['changed_schema'][0], 'CREATED');
          assert.equal(result['changed_schema'][2], 't1');
        }
        done(err);
      });
    });
    it('re-create failure', function(done) {
      pool.sendQuery(t1, function(err, result) {
        if (err) {
          assert.equal(err[0], 9216);
          assert.equal(err[2]['table'], 't1');
          done();
        }
      });
    });
    describe('inserts', function() {
      var i1 = new Q.Insert(t1, { 'a' : 1, 'b' : 'foo', 'c' : 5.20 });
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
      it('inserts', function(done) {
        var ic = 0;
        var icplus = function(err, result) {
          if (!err) {ic++;}
          if (ic === 5) {done();}
        };
        pool.sendQuery(i1, icplus);
        pool.sendQuery(i2, icplus);
        pool.sendQuery(i3, icplus);
        pool.sendQuery(i4, icplus);
        pool.sendQuery(i5, icplus);
      });
      describe('updates', function() {
        var u1 = new Q.Update(t1, {'d' : 'foo2'}).where({'a' : 1, 'b' : 'foo'});
        var u2 = new Q.Update(t2, {'b' : {'list+' : [6]}}).where({'a' : 3});
        it('updates', function(done) {
          var ic = 0;
          var icplus = function(err, result) {
            if (!err) {ic++;}
            if (ic === 2) {done();}
          };
          pool.sendQuery(u1, icplus);
          pool.sendQuery(u2, icplus);
        });
      });
      describe('selects', function() {
        var s1 = new Q.Select(t1).where({'a' : 1});
        var s2 = new Q.Select(t2, ['a', 'c']).where({'a' : 4});
        var s3 = new Q.Select(t3);
        it('one', function(done) {
          pool.sendQuery(s1, function(err, result) {
            if (result[0].a === 1 && result[0].d === 'foo2') {
              done();}
          });
        });
        it('two', function(done) {
          pool.sendQuery(s2, function(err, result) {
            if (result['rows'][0][0] === 4 &&
                result['rows'][0][1].q === 'one') {
              done();}}, null, true);
        });
        it('three', function(done) {
          pool.sendQuery(s3, function(err, result) {
            if (result['rows'][0]) {
              done();}}, null, true);
        });
      });
      describe('Drops', function() {
        it('drop', function(done) {
            pool.sendQuery(t1.dbDrop(), function(err, result) {
              if (result['changed_schema']) {
                assert.equal(result['changed_schema'][0], 'DROPPED');
                assert.equal(result['changed_schema'][2], 't1');
              }
              pool.sendQuery(t2.dbDrop(), function(err, result) {});
              pool.sendQuery(t3.dbDrop(), function(err, result) {});
              done(err);
            });
        });
        it('re-drop failure', function(done) {
            pool.sendQuery(t1.dbDrop(), function(err, result) {
              if (err) {
                assert.equal(err[0], 8960);
                assert.equal(err[1].match('t1')[0], 't1');
                done();
              }
            });
        });
      });
    });
  });
});

