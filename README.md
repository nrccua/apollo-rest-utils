# Apollo Rest utils

Encoura's solution to integrating rest APIs with
[Apollo](https://www.apollographql.com/docs/) and
[Apollo Client](https://www.apollographql.com/docs/react/).

These utils build on top of the great work of
[apollo-link-rest](https://www.apollographql.com/docs/react/api/link/apollo-link-rest/).

This library provides helper functions and generators for making integration
with REST apis and Apollo in a TypeScript application.

## Features

- A command line utiltity that takes a swagger file/url, and automatically
  generates input and output types, and endpoint definitions that can be used
  to make integration with `apollo-link-rest` much easier.
- Wrapper functions for common GraphQL operations that allow you to pass in
  pure GraphQL, and enables the input variables and the result to be strongly
  typed based on the swagger definition.
- Automatically checks your GraphQL at runtime and will throw exceptions if
  your GraphQL fields do not match the endpoint definition.
- Custom apollo links to cover REST API edge cases, such as using the
  `headersLink` to retrieve data from REST response headers.

## Usage

From the command line you can generate definitions for endpoints:

```bash
npx apollo-rest-utils <path_to_swagger_file_or_url> <output_directory_where_you_want_the_files> [optional_endpoint_id_to_use]
```

Then you can use those definitions to make GraphQL calls within an Apollo context:

```TypeScript
import { wrapRestQuery } from 'apollo-rest-utils';

import ROUTES from 'path/to/directory_specified_in_cli_call/__generatedRestEndpoints';

const userSearch = (searchPattern: string) => {
  const wrappedRestQuery = wrapRestQuery<'users'>();

  const { data, loading } = wrappedRestQuery(
    gql`
      query RenderUserSearchQuery($search: String!) {
        user(search: $search) {
          id
          name
          city
          state
        }
      }
    `,
    {
      endpoint: ROUTES.GET.USER_SEARCH,
      skip: !searchPattern,
      variables: {
        search: searchPattern,
      },
    },
  );

  return data?.users ?? [];
}
```

## Endpoint IDs

To facilitate using this with multiple endpoints, you must specify an endpoint
id per endpoint. See
[https://www.apollographql.com/docs/react/api/link/apollo-link-rest/#multiple-endpoints](https://www.apollographql.com/docs/react/api/link/apollo-link-rest/#multiple-endpoints)

## Custom Links

### `HeadersLink`

This link allows you to access the REST API's response headers within the
`data` object that comes back from Apollo Client.

NOTE: Since GraphQL only accepts field names written in `camelCase`, the headers
should be requested in camel case format. I.e. if your REST API returns a
`total-count` header, you'll want to ask for it using `totalCount`.

#### `HeadersLink` Setup

```ts
import { RestLink } from 'apollo-link-rest';
import { HeadersLink } from 'apollo-rest-utils';

const headersLink = new HeadersLink();
const restLink = new RestLink({ ... });

new ApolloClient({
  ...
  cache: new InMemoryCache({ ... }),
  link: ApolloLink.from([headersLink, restLink]),
  ...
});
```

#### `HeadersLink` Usage

```ts
const { data } = wrapRestQuery<'something'>()(
  gql`
    query SomethingQuery($id: String!) {
      something(id: $id) {
        _id
        fieldA
        fieldB
        fieldC
      }
      headers {
        nextOffset
        totalCount
        totalPages
      }
    }
  `,
  {
    endpoint: REST.GET.SOMETHING,
    variables: {
      id,
    },
  },
);

console.log(data?.something); // response data
console.log(data?.headers); // response headers
```

## Releasing

Checking in the dist folder is not necessary as it will be built upon
npm install by the downstream project.

After making any changes and merging them to main, please do the following:

- Create a new branch from main and run `npm run update:version`
- Verify the `CHANGELOG.md` generated changes
- Commit, push, and merge to main.
- Create a new
  [release](https://github.com/nrccua/apollo-rest-utils/releases/new) using
  the tag generated in the previous steps
- Use the `Auto-generate release notes` button to generate the release notes,
  and add any context you may deem necessary.
