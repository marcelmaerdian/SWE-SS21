/* eslint-disable max-lines */
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
 * Das Modul besteht aus der Klasse {@linkcode AuthService} für die
 * Authentifizierung.
 * @packageDocumentation
 */

import type { Auto, AutoData, AutoDocument } from '../entity';
import {
    AutoInvalid,
    AutoNotExists,
    AutoServiceError,
    IsbnExists,
    TitelExists,
    VersionInvalid,
    VersionOutdated,
} from './errors';
import { AutoModel, validateAuto } from '../entity';
import type { FilterQuery, QueryOptions } from 'mongoose';
import { cloud, logger, mailConfig } from '../../shared';
import type { SendMailOptions } from 'nodemailer';

// API-Dokumentation zu Mongoose:
// http://mongoosejs.com/docs/api.html
// https://github.com/Automattic/mongoose/issues/3949

/* eslint-disable no-null/no-null, unicorn/no-useless-undefined */

/**
 * Die Klasse `AutoService` implementiert den Anwendungskern für Bücher und
 * greift mit _Mongoose_ auf MongoDB zu.
 */
export class AutoService {
    private static readonly UPDATE_OPTIONS: QueryOptions = { new: true };

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C# und Mono<> aus Project Reactor
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Auto asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Autoes
     * @returns Das gefundene Auto vom Typ {@linkcode AutoData} oder undefined
     *          in einem Promise aus ES2015 (vgl.: Mono aus Project Reactor oder
     *          Future aus Java)
     */
    async findById(id: string) {
        logger.debug('AutoService.findById(): id=%s', id);

        // ein Auto zur gegebenen ID asynchron mit Mongoose suchen
        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // Das Resultat ist null, falls nicht gefunden.
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document,
        // so dass u.a. der virtuelle getter "id" auch nicht mehr vorhanden ist.
        const Auto = await AutoModel.findById(id).lean<AutoData | null>();
        logger.debug('AutoService.findById(): Auto=%o', Auto);

        if (Auto === null) {
            return undefined;
        }

        this.deleteTimestamps(Auto);
        return Auto;
    }

    /**
     * Bücher asynchron suchen.
     * @param query Die DB-Query als JSON-Objekt
     * @returns Ein JSON-Array mit den gefundenen Büchern. Ggf. ist das Array leer.
     */
    // eslint-disable-next-line max-lines-per-function
    async find(query?: FilterQuery<AutoDocument> | undefined) {
        logger.debug('AutoService.find(): query=%o', query);

        // alle Buecher asynchron suchen u. aufsteigend nach titel sortieren
        // https://docs.mongodb.org/manual/reference/object-id
        // entries(): { titel: 'a', rating: 5 } => [{ titel: 'x'}, {rating: 5}]
        if (query === undefined || Object.entries(query).length === 0) {
            logger.debug('AutoService.find(): alle Buecher');
            // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
            const buecher = await AutoModel.find()
                .sort('titel')
                .lean<AutoData[]>();
            for await (const Auto of buecher) {
                this.deleteTimestamps(Auto);
            }
            return buecher;
        }

        // { titel: 'a', rating: 5, javascript: true }
        // Rest Properties
        const { titel, javascript, typescript, ...dbQuery } = query;

        // Buecher zur Query (= JSON-Objekt durch Express) asynchron suchen
        // Titel in der Query: Teilstring des Titels,
        // d.h. "LIKE" als regulaerer Ausdruck
        // 'i': keine Unterscheidung zw. Gross- u. Kleinschreibung
        // NICHT /.../, weil das Muster variabel sein muss
        // CAVEAT: KEINE SEHR LANGEN Strings wg. regulaerem Ausdruck
        if (
            titel !== undefined &&
            titel !== null &&
            typeof titel === 'string' &&
            // eslint-disable-next-line @typescript-eslint/no-magic-numbers
            titel.length < 10
        ) {
            // RegExp statt Re2 wegen Mongoose
            dbQuery.titel = new RegExp(titel, 'iu'); // eslint-disable-line security/detect-non-literal-regexp, security-node/non-literal-reg-expr
        }

        // z.B. {javascript: true, typescript: true}
        const schlagwoerter = [];
        if (javascript === 'true') {
            schlagwoerter.push('JAVASCRIPT');
        }
        if (typescript === 'true') {
            schlagwoerter.push('TYPESCRIPT');
        }
        if (schlagwoerter.length === 0) {
            delete dbQuery.schlagwoerter;
        } else {
            dbQuery.schlagwoerter = schlagwoerter;
        }

        logger.debug('AutoService.find(): dbQuery=%o', dbQuery);

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // leeres Array, falls nichts gefunden wird
        // AutoModel.findOne(query), falls das Suchkriterium eindeutig ist
        // bei findOne(query) wird null zurueckgeliefert, falls nichts gefunden
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        const buecher = await AutoModel.find(dbQuery).lean<AutoData[]>();
        for await (const Auto of buecher) {
            this.deleteTimestamps(Auto);
        }

        return buecher;
    }

