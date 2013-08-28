var assert = require('assert')
  , Frame = require('../lib/frame');

describe('Frame: ', function() {
  describe('Buffering simple types - ', function() {
    it('string', function() {
      assert.equal(Frame.bufferString('a string test'),
                   '\u0000\ra string test');
    })
    it('ascii', function() {
      assert.equal(Frame.writeValue('ascii string',
                                    {'type' : 0x0001}).toString(),
                   '\u0000\u0000\u0000\fascii string');
    })
    it('blob', function() {
      assert.equal(Frame.writeValue('a blob', {'type' : 0x0003}).toString(),
                   '\u0000\u0000\u0000\u0006a blob');
    })
    it('boolean: true', function() {
      assert.equal(Frame.writeValue(true, {'type' : 0x0004}).toString(),
                   '\u0000\u0000\u0000\u0001');
    })
    it('boolean: false', function() {
      assert.equal(Frame.writeValue(false, {'type' : 0x0004}).toString(),
                   '\u0000\u0000\u0000\u0000');
    })
    it('decimal', function() {
      assert.equal(Frame.writeValue(3.15, {'type' : 0x0006}).toString(),
                   '\u0000\u0000\u0000\u0006����\u0001;');
    })
    it('double', function() {
      assert.equal(Frame.writeValue(1e9, {'type' : 0x0007}).toString(),
                   'A��e\u0000\u0000\u0000\u0000');
    })
    it('float', function() {
      assert.equal(Frame.writeValue(3.141526, {'type' : 0x0008}).toString(),
                   '@I\u000e�');
    })
    it('bigint', function() {
      assert.equal(Frame.writeValue(1375932900692233,
                                    {'type' : 0x0002}).toString(),
                   '\u0000W��W���');
    })
    it('int', function() {
      assert.equal(Frame.writeValue(123456, {'type' : 0x0009}).toString(),
                   '\u0000\u0001�@');
    })
    it('text', function() {
      assert.equal(Frame.writeValue('utf8 string',
                                    {'type' : 0x000A}).toString(),
                   '\u0000\u0000\u0000\u000butf8 string');
    })
    it('inet', function() {
      assert.equal(Frame.writeValue('10.20.30.40:1234',
                                    {'type' : 0x0010}).toString(),
                   '\u0004\n\u0014\u001e(\u0000\u0000\u0004�');
    })
  })
  describe('Buffering collection types - ', function() {
    it('list', function() {
      assert.equal(Frame.writeValue(
        [1, 2], {'type' : 0x0020, 'opt' : 0x0009}).toString(),
        '\u0000\u0002\u0000\u0004\u0000\u0000\u0000\u0001\u0000\u0004\u0000\u0000\u0000\u0002');
    })
    it('set', function() {
      assert.equal(Frame.writeValue(
        ['val 1', 'val 2'], {'type' : 0x0020, 'opt' : 0x000A}).toString(),
        '\u0000\u0002\u0000\u0005val 1\u0000\u0005val 2');
    })
    it('map', function() {
      assert.equal(Frame.writeValue(
        {'k1' : 'val 1', 'k2' : 'val 2'},
        {'type' : 0x0021, 'opt' : 0x000A, 'opt2' : 0x000A}).toString(),
        '\u0000\u0002\u0000\u0002k1\u0000\u0005val 1\u0000\u0002k2\u0000\u0005val 2');
    })
  })
  describe('Buffering list and key/values', function() {
    it('Buffering String List', function() {
      assert.equal(Frame.bufferStringList(['string one', 'string two']),
                   '\u0000\u0002\u0000\nstring one\u0000\nstring two');
    })
    it('Buffering Key and value string', function() {
      assert.equal(Frame.bufferKeyValueStrs(
        {'key 1' : 'string one', 'key 2' : 'string two'}).toString(),
        '\u0000\u0002\u0000\u0005key 1\u0000\nstring one\u0000\u0005key 2\u0000\nstring two');
    })
    it('Buffering Key and value string List', function() {
      assert.equal(Frame.bufferKeyValueStrs(
        {'key list' : ['string 1', 'string 2', 'string 3']}).toString(),
        '\u0000\u0001\u0000\bkey list\u0000\u0003\u0000\bstring 1\u0000\bstring 2\u0000\bstring 3');
    })
  })
});
