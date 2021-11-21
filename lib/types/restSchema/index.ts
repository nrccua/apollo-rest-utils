import { isObject } from 'lodash';

// This should probably come from OpenAPITypes, but it works for now
export interface IRestEndpointHeaderSchema {
  type: 'string';
  enum: string[];
}

export interface IRestEndpointHeader {
  name: string;
  description: string;
  required?: boolean;
  schema: IRestEndpointHeaderSchema;
}

export interface IRestEndpoint<ResponseType, RequestType = unknown> {
  gql: string;
  requestBody?: RequestType;
  responseBody?: ResponseType;
  headers?: IRestEndpointHeader[];
  responseSchema: RestEndpointSchema;
}

export type Input<T> = T | { input: T };

export interface IEndpointOptions<T, U> {
  endpoint: IRestEndpoint<T, U>;
}

export type NamedGQLResult<Name extends string, TData = unknown> = {
  [k in Name]: TData;
};

export type RestEndpointSchema = (string | { [k in string]?: RestEndpointSchema })[];

export function getSchemaField(schema: RestEndpointSchema, field: string): RestEndpointSchema | undefined {
  if (schema.includes(field)) {
    return [field];
  }
  const schemaObjects = schema.filter(schemaItem => isObject(schemaItem));
  const found = schemaObjects.filter(schemaItem => Object.keys(schemaItem)[0] === field);
  if (found.length === 1) {
    return (found[0] as Record<string, RestEndpointSchema>)[field];
  }
  return undefined;
}