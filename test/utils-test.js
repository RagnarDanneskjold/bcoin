'use strict';

var bn = require('bn.js');
var bcoin = require('../').set('main');
var assert = require('assert');
var utils = bcoin.utils;

describe('Utils', function() {
  var vectors = [
    ['', ''],
    ['61', '2g'],
    ['626262', 'a3gV'],
    ['636363', 'aPEr'],
    ['73696d706c792061206c6f6e6720737472696e67', '2cFupjhnEsSn59qHXstmK2ffpLv2'],
    ['00eb15231dfceb60925886b67d065299925915aeb172c06647', '1NS17iag9jJgTHD1VXjvLCEnZuQ3rJDE9L'],
    ['516b6fcd0f', 'ABnLTmg'],
    ['bf4f89001e670274dd', '3SEo3LWLoPntC'],
    ['572e4794', '3EFU7m'],
    ['ecac89cad93923c02321', 'EJDM8drfXA6uyA'],
    ['10c8511e', 'Rt5zm'],
    ['00000000000000000000', '1111111111']
  ];

  it('should encode/decode base58', function() {
    var arr = new Buffer([ 0, 0, 0, 0xde, 0xad, 0xbe, 0xef ]);
    var b = utils.toBase58(arr);
    assert.equal(b, '1116h8cQN');
    assert.deepEqual(utils.fromBase58(b), arr);
    for (var i = 0; i < vectors.length; i++) {
      var r = new Buffer(vectors[i][0], 'hex');
      var b = vectors[i][1];
      assert.equal(utils.toBase58(r), b);
      assert.deepEqual(utils.fromBase58(b), r);
    }
  });

  it('should translate bits to target', function() {
    var bits = 0x1900896c;
    var hash = new Buffer(
      '672b3f1bb11a994267ea4171069ba0aa4448a840f38e8f340000000000000000',
      'hex'
    );
    var target = utils.fromCompact(bits);
    assert(utils.testTarget(hash, target));
  });

  it('should convert satoshi to btc', function() {
    var btc = utils.btc(5460);
    assert.equal(btc, '0.0000546');
    btc = utils.btc(54678 * 1000000);
    assert.equal(btc, '546.78');
    btc = utils.btc(5460 * 10000000);
    assert.equal(btc, '546.0');
  });

  it('should convert btc to satoshi', function() {
    var btc = utils.satoshi('0.0000546');
    assert(btc === 5460);
    btc = utils.satoshi('546.78');
    assert(btc === 54678 * 1000000);
    btc = utils.satoshi('546');
    assert(btc === 5460 * 10000000);
    btc = utils.satoshi('546.0');
    assert(btc === 5460 * 10000000);
    btc = utils.satoshi('546.0000');
    assert(btc === 5460 * 10000000);
    assert.doesNotThrow(function() {
      utils.satoshi('546.00000000000000000');
    });
    assert.throws(function() {
      utils.satoshi('546.00000000000000001');
    });
    assert.doesNotThrow(function() {
      utils.satoshi('90071992.54740991');
    });
    assert.doesNotThrow(function() {
      utils.satoshi('090071992.547409910');
    });
    assert.throws(function() {
      utils.satoshi('90071992.54740992');
    });
    assert.throws(function() {
      utils.satoshi('190071992.54740991');
    });
  });

  it('should write/read new varints', function() {
    /*
     * 0:         [0x00]  256:        [0x81 0x00]
     * 1:         [0x01]  16383:      [0xFE 0x7F]
     * 127:       [0x7F]  16384:      [0xFF 0x00]
     * 128:  [0x80 0x00]  16511: [0x80 0xFF 0x7F]
     * 255:  [0x80 0x7F]  65535: [0x82 0xFD 0x7F]
     * 2^32:           [0x8E 0xFE 0xFE 0xFF 0x00]
     */

    var n = 0;
    var b = new Buffer(1);
    b.fill(0x00);
    utils.writeVarint2(b, 0, 0);
    assert.equal(utils.readVarint2(b, 0).value, 0);
    assert.deepEqual(b, [0]);

    var b = new Buffer(1);
    b.fill(0x00);
    utils.writeVarint2(b, 1, 0);
    assert.equal(utils.readVarint2(b, 0).value, 1);
    assert.deepEqual(b, [1]);

    var b = new Buffer(1);
    b.fill(0x00);
    utils.writeVarint2(b, 127, 0);
    assert.equal(utils.readVarint2(b, 0).value, 127);
    assert.deepEqual(b, [0x7f]);

    var b = new Buffer(2);
    b.fill(0x00);
    utils.writeVarint2(b, 128, 0);
    assert.equal(utils.readVarint2(b, 0).value, 128);
    assert.deepEqual(b, [0x80, 0x00]);

    var b = new Buffer(2);
    b.fill(0x00);
    utils.writeVarint2(b, 255, 0);
    assert.equal(utils.readVarint2(b, 0).value, 255);
    assert.deepEqual(b, [0x80, 0x7f]);

    var b = new Buffer(3);
    b.fill(0x00);
    utils.writeVarint2(b, 16511, 0);
    assert.equal(utils.readVarint2(b, 0).value, 16511);
    //assert.deepEqual(b, [0x80, 0xff, 0x7f]);
    assert.deepEqual(b, [0xff, 0x7f, 0x00]);

    var b = new Buffer(3);
    b.fill(0x00);
    utils.writeVarint2(b, 65535, 0);
    assert.equal(utils.readVarint2(b, 0).value, 65535);
    //assert.deepEqual(b, [0x82, 0xfd, 0x7f]);
    assert.deepEqual(b, [0x82, 0xfe, 0x7f]);
  });

  var unsigned = [
    new bn('ffeeffee'),
    new bn('001fffeeffeeffee'),
    new bn('eeffeeff'),
    new bn('001feeffeeffeeff'),
    new bn(0),
    new bn(1)
  ];

  var signed = [
    new bn('ffeeffee'),
    new bn('001fffeeffeeffee'),
    new bn('eeffeeff'),
    new bn('001feeffeeffeeff'),
    new bn(0),
    new bn(1),
    new bn('ffeeffee').ineg(),
    new bn('001fffeeffeeffee').ineg(),
    new bn('eeffeeff').ineg(),
    new bn('001feeffeeffeeff').ineg(),
    new bn(0).ineg(),
    new bn(1).ineg()
  ];

  unsigned.forEach(function(num) {
    var buf1 = new Buffer(8);
    var buf2 = new Buffer(8);
    var msg = 'should write+read a ' + num.bitLength() + ' bit unsigned int';
    it(msg, function() {
      utils.writeU64(buf1, num, 0);
      utils.writeU64N(buf2, num.toNumber(), 0);
      assert.deepEqual(buf1, buf2);
      var n1 = utils.readU64(buf1, 0);
      var n2 = utils.readU64N(buf2, 0);
      assert.equal(n1.toNumber(), n2);
    });
  });

  signed.forEach(function(num) {
    var buf1 = new Buffer(8);
    var buf2 = new Buffer(8);
    var msg = 'should write+read a ' + num.bitLength()
      + ' bit ' + (num.isNeg() ? 'negative' : 'positive') + ' int';
    it(msg, function() {
      utils.write64(buf1, num, 0);
      utils.write64N(buf2, num.toNumber(), 0);
      assert.deepEqual(buf1, buf2);
      var n1 = utils.read64(buf1, 0);
      var n2 = utils.read64N(buf2, 0);
      assert.equal(n1.toNumber(), n2);
    });
    var msg = 'should write+read a ' + num.bitLength()
      + ' bit ' + (num.isNeg() ? 'negative' : 'positive') + ' int as unsigned';
    it(msg, function() {
      utils.writeU64(buf1, num, 0);
      utils.writeU64N(buf2, num.toNumber(), 0);
      assert.deepEqual(buf1, buf2);
      var n1 = utils.readU64(buf1, 0);
      if (num.isNeg()) {
        assert.throws(function() {
          utils.readU64N(buf2, 0);
        });
      } else {
        var n2 = utils.readU64N(buf2, 0);
        assert.equal(n1.toNumber(), n2);
      }
    });
  });
});
