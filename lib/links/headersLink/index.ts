import { ApolloLink } from '@apollo/client';
import { camelCase, get } from 'lodash';

export const headersLink = new ApolloLink((operation, forward) =>
  forward(operation).map((response): Record<string, unknown> => {
    const context = operation.getContext();

    const headersMap = (get(context, 'restResponses[0].headers') as Map<string, unknown>) || new Map();
    const headersObj: Record<string, unknown> = Object.fromEntries(headersMap);

    const headersObjCamelCase: Record<string, unknown> = {};
    Object.keys(headersObj).forEach((key): void => {
      headersObjCamelCase[camelCase(key)] = headersObj[key];
    });

    return {
      ...response,
      data: {
        ...response.data,
        headers: headersObjCamelCase,
      },
    };
  }),
);

export default headersLink;
