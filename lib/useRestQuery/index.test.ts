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
  const dummyEndpoint = { gql: '@rest(method: "get", path: "test")' } as IRestEndpoint<
    { sessionToken: string },
    { testInput: string }
  >;

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
        query TestMutation($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      { endpoint: dummyEndpoint },
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
        query TestMutation($input: input) {
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

  it('wrapRestQuery should create a function that returns results via useQuery', () => {
    const testToken = 'TEST_TOKEN';
    useQueryMock.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestQuery<'refreshToken'>();
    const { data } = wrappedRestQuery(
      gql`
        query TestQuery($input: input) {
          refreshToken(input: $input) {
            sessionToken
          }
        }
      `,
      {
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
        query TestQuery($input: input) {
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

  it('wrapRestClientQuery should create a function that returns results via client.query', async () => {
    const testToken = 'TEST_TOKEN';
    const clientMock = new MockApolloClient();

    clientMock.query.mockReturnValue({ data: { refreshToken: { sessionToken: testToken } } });

    const wrappedRestQuery = wrapRestClientQuery<'refreshToken'>();

    const { data } = await wrappedRestQuery({
      client: clientMock as unknown as ApolloClient<object>,
      endpoint: dummyEndpoint,
      query: gql`
        query TestClientQuery($input: input) {
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
        query TestClientQuery($input: input) {
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
      query TestQuery($input: input) {
        refreshToken(input: $input) {
          sessionToken
        }
      }
    `;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).not.toThrowError();
  });

  it('should not throw an error for a valid query with headers', () => {
    const query = gql`
      query TestQuery($input: input) {
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
      mutation TestMutation($input: input) {
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
      query TestQuery($input: input) {
        refreshToken
      }
    `;

    expect(() => validateQueryAgainstEndpoint(query, dummyEndpoint)).toThrowError(
      'Query selection must contain at least one value to return',
    );
  });

  it('should throw an error for a query with a bad field', () => {
    const query = gql`
      query TestQuery($input: input) {
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
