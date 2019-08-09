// tslint:disable:no-implicit-dependencies - this should only be run in dev mode
import * as TJS from 'typescript-json-schema';
import * as glob from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import {
  InputData,
  JSONSchemaInput,
  NewtonsoftCSharpTargetLanguage,
  Options,
  quicktype
} from 'quicktype-core';
const fsPromise = {
  writeFile: promisify(fs.writeFile),
  mkdir: promisify(fs.mkdir)
};
const get = require('lodash.get');

const generateSchema = () => {
  const settings: TJS.PartialArgs = {
    titles: true,                  // Adds title attribute to each schema property
    required: true,                // Creates an array of required properties
    strictNullChecks: true,        // Makes values non-nullable by default
    validationKeywords: ['items'], // Allow overwriting of item definitions
    noExtraProps: true
  };

  // Get a list of typescript files to generate types for
  // They *MUST* have their absolute path for typescript-json-schema to correctly include them
  const files = glob.sync('../fscommerce/src/Commerce/types/*.ts', { absolute: true });

  const program = TJS.programFromConfig('../fscommerce/tsconfig.json', files);
  const schema = TJS.generateSchema(program, 'Product', settings, files);

  if (!schema) {
    throw new Error('Unable to generate schema');
  }

  return schema;
};

const alterSchema = (schema: TJS.Definition) => {
  if (!schema.definitions) {
    return schema;
  }

  // Remove definitions that we don't want to include
  // These are either poorly-parsed generics (which are fixed below) or types that are overwritten
  const definitionsToRemove = ['Decimal', 'T', 'T_1'];
  for (const def of definitionsToRemove) {
    delete schema.definitions[def];
  }

  // Remove the reference to the decimal class from CurrencyValue
  // Setting the type to be string is handled through an annotation in the TS interface
  if (get(schema, 'definitions.CurrencyValue.properties.value')) {
    delete schema.definitions.CurrencyValue.properties.value.$ref;
  }

  /**
   * NOTE
   *
   * typescript-json-schema doesn't handle generics very well, so it might be necessary to overwrite
   * or fix the generated definitions. This can usually be handled annotations (See: CartItem),
   * but there may be cases where you need to actually alter the generated schema. You're able to do
   * something like:
   *
   * if (get(schema, 'definitions.ProductIndex.properties.products.items.$ref')) {
   *   schema.definitions.ProductIndex.properties.products.items.$ref = '#/definitions/Product';
   * }
   */

  return schema;
};

const definitionToInputData = async (schema: TJS.Definition) => {
  const inputData = new InputData();

  // Source for the input data. The generated schema isn't for a particular object, so
  // the name MUST be '#/definitions/' so that it actually finds data
  const source = { kind: 'schema', name: '#/definitions/', schema: JSON.stringify(schema) };

  // "JSONSchemaInput" is the class that reads JSON Schema and converts it into quicktype's
  // internal type representation
  await inputData.addSource('schema', source, () => new JSONSchemaInput(undefined));

  return inputData;
};

const inputDataToCSharp = async (inputData: InputData) => {
  // "NewtonsoftCSharpTargetLanguage" will generate the C# classes with attributes for
  // Newtonsoft's Json.NET as well as serialization/deserialization helpers for validation.
  // "CSharpTargetLanguage" will produce C# classes as well, but doesn't do validation.
  const lang = new NewtonsoftCSharpTargetLanguage();

  const options: Partial<Options> = {
    lang,
    inputData,
    alphabetizeProperties: true,
    allPropertiesOptional: false,
    fixedTopLevels: true,
    rendererOptions: {
      // Finding the available options for "rendererOptions" is a little weird
      // Easiest way to find these options is to check in the cli help
      'array-type': 'list',
      namespace: 'EPiServer.Reference.Commerce.Site.Features.Shared.FlagshipViewModels',
      'check-required': 'true',
      'number-type': 'decimal'
    }
  };

  const { lines } = await quicktype(options);
  return lines.join('\n');
};

const writeFile = async (filename: string, contents: any) => {
  const schemaDir = path.resolve('.', 'schemas');

  // fs.exists is deprecated and should not be used
  const schemaDirExists = await fs.existsSync(schemaDir);
  if (!schemaDirExists) {
    await fsPromise.mkdir(schemaDir);
  }

  const filePath = path.resolve(schemaDir, filename);
  await fsPromise.writeFile(filePath, contents);
};

const generateOverview = (schema: TJS.Definition): string => {
  if (!schema.properties) {
    return '';
  }

  return Object
    .keys(schema.properties)
    .map(propName => schema.properties ?
      `${propName}: ${schema.properties[propName].description.replace(/\n/, ' ') ||
        'No description'}` :
      ''
    )
    .join('\n');
};

(async () => {
  const filename = 'product';

  // Generate a JSON Schema based on our Typescript interfaces
  const schema = alterSchema(generateSchema());

  // Write out the JSON Schema document
  await writeFile(`${filename}.json`, JSON.stringify(schema, null, 2));

  // Convert the JSON Schema to Quicktype's internal data structure
  const inputData = await definitionToInputData(schema);

  // Convert Quicktype's structure to C# code
  const sourceCode = await inputDataToCSharp(inputData);

  // Write out the C# file
  // TODO: See about publishing this someplace
  await writeFile(`${filename}.cs`, sourceCode);

  // Generate high level overview of schema
  const overview = generateOverview(schema);
  await writeFile(`${filename}.txt`, overview);
})();
