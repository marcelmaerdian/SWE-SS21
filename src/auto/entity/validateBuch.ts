/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// https://json-schema.org/implementations.html

/**
 * Das Modul besteht aus dem Typ {@linkcode ValidationErrorMsg} und der
 * Funktion {@linkcode validateAuto} sowie notwendigen Konstanten.
 * @packageDocumentation
 */

// https://ajv.js.org/guide/schema-language.html#draft-2019-09-and-draft-2012-12
// https://github.com/ajv-validator/ajv/blob/master/docs/validation.md
import Ajv2020 from 'ajv/dist/2020';
import type { Auto } from './auto';
import { jsonSchema } from './jsonSchema';
import { logger } from '../../shared';

/**
 * Konstante für den maximalen Wert bei den Bewertungen
 */
export const MAX_RATING = 5;

const ajv = new Ajv2020({
    allowUnionTypes: true,
    allErrors: true,
});

/**
 * Typ für mögliche Fehlertexte bei der Validierung.
 */
export type ValidationErrorMsg = Record<string, string | undefined>;

/**
 * Funktion zur Validierung, wenn neue Bücher angelegt oder vorhandene Bücher
 * aktualisiert bzw. überschrieben werden sollen.
 */
export const validateAuto = (auto: Auto) => {
    const validate = ajv.compile<Auto>(jsonSchema);
    validate(auto);
    // nullish coalescing
    const errors = validate.errors ?? [];
    logger.debug('validateAuto: errors=%o', errors);
    const errorMsg: ValidationErrorMsg = {};
    errors.forEach((err) => {
        const { instancePath } = err;
        // eslint-disable-next-line default-case
        switch (instancePath) {
            case '/modell':
                errorMsg.modell =
                    'Ein Automodell muss mit einem Autostaben, einer Ziffer oder _ beginnen.';
                break;
            case '/rating':
                errorMsg.rating =
                    'Eine Bewertung muss zwischen 0 und 5 liegen.';
                break;
            case '/art':
                errorMsg.art =
                    'Die Art eines Autoes muss KINDLE oder DRUCKAUSGABE sein.';
                break;
            case '/produzent':
                errorMsg.produzent =
                    'Der Produzent eines Autoes muss FOO_PRODUZENT oder BAR_PRODUZENT sein.';
                break;
            case '/preis':
                errorMsg.preis = 'Der Preis darf nicht negativ sein.';
                break;
            case '/rabatt':
                errorMsg.rabatt =
                    'Der Rabatt muss ein Wert zwischen 0 und 1 sein.';
                break;
            case '/lieferbar':
                errorMsg.lieferbar =
                    '"lieferbar" muss auf true oder false gesetzt sein.';
                break;
            case '/datum':
                errorMsg.datum = 'Das Datum muss im Format yyyy-MM-dd sein.';
                break;
            case '/seriennummer':
                errorMsg.seriennummer = 'Die SERIENNUMMER-Nummer ist nicht korrekt.';
                break;
            case '/homepage':
                errorMsg.homepage = 'Die Homepage ist nicht korrekt.';
                break;
        }
    });

    logger.debug('validateAuto: errorMsg=%o', errorMsg);
    return Object.entries(errorMsg).length === 0 ? undefined : errorMsg;
};
