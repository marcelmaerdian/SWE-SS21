import type { GenericJsonSchema } from './GenericJsonSchema';

export const MAX_RATING = 5;

export const jsonSchema: GenericJsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'http://acme.com/buch.json#',
    title: 'Buch',
    description: 'Eigenschaften eines Buches: Typen und Constraints',
    type: 'object',
    properties: {
        /* eslint-disable @typescript-eslint/naming-convention */
        _id: {
            type: 'string',
            pattern:
                '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$',
        },
        __v: {
            type: 'number',
            minimum: 0,
        },
        /* eslint-enable @typescript-eslint/naming-convention */
        titel: {
            type: 'string',
            pattern: '^\\w.*',
        },
        rating: {
            type: 'number',
            minimum: 0,
            maximum: MAX_RATING,
        },
        art: {
            type: 'string',
            enum: ['DRUCKAUSGABE', 'KINDLE', ''],
        },
        verlag: {
            type: 'string',
            enum: ['BAR_VERLAG', 'FOO_VERLAG', ''],
        },
        preis: {
            type: 'number',
            minimum: 0,
        },
        rabatt: {
            type: 'number',
            exclusiveMinimum: 0,
            exclusiveMaximum: 1,
        },
        lieferbar: { type: 'boolean' },
        datum: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
        isbn: {
            type: 'string',
            // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
            pattern:
                '^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|' +
                '(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|' +
                '(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?' +
                '[0-9]+[- ]?[0-9]+[- ]?[0-9X]*',
        },
        homepage: {
            type: 'string',
            // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch08s01.html
            // https://mathiasbynens.be/demo/url-regex
            // https://stackoverflow.com/questions/161738/what-is-the-best-regular-expression-to-check-if-a-string-is-a-valid-url
            // https://github.com/validatorjs/validator.js/blob/master/src/lib/isURL.js
            pattern: '^(https?://|www.)[a-z0-9-]+(.[a-z0-9-]+)+([/?].*)?$',
        },
        schlagwoerter: {
            type: 'array',
            items: { type: 'string' },
        },
        autoren: {
            type: 'array',
            items: { type: 'object' },
        },
    },
    // isbn ist NUR beim Neuanlegen ein Pflichtfeld
    // Mongoose bietet dazu die Funktion MyModel.findByIdAndUpdate()
    required: ['titel', 'art', 'verlag'],
    additionalProperties: false,
};
