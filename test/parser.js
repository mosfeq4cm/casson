var assert = require('assert')
  , Parser = require('../lib/parser')
  , Frame = require('../lib/frame')

describe('Parser: ', function() {
  describe('Basic messages', function() {
    it('Ready', function() {
      var parser = new Parser();
      parser.write(Frame.fullPackage(0x01, 0x02, Frame.bufferString('')));
      assert.equal(parser.result['ready'], true);
    })
    it('Authenticate', function() {
      var parser = new Parser();
      parser.write(
        Frame.fullPackage(0x01, 0x03,
                          Frame.bufferString('iAuthenticator')));
      assert.equal(parser.result['authenticator'], 'iAuthenticator');
    })
  })
  describe('Error messages', function() {
    it('Protocol error', function() {
      var parser = new Parser();
      parser.write(
        Frame.fullPackage(0x01, 0x00, Buffer.concat(
          [new Buffer([0x00, 0x00, 0x00, 0x0A]),
           Frame.bufferString(Parser.error_codes[10])])));
      assert.equal(parser.result['error'][1], 'Protocol error');
    })
    it('Unavailable exception', function() {
      var parser = new Parser();
      parser.write(
        Frame.fullPackage(0x01, 0x00, Buffer.concat(
          [new Buffer([0x00, 0x00, 0x10, 0x00]),
           Frame.bufferString(Parser.error_codes[0x1000]),
           new Buffer([0x00, 0x01]),
           new Buffer([0x00, 0x00, 0x00, 0x0B]),
           new Buffer([0x00, 0x00, 0x00, 0x0C])])));
      var err_args = parser.result['error'][2];
      var p = (parser.result['error'][1] === 'Unavailable exception') &&
        (err_args['consistency'] === 0x0001) &&
        (err_args['node_required'] === 11) &&
        (err_args['node_alive'] === 12);
      assert.equal(p, true);
    })
    it('Write timeout', function() {
      var parser = new Parser();
      parser.write(
        Frame.fullPackage(0x01, 0x00, Buffer.concat(
          [new Buffer([0x00, 0x00, 0x11, 0x00]),
           Frame.bufferString(Parser.error_codes[0x1100]),
           new Buffer([0x00, 0x01]),
           new Buffer([0x00, 0x00, 0x00, 0x0B]),
           new Buffer([0x00, 0x00, 0x00, 0x0C]),
           Frame.bufferString('write type')])));
      var err_args = parser.result['error'][2];
      var p = (parser.result['error'][1] === 'Write timeout') &&
        (err_args['consistency'] === 0x0001) &&
        (err_args['node_received'] === 11) &&
        (err_args['node_blockfor'] === 12) &&
        (err_args['write_type'] === 'write type');
      assert.equal(p, true);
    })
    it('Read timeout', function() {
      var parser = new Parser();
      parser.write(
        Frame.fullPackage(0x01, 0x00, Buffer.concat(
          [new Buffer([0x00, 0x00, 0x12, 0x00]),
           Frame.bufferString(Parser.error_codes[0x1200]),
           new Buffer([0x00, 0x01]),
           new Buffer([0x00, 0x00, 0x00, 0x0B]),
           new Buffer([0x00, 0x00, 0x00, 0x0C]),
           new Buffer([0x00])])));
      var err_args = parser.result['error'][2];
      var p = (parser.result['error'][1] === 'Read timeout') &&
        (err_args['consistency'] === 0x0001) &&
        (err_args['node_received'] === 11) &&
        (err_args['node_blockfor'] === 12) &&
        (err_args['data_present'] === false);
      assert.equal(p, true);
    })
    it('Already exists', function() {
      var parser = new Parser();
      parser.write(
        Frame.fullPackage(0x01, 0x00, Buffer.concat(
          [new Buffer([0x00, 0x00, 0x24, 0x00]),
           Frame.bufferString(Parser.error_codes[0x2400]),
           Frame.bufferString('testks'),
           Frame.bufferString('testtable')])));
      var err_args = parser.result['error'][2];
      var p = (parser.result['error'][1] === 'Already exists') &&
        (err_args['keyspace'] === 'testks') &&
        (err_args['table'] === 'testtable');
      assert.equal(p, true);
    })
  })
  describe('Result messages', function() {
  })
})
