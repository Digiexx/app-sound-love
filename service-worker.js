/* =========================================
   SOUND LOVE — SERVICE WORKER
   ========================================= */

"use strict";

// Este nome também será usado pelo módulo de download.
const CACHE_OFFLINE = "sound-love-offline-v1";

const ENDERECO_INICIAL = new URL(
    "index.html",
    self.registration.scope
).href;

const ENDERECO_VERSAO = new URL(
    "versao.json",
    self.registration.scope
).href;


/* =========================================
   INSTALAÇÃO E ATIVAÇÃO
   ========================================= */

self.addEventListener("install", (evento) => {

    evento.waitUntil(self.skipWaiting());

});

self.addEventListener("activate", (evento) => {

    // As músicas baixadas permanecem salvas
    // quando uma nova publicação é ativada.
    evento.waitUntil(self.clients.claim());

});


/* =========================================
   LEITURA DOS ARQUIVOS SALVOS
   ========================================= */

async function encontrarArquivoSalvo(requisicao) {

    const cache = await caches.open(CACHE_OFFLINE);

    const endereco = new URL(requisicao.url);

    const paginaInicial =
        endereco.pathname ===
            new URL(self.registration.scope).pathname ||
        endereco.pathname ===
            new URL(ENDERECO_INICIAL).pathname;

    const chave =
        requisicao.mode === "navigate" && paginaInicial
            ? ENDERECO_INICIAL
            : requisicao.url;

    return cache.match(chave);

}


/* =========================================
   REPRODUÇÃO E POSIÇÃO DA MÚSICA
   ========================================= */

async function responderMusicaSalva(
    requisicao,
    resposta
) {

    const intervalo = requisicao.headers.get("Range");

    if (!intervalo) {
        return resposta;
    }

    const partes = /^bytes=(\d*)-(\d*)$/i.exec(
        intervalo.trim()
    );

    // Solicitações de intervalos múltiplos não são
    // tratadas aqui: envia o arquivo completo.
    if (!partes || (!partes[1] && !partes[2])) {
        return resposta;
    }

    const arquivo = await resposta.blob();
    const tamanho = arquivo.size;

    let inicio;
    let fim;

    if (!partes[1]) {

        const quantidade = Number(partes[2]);

        inicio = Math.max(0, tamanho - quantidade);
        fim = tamanho - 1;

    } else {

        inicio = Number(partes[1]);

        fim = partes[2]
            ? Math.min(Number(partes[2]), tamanho - 1)
            : tamanho - 1;

    }

    if (
        tamanho === 0 ||
        !Number.isSafeInteger(inicio) ||
        !Number.isSafeInteger(fim) ||
        inicio >= tamanho ||
        inicio > fim
    ) {

        return new Response(null, {

            status: 416,

            headers: {
                "Content-Range": `bytes */${tamanho}`
            }

        });

    }

    const trecho = arquivo.slice(inicio, fim + 1);

    const cabecalhos = new Headers(resposta.headers);

    cabecalhos.delete("Content-Encoding");

    cabecalhos.set("Accept-Ranges", "bytes");

    cabecalhos.set(
        "Content-Range",
        `bytes ${inicio}-${fim}/${tamanho}`
    );

    cabecalhos.set(
        "Content-Length",
        String(trecho.size)
    );

    if (!cabecalhos.has("Content-Type")) {
        cabecalhos.set("Content-Type", "audio/mpeg");
    }

    return new Response(trecho, {

        status: 206,
        statusText: "Partial Content",
        headers: cabecalhos

    });

}


/* =========================================
   INTERNET E MODO OFFLINE
   ========================================= */

async function responderRequisicao(requisicao) {

    const endereco = new URL(requisicao.url);

    // A identificação de atualização sempre vem
    // da internet. Nunca utiliza uma versão antiga.
    if (
        endereco.origin + endereco.pathname ===
        ENDERECO_VERSAO
    ) {

        return fetch(requisicao, {
            cache: "no-store"
        });

    }

    const musica =
        requisicao.destination === "audio" ||
        /\.(mp3|m4a|ogg|wav)$/i.test(endereco.pathname);

    if (musica) {

        // Músicas baixadas tocam diretamente do celular.
        const salva = await encontrarArquivoSalvo(
            requisicao
        );

        if (salva && salva.status === 200) {

            return responderMusicaSalva(
                requisicao,
                salva
            );

        }

        // Música ainda não baixada precisa de internet.
        return fetch(requisicao, {
            cache: "no-cache"
        });

    }

    try {

        // Com internet, busca as telas e os demais
        // arquivos atuais da publicação.
        const resposta = await fetch(requisicao, {
            cache: "no-cache"
        });

        if (resposta.status >= 500) {

            const salva = await encontrarArquivoSalvo(
                requisicao
            );

            if (salva) {
                return salva;
            }

        }

        return resposta;

    } catch {

        // Sem internet, utiliza o arquivo baixado.
        const salva = await encontrarArquivoSalvo(
            requisicao
        );

        return salva || Response.error();

    }

}


/* =========================================
   INTERCEPTAÇÃO DAS SOLICITAÇÕES
   ========================================= */

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
        responderRequisicao(requisicao)
    );

});