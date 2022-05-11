#!/usr/bin/env node

// This file is NOT meant to be imported.
// It is a helper file to generate @rest endpoint definitions
// from a swagger.json file

/* eslint-disable import/no-extraneous-dependencies, no-console */

import fs from 'fs';
import path from 'path';

import SwaggerParser from '@apidevtools/swagger-parser';
import _, { first } from 'lodash';
import { OpenAPI, OpenAPIV3 } from 'openapi-types';
import openapiTS, { ParameterObject, ReferenceObject, ResponseObject, SchemaObject } from 'openapi-typescript';
import prettier from 'prettier';

import { RestEndpointSchema } from '../types';

export function addArgsToPath(endpointPath: string, parameters: OpenAPIV3.ParameterObject[] | undefined): string {
  const queryParams = parameters?.filter(p => p.in === 'query').map(p => `${p.name}={args.${p.name}}`) ?? [];
  return !_.includes(endpointPath, '{') && queryParams.length > 0
    ? `${endpointPath.substr(1)}?{args}`
    : endpointPath.substr(1).replace(/{/g, '{args.') + (queryParams.length > 0 ? `?${queryParams.join('&')}` : '');
}

export function getResponseSchema(properties: {
  [name: string]: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | ReferenceObject | SchemaObject;
}): RestEndpointSchema | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const result = Object.keys(properties)
    .map((p: string) => {
      if ('properties' in properties[p]) {
        const pObject = properties[p] as OpenAPIV3.NonArraySchemaObject;
        if (pObject.properties) {
          return { [p]: getResponseSchema(pObject.properties) };
        }
      } else if ('items' in properties[p]) {
        const items = (properties[p] as OpenAPIV3.ArraySchemaObject).items;
        if ('properties' in items) {
          const itemProperties = (items as OpenAPIV3.NonArraySchemaObject).properties;
          if (itemProperties) {
            return {
              [p]: getResponseSchema(itemProperties),
            };
          }
        }
      }
      return p;
    })
    .filter(p =>
      p !== undefined && _.isObject(p)
        ? Object.keys(p)
            .map(key => p[key] !== undefined)
            .reduce((a, v) => a && v, true)
        : true,
    );
  return result;
}

export function normalizeName(name: string): string {
  const normalized = name.trim().replace(/[/-]/g, '_').toUpperCase().replace(/{/g, 'BY_').replace(/}/g, '');
  return normalized.startsWith('_') ? normalized.substr(1) : normalized;
}

export function pathToType(endpointPath: string, isArray = false): string {
  const result = `${_.camelCase(normalizeName(endpointPath))}Response`;
  return `${isArray ? '[' : ''}${result.replace(result[0], result[0].toUpperCase())}${isArray ? ']' : ''}`;
}

export function typeOfParam(param: ParameterObject): string {
  return param.schema &&
    'type' in param.schema &&
    param.schema?.type &&
    ['number', 'string'].includes(param.schema?.type)
    ? param.schema?.type
    : 'any';
}

export function typeObjectFromParams(
  params: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[],
): string | undefined {
  if (params.length === 0) {
    return undefined;
  }

  let typeString = '{ ';

  params.forEach(p => {
    const paramObject = p as ParameterObject;
    if (paramObject.name) {
      typeString += `${_.camelCase(paramObject.name)}${
        paramObject.required || paramObject.in === 'path' ? '' : '?'
      }: ${typeOfParam(paramObject)}; `;
    }
  });

  typeString += ' }';

  return typeString;
}

export async function generateTypes(apiPath: string, filePath: string): Promise<string> {
  const typeOutput = await openapiTS(apiPath, { prettierConfig: '.prettierrc.js' });
  fs.writeFileSync(filePath, typeOutput);
  return `./${path.basename(filePath.replace(/[.]ts$/, ''))}`;
}

