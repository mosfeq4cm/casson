var assert = require('assert'),
    util = require('util'),
    Frame = require('../lib/frame'),
    Parser = require('../lib/parser'),
    Pool = require('../lib/pool')

describe('Connection: ', function() {
  describe('Pool.Connector', function() {
    var opts = {'host' : 'localhost', 'port' :9042}
    var c = new Pool.Connector(opts);
    it('startup', function(done) {
      c.on('result', function(data) {
        var p = new Parser();
        p.write(new Buffer(data));
        if (p.result['authenticator']) {done();}
      });
      new Frame('Startup').send(1, c);
    });
    it('credentials', function(done) {
      var cf = function() {
        c.on('result', function(data) {
          var p = new Parser();
          p.write(new Buffer(data));
          if (p.result['ready']) {done();}
        });
        var f = new Frame('Credentials', {
          'username' : 'u_tester', 'password' : 'pw_test'});
        f.send(2, c);
      };
      setTimeout(cf, 200);
    });
    it('options', function(done) {
      var of = function() {
        c.on('result', function(data) {
          var p = new Parser();
          p.write(new Buffer(data));
          if (p.result['supported']) {done();}
        });
        new Frame('Options').send(3, c);
      };
      setTimeout(of, 250);
    });
    it('keyspace', function(done) {
      var kf = function() {
        c.on('result', function(data) {
          var p = new Parser();
          p.write(new Buffer(data));
          if (p.result['keyspace'] === 'casson_test') {done();}
        });
        new Frame('Query', 'USE casson_test').send(4, c);
      };
      setTimeout(kf, 300);
    });
  });
  describe('Pool', function() {
    describe('with two hosts', function() {
      var op = {'hosts' : ['localhost:9042', '127.0.0.1:9042'],
                'username' : 'u_tester', 'password' : 'pw_test',
                'keyspace' : 'casson_test2'};
      var p = new Pool(op);
      it('2x2 connects', function() {
        assert.equal(p.hostspec.length * p.n_connect, 4);
      });
      it('keyspace', function(done) {
        setTimeout(function() {
          if (p.keyspace.name === 'casson_test2') { done(); } }, 100);
      });
      it('set keyspace', function(done) {
        p.setKeyspace('casson_test');
        setTimeout(function() {
          if (p.keyspace.name === 'casson_test') { done(); } }, 100);
      });
    });
    describe('with 4 connections', function() {
      var op = {'hosts' : ['localhost:9042'],
                'username' : 'u_tester', 'password' : 'pw_test',
                'keyspace' : 'casson_test2',
                'connection_per_host' : 4};
      it('keyspace', function() {
        var p = new Pool(op);
        assert.equal(p.hostspec.length * p.n_connect, 4);
      });
    });
  });
});


