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

import { HttpMethod, agent, createTestserver } from '../../testserver';
import { HttpStatus, logger, nodeConfig } from '../../../src/shared';
import { afterAll, beforeAll, describe, test } from '@jest/globals';
import fetch, { Headers, Request } from 'node-fetch';
import type { AddressInfo } from 'net';
import type { Auto } from '../../../src/auto/entity';
import { MAX_RATING } from '../../../src/auto/entity';
import { PATHS } from '../../../src/app';
import type { Server } from 'http';
import chai from 'chai';
import { login } from '../../login';

const { expect } = chai;

// IIFE (= Immediately Invoked Function Expression) statt top-level await
// https://developer.mozilla.org/en-US/docs/Glossary/IIFE
(async () => {
    // startWith(), endWith()
    const chaiString = await import('chai-string');
    chai.use(chaiString.default);
})();

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaendertesAuto: Omit<Auto, 'seriennummer'> = {
    // seriennummer wird nicht geaendet
    modell: 'Geaendert',
    rating: 1,
    art: 'CABRIO',
    produzent: 'FOO_PRODUZENT',
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    homepage: 'https://test.te',
    produktionswerke: [{ nachname: 'Gamma', vorname: 'Claus' }],
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
};
const idVorhanden = '00000000-0000-0000-0000-000000000003';

const geaendertesAutoIdNichtVorhanden: Omit<
    Auto,
    'seriennummer' | 'homepage'
> = {
    modell: 'Nichtvorhanden',
    rating: 1,
    art: 'CABRIO',
    produzent: 'FOO_PRODUZENT',
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    produktionswerke: [{ nachname: 'Gamma', vorname: 'Claus' }],
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
};
const idNichtVorhanden = '00000000-0000-0000-0000-000000000999';

const geaendertesAutoInvalid: object = {
    model: 'Alpha',
    rating: -1,
    art: 'UNSICHTBAR',
    produzent: 'NO_PRODUZENT',
    preis: 0.01,
    rabatt: 0,
    lieferbar: true,
    datum: '12345-123-123',
    seriennummer: 'falsche-SERIENNUMMER',
    produktionswerke: [{ nachname: 'Test', vorname: 'Theo' }],
    schlagwoerter: [],
};

