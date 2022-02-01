import { randomUUID } from 'crypto';

import { ApolloLink, FetchResult, NextLink, Observable, Operation } from '@apollo/client';
import { camelCase, first } from 'lodash';

interface IRestResponse {
  body?: unknown;
  bodyUsed?: boolean;
  headers?: Map<string, unknown>;
  ok?: boolean;
  redirected?: boolean;
  status: number;
  statusText?: string;
  type?: string;
  url: string;
}

export class HeadersLink extends ApolloLink {
  // eslint-disable-next-line class-methods-use-this
  public request(operation: Operation, forward: NextLink): Observable<FetchResult> | null {
    return forward(operation).map((response): Record<string, unknown> => {
      const context = operation.getContext();

      const restResponse = first(context.restResponses as IRestResponse[]);
      const headersMap = restResponse?.headers ?? new Map();
      const headersObj = Object.fromEntries(headersMap) as Record<string, unknown>;

      const headersObjCamelCased: Record<string, unknown> = {
        __typename: 'headers',
        _id: restResponse?.url ?? randomUUID(),
      };
      Object.keys(headersObj).forEach((key): void => {
        headersObjCamelCased[camelCase(key)] = headersObj[key];
      });

      return {
        ...response,
        data: {
          ...response.data,
          headers: headersObjCamelCased,
        },
      };
    });
  }
}

export default HeadersLink;
