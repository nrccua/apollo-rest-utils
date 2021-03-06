import {
  ApolloCache,
  ApolloClient,
  ApolloQueryResult,
  DefaultContext,
  DocumentNode,
  gql,
  MutationHookOptions,
  MutationTuple,
  OperationVariables,
  QueryHookOptions,
  QueryOptions,
  QueryResult,
  TypedDocumentNode,
  useMutation,
  useQuery,
} from '@apollo/client';
import { DirectiveNode, FieldNode, OperationDefinitionNode } from 'graphql';
import { print } from 'graphql/language/printer';
import { get } from 'lodash';

import {
  IEndpointOptions,
  getSchemaField,
  Input,
  InvalidQueryError,
  IRestEndpoint,
  NamedGQLResult,
  WithHeaders,
} from '../types';

function stripOptionals(gqlQuery: string, variables?: Record<string, unknown>): string {
  const args = Array.from(gqlQuery.matchAll(/{args.([^}]*)}/g)).map(m => m[1]);
  let renderedGql = gqlQuery;

  args.forEach(arg => {
    if (!variables || !(arg in variables) || variables[arg] === undefined) {
      // eslint-disable-next-line security/detect-non-literal-regexp
      renderedGql = renderedGql.replace(new RegExp(`${arg}={args.${arg}}`, 'g'), '');
    }
  });
  return renderedGql;
}

export function validateQueryAgainstEndpoint<TName extends string, TData = unknown, TVariables = OperationVariables>(
  query: DocumentNode | TypedDocumentNode<NamedGQLResult<TName, TData>, TVariables>,
  endpoint: IRestEndpoint<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>>,
): void {
  if (query.definitions.length !== 1) {
    throw new InvalidQueryError('Query must contain exactly one definition', query, endpoint);
  }

  const definition = query.definitions[0];
  if (definition.kind !== 'OperationDefinition') {
    throw new InvalidQueryError('Query definition must be an operation', query, endpoint);
  }

  if (definition.selectionSet.selections.length !== 1) {
    let selectionsIncludeHeaders = false;
    definition.selectionSet.selections.forEach((selection): void => {
      if (get(selection, 'name.value') === 'headers') {
        selectionsIncludeHeaders = true;
      }
    });

    if (
      definition.operation === 'query' &&
      !(selectionsIncludeHeaders && definition.selectionSet.selections.length === 2)
    ) {
      throw new InvalidQueryError(
        'Query must contain exactly one selection, or one selection with headers (if using the HeadersLink). Did you mean to do a mutation?',
        query,
        endpoint,
      );
    }
  }

  const selection = definition.selectionSet.selections[0] as FieldNode;
  if (selection.kind !== 'Field') {
    throw new InvalidQueryError('Query selection must be a field', query, endpoint);
  }

  if (
    definition.operation === 'query' &&
    (selection.selectionSet === undefined || selection.selectionSet.selections.length === 0)
  ) {
    throw new InvalidQueryError('Query selection must contain at least one value to return', query, endpoint);
  }

  if (selection.selectionSet?.selections) {
    const subFields = selection.selectionSet.selections.map(s => (s as FieldNode).name.value);

    const badFields = subFields.filter(
      fieldName =>
        endpoint.responseSchema !== undefined && getSchemaField(endpoint.responseSchema, fieldName) === undefined,
    );

    if (badFields.length > 0) {
      throw new InvalidQueryError(
        `Query contains invalid fields: ${badFields.join(', ')}`,
        query,
        endpoint,
        endpoint.responseSchema,
      );
    }
  }
}