export function generateTypescript(api: OpenAPI.Document, typeImportLocation: string, endpointId?: string): string {
  let generatedTSEndpoints = '';
  // Create an object representing routes by method, e.g., { 'get': {}, ... }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  const routes = Object.entries(OpenAPIV3.HttpMethods).reduce(
    (a, v) => ({
      ...a,
      [v[1]]: {},
    }),
    {},
  ) as unknown as Record<Uppercase<OpenAPIV3.HttpMethods>, Record<string, string>>;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const paths = api.paths as Record<string, OpenAPIV3.PathItemObject>;
  Object.keys(paths).forEach(endpointPath => {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const pathObject = paths[endpointPath] as Record<string, OpenAPIV3.OperationObject<{}>>;
    Object.keys(pathObject).forEach(method => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const endpointObject = pathObject[method];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      let responseBody = `paths['${endpointPath}']['${method}']['responses']`;
      let responseSchema;
      let isArray = false;
      const okResponse = _.first(Object.keys(endpointObject.responses).sort());
      if (okResponse && parseInt(okResponse, 10) < 300) {
        responseBody += `['${okResponse}']`;
        const responseObject = endpointObject.responses[okResponse] as OpenAPIV3.ResponseObject | ResponseObject;
        let schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | ReferenceObject | SchemaObject | undefined;
        if (responseObject?.content) {
          responseBody += `['content']`;
          if (responseObject?.content?.['application/json']) {
            responseBody += `['application/json']`;
            schema = responseObject.content['application/json'].schema as
              | OpenAPIV3.ReferenceObject
              | OpenAPIV3.SchemaObject;
          }
        } else if ('schema' in responseObject) {
          responseBody += `['schema']`;
          schema = responseObject.schema;
        }
        if (schema && 'properties' in schema && schema.properties) {
          responseSchema = getResponseSchema(schema.properties);
        } else if (
          schema &&
          'items' in schema &&
          schema.items &&
          'properties' in schema.items &&
          schema.items.properties
        ) {
          isArray = true;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          responseSchema = getResponseSchema(schema.items.properties);
        }
      }
      const requestBodyObject = endpointObject.requestBody as OpenAPIV3.RequestBodyObject;
      const contentKeys = Object.keys(requestBodyObject?.content ?? {});
      const queryPathParams =
        endpointObject.parameters?.filter(p => 'in' in p && ['path', 'query'].includes(p.in)) ?? [];
      const queryPathParamsObject = typeObjectFromParams(queryPathParams);
      const bodyParam = first(endpointObject.parameters?.filter(p => 'name' in p && p.name.toLowerCase() === 'body'));
      // eslint-disable-next-line no-nested-ternary
      const requestBody = contentKeys.includes('application/json')
        ? // OpenAPI 3 way
          `paths['${endpointPath}']['${method}']['requestBody']['content']['application/json']`
        : // Swagger 2 way
        bodyParam
        ? `paths['${endpointPath}']['${method}']['parameters']['body']['body']`
        : undefined;
      const headers =
        endpointObject.parameters
          ?.filter(p => 'in' in p && p.in === 'header')
          .map(p => p as OpenAPIV3.ParameterObject) ?? [];
      routes[method as Uppercase<OpenAPIV3.HttpMethods>][
        normalizeName(endpointPath)
      ] = `${`{ gql: '@rest(method: "${method.toUpperCase()}", path: "${addArgsToPath(
        endpointPath,
        endpointObject.parameters as OpenAPIV3.ParameterObject[] | undefined,
      )}", type: "${pathToType(endpointPath, isArray)}"${endpointId ? `, endpoint: "${endpointId}"` : ''})', `}${
        headers?.length > 0
          ? `headers: [${headers
              .map(h =>
                JSON.stringify({ description: h.description, name: h.name, required: h.required, schema: h.schema }),
              )
              .join(',\n')}],`
          : ''
      }${
        responseSchema ? `responseSchema: ${JSON.stringify(responseSchema)},\n` : ''
      }} as IRestEndpoint<${responseBody}${
        // eslint-disable-next-line no-nested-ternary
        requestBody && queryPathParamsObject
          ? `,Input<${requestBody}> & ${queryPathParamsObject}`
          : // eslint-disable-next-line no-nested-ternary
          requestBody
          ? `,${requestBody}`
          : queryPathParamsObject
          ? `,${queryPathParamsObject}`
          : ''
      }>,`;
    });
  });
  generatedTSEndpoints += 'const ROUTES = {\n';
  Object.keys(routes)
    .sort()
    .forEach(method => {
      generatedTSEndpoints += `${method.toUpperCase()}: {\n`;
      Object.keys(routes[method as Uppercase<OpenAPIV3.HttpMethods>])
        .sort()
        .forEach(endpoint => {
          generatedTSEndpoints += `${endpoint}: ${routes[method as Uppercase<OpenAPIV3.HttpMethods>][endpoint]}\n`;
        });
      generatedTSEndpoints += `},\n`;
    });
  generatedTSEndpoints += '};\n\nexport default ROUTES;';

  const warningHeader =
    '/**\n* This file was auto-generated by the generateRoutes endpoint generator.\n* Do not make direct changes to the file.\n' +
    `* To update this file run \`npx apollo-rest-utils <swagger_definition> <directory_of_this_file>\`\n*/\n\n`;
  // eslint-disable-next-line lodash/prefer-includes
  if (generatedTSEndpoints.indexOf('Input<') > -1) {
    // eslint-disable-next-line max-len
    generatedTSEndpoints = `${warningHeader}import { paths } from '${typeImportLocation}'\n\nimport { IRestEndpoint, Input } from '@encoura/apollo-rest-utils';\n\n\n${generatedTSEndpoints}`;
  } else {
    // eslint-disable-next-line max-len
    generatedTSEndpoints = `${warningHeader}import { paths } from '${typeImportLocation}'\n\nimport { IRestEndpoint } from '@encoura/apollo-rest-utils';\n\n\n${generatedTSEndpoints}`;
  }

  return generatedTSEndpoints;
}

// NO TEST COVERAGE FOR THE CLI TOOL AT THIS TIME
// istanbul ignore next
async function main(): Promise<void> {
  if (require.main === module) {
    const usage = 'apollo-rest-utils <swagger_file_or_url> <output_directory> [endpoint_id]';
    if (process.argv.length < 3) {
      console.log(usage);
      throw new Error('No swagger file/URL provided as an argument');
    }
    if (process.argv.length < 4) {
      console.log(usage);
      throw new Error('No output directory provided as an argument');
    }
    const swaggerUrl = process.argv[2];
    const outputDirectory = process.argv[3];
    const endpointId = process.argv.length > 4 ? process.argv[4] : undefined;
    const typesFilename = path.join(outputDirectory, '__generatedSwaggerTypes.ts');
    const endpointsFilename = path.join(outputDirectory, '__generatedRestEndpoints.ts');
    const swaggerTypes = await generateTypes(swaggerUrl, typesFilename);
    console.log(`Types file written to ${typesFilename}`);
    const api = await SwaggerParser.validate(swaggerUrl);
    const generatedTSEndpoints = generateTypescript(api, swaggerTypes, endpointId);
    const prettierTSEndpoints = prettier.format(generatedTSEndpoints, { filepath: endpointsFilename });
    fs.writeFileSync(endpointsFilename, prettierTSEndpoints);
    console.log(`Endpoint definition file written to ${endpointsFilename}`);
  }
}

// NO TEST COVERAGE FOR THE CLI TOOL AT THIS TIME
// istanbul ignore next
main().catch((unkErr: unknown) => {
  console.error(unkErr);
  process.exit(1);
});
