# Copyright (C) 2020 - present Juergen Zimmermann
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

# FIXME https://github.com/bazelbuild/rules_docker#nodejs_image

# "Multi-stage Build" mit einem "distroless image"

# https://github.com/GoogleContainerTools/distroless/blob/master/examples/nodejs/Dockerfile
# https://nodejs.org/de/docs/guides/nodejs-docker-webapp
# https://docs.docker.com/engine/reference/builder
# https://docs.docker.com/develop/develop-images/dockerfile_best-practices
# https://cloud.google.com/solutions/best-practices-for-building-containers

# ==============================================================================
#   B u i l d   S t a g e   m i t   T y p e S c r i p t
#
#   Node mit Debian als Basis einschl. GNU C/C++
#   Python fuer node_gyp: fuer bcrypt und re2
# ==============================================================================

# CAVEAT: Gleiche Version wie distroless wegen Installation von bcrypt und re2 durch node-gyp
# https://www.debian.org/releases: Debian 10 = Buster

FROM node:14.16.1-buster AS builder

# Arbeitsverzeichnis setzen und implizit erstellen
WORKDIR /source

# in das Arbeitsverzeichnis kopieren
COPY package.json package-lock.json .npmrc tsconfig.json ./
COPY src ./src

# Python 3 installieren: wird fuer die Installation von bcrypt und re2 benoetigt
# https://packages.debian.org/buster/python3
# npm, dependencies (NICHT: devDependencies) und TypeScript fuer die Uebersetzung installieren
# Uebersetzen und devDependencies entfernen (siehe https://docs.npmjs.com/cli/v7/commands/npm-prune)
RUN apt-get --yes --no-install-recommends install python3=3.7.3-1 && \
    npm i -g npm@7.8.0 && \
    npm i --prod --no-audit --no-fund && \
    npm i -D typescript && \
    npx tsc && \
    npm prune --production

# ==============================================================================
#   D i s t r o l e s s   S t a g e
#
#   Node mit "distroless" als Basis
#   node_modules mit dependencies aus package.json
#   eigener, uebersetzter JS-Code zzgl. Konfigurationsdateien
# ==============================================================================
FROM gcr.io/distroless/nodejs-debian10:14
# debug-Image enthaelt Package-Manager, Shell (ash) usw.
#FROM gcr.io/distroless/nodejs-debian10:14-debug

WORKDIR /app
COPY --from=builder /source/package.json .
COPY --from=builder /source/node_modules ./node_modules
COPY --from=builder /source/dist .
COPY src/shared/config/jwt ./shared/config/jwt
COPY src/shared/db/image.png ./shared/db/

# EJS
COPY src/views ./views
COPY src/public ./public

# Port fuer Publishing freigeben
EXPOSE 3000

# "nonroot" siehe /etc/passwd
USER 65532

# <Strg>C beim Stoppen des Docker-Containers
STOPSIGNAL SIGINT

# Node-Server als ersten und einzigen Prozess durch "node server.js" starten
CMD ["server.js"]