    /**
     * Ein neues Auto soll angelegt werden.
     * @param Auto Das neu abzulegende Auto
     * @returns Die ID des neu angelegten Autoes oder im Fehlerfall
     * - {@linkcode AutoInvalid} falls die Autodaten gegen Constraints verstoßen
     * - {@linkcode IsbnExists} falls die ISBN-Nr bereits existiert
     * - {@linkcode TitelExists} falls der Titel bereits existiert
     */
    async create(
        Auto: Auto,
    ): Promise<AutoInvalid | IsbnExists | TitelExists | string> {
        logger.debug('AutoService.create(): Auto=%o', Auto);
        const validateResult = await this.validateCreate(Auto);
        if (validateResult instanceof AutoServiceError) {
            return validateResult;
        }

        const AutoModel = new AutoModel(Auto);
        const saved = await AutoModel.save();
        const id = saved._id as string; // eslint-disable-line @typescript-eslint/non-nullable-type-assertion-style
        logger.debug('AutoService.create(): id=%s', id);

        await this.sendmail(Auto);

        return id;
    }

    /**
     * Ein vorhandenes Auto soll aktualisiert werden.
     * @param Auto Das zu aktualisierende Auto
     * @param versionStr Die Versionsnummer für optimistische Synchronisation
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     *  oder im Fehlerfall
     *  - {@linkcode AutoInvalid}, falls Constraints verletzt sind
     *  - {@linkcode AutoNotExists}, falls das Auto nicht existiert
     *  - {@linkcode TitelExists}, falls der Titel bereits existiert
     *  - {@linkcode VersionInvalid}, falls die Versionsnummer ungültig ist
     *  - {@linkcode VersionOutdated}, falls die Versionsnummer nicht aktuell ist
     */
    async update(
        Auto: Auto,
        versionStr: string,
    ): Promise<
        | AutoInvalid
        | AutoNotExists
        | TitelExists
        | VersionInvalid
        | VersionOutdated
        | number
    > {
        logger.debug('AutoService.update(): Auto=%o', Auto);
        logger.debug('AutoService.update(): versionStr=%s', versionStr);

        const validateResult = await this.validateUpdate(Auto, versionStr);
        if (validateResult instanceof AutoServiceError) {
            return validateResult;
        }

        // findByIdAndReplace ersetzt ein Document mit ggf. weniger Properties
        const AutoModel = new AutoModel(Auto);
        // Weitere Methoden zum Aktualisieren:
        //    Auto.findOneAndUpdate(update)
        //    Auto.updateOne(bedingung)
        const updated = await AutoModel.findByIdAndUpdate(
            Auto._id,
            AutoModel,
            AutoService.UPDATE_OPTIONS,
        ).lean<AutoData | null>();
        if (updated === null) {
            return new AutoNotExists(Auto._id);
        }

        const version = updated.__v as number; // eslint-disable-line @typescript-eslint/non-nullable-type-assertion-style
        logger.debug('AutoService.update(): version=%d', version);

        return Promise.resolve(version);
    }

