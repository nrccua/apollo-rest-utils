import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

import SwaggerParser from '@apidevtools/swagger-parser';

import { generateTypes, generateTypescript, normalizeName, pathToType } from '.';

const buildFolder = path.join('.', 'build', 'tests');

function createBuildFolder(): void {
  if (!fs.existsSync(buildFolder)) {
    fs.mkdirSync(buildFolder, { recursive: true });
  }
}
function deleteBuildFolder(): void {
  if (fs.existsSync(buildFolder)) {
    fs.rmdirSync(buildFolder, { recursive: true });
  }
}

function doTestImport(tsData: string): void {
  const filename = `${randomUUID()}.ts`;

  fs.writeFileSync(path.join(buildFolder, filename), tsData);

  expect(() => {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, security/detect-non-literal-require, import/no-dynamic-require, global-require, @typescript-eslint/no-var-requires
    const endpoints = require(`../../build/tests/${filename}`);
    expect(endpoints).toBeTruthy(); // Probably a better test here, but I don't know what it would be
  }).not.toThrow();
}

describe('generateTypescript', () => {
  const testSwaggerPath = './test/test_data/generateRoutes/';

  beforeAll(() => {
    createBuildFolder();
  });

  afterAll(() => {
    deleteBuildFolder();
  });

  it.each(fs.readdirSync(testSwaggerPath).map(d => path.join(testSwaggerPath, d)))(
    'can parse the swagger document %s',
    async apiPath => {
      const api = await SwaggerParser.validate(apiPath);

      const typeImport = await generateTypes(apiPath, path.join(buildFolder, `${randomUUID()}_types.ts`));

      const tsData = generateTypescript(api, typeImport).replace(/@encoura\/apollo-rest-utils/g, '../../lib');

      expect(tsData).toBeTruthy(); // Not empty, null, or undefined

      expect(tsData.includes(', endpoint: "')).toBe(false);

      doTestImport(tsData);
    },
  );

  it('can generate endpoints with the optional endpoint id', async () => {
    const apiPath = path.join(testSwaggerPath, 'OpenAPIV3WithRef.json');

    const api = await SwaggerParser.validate(apiPath);

    const typeImport = await generateTypes(apiPath, path.join(buildFolder, `${randomUUID()}_types.ts`));

    const tsData = generateTypescript(api, typeImport, 'TEST').replace(/@encoura\/apollo-rest-utils/g, '../../lib');

    expect(tsData).toBeTruthy(); // Not empty, null, or undefined

    // Make sure we have an endpoint option for every rest method
    expect(tsData.match(/[@]rest/g)).not.toBeUndefined();
    expect(tsData.match(/[@]rest/g)?.length).toEqual(tsData.match(/, endpoint: "TEST"/g)?.length);

    doTestImport(tsData);
  });
});

describe('normalizeName', () => {
  it.each([
    ['/login', 'LOGIN'],
    ['login', 'LOGIN'],
    ['/high-schools/search', 'HIGH_SCHOOLS_SEARCH'],
    ['/invitations/{studentKey}/users/{mentorEmail}', 'INVITATIONS_BY_STUDENTKEY_USERS_BY_MENTOREMAIL'],
    ['/{userId}/{studentKey}/{email}', 'BY_USERID_BY_STUDENTKEY_BY_EMAIL'],
  ])('path %s produces name %s', (pathName, expectedEndpointName) => {
    expect(normalizeName(pathName)).toEqual(expectedEndpointName);
  });
});

describe('pathToType', () => {
  it.each([
    ['/login', 'LoginResponse'],
    ['/high-schools/search', 'HighSchoolsSearchResponse'],
    ['/invitations/{studentKey}/users/{mentorEmail}', 'InvitationsByStudentkeyUsersByMentoremailResponse'],
  ])('path %s produces type name %s', (pathName, expectedTypeName) => {
    expect(pathToType(pathName)).toEqual(expectedTypeName);
  });
});
