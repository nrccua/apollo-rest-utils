import { ApolloLink, FetchResult, NextLink, Observable, Operation } from '@apollo/client';
import { camelCase, get } from 'lodash';

export class HeadersLink extends ApolloLink {
  // eslint-disable-next-line class-methods-use-this
  public request(operation: Operation, forward: NextLink): Observable<FetchResult> | null {
    return forward(operation).map((response): Record<string, unknown> => {
      const context = operation.getContext();

      const headersMap = (get(context, 'restResponses[0].headers') as Map<string, unknown>) || new Map();
      const headersObj: Record<string, unknown> = Object.fromEntries(headersMap);

      const headersObjCamelCased: Record<string, unknown> = {};
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
