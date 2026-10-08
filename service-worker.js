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

async function encontrarArquivoAtualizado(requisicao) {

    try {

        const controle = await caches.open(
            "sound-love-publicacao-v2"
        );

        const enderecoPublicacao = new URL(
            "__sound-love-publicacao-ativa__",
            self.registration.scope
        ).href;

        const registro = await controle.match(
            enderecoPublicacao
        );

        if (!registro || registro.status !== 200) {
            return null;
        }

        const publicacao = await registro.json();

        if (!Array.isArray(publicacao.arquivos)) {
            return null;
        }

        const endereco = new URL(requisicao.url);

        const inicio = new URL(
            self.registration.scope
        );

        const paginaInicial =
            requisicao.mode === "navigate" &&
            (
                endereco.pathname === inicio.pathname ||
                endereco.pathname ===
                    new URL(ENDERECO_INICIAL).pathname
            );

        const caminho = paginaInicial
            ? ENDERECO_INICIAL
            : endereco.origin + endereco.pathname;

        const arquivo = publicacao.arquivos.find(
            (item) => {

                return new URL(
                    item.caminho,
                    inicio
                ).href === caminho;

            }
        );

        if (
            !arquivo ||
            !/^[a-f0-9]{64}$/.test(arquivo.sha256)
        ) {
            return null;
        }

        const chave = new URL(
            arquivo.caminho,
            inicio
        );

        chave.searchParams.set(
            "sl-conteudo",
            arquivo.sha256
        );

        const cache = await caches.open(
            "sound-love-arquivos-v2"
        );

        const resposta = await cache.match(
            chave.href
        );

        return resposta && resposta.status === 200
            ? resposta
            : null;

    } catch {

        return null;

    }

}

async function responderRequisicao(requisicao) {

    const endereco = new URL(requisicao.url);

    const enderecoCatalogo = new URL(
        "catalogo-offline.json",
        self.registration.scope
    ).href;

    const caminho =
        endereco.origin + endereco.pathname;

    // Consulta a publicação e baixa arquivos novos
    // diretamente da internet.
    if (
        caminho === ENDERECO_VERSAO ||
        caminho === enderecoCatalogo ||
        endereco.searchParams.has("sl-download")
    ) {

        return fetch(requisicao, {
            cache: "no-store"
        });

    }

    const musica =
        requisicao.destination === "audio" ||
        /\.(mp3|m4a|ogg|wav)$/i.test(endereco.pathname);

    // Usa a publicação ativada após concluir o download.
    const atualizada = await encontrarArquivoAtualizado(
        requisicao
    );

    if (atualizada) {

        return musica
            ? responderMusicaSalva(
                requisicao,
                atualizada
            )
            : atualizada;

    }

    // Mantém compatibilidade com o primeiro download.
    if (musica) {

        const salva = await encontrarArquivoSalvo(
            requisicao
        );

        if (salva && salva.status === 200) {

            return responderMusicaSalva(
                requisicao,
                salva
            );

        }

        return fetch(requisicao, {
            cache: "no-cache"
        });

    }

    try {

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