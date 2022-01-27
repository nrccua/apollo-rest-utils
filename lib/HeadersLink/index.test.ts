import { randomUUID } from 'crypto';

import { NextLink, Operation } from '@apollo/client';

import HeadersLink from '.';

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('testId'),
}));

describe('HeadersLink', () => {
  const mockForward = jest.fn();
  const mockGetContext = jest.fn();
  const mockOperation = {
    getContext: mockGetContext,
  } as unknown as Operation;
  const mockUrl = 'https://example.com/api';

  beforeEach(() => {
    jest.resetAllMocks();
    mockForward.mockReturnValue([{}]);
    mockGetContext.mockReturnValue({
      restResponses: [
        {
          url: mockUrl,
        },
      ],
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('can handle requests without headers', () => {
    const headersLink = new HeadersLink();

    const result = headersLink.request(mockOperation, mockForward as unknown as NextLink);

    expect(result).toEqual([{ data: { headers: { __typename: 'headers', _id: mockUrl } } }]);
  });

  it('can handle requests with headers', () => {
    mockGetContext.mockReturnValue({
      restResponses: [
        {
          headers: [['x-api-key', '12345']],
        },
      ],
    });

    const headersLink = new HeadersLink();

    const result = headersLink.request(mockOperation, mockForward as unknown as NextLink);

    expect(result).toEqual([{ data: { headers: { __typename: 'headers', _id: randomUUID(), xApiKey: '12345' } } }]);
  });
});
