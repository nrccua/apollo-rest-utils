import { DocumentNode, OperationVariables, TypedDocumentNode } from '@apollo/client';

import { Input, IRestEndpoint, NamedGQLResult, RestEndpointSchema } from './restSchema';

// Default export makes re-exporting in types a pain
// eslint-disable-next-line import/prefer-default-export
export class InvalidQueryError<TName extends string, TData = unknown, TVariables = OperationVariables> extends Error {
  constructor(
    public message: string,
    public query: DocumentNode | TypedDocumentNode<NamedGQLResult<TName, TData>, TVariables>,
    public endpoint: IRestEndpoint<NamedGQLResult<TName, TData>, Input<TVariables>>,
    public schema?: RestEndpointSchema,
  ) {
    super(message);
  }
}
