Decimal = function(num) {

  var DECIMAL_SEPARATOR = '.';

  var toIntegers = function(num) {

    var value, exp;
    var tokens = num.split(DECIMAL_SEPARATOR),
        integer = tokens[0],
        fractional = tokens[1];

    if(!fractional) {
      var trailing_zeros = integer.match(/0+$/);

      if(trailing_zeros) {
        var length = trailing_zeros[0].length;
        value = integer.substr(0, integer.length - length);
        exp = length;
      } else {
        value = integer;
        exp = 0;
      }
    } else {
      value = parseInt(num.split(DECIMAL_SEPARATOR).join(''), 10);
      exp = fractional.length * -1;
    }

    return {
      'value': value,
      'exp': exp
    };
  };

  this.str = String(num);
  this.ints = toIntegers(this.str);
};

module.exports = Decimal;
