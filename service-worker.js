/* =========================================
   SOUND LOVE — SERVICE WORKER
   ========================================= */

"use strict";

self.addEventListener("install", (evento) => {

    evento.waitUntil(self.skipWaiting());

});

self.addEventListener("activate", (evento) => {

    evento.waitUntil(self.clients.claim());

});

self.addEventListener("fetch", (evento) => {

    const requisicao = evento.request;

    if (requisicao.method !== "GET") {
        return;
    }

    const endereco = new URL(requisicao.url);

    if (endereco.origin !== self.location.origin) {
        return;
    }

    evento.respondWith(
        fetch(requisicao, {
            cache: "no-cache"
        })
    );

});