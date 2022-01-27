import * as apolloClientLib from '@apollo/client';
import { ApolloClient, DocumentNode, gql, useMutation, useQuery } from '@apollo/client';
import { print, SelectionNode } from 'graphql';
import { first } from 'lodash';

import { IRestEndpoint } from '../types';

import { validateQueryAgainstEndpoint, wrapRestClientQuery, wrapRestMutation, wrapRestQuery } from '.';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class MockApolloClient {
  public query: jest.Mock;

  constructor() {
    this.query = jest.fn();
  }
}

jest.mock('@apollo/client', () => ({
  ...jest.requireActual<typeof apolloClientLib>('@apollo/client'),
  ApolloClient: jest.fn().mockImplementation(() => new MockApolloClient()),
  useMutation: jest.fn(),
  useQuery: jest.fn(),
}));

describe('useRestQuery Library', () => {
  const useMutationMock = useMutation as jest.Mock;
  const useQueryMock = useQuery as jest.Mock;
  const dummyEndpoint = { gql: '@rest(method: "get", path: "test/{args.testInput}")' } as IRestEndpoint<
    { sessionToken: string },
    { testInput: string }
  >;

  const dummyEndpointWithOptional = {
    gql: '@rest(method: "get", path: "test/{args.testInput}?optional={args.optional}")',
  } as IRestEndpoint<{ sessionToken: string }, { testInput: string; optional?: string }>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('wrapRestMutation should create a function that returns results via useMutation', async () => {
    const testToken = 'TEST_TOKEN';
    const mockResult = {
      called: true,
      client: new MockApolloClient() as unknown as ApolloClient<unknown>,
      data: { refreshToken: { sessionToken: testToken } },
      loading: false,
    };

    useMutationMock.mockReturnValue([async (): Promise<typeof mockResult> => Promise.resolve(mockResult), mockResult]);

    const wrappedRestMutation = wrapRestMutation<'refreshToken'>();
    const [refreshToken] = wrappedRestMutation(
      gql`
        mutation TestMutationB088D1CCBE7C($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      { debug: true, endpoint: dummyEndpoint },
    );
    const result = await refreshToken({
      variables: {
        input: {
          testInput: 'test',
        },
      },
    });

    expect(result.data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useMutationMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestMutation should create a function that allows an empty input variable', async () => {
    const testToken = 'TEST_TOKEN';
    const mockResult = {
      called: true,
      client: new MockApolloClient() as unknown as ApolloClient<unknown>,
      data: { refreshToken: { sessionToken: testToken } },
      loading: false,
    };

    useMutationMock.mockReturnValue([async (): Promise<typeof mockResult> => Promise.resolve(mockResult), mockResult]);

    const wrappedRestMutation = wrapRestMutation<'refreshToken'>();
    const [refreshToken] = wrappedRestMutation(
      gql`
        mutation TestMutationA6D73CE52831($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      { endpoint: dummyEndpoint },
    );
    const result = await refreshToken({
      variables: {
        input: {},
        testInput: 'test',
      },
    });

    expect(result.data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useMutationMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestMutation should create a function that allows $headers', async () => {
    const testToken = 'TEST_TOKEN';
    const mockResult = {
      called: true,
      client: new MockApolloClient() as unknown as ApolloClient<unknown>,
      data: { refreshToken: { sessionToken: testToken } },
      loading: false,
    };

    useMutationMock.mockReturnValue([async (): Promise<typeof mockResult> => Promise.resolve(mockResult), mockResult]);

    const wrappedRestMutation = wrapRestMutation<'refreshToken'>();
    const [refreshToken] = wrappedRestMutation(
      gql`
        mutation TestMutationB088D1CCBE7C($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      { endpoint: dummyEndpoint },
    );
    const result = await refreshToken({
      variables: {
        $headers: {
          'x-api-key': '12345',
        },
        input: {
          testInput: 'test',
        },
      },
    });

    expect(result.data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useMutationMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestQuery should create a function that returns results via useQuery', () => {
    const testToken = 'TEST_TOKEN';
    useQueryMock.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestQuery<'refreshToken'>();
    const { data } = wrappedRestQuery(
      gql`
        query TestQuery2067FE118166($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      {
        debug: true,
        endpoint: dummyEndpoint,
        variables: {
          testInput: 'test',
        },
      },
    );

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useQueryMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestQuery should create a function that allows an empty input variable', () => {
    const testToken = 'TEST_TOKEN';
    useQueryMock.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestQuery<'refreshToken'>();
    const { data } = wrappedRestQuery(
      gql`
        query TestQuery0DE04F7BFE72($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      {
        endpoint: dummyEndpoint,
        variables: {
          input: {},
          testInput: 'test',
        },
      },
    );

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useQueryMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestQuery should create a function that does not pass optional variables when not present', () => {
    const testToken = 'TEST_TOKEN';
    useQueryMock.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestQuery<'refreshToken'>();
    const { data } = wrappedRestQuery(
      gql`
        query TestQuery3353136F6C33($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      {
        endpoint: dummyEndpointWithOptional,
        variables: {
          testInput: 'test',
        },
      },
    );

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useQueryMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected without the optional
    expect(print(generatedNode)).not.toContain('?optional={args.optional}');
  });

  it('wrapRestQuery should create a function that does pass optional variables when present', () => {
    const testToken = 'TEST_TOKEN';
    useQueryMock.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestQuery<'refreshToken'>();
    const { data } = wrappedRestQuery(
      gql`
        query TestQuery4($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      {
        endpoint: dummyEndpointWithOptional,
        variables: {
          optional: 'OPTION',
          testInput: 'test',
        },
      },
    );

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useQueryMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected with the optional
    expect(print(generatedNode)).toContain('?optional={args.optional}');
  });

  it('wrapRestQuery should create a function that allows $headers', () => {
    const testToken = 'TEST_TOKEN';
    useQueryMock.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestQuery<'refreshToken'>();
    const { data } = wrappedRestQuery(
      gql`
        query TestQuery2067FE118166($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      {
        endpoint: dummyEndpoint,
        variables: {
          $headers: {
            'x-api-key': '12345',
          },
          testInput: 'test',
        },
      },
    );

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = first(first(useQueryMock.mock.calls)) as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestClientQuery should create a function that returns results via client.query', async () => {
    const testToken = 'TEST_TOKEN';
    const clientMock = new MockApolloClient();

    clientMock.query.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestClientQuery<'refreshToken'>();

    const { data } = await wrappedRestQuery({
      client: clientMock as unknown as ApolloClient<object>,
      debug: true,
      endpoint: dummyEndpoint,
      query: gql`
        query TestClientQuery3F3C1DCCA1E2($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      variables: {
        testInput: 'test',
      },
    });

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = (first(first(clientMock.query.mock.calls)) as Parameters<typeof wrappedRestQuery>[0])
      ?.query as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestClientQuery should create a function that allows an empty input variable', async () => {
    const testToken = 'TEST_TOKEN';
    const clientMock = new MockApolloClient();

    clientMock.query.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestClientQuery<'refreshToken'>();

    const { data } = await wrappedRestQuery({
      client: clientMock as unknown as ApolloClient<object>,
      endpoint: dummyEndpoint,
      query: gql`
        query TestClientQueryA88578653318($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      variables: {
        input: {},
        testInput: 'test',
      },
    });

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = (first(first(clientMock.query.mock.calls)) as Parameters<typeof wrappedRestQuery>[0])
      ?.query as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });

  it('wrapRestClientQuery should create a function that does not pass optional variables when not present', async () => {
    const testToken = 'TEST_TOKEN';
    const clientMock = new MockApolloClient();

    clientMock.query.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestClientQuery<'refreshToken'>();

    const { data } = await wrappedRestQuery({
      client: clientMock as unknown as ApolloClient<object>,
      endpoint: dummyEndpointWithOptional,
      query: gql`
        query TestClientQuery88F953B187A6($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      variables: {
        testInput: 'test',
      },
    });

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = (first(first(clientMock.query.mock.calls)) as Parameters<typeof wrappedRestQuery>[0])
      ?.query as DocumentNode;

    // Make sure our @rest gql got injected without the optional
    expect(print(generatedNode)).not.toContain('?optional={args.optional}');
  });

  it('wrapRestClientQuery should create a function that does pass optional variables when present', async () => {
    const testToken = 'TEST_TOKEN';
    const clientMock = new MockApolloClient();

    clientMock.query.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestClientQuery<'refreshToken'>();

    const { data } = await wrappedRestQuery({
      client: clientMock as unknown as ApolloClient<object>,
      endpoint: dummyEndpointWithOptional,
      query: gql`
        query TestClientQuery12836BB2CE80($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      variables: {
        optional: 'OPTIONAL',
        testInput: 'test',
      },
    });

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = (first(first(clientMock.query.mock.calls)) as Parameters<typeof wrappedRestQuery>[0])
      ?.query as DocumentNode;

    // Make sure our @rest gql got injected without the optional
    expect(print(generatedNode)).toContain('?optional={args.optional}');
  });

  it('wrapRestClientQuery should create a function that allows $headers', async () => {
    const testToken = 'TEST_TOKEN';
    const clientMock = new MockApolloClient();

    clientMock.query.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestClientQuery<'refreshToken'>();

    const { data } = await wrappedRestQuery({
      client: clientMock as unknown as ApolloClient<object>,
      endpoint: dummyEndpoint,
      query: gql`
        query TestClientQuery3F3C1DCCA1E2($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      variables: {
        $headers: {
          'x-api-key': '12345',
        },
        testInput: 'test',
      },
    });

    expect(data?.refreshToken.sessionToken).toBe(testToken);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const generatedNode = (first(first(clientMock.query.mock.calls)) as Parameters<typeof wrappedRestQuery>[0])
      ?.query as DocumentNode;

    // Make sure our @rest gql got injected
    expect(print(generatedNode)).toContain(dummyEndpoint.gql);
  });
});

describe('validateQueryAgainstEndpoint', () => {
  const dummyEndpoint = {
    gql: '@rest(method: "get", path: "test")',
    responseSchema: ['sessionToken'],
  } as IRestEndpoint<{ sessionToken: string }, { testInput: string }>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should not throw an error for a valid query', () => {
    const query = gql`
      query TestQuery2DB1249ECE2D($input: input) {
        refreshToken(input: $input) {
          sessionToken
        }
      }
    `;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).not.toThrowError();
  });

  it('should not throw an error for a valid query with headers', () => {
    const query = gql`
      query TestQuery96E94A832983($input: input) {
        refreshToken(input: $input) {
          sessionToken
        }
        headers
      }
    `;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).not.toThrowError();
  });

  it('should not throw an error for a valid mutation without a return value', () => {
    const query = gql`
      mutation TestMutationDDBF37B7D32E($input: input) {
        refreshToken(input: $input)
      }
    `;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).not.toThrowError();
  });

  it('should throw an error for a query with no definitions', () => {
    const query = { definitions: [], kind: 'Document' } as DocumentNode;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).toThrowError(
      'Query must contain exactly one definition',
    );
  });

  it('should throw an error for a query with a non-operation definitions', () => {
    const query = {
      definitions: [{ kind: 'ScalarTypeDefinition', name: { kind: 'Name', value: 'NULL' } }],
      kind: 'Document',
    } as DocumentNode;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).toThrowError(
      'Query definition must be an operation',
    );
  });

  it('should throw and error with an empty selections array', () => {
    const query: DocumentNode = {
      definitions: [
        {
          kind: 'OperationDefinition',
          operation: 'query',
          selectionSet: { kind: 'SelectionSet', selections: [] as readonly SelectionNode[] },
        },
      ],
      kind: 'Document',
    };

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).toThrowError(
      'Query must contain exactly one selection',
    );
  });

  it('should throw and error with a non-Field selection', () => {
    const query: DocumentNode = {
      definitions: [
        {
          kind: 'OperationDefinition',
          operation: 'query',
          selectionSet: {
            kind: 'SelectionSet',
            selections: [{ kind: 'FragmentSpread', name: { kind: 'Name', value: 'NULL' } }] as readonly SelectionNode[],
          },
        },
      ],
      kind: 'Document',
    };

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).toThrowError('Query selection must be a field');
  });

  it('should throw an error for a query with no requested return value', () => {
    const query = gql`
      query TestQueryCCE87F921F70($input: input) {
        refreshToken
      }
    `;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).toThrowError(
      'Query selection must contain at least one value to return',
    );
  });

  it('should throw an error for a query with a bad field', () => {
    const query = gql`
      query TestQuery9944478B3BFE($input: input) {
        refreshToken(input: $input) {
          test
        }
      }
    `;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).toThrowError(
      'Query contains invalid fields: test',
    );
  });
});