export function useRestMutation<
  TName extends string,
  TData = unknown,
  TVariables = OperationVariables,
  TContext = DefaultContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  mutation: DocumentNode | TypedDocumentNode<NamedGQLResult<TName, TData>, TVariables>,
  options: IEndpointOptions<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> &
    MutationHookOptions<NamedGQLResult<TName, TData>, TVariables, TContext>,
): MutationTuple<NamedGQLResult<TName, TData>, Input<TVariables>, TContext, TCache> {
  validateQueryAgainstEndpoint(mutation, options.endpoint);
  const directives = (mutation.definitions[0] as OperationDefinitionNode).selectionSet.selections[0]
    .directives as DirectiveNode[];
  if (directives.length === 0) {
    const dummyGQL = gql`query a($c: any) { b(c: $c) ${options.endpoint.gql} {d} }`;
    const dummyDirectives = (dummyGQL.definitions[0] as OperationDefinitionNode).selectionSet.selections[0]
      .directives as DirectiveNode[];
    directives.push(dummyDirectives[0]);
  }

  if (options.debug) {
    // eslint-disable-next-line no-console
    console.debug('useRestMutation', { mutation: print(mutation), options });
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMutation<NamedGQLResult<TName, TData>, Input<TVariables>, TContext, TCache>(
    mutation,
    options as MutationHookOptions<NamedGQLResult<TName, TData>, Input<TVariables>, TContext>,
  );
}

/**
 * Creates a function to wrap the mutation results in an outer object for proper type checking.
 *
 * E.g., for an endpoint that returns user information like:
 *   `{ uid: string; firsName: string; }`
 *
 * And the following gql:
 *   `mutation MyMutation {
 *      user @rest(...) {
 *        uid
 *        firstName
 *      }
 *    }`
 *
 * Because of how apollo-client/GraphQL structures the result, the result of calling this with useRestMutation would return an object like:
 *   `{ user: { uid: string; firsName: string; } }`
 *
 * So this function generates a function that is typed with the expected outer wrapper.
 *
 * E.g., for the above example:
 *
 *`   const wrappedMutation = wrapRestMutation<'user'>();`
 *
 *`   result = wrappedMutation(gqlMutation, ...);`
 *
 *`   const uid = result.user.uid; // This is properly typed!`
 */
export function wrapRestMutation<TName extends string>() {
  return <
    TData = unknown,
    TVariables = OperationVariables,
    TContext = DefaultContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TCache extends ApolloCache<any> = ApolloCache<any>,
  >(
    mutation: DocumentNode | TypedDocumentNode<TData, TVariables>,
    options: IEndpointOptions<TData, TVariables> & MutationHookOptions<TData, TVariables, TContext>,
  ): MutationTuple<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>, TContext, TCache> =>
    useRestMutation(
      mutation,
      options as unknown as IEndpointOptions<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> &
        MutationHookOptions<NamedGQLResult<TName, TData>, WithHeaders<TVariables>, TContext>,
    );
}

export function useRestQuery<TName extends string, TData, TVariables>(
  query: DocumentNode | TypedDocumentNode<NamedGQLResult<TName, TData>, TVariables>,
  options: IEndpointOptions<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> &
    QueryHookOptions<NamedGQLResult<TName, TData>, TVariables>,
): QueryResult<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> {
  validateQueryAgainstEndpoint(query, options.endpoint);
  const directives = (query.definitions[0] as OperationDefinitionNode).selectionSet.selections[0]
    .directives as DirectiveNode[];
  if (directives.length === 0) {
    const dummyGQL = gql`query a($c: any) { b(c: $c) ${stripOptionals(
      options.endpoint.gql,
      options.variables as unknown as Record<string, unknown> | undefined,
    )} {d} }`;
    const dummyDirectives = (dummyGQL.definitions[0] as OperationDefinitionNode).selectionSet.selections[0]
      .directives as DirectiveNode[];
    directives.push(dummyDirectives[0]);
  }

  if (options.debug) {
    // eslint-disable-next-line no-console, sort-keys
    console.debug('useRestQuery', { query: print(query), options });
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useQuery<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>>(
    query,
    options as QueryHookOptions<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>>,
  );
}

/**
 * Creates a function to wrap the query results in an outer object for proper type checking.
 *
 * E.g., for an endpoint that returns user information like:
 *   `{ uid: string; firsName: string; }`
 *
 * And the following gql:
 *   `query MyQuery {
 *      user @rest(...) {
 *        uid
 *        firstName
 *      }
 *    }`
 *
 * Because of how apollo-client/GraphQL structures the result, the result of calling this with useRestQuery would return an object like:
 *   `{ user: { uid: string; firsName: string; } }`
 *
 * So this function generates a function that is typed with the expected outer wrapper.
 *
 * E.g., for the above example:
 *
 *`   const wrappedQuery = wrapRestQuery<'user'>();`
 *
 *`   result = wrappedQuery(gqlQuery, ...);`
 *
 *`   const uid = result.user.uid; // This is properly typed!`
 */
export function wrapRestQuery<TName extends string>() {
  return <TData, TVariables>(
    query: DocumentNode | TypedDocumentNode<TData, TVariables>,
    options: IEndpointOptions<TData, TVariables> & QueryHookOptions<TData, WithHeaders<Input<TVariables>>>,
  ): QueryResult<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> =>
    useRestQuery(
      query,
      options as unknown as IEndpointOptions<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> &
        QueryHookOptions<NamedGQLResult<TName, TData>, TVariables>,
    );
}

export function useRestClientQuery<TName extends string, TData, TVariables>(
  options: IEndpointOptions<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> &
    QueryOptions<TVariables, NamedGQLResult<TName, TData>> & { client: ApolloClient<object> },
): Promise<ApolloQueryResult<NamedGQLResult<TName, TData>>> {
  validateQueryAgainstEndpoint(options.query, options.endpoint);
  const directives = (options.query.definitions[0] as OperationDefinitionNode).selectionSet.selections[0]
    .directives as DirectiveNode[];
  if (directives.length === 0) {
    const dummyGQL = gql`query a($c: any) { b(c: $c) ${stripOptionals(
      options.endpoint.gql,
      options.variables as unknown as Record<string, unknown> | undefined,
    )} {d} }`;
    const dummyDirectives = (dummyGQL.definitions[0] as OperationDefinitionNode).selectionSet.selections[0]
      .directives as DirectiveNode[];
    directives.push(dummyDirectives[0]);
  }

  if (options.debug) {
    // eslint-disable-next-line no-console, sort-keys
    console.debug('useRestClientQuery', { query: print(options.query), options });
  }
  return options.client.query<NamedGQLResult<TName, TData>, TVariables>(options);
}

/**
 * Creates an async function to wrap the clientquery results in an outer object for proper type checking.
 *
 * E.g., for an endpoint that returns user information like:
 *   `{ uid: string; firsName: string; }`
 *
 * And the following gql:
 *   `query MyQuery {
 *      user @rest(...) {
 *        uid
 *        firstName
 *      }
 *    }`
 *
 * Because of how apollo-client/GraphQL structures the result, the result of calling this with useClientRestQuery would return an object like:
 *   `{ user: { uid: string; firsName: string; } }`
 *
 * So this function generates a function that is typed with the expected outer wrapper.
 *
 * E.g., for the above example:
 *
 *`   const wrappedQuery = wrapClientRestQuery<'user'>();`
 *
 *`   result = await wrappedQuery(gqlOptionsWithQuery, ...);`
 *
 *`   const uid = result.user.uid; // This is properly typed!`
 */
export function wrapRestClientQuery<TName extends string>() {
  return <TData, TVariables>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: IEndpointOptions<TData, TVariables> &
      QueryOptions<WithHeaders<Input<TVariables>>, TData> & { client: ApolloClient<object> },
  ): Promise<ApolloQueryResult<NamedGQLResult<TName, TData>>> =>
    useRestClientQuery(
      options as unknown as IEndpointOptions<NamedGQLResult<TName, TData>, WithHeaders<Input<TVariables>>> &
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        QueryOptions<TVariables, NamedGQLResult<TName, TData>> & { client: ApolloClient<object> },
    );
}
