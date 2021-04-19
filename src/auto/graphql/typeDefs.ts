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
 * Das Modul enthält die _Typdefinitionen_ für GraphQL, die mit einem _Tagged
 * Template String_ für Apollo realisiert sind.
 *
 * Vordefinierte skalare Typen
 * - Int: 32‐bit Integer
 * - Float: Gleitkommmazahl mit doppelter Genauigkeit
 * - String:
 * - Boolean: true, false
 * - ID: eindeutiger Bezeichner, wird serialisiert wie ein String
 *
 * `Auto`: eigene Typdefinition für Queries. `!` markiert Pflichtfelder
 *
 * `Query`: Signatur der Lese-Methoden
 *
 * `Mutation`: Signatur der Schreib-Methoden
 * @packageDocumentation
 */

import { gql } from 'apollo-server-express';

// https://www.apollographql.com/docs/apollo-server/migration-two-dot/#the-gql-tag
// https://www.apollographql.com/docs/apollo-server/schema/schema

/**
 * _Tagged Template String_, d.h. der Template-String wird durch eine Funktion
 * (hier: `gql`) modifiziert. Die Funktion `gql` wird für Syntax-Highlighting
 * und für die Formatierung durch Prettier verwendet.
 */
export const typeDefs = gql`
    "Enum-Typ fuer die Art eines Autoes"
    enum Art {
        DRUCKAUSGABE
        KINDLE
    }

    "Enum-Typ fuer den Hersteller eines Autoes"
    enum Hersteller {
        FOO_HERSTELLER
        BAR_HERSTELLER
    }

    "Datenschema eines Autoes, das empfangen oder gesendet wird"
    type Auto {
        id: ID!
        version: Int
        modell: String!
        rating: Int
        art: Art
        hersteller: Hersteller!
        preis: Float
        rabatt: Float
        lieferbar: Boolean
        datum: String
        seriennummer: String
        homepage: String
        schlagwoerter: [String]
    }

    "Funktionen, um Autos zu empfangen"
    type Query {
        autos(modell: String): [Auto]
        auto(id: ID!): Auto
    }

    "Funktionen, um Autos anzulegen, zu aktualisieren oder zu loeschen"
    type Mutation {
        createAuto(
            modell: String!
            rating: Int
            art: String
            hersteller: String!
            preis: Float
            rabatt: Float
            lieferbar: Boolean
            datum: String
            seriennummer: String
            homepage: String
            schlagwoerter: [String]
        ): String
        updateAuto(
            _id: ID
            modell: String!
            rating: Int
            art: String
            hersteller: String!
            preis: Float
            rabatt: Float
            lieferbar: Boolean
            datum: String
            seriennummer: String
            homepage: String
            schlagwoerter: [String]
            version: Int
        ): Int
        deleteAuto(id: ID!): Boolean
    }
`;
