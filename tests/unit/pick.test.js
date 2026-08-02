const pick = require('../../src/utils/pick');

describe('pick', () => {
  test('picks listed keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  test('ignores missing keys', () => {
    expect(pick({ a: 1 }, ['a', 'z'])).toEqual({ a: 1 });
  });

  test('handles null object', () => {
    expect(pick(null, ['a'])).toEqual({});
  });
});