    /**
     * Ein Auto wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Autoes
     * @returns true, falls das Auto vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: string) {
        logger.debug('AutoService.delete(): id=%s', id);

        // Das Auto zur gegebenen ID asynchron loeschen
        const deleted = await AutoModel.findByIdAndDelete(id).lean();
        logger.debug('AutoService.delete(): deleted=%o', deleted);
        return deleted !== null;

        // Weitere Methoden von mongoose, um zu loeschen:
        //  Auto.findByIdAndRemove(id)
        //  Auto.findOneAndRemove(bedingung)
    }

    private deleteTimestamps(Auto: AutoData) {
        delete Auto.createdAt;
        delete Auto.updatedAt;
    }

    private async validateCreate(Auto: Auto) {
        const msg = validateAuto(Auto);
        if (msg !== undefined) {
            logger.debug(
                'AutoService.validateCreate(): Validation Message: %o',
                msg,
            );
            return new AutoInvalid(msg);
        }

        // statt 2 sequentiellen DB-Zugriffen waere 1 DB-Zugriff mit OR besser

        const { titel } = Auto;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await AutoModel.exists({ titel })) {
            return new TitelExists(titel);
        }

        const { isbn } = Auto;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await AutoModel.exists({ isbn })) {
            return new IsbnExists(isbn);
        }

        logger.debug('AutoService.validateCreate(): ok');
        return undefined;
    }

    private async sendmail(Auto: Auto) {
        if (cloud !== undefined || mailConfig.host === 'skip') {
            // In der Cloud kann man z.B. "@sendgrid/mail" statt
            // "nodemailer" mit lokalem Mailserver verwenden
            return;
        }

        const from = '"Joe Doe" <Joe.Doe@acme.com>';
        const to = '"Foo Bar" <Foo.Bar@acme.com>';
        const subject = `Neues Auto ${Auto._id}`;
        const body = `Das Auto mit dem Titel <strong>${Auto.titel}</strong> ist angelegt`;

        const data: SendMailOptions = { from, to, subject, html: body };
        logger.debug('sendMail(): data=%o', data);

        try {
            const nodemailer = await import('nodemailer'); // eslint-disable-line node/no-unsupported-features/es-syntax
            await nodemailer.createTransport(mailConfig).sendMail(data);
        } catch (err: unknown) {
            logger.error(
                'AutoService.create(): Fehler beim Verschicken der Email: %o',
                err,
            );
        }
    }

    private async validateUpdate(Auto: Auto, versionStr: string) {
        const result = this.validateVersion(versionStr);
        if (typeof result !== 'number') {
            return result;
        }

        const version = result;
        logger.debug('AutoService.validateUpdate(): version=%d', version);
        logger.debug('AutoService.validateUpdate(): Auto=%o', Auto);

        const validationMsg = validateAuto(Auto);
        if (validationMsg !== undefined) {
            return new AutoInvalid(validationMsg);
        }

        const resultTitel = await this.checkTitelExists(Auto);
        if (resultTitel !== undefined && resultTitel.id !== Auto._id) {
            return resultTitel;
        }

        if (Auto._id === undefined) {
            return new AutoNotExists(undefined);
        }

        const resultIdAndVersion = await this.checkIdAndVersion(
            Auto._id,
            version,
        );
        if (resultIdAndVersion !== undefined) {
            return resultIdAndVersion;
        }

        logger.debug('AutoService.validateUpdate(): ok');
        return undefined;
    }

    private validateVersion(versionStr: string | undefined) {
        if (versionStr === undefined) {
            const error = new VersionInvalid(versionStr);
            logger.debug(
                'AutoService.validateVersion(): VersionInvalid=%o',
                error,
            );
            return error;
        }

        const version = Number.parseInt(versionStr, 10);
        if (Number.isNaN(version)) {
            const error = new VersionInvalid(versionStr);
            logger.debug(
                'AutoService.validateVersion(): VersionInvalid=%o',
                error,
            );
            return error;
        }

        return version;
    }

    private async checkTitelExists(Auto: Auto) {
        const { titel } = Auto;

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        const result = await AutoModel.findOne({ titel }, { _id: true }).lean();
        if (result !== null) {
            const id = result._id;
            logger.debug('AutoService.checkTitelExists(): _id=%s', id);
            return new TitelExists(titel, id);
        }

        logger.debug('AutoService.checkTitelExists(): ok');
        return undefined;
    }

    private async checkIdAndVersion(id: string, version: number) {
        const AutoDb: AutoData | null = await AutoModel.findById(id).lean();
        if (AutoDb === null) {
            const result = new AutoNotExists(id);
            logger.debug(
                'AutoService.checkIdAndVersion(): AutoNotExists=%o',
                result,
            );
            return result;
        }

        // nullish coalescing
        const versionDb = AutoDb.__v ?? 0;
        if (version < versionDb) {
            const result = new VersionOutdated(id, version);
            logger.debug(
                'AutoService.checkIdAndVersion(): VersionOutdated=%o',
                result,
            );
            return result;
        }

        return undefined;
    }
}
/* eslint-enable no-null/no-null, unicorn/no-useless-undefined */
/* eslint-enable max-lines */
