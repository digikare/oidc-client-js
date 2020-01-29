// Copyright (c) Brock Allen & Dominick Baier. All rights reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

import { Log } from './Log.js';
import { MetadataService } from './MetadataService.js';
import { Global } from './Global.js';

const AccessTokenTypeHint = "access_token";
const RefreshTokenTypeHint = "refresh_token";

export class TokenRevocationClient {
    constructor(settings, fetch = Global.fetch, MetadataServiceCtor = MetadataService) {
        if (!settings) {
            Log.error("TokenRevocationClient.ctor: No settings provided");
            throw new Error("No settings provided.");
        }

        this._settings = settings;
        this._fetch = fetch;
        this._metadataService = new MetadataServiceCtor(this._settings);
    }

    revoke(token, required, type = "access_token") {
        if (!token) {
            Log.error("TokenRevocationClient.revoke: No token provided");
            throw new Error("No token provided.");
        }

        if (type !== AccessTokenTypeHint && type != RefreshTokenTypeHint) {
            Log.error("TokenRevocationClient.revoke: Invalid token type");
            throw new Error("Invalid token type.");
        }

        return this._metadataService.getRevocationEndpoint().then(url => {
            if (!url) {
                if (required) {
                    Log.error("TokenRevocationClient.revoke: Revocation not supported");
                    throw new Error("Revocation not supported");
                }

                // not required, so don't error and just return
                return;
            }

            Log.debug("TokenRevocationClient.revoke: Revoking " + type);
            var client_id = this._settings.client_id;
            var client_secret = this._settings.client_secret;
            return this._revoke(url, client_id, client_secret, token, type);
        });
    }

    _revoke(url, client_id, client_secret, token, type) {

        var formBodyObj = {
            client_id: client_id,
            token_type_hint: type,
            token: token
        };

        if (client_secret) {
            formBody.client_secret = client_secret;
        }

        var formBody = Object.keys(formBodyObj).map(key => {
            return key + "=" +  encodeURIComponent(formBodyObj[key]);
        });

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: formBody.join('&'),
        })
        .then((response) => {
            if (response.ok && response.status === 200) {
                return true;
            }
            throw new Error(response.statusText + "(" + response.statusText + ")");
        }, (err) => {
            throw new Error('Network Error');
        })
        .catch(err => {
            Log.debug("TokenRevocationClient.revoke: " + err);
        })
    }
}
