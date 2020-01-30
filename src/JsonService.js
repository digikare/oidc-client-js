// Copyright (c) Brock Allen & Dominick Baier. All rights reserved.
// Licensed under the Apache License, Version 2.0. See LICENSE in the project root for license information.

if (!process) {
    require('unfetch/polyfill/index.js');
}

import { Log } from './Log.js';

/**
 * jwtHandler(req)
 *
 * req.responseText (text response)
 */

export class JsonService {
    constructor(
        additionalContentTypes = null,
        jwtHandler = null
    ) {
        if (additionalContentTypes && Array.isArray(additionalContentTypes))
        {
            this._contentTypes = additionalContentTypes.slice();
        }
        else
        {
            this._contentTypes = [];
        }
        this._contentTypes.push('application/json');
        if (jwtHandler) {
            this._contentTypes.push('application/jwt');
        }

        this._jwtHandler = jwtHandler;
    }

    getJson(url, token) {
        if (!url){
            Log.error("JsonService.getJson: No url passed");
            throw new Error("url");
        }

        Log.debug("JsonService.getJson, url: ", url);

        var allowedContentTypes = this._contentTypes;
        var headers = {};

        if (token) {
            Log.debug("JsonService.getJson: token passed, setting Authorization header");
            headers.Authorization = "Bearer " + token;
        }

        return fetch(url, {
            method: 'GET',
            headers: headers,
        })
        .then(function (response) {

            if (response.ok === false) {
                throw new Error(response.statusText + " (" + response.status + ")");
            }

            return response;
        }, function (err) {
            throw new Error(`Network Error`);
        }).then(function (response) {

            var contentType = response.headers.get('content-type');
            if (contentType) {
                var found = allowedContentTypes.find(item => {
                    if (contentType.startsWith(item)) {
                        return response;
                    }
                });

                if (found == "application/jwt") {
                    return Promise.resolve(response.text()).then(function(responseText) {
                        return jwtHandler({ responseText: responseText });
                    })
                }

                if (found) {
                    return response.json();
                }
            }
            throw new Error("Invalid response Content-Type: " + contentType + ", from URL: " + url);

        }).catch(function (error) {
            Log.error("JsonService.getJson:", error);
            throw error;
        })
    }

    postForm(url, payload) {
        if (!url){
            Log.error("JsonService.postForm: No url passed");
            throw new Error("url");
        }

        Log.debug("JsonService.postForm, url: ", url);

        var allowedContentTypes = this._contentTypes;
        var formBody = Object.keys(payload).map((key) => {
            return encodeURIComponent(key) + "=" + encodeURIComponent(payload[key]);
        });

        return fetch(url, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formBody.join('&')
        })
        .then(function (response) {
            if (response.ok || response.status === 400) {
                return response;
            }
            throw new Error(req.statusText + " (" + req.status + ")");
        })
        .then(function (response) {
            var contentType = response.headers.get("content-type");
            if (!contentType) {
                throw new Error("Invalid response Content-Type: " + contentType + ", from URL: " + url);
            }

            var found = allowedContentTypes.find(item => {
                if (contentType.startsWith(item)) {
                    return true;
                }
            });

            if (!found) {
                throw new Error("Invalid response Content-Type: " + contentType + ", from URL: " + url);
            }
            return response.json();
        })
        .then(function (payload) {

            if (payload && payload.error) {
                Log.error("JsonService.postForm: Error from server: ", payload.error);
                throw new Error(payload.error);
            }

            return payload;
        });
    }
}
