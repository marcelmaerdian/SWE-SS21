/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul enthält die Information, ob man innerhalb von Kubernetes ist.
 * @packageDocumentation
 */

import { hostname } from 'os';

// DNS-Name eines Kubernetes-Pod endet z.B. mit -75469ff64b-q3bst
const kubernetesRegexp = /-[a-z0-9]{10}-[a-z0-9]{5}$/u;

/**
 * Boole'sches Flag, ob man in einem Kubernetes-Cluster ist.
 */
export const kubernetes = kubernetesRegexp.exec(hostname()) !== null; // eslint-disable-line no-null/no-null

console.info('kubernetes: %s', kubernetes);
