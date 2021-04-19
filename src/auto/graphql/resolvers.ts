/*
 * Copyright (C) 2018 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/**
 * Das Modul enthält die _Resolver_ für GraphQL.
 *
 * Die Referenzimplementierung von GraphQL soll übrigens nach TypeScript
 * migriert werden: https://github.com/graphql/graphql-js/issues/2860
 * @packageDocumentation
 */

import {
    AutoInvalid,
    AutoNotExists,
    ModellExists,
    VersionInvalid,
    VersionOutdated,
} from './../service/errors';
import { AutoService, AutoServiceError } from '../service';
import type { Auto } from './../entity';
import { logger } from '../../shared';

const autoService = new AutoService();

// https://www.apollographql.com/docs/apollo-server/data/resolvers
// Zugriff auf Header-Daten, z.B. Token
// https://www.apollographql.com/docs/apollo-server/migration-two-dot/#accessing-request-headers
// https://www.apollographql.com/docs/apollo-server/security/authentication

// Resultat mit id (statt _id) und version (statt __v)
// __ ist bei GraphQL fuer interne Zwecke reserviert
const withIdAndVersion = (auto: Auto) => {
    const result: any = auto;
    result.id = auto._id;
    result.version = auto.__v;
    return auto;
};

const findAutoById = async (id: string) => {
    const auto = await autoService.findById(id);
    if (auto === undefined) {
        return;
    }
    return withIdAndVersion(auto);
};

const findAutos = async (modell: string | undefined) => {
    const suchkriterium = modell === undefined ? {} : { modell };
    const autos = await autoService.find(suchkriterium);
    return autos.map((auto: Auto) => withIdAndVersion(auto));
};

interface ModellCriteria {
    modell: string;
}

interface IdCriteria {
    id: string;
}

const createAuto = async (auto: Auto) => {
    const result = await autoService.create(auto);
    logger.debug('resolvers createAuto(): result=%o', result);
    if (result instanceof AutoServiceError) {
        return;
    }
    return result;
};

const logUpdateResult = (
    result:
        | AutoInvalid
        | AutoNotExists
        | ModellExists
        | VersionInvalid
        | VersionOutdated
        | number,
) => {
    if (result instanceof AutoInvalid) {
        logger.debug('resolvers updateAuto(): validation msg = %o', result.msg);
    } else if (result instanceof ModellExists) {
        logger.debug(
            'resolvers updateAuto(): vorhandener modell = %s',
            result.modell,
        );
    } else if (result instanceof AutoNotExists) {
        logger.debug(
            'resolvers updateAuto(): nicht-vorhandene id = %s',
            result.id,
        );
    } else if (result instanceof VersionInvalid) {
        logger.debug(
            'resolvers updateAuto(): ungueltige version = %d',
            result.version,
        );
    } else if (result instanceof VersionOutdated) {
        logger.debug(
            'resolvers updateAuto(): alte version = %d',
            result.version,
        );
    } else {
        logger.debug(
            'resolvers updateAuto(): aktualisierte Version= %d',
            result,
        );
    }
};

const updateAuto = async (auto: Auto) => {
    logger.debug(
        'resolvers updateAuto(): zu aktualisieren = %s',
        JSON.stringify(auto),
    );
    // nullish coalescing
    const version = auto.__v ?? 0;
    const result = await autoService.update(auto, version.toString());
    logUpdateResult(result);
    return result;
};

const deleteAuto = async (id: string) => {
    const result = await autoService.delete(id);
    logger.debug('resolvers deleteAuto(): result = %s', result);
    return result;
};

// Queries passend zu "type Query" in typeDefs.ts
const query = {
    /**
     * Bücher suchen
     * @param _ nicht benutzt
     * @param __namedParameters JSON-Objekt mit `modell` als Suchkriterium
     * @returns Promise mit einem JSON-Array der gefundenen Bücher
     */
    autos: (_: unknown, { modell }: ModellCriteria) => findAutos(modell),

    /**
     * Auto suchen
     * @param _ nicht benutzt
     * @param __namedParameters JSON-Objekt mit `id` als Suchkriterium
     * @returns Promise mit dem gefundenen {@linkcode Auto} oder `undefined`
     */
    auto: (_: unknown, { id }: IdCriteria) => findAutoById(id),
};

const mutation = {
    /**
     * Neues Auto anlegen
     * @param _ nicht benutzt
     * @param auto JSON-Objekt mit dem neuen {@linkcode Auto}
     * @returns Promise mit der generierten ID
     */
    createAuto: (_: unknown, auto: Auto) => createAuto(auto),

    /**
     * Vorhandenes {@linkcode Auto} aktualisieren
     * @param _ nicht benutzt
     * @param auto JSON-Objekt mit dem zu aktualisierenden Auto
     * @returns Das aktualisierte Auto als {@linkcode AutoData} in einem Promise,
     * falls kein Fehler aufgetreten ist. Ansonsten ein Promise mit einem Fehler
     * durch:
     * - {@linkcode AutoInvalid}
     * - {@linkcode AutoNotExists}
     * - {@linkcode ModellExists}
     * - {@linkcode VersionInvalid}
     * - {@linkcode VersionOutdated}
     */
    updateAuto: (_: unknown, auto: Auto) => updateAuto(auto),

    /**
     * Auto löschen
     * @param _ nicht benutzt
     * @param __namedParameters JSON-Objekt mit `id` zur Identifikation
     * @returns true, falls das Auto gelöscht wurde. Sonst false.
     */
    deleteAuto: (_: unknown, { id }: IdCriteria) => deleteAuto(id),
};

/**
 * Die Resolver bestehen aus `Query` und `Mutation`.
 */
export const resolvers /* : IResolvers */ = {
    Query: query, // eslint-disable-line @typescript-eslint/naming-convention
    Mutation: mutation, // eslint-disable-line @typescript-eslint/naming-convention
};
