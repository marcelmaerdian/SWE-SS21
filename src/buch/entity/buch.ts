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

/**
 * Das Modul besteht aus dem Interface {@linkcode BuchData} und der Klasse
 * {@linkcode BuchDocument} für Mongoose. Aus dem Interface {@linkcode BuchData}
 * ist das Interface {@linkcode Buch} extrahiert, das an der REST- und
 * GraphQL-Schnittstelle verwendet wird.
 * @packageDocumentation
 */

/**
 * Alias-Typ für gültige Strings bei Verlagen.
 */
export type Verlag = 'BAR_VERLAG' | 'FOO_VERLAG';

/**
 * Alias-Typ für gültige Strings bei der Art eines Buches.
 */
export type BuchArt = 'DRUCKAUSGABE' | 'KINDLE';

/**
 * Gemeinsames Interface für _REST_, _GraphQL_ und _Mongoose_.
 */
export interface Buch {
    // _id und __v werden bei REST durch HATEOAS und ETag abgedeckt
    // und deshalb beim Response entfernt.
    // Ausserdem wird _id bei einem POST-Request generiert
    _id?: string; // eslint-disable-line @typescript-eslint/naming-convention

    __v?: number; // eslint-disable-line @typescript-eslint/naming-convention

    readonly titel: string | null | undefined;
    readonly rating: number | null | undefined;
    readonly art: BuchArt | '' | null | undefined;
    readonly verlag: Verlag | '' | null | undefined;
    readonly preis: number | undefined;
    readonly rabatt: number | undefined;
    readonly lieferbar: boolean | undefined;

    // string bei REST und Date bei GraphQL sowie Mongoose
    datum: Date | string | undefined;

    readonly isbn: string | null | undefined;
    readonly homepage: string | null | undefined;
    readonly schlagwoerter?: string[];
    readonly autoren: unknown;
}

/**
 * Interface für die Rohdaten aus MongoDB durch die _Mongoose_-Funktion `lean()`.
 */
export interface BuchData extends Buch {
    // Zeitstempel fuer die MongoDB-Dokumente:
    // wird bei der Rueckgabe aus dem Anwendungskern entfernt
    createdAt?: Date;

    updatedAt?: Date;
}
