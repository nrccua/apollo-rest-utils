import { NextLink, Operation } from '@apollo/client';

import HeadersLink from '.';

describe('HeadersLink', () => {
  const mockForward = jest.fn();
  const mockGetContext = jest.fn();
  const mockOperation = {
    getContext: mockGetContext,
  } as unknown as Operation;

  beforeEach(() => {
    jest.resetAllMocks();
    mockForward.mockReturnValue([{}]);
    mockGetContext.mockReturnValue({
      restResponses: [{}],
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('can handle requests without headers', () => {
    const headersLink = new HeadersLink();

    const result = headersLink.request(mockOperation, mockForward as unknown as NextLink);

    expect(result).toEqual([{ data: { headers: {} } }]);
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

    expect(result).toEqual([{ data: { headers: { xApiKey: '12345' } } }]);
  });
});