const veraltesAuto: object = {
    // seriennummer wird nicht geaendet
    model: 'Veraltet',
    rating: 1,
    art: 'CABRIO',
    produzent: 'FOO_PRODUZENT',
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    homepage: 'https://test.te',
    produktionswerke: [{ nachname: 'Gamma', vorname: 'Claus' }],
    schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
const path = PATHS.autos;
let server: Server;
let autosUri: string;
let loginUri: string;

// Test-Suite
describe('PUT /api/autos/:id', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        server = await createTestserver();

        const address = server.address() as AddressInfo;
        const baseUri = `https://${nodeConfig.host}:${address.port}`;
        autosUri = `${baseUri}${path}`;
        logger.info(`autosUri = ${autosUri}`);
        loginUri = `${baseUri}${PATHS.login}`;
    });

    afterAll(() => {
        server.close();
    });

    test('Vorhandenes Auto aendern', async () => {
        // given
        const token = await login(loginUri);
        const headers = new Headers({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': '"0"',
        });
        const body = JSON.stringify(geaendertesAuto);
        const request = new Request(`${autosUri}/${idVorhanden}`, {
            method: HttpMethod.PUT,
            headers,
            body,
            agent,
        });

        // when
        const response = await fetch(request);

        // then
        expect(response.status).to.be.equal(HttpStatus.NO_CONTENT);
        const responseBody = await response.text();
        expect(responseBody).to.be.empty;
    });

    test('Nicht-vorhandenes Auto aendern', async () => {
        // given
        const token = await login(loginUri);
        const headers = new Headers({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': '"0"',
        });
        const body = JSON.stringify(geaendertesAutoIdNichtVorhanden);
        const request = new Request(`${autosUri}/${idNichtVorhanden}`, {
            method: HttpMethod.PUT,
            headers,
            body,
            agent,
        });

        // when
        const response = await fetch(request);

        // then
        expect(response.status).to.be.equal(HttpStatus.PRECONDITION_FAILED);
        const responseBody = await response.text();
        expect(responseBody).to.be.equal(
            `Es gibt kein Auto mit der ID "${idNichtVorhanden}".`,
        );
    });

    test('Vorhandenes Auto aendern, aber mit ungueltigen Daten', async () => {
        // given
        const token = await login(loginUri);
        const headers = new Headers({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': '"0"',
        });
        const body = JSON.stringify(geaendertesAutoInvalid);
        const request = new Request(`${autosUri}/${idVorhanden}`, {
            method: HttpMethod.PUT,
            headers,
            body,
            agent,
        });

        // when
        const response = await fetch(request);

        // then
        expect(response.status).to.be.equal(HttpStatus.BAD_REQUEST);
        const {
            art,
            rating,
            produzent,
            datum,
            seriennummer,
        } = await response.json();
        expect(art).to.be.equal(
            'Die Art eines Autoes muss SUV oder CABRIO sein.',
        );
        expect(rating).to.be.equal(
            `Eine Bewertung muss zwischen 0 und ${MAX_RATING} liegen.`,
        );
        expect(produzent).to.be.equal(
            'Der Produzent eines Autoes muss FOO_PRODUZENT oder BAR_PRODUZENT sein.',
        );
        expect(datum).to.be.equal('Das Datum muss im Format yyyy-MM-dd sein.');
        expect(seriennummer).to.be.equal('Die Seriennummer ist nicht korrekt.');
    });

    test('Vorhandenes Auto aendern, aber ohne Versionsnummer', async () => {
        // given
        const token = await login(loginUri);
        const headers = new Headers({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        });
        const body = JSON.stringify(geaendertesAuto);
        const request = new Request(`${autosUri}/${idVorhanden}`, {
            method: HttpMethod.PUT,
            headers,
            body,
            agent,
        });

        // when
        const response = await fetch(request);

        // then
        expect(response.status).to.be.equal(HttpStatus.PRECONDITION_REQUIRED);
        const responseBody = await response.text();
        expect(responseBody).to.be.equal('Versionsnummer fehlt');
    });

    test('Vorhandenes Auto aendern, aber mit alter Versionsnummer', async () => {
        // given
        const token = await login(loginUri);
        const headers = new Headers({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': '"-1"',
        });
        const body = JSON.stringify(veraltesAuto);
        const request = new Request(`${autosUri}/${idVorhanden}`, {
            method: HttpMethod.PUT,
            headers,
            body,
            agent,
        });

        // when
        const response = await fetch(request);

        // then
        expect(response.status).to.be.equal(HttpStatus.PRECONDITION_FAILED);
        const responseBody = await response.text();
        expect(responseBody).to.have.string('Die Versionsnummer');
    });

    test('Vorhandenes Auto aendern, aber ohne Token', async () => {
        // given
        const headers = new Headers({
            'Content-Type': 'application/json',
            'If-Match': '"0"',
        });
        const body = JSON.stringify(geaendertesAuto);
        const request = new Request(`${autosUri}/${idVorhanden}`, {
            method: HttpMethod.PUT,
            headers,
            body,
            agent,
        });

        // when
        const response = await fetch(request);

        // then
        expect(response.status).to.be.equal(HttpStatus.UNAUTHORIZED);
        const responseBody = await response.text();
        expect(responseBody).to.be.equalIgnoreCase('unauthorized');
    });

    test('Vorhandenes Auto aendern, aber mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        const headers = new Headers({
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'If-Match': '"0"',
        });
        const body = JSON.stringify(geaendertesAuto);
        const request = new Request(`${autosUri}/${idVorhanden}`, {
            method: HttpMethod.PUT,
            headers,
            body,
            agent,
        });

        // when
        const response = await fetch(request);

        // then
        expect(response.status).to.be.equal(HttpStatus.UNAUTHORIZED);
        const responseBody = await response.text();
        expect(responseBody).to.be.equalIgnoreCase('unauthorized');
    });
});
