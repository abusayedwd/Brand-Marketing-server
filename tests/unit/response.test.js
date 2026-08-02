const response = require('../../src/config/response');

describe('response helper', () => {
  test('wraps payload under data.attributes', () => {
    const body = response({
      statusCode: 200,
      message: 'ok',
      data: { id: '1', name: 'Brivio' },
    });
    expect(body.code).toBe(200);
    expect(body.message).toBe('ok');
    expect(body.data.attributes).toEqual({ id: '1', name: 'Brivio' });
  });

  test('returns empty data object when no payload', () => {
    const body = response({ statusCode: 400, message: 'bad' });
    expect(body.code).toBe(400);
    expect(body.data).toEqual({});
  });
});
