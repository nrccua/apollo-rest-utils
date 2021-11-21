import { getSchemaField } from '.';

describe('getSchemaField', () => {
  const dummySchema = ['a', { b: ['c'] }];

  it('can find a simple schema field', () => {
    const result = getSchemaField(dummySchema, 'a');

    expect(result).toEqual(['a']);
  });

  it('can find a complex schema field', () => {
    const result = getSchemaField(dummySchema, 'b');

    expect(result).toEqual(['c']);
  });

  it('returns undefined for a missing schema field', () => {
    const result = getSchemaField(dummySchema, 'd');

    expect(result).toBeUndefined();
  });
});
