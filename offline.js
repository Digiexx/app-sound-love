/* =========================================
   SOUND LOVE — DOWNLOAD PARA OUVIR OFFLINE
   ========================================= */

window.SoundLoveOffline = (() => {

    "use strict";

    const NOME_CACHE = "sound-love-offline-v1";

    const BASE = new URL("./", document.baseURI);

    const CACHE_ATUALIZADO = "sound-love-arquivos-v2";

    const CACHE_PUBLICACAO = "sound-love-publicacao-v2";

    const ENDERECO_CATALOGO =
        new URL("catalogo-offline.json", BASE).href;

    const ENDERECO_PUBLICACAO =
        new URL("__sound-love-publicacao-ativa__", BASE).href;

    function chaveArquivoAtualizado(arquivo) {

        const endereco = new URL(
            enderecoArquivo(arquivo.caminho)
        );

        endereco.searchParams.set(
            "sl-conteudo",
            arquivo.sha256
        );

        return endereco.href;

    }

    function validarCatalogoOffline(catalogo) {

        const hashValido = /^[a-f0-9]{64}$/;

        if (
            catalogo?.formato !== 1 ||
            typeof catalogo.versao !== "string" ||
            !catalogo.versao ||
            catalogo.blocoBytes !== 1024 * 1024 ||
            !Array.isArray(catalogo.arquivos) ||
            !catalogo.arquivos.length
        ) {

            throw new Error(
                "O catálogo offline não está no formato esperado."
            );

        }

        const caminhos = new Set();

        for (const arquivo of catalogo.arquivos) {

            if (
                typeof arquivo?.caminho !== "string" ||
                !arquivo.caminho ||
                arquivo.caminho.startsWith("/") ||
                /^[a-z][a-z0-9+.-]*:/i.test(arquivo.caminho) ||
                /[\\?#]/.test(arquivo.caminho) ||
                /(^|\/)\.{1,2}(\/|$)/.test(arquivo.caminho) ||
                caminhos.has(arquivo.caminho) ||
                typeof arquivo.sha256 !== "string" ||
                !hashValido.test(arquivo.sha256) ||
                !Number.isSafeInteger(arquivo.tamanho) ||
                arquivo.tamanho < 0 ||
                !Array.isArray(arquivo.blocos) ||
                arquivo.blocos.length !== Math.ceil(
                    arquivo.tamanho / catalogo.blocoBytes
                ) ||
                arquivo.blocos.some((bloco) => {

                    return (
                        typeof bloco !== "string" ||
                        !hashValido.test(bloco)
                    );

                })
            ) {

                throw new Error(
                    "O catálogo contém uma identificação inválida."
                );

            }

            // Confirma que o arquivo pertence à pasta do app.
            enderecoArquivo(arquivo.caminho);

            caminhos.add(arquivo.caminho);

        }

        const arquivosEssenciais = [
            "index.html",
            "script.js",
            "acesso.js",
            "offline.js",
            "atualizacao.js"
        ];

        if (
            arquivosEssenciais.some((caminho) => {
                return !caminhos.has(caminho);
            })
        ) {

            throw new Error(
                "O catálogo não contém todos os arquivos essenciais."
            );

        }

        return catalogo;

    }

    async function carregarCatalogoOffline(versaoEsperada = "") {

        const controlador = new AbortController();

        const limite = window.setTimeout(() => {
            controlador.abort();
        }, 20000);

        try {

            const endereco = new URL(ENDERECO_CATALOGO);

            endereco.searchParams.set(
                "sl-download",
                String(Date.now())
            );

            const resposta = await fetch(endereco.href, {
                cache: "no-store",
                signal: controlador.signal
            });

            if (resposta.status !== 200) {

                throw new Error(
                    "Não foi possível consultar os arquivos da atualização."
                );

            }

            const catalogo = validarCatalogoOffline(
                await resposta.json()
            );

            if (
                versaoEsperada &&
                catalogo.versao !== versaoEsperada
            ) {

                throw new Error(
                    "A publicação ainda está sendo disponibilizada. Tente novamente em alguns instantes."
                );

            }

            return catalogo;

        } finally {

            window.clearTimeout(limite);

        }

    }

    async function lerCatalogoOfflineSalvo() {

        try {

            const cache = await caches.open(
                CACHE_PUBLICACAO
            );

            const resposta = await cache.match(
                ENDERECO_PUBLICACAO
            );

            if (!resposta || resposta.status !== 200) {
                return null;
            }

            return validarCatalogoOffline(
                await resposta.json()
            );

        } catch {

            return null;

        }

    }

    const ARQUIVOS_APP = [
        "style.css",
        "acesso.css",
        "categorias.js",
        "musicas.js",
        "script.js",
        "acesso.js",
        "atualizacao.js",
        "offline.js",
        "manifest.json",

        "imagens/icons/icon-192.png",
        "imagens/icons/icon-512.png",
        "imagens/icons/icon-512-maskable.png",

        "imagens/temas/desejo.webp",
        "imagens/temas/paixao.webp",
        "imagens/temas/carinho.webp",
        "imagens/temas/prazer.webp"
    ];

    const situacao = {
        baixando: false,
        completo: false,
        progresso: 0,
        concluidos: 0,
        total: 0,
        mensagem: "Baixe sua coleção para ouvir sem internet.",
        erro: ""
    };

    function obterEstado() {

        return { ...situacao };

    }

    function informar() {

        window.dispatchEvent(
            new CustomEvent("sound-love-offline-status", {
                detail: obterEstado()
            })
        );

    }

    function enderecoArquivo(caminho) {

        const endereco = new URL(caminho, BASE);

        if (endereco.protocol === "data:") {
            return null;
        }

        if (
            endereco.origin !== BASE.origin ||
            !endereco.pathname.startsWith(BASE.pathname)
        ) {

            throw new Error(
                "O download offline precisa de arquivos dentro da pasta do app."
            );

        }

        endereco.hash = "";

        return endereco.href;

    }

    function listarArquivos() {

        const arquivos = new Set();

        ARQUIVOS_APP.forEach((caminho) => {
            arquivos.add(enderecoArquivo(caminho));
        });

        const musicas = window.SOUND_MUSICAS;

        if (!Array.isArray(musicas)) {

            throw new Error(
                "Não foi possível encontrar a lista de músicas."
            );

        }

        musicas.forEach((musica) => {

            if (musica.arquivo) {

                const endereco = enderecoArquivo(
                    musica.arquivo
                );

                if (endereco) {
                    arquivos.add(endereco);
                }

            }

            if (musica.capa) {

                const endereco = enderecoArquivo(
                    musica.capa
                );

                if (endereco) {
                    arquivos.add(endereco);
                }

            }

        });

        // Guarda a página inicial por último.
        arquivos.add(enderecoArquivo("index.html"));

        return Array.from(arquivos);

    }

    function nomeArquivo(endereco) {

        return decodeURIComponent(
            new URL(endereco).pathname.split("/").pop()
        );

    }

    async function conferirArquivoOffline(
        resposta,
        arquivo,
        blocoBytes
    ) {

        if (
            !resposta ||
            resposta.status !== 200 ||
            !resposta.body
        ) {
            return false;
        }

        if (!window.crypto?.subtle) {

            throw new Error(
                "Este navegador não permite conferir os arquivos. Abra o app em um navegador atualizado, pelo endereço HTTPS."
            );

        }

        if (
            !Number.isSafeInteger(blocoBytes) ||
            blocoBytes <= 0 ||
            !Number.isSafeInteger(arquivo.tamanho) ||
            arquivo.tamanho < 0 ||
            !Array.isArray(arquivo.blocos) ||
            arquivo.blocos.length !==
                Math.ceil(arquivo.tamanho / blocoBytes)
        ) {
            return false;
        }

        const leitor = resposta.body.getReader();

        const memoria = new Uint8Array(blocoBytes);

        let preenchidos = 0;
        let total = 0;
        let indice = 0;

        async function conferirBloco() {

            const resultado =
                await window.crypto.subtle.digest(
                    "SHA-256",
                    memoria.subarray(0, preenchidos)
                );

            const hash = Array.from(
                new Uint8Array(resultado),
                (byte) => {

                    return byte
                        .toString(16)
                        .padStart(2, "0");

                }
            ).join("");

            const confere =
                hash === arquivo.blocos[indice];

            indice += 1;
            preenchidos = 0;

            return confere;

        }

        try {

            while (true) {

                const {
                    value: trecho,
                    done: terminou
                } = await leitor.read();

                if (terminou) {
                    break;
                }

                total += trecho.byteLength;

                if (total > arquivo.tamanho) {
                    return false;
                }

                let posicao = 0;

                while (posicao < trecho.byteLength) {

                    const quantidade = Math.min(
                        blocoBytes - preenchidos,
                        trecho.byteLength - posicao
                    );

                    memoria.set(
                        trecho.subarray(
                            posicao,
                            posicao + quantidade
                        ),
                        preenchidos
                    );

                    preenchidos += quantidade;
                    posicao += quantidade;

                    if (
                        preenchidos === blocoBytes &&
                        !(await conferirBloco())
                    ) {
                        return false;
                    }

                }

            }

            if (
                preenchidos > 0 &&
                !(await conferirBloco())
            ) {
                return false;
            }

            return (
                total === arquivo.tamanho &&
                indice === arquivo.blocos.length
            );

        } finally {

            try {

                await leitor.cancel();

            } catch {

                // A leitura pode já ter sido encerrada.

            }

            leitor.releaseLock();

        }

    }

    async function verificar() {

        if (situacao.baixando) {
            return obterEstado();
        }

        if (
            !window.isSecureContext ||
            !("caches" in window)
        ) {

            situacao.completo = false;
            situacao.versao = "";
            situacao.erro = "";

            situacao.mensagem =
                "O modo offline precisa do app publicado em HTTPS.";

            informar();

            return obterEstado();

        }

        try {

            const catalogo = await lerCatalogoOfflineSalvo();

            const arquivos = catalogo
                ? catalogo.arquivos.map((arquivo) => {
                    return chaveArquivoAtualizado(arquivo);
                })
                : listarArquivos();

            const cache = await caches.open(
                catalogo
                    ? CACHE_ATUALIZADO
                    : NOME_CACHE
            );

            let encontrados = 0;

            for (const endereco of arquivos) {

                const resposta = await cache.match(
                    endereco
                );

                if (
                    resposta &&
                    resposta.status === 200
                ) {
                    encontrados += 1;
                }

            }

            // Não interfere em um download iniciado
            // enquanto a verificação estava acontecendo.
            if (situacao.baixando) {
                return obterEstado();
            }

            situacao.total = arquivos.length;
            situacao.concluidos = encontrados;
            situacao.versao = catalogo?.versao || "";
            situacao.erro = "";

            situacao.completo =
                encontrados === arquivos.length;

            situacao.progresso = situacao.completo
                ? 100
                : Math.floor(
                    (encontrados / arquivos.length) * 100
                );

            situacao.mensagem = situacao.completo
                ? "Sua coleção está disponível offline."
                : encontrados > 0
                    ? "Conclua o download da sua coleção."
                    : "Baixe sua coleção para ouvir sem internet.";

        } catch (erro) {

            if (situacao.baixando) {
                return obterEstado();
            }

            situacao.completo = false;
            situacao.versao = "";
            situacao.erro = erro.message;

            situacao.mensagem =
                "Não foi possível verificar os arquivos baixados.";

        }

        informar();

        return obterEstado();

    }

    function atualizarProgressoBytesOffline() {

        const total =
            Number(situacao.bytesTotais) || 0;

        const prontos =
            (Number(situacao.bytesConcluidos) || 0) +
            (Number(situacao.bytesRecebidos) || 0);

        const fracao = total > 0
            ? prontos / total
            : situacao.total > 0
                ? situacao.concluidos / situacao.total
                : 0;

        situacao.progresso = Math.min(
            99,
            Math.max(0, Math.floor(fracao * 100))
        );

    }

    async function salvarArquivoComProgressoOffline(
        cache,
        chave,
        resposta,
        arquivo
    ) {

        if (
            !resposta.body ||
            typeof TransformStream !== "function"
        ) {

            await cache.put(chave, resposta);

            return;

        }

        let recebidos = 0;
        let ultimaNotificacao = 0;

        const acompanhamento = new TransformStream({

            transform(trecho, controle) {

                recebidos += trecho.byteLength;

                if (recebidos > arquivo.tamanho) {

                    throw new Error(
                        `O tamanho de ${arquivo.caminho} não corresponde à publicação.`
                    );

                }

                situacao.bytesRecebidos = recebidos;

                atualizarProgressoBytesOffline();

                const agora = Date.now();

                if (
                    agora - ultimaNotificacao >= 250 ||
                    recebidos === arquivo.tamanho
                ) {

                    ultimaNotificacao = agora;

                    informar();

                }

                controle.enqueue(trecho);

            },

            flush() {

                if (recebidos !== arquivo.tamanho) {

                    throw new Error(
                        `O download de ${arquivo.caminho} ficou incompleto.`
                    );

                }

            }

        });

        const cabecalhos = new Headers(
            resposta.headers
        );

        cabecalhos.delete("Content-Encoding");
        cabecalhos.delete("Content-Length");

        cabecalhos.set(
            "Content-Length",
            String(arquivo.tamanho)
        );

        await cache.put(
            chave,
            new Response(
                resposta.body.pipeThrough(
                    acompanhamento
                ),
                {
                    status: resposta.status,
                    statusText: resposta.statusText,
                    headers: cabecalhos
                }
            )
        );

    }

    async function prepararArmazenamentoOffline(
        catalogo,
        cache,
        confirmados
    ) {

        const reutilizaveis = new Set();

        let bytesNovos = 0;

        situacao.armazenamentoPersistente = null;

        for (const arquivo of catalogo.arquivos) {

            situacao.mensagem =
                `Conferindo armazenamento: ${arquivo.caminho}`;

            informar();

            const chave = chaveArquivoAtualizado(arquivo);

            const existente = await cache.match(chave);

            const valido =
                !!existente &&
                existente.status === 200 &&
                (
                    confirmados.has(chave) ||
                    await conferirArquivoOffline(
                        existente,
                        arquivo,
                        catalogo.blocoBytes
                    )
                );

            if (valido) {

                reutilizaveis.add(chave);

            } else {

                bytesNovos += arquivo.tamanho;

                if (!Number.isSafeInteger(bytesNovos)) {

                    throw new Error(
                        "O tamanho da coleção não pôde ser calculado."
                    );

                }

            }

        }

        const bytesCatalogo = new TextEncoder().encode(
            JSON.stringify(catalogo)
        ).byteLength;

        const margem = Math.max(
            1024 * 1024,
            Math.ceil(bytesNovos * 0.05)
        );

        const necessarios =
            bytesNovos + bytesCatalogo + margem;

        if (
            typeof navigator.storage?.estimate ===
            "function"
        ) {

            let estimativa = null;

            try {

                estimativa =
                    await navigator.storage.estimate();

            } catch {

                // Se a estimativa falhar, a gravação
                // ainda pode funcionar.

            }

            if (
                typeof estimativa?.quota === "number" &&
                typeof estimativa?.usage === "number" &&
                Number.isFinite(estimativa.quota) &&
                Number.isFinite(estimativa.usage) &&
                estimativa.quota >= 0 &&
                estimativa.usage >= 0
            ) {

                const disponiveis = Math.max(
                    0,
                    estimativa.quota - estimativa.usage
                );

                if (necessarios > disponiveis) {

                    const unidade = 1024 * 1024;

                    throw new Error(
                        `A atualização precisa de aproximadamente ${Math.ceil(necessarios / unidade)} MB adicionais, incluindo uma margem. O navegador informa cerca de ${Math.floor(disponiveis / unidade)} MB disponíveis para este site. Libere espaço e tente novamente.`
                    );

                }

            }

        }

        situacao.mensagem =
            "Preparando a proteção dos downloads…";

        informar();

        try {

            if (
                typeof navigator.storage?.persisted ===
                "function"
            ) {

                situacao.armazenamentoPersistente =
                    await navigator.storage.persisted();

            }

            if (
                situacao.armazenamentoPersistente !== true &&
                typeof navigator.storage?.persist ===
                    "function"
            ) {

                situacao.armazenamentoPersistente =
                    await navigator.storage.persist();

            }

        } catch {

            // A recusa ou indisponibilidade
            // não impede o download.

            situacao.armazenamentoPersistente = null;

        }

        return reutilizaveis;

    }

    const ENDERECO_PUBLICACAO_ANTERIOR = new URL(
        "__sound-love-publicacao-anterior__",
        BASE
    ).href;

    function consultarJanelasOffline() {

        const worker =
            navigator.serviceWorker?.controller;

        if (
            !worker ||
            typeof MessageChannel !== "function"
        ) {
            return Promise.resolve(null);
        }

        return new Promise((resolver) => {

            const canal = new MessageChannel();

            let encerrado = false;
            let limite;

            function concluir(resultado) {

                if (encerrado) {
                    return;
                }

                encerrado = true;

                window.clearTimeout(limite);

                canal.port1.close();
                canal.port2.close();

                resolver(resultado);

            }

            limite = window.setTimeout(
                () => concluir(null),
                4000
            );

            canal.port1.onmessage = (evento) => {

                const dados = evento.data;

                concluir(
                    dados?.tipo === "sound-love-janelas" &&
                    dados.escopo === BASE.href &&
                    Number.isSafeInteger(
                        dados.quantidade
                    ) &&
                    dados.quantidade >= 0
                        ? dados.quantidade
                        : null
                );

            };

            canal.port1.onmessageerror = () => {
                concluir(null);
            };

            try {

                worker.postMessage(
                    {
                        tipo:
                            "sound-love-consultar-janelas"
                    },
                    [canal.port2]
                );

            } catch {

                concluir(null);

            }

        });

    }

    async function limparArquivosAntigosOffline(
        catalogo
    ) {

        let removidos = 0;

        // Sem coordenação entre janelas,
        // a limpeza fica adiada.
        if (!travaAtualizacaoAtiva) {
            return removidos;
        }

        try {

            if (
                await consultarJanelasOffline() !== 1
            ) {
                return removidos;
            }

            const ativa =
                await lerCatalogoOfflineSalvo();

            if (
                !ativa ||
                ativa.versao !== catalogo.versao
            ) {
                return removidos;
            }

            const controle = await caches.open(
                CACHE_PUBLICACAO
            );

            const registroAnterior =
                await controle.match(
                    ENDERECO_PUBLICACAO_ANTERIOR
                );

            let anterior = null;

            if (registroAnterior) {

                if (registroAnterior.status !== 200) {
                    return removidos;
                }

                anterior = validarCatalogoOffline(
                    await registroAnterior.json()
                );

            }

            const conservar = new Set(
                [
                    ...ativa.arquivos,
                    ...(anterior?.arquivos || [])
                ].map(chaveArquivoAtualizado)
            );

            const cache = await caches.open(
                CACHE_ATUALIZADO
            );

            // Só limpa se as publicações preservadas
            // estiverem completas.
            for (const chave of conservar) {

                const salva = await cache.match(chave);

                if (!salva || salva.status !== 200) {
                    return removidos;
                }

            }

            const chaves = await cache.keys();

            for (const requisicao of chaves) {

                const endereco = new URL(
                    requisicao.url
                );

                const hash = endereco.searchParams.get(
                    "sl-conteudo"
                );

                if (
                    endereco.origin !== BASE.origin ||
                    !endereco.pathname.startsWith(
                        BASE.pathname
                    ) ||
                    !/^[a-f0-9]{64}$/.test(hash || "") ||
                    conservar.has(endereco.href)
                ) {
                    continue;
                }

                if (await cache.delete(requisicao)) {
                    removidos += 1;
                }

            }

        } catch {

            // A atualização concluída continua válida
            // se a limpeza falhar.

        }

        return removidos;

    }

    let travaAtualizacaoAtiva = false;

    async function baixar(versaoEsperada = "") {

        if (situacao.baixando) {
            return obterEstado();
        }

        if (
            typeof navigator.locks?.request !==
            "function"
        ) {

            return executarDownloadOffline(
                versaoEsperada
            );

        }

        try {

            return await navigator.locks.request(

                "sound-love-atualizacao:" + BASE.href,

                {
                    mode: "exclusive",
                    ifAvailable: true
                },

                async (trava) => {

                    if (!trava) {

                        if (situacao.baixando) {
                            return obterEstado();
                        }

                        return {

                            ...obterEstado(),

                            completo: false,

                            mensagem:
                                "A coleção está sendo atualizada em outra janela.",

                            erro:
                                "Aguarde a atualização na outra janela terminar e tente novamente aqui."

                        };

                    }

                    travaAtualizacaoAtiva = true;

                    try {

                        return await executarDownloadOffline(
                            versaoEsperada
                        );

                    } finally {

                        travaAtualizacaoAtiva = false;

                    }

                }

            );

        } catch (erro) {

            return {

                ...obterEstado(),

                completo: false,

                mensagem:
                    "Não foi possível iniciar a atualização nesta janela.",

                erro:
                    erro?.message ||
                    "Feche as outras janelas do Sound Love e tente novamente."

            };

        }

    }

    async function executarDownloadOffline(
        versaoEsperada = ""
    ) {

        if (situacao.baixando) {
            return obterEstado();
        }

        if (
            !window.isSecureContext ||
            !("caches" in window) ||
            !("serviceWorker" in navigator)
        ) {

            situacao.erro =
                "Abra o Sound Love pelo endereço publicado em HTTPS.";

            informar();

            return obterEstado();

        }

        if (!navigator.onLine) {

            situacao.erro =
                "Conecte-se à internet para atualizar sua coleção.";

            informar();

            return obterEstado();

        }

        situacao.baixando = true;
        situacao.completo = false;
        situacao.progresso = 0;
        situacao.concluidos = 0;
        situacao.total = 0;
        situacao.erro = "";
        situacao.versao = "";

        situacao.mensagem =
            "Consultando sua atualização…";

        informar();

        let tempoPreparacao;

        try {

            await Promise.race([

                navigator.serviceWorker.ready,

                new Promise((_, rejeitar) => {

                    tempoPreparacao = window.setTimeout(
                        () => rejeitar(
                            new Error(
                                "O modo offline ainda está sendo preparado. Tente novamente em alguns instantes."
                            )
                        ),
                        15000
                    );

                })

            ]);

            window.clearTimeout(tempoPreparacao);

            const catalogo = await carregarCatalogoOffline(
                versaoEsperada
            );

            const anterior = await lerCatalogoOfflineSalvo();

            const confirmados = new Set(
                (anterior?.arquivos || []).map((arquivo) => {
                    return chaveArquivoAtualizado(arquivo);
                })
            );

            const cache = await caches.open(
                CACHE_ATUALIZADO
            );

            const cacheAntigo = await caches.open(
                NOME_CACHE
            );

            situacao.total = catalogo.arquivos.length;

            situacao.bytesTotais = 0;
            situacao.bytesConcluidos = 0;
            situacao.bytesRecebidos = 0;

            const reutilizaveis =
                await prepararArmazenamentoOffline(
                    catalogo,
                    cache,
                    confirmados
                );

            situacao.bytesTotais =
                catalogo.arquivos.reduce(
                    (total, arquivo) => total + (
                        reutilizaveis.has(
                            chaveArquivoAtualizado(arquivo)
                        )
                            ? 0
                            : arquivo.tamanho
                    ),
                    0
                );

            atualizarProgressoBytesOffline();

            informar();

            const identificador = Date.now();

            for (const arquivo of catalogo.arquivos) {

                const endereco = enderecoArquivo(
                    arquivo.caminho
                );

                const chave = chaveArquivoAtualizado(
                    arquivo
                );

                situacao.mensagem =
                    `Conferindo: ${arquivo.caminho}`;

                informar();

                const existente = await cache.match(chave);

                let pronto =
                    !!existente &&
                    existente.status === 200 &&
                    reutilizaveis.has(chave);

                // Recalcula se um arquivo salvo desapareceu
                // depois da preparação.
                if (
                    !pronto &&
                    reutilizaveis.delete(chave)
                ) {

                    situacao.bytesTotais +=
                        arquivo.tamanho;

                }

                // Aproveita arquivos do primeiro download.
                if (!pronto) {

                    const antigo = await cacheAntigo.match(
                        endereco
                    );

                    if (
                        await conferirArquivoOffline(
                            antigo,
                            arquivo,
                            catalogo.blocoBytes
                        )
                    ) {

                        const copia = await cacheAntigo.match(
                            endereco
                        );

                        if (copia) {

                            await cache.put(chave, copia);

                            pronto = true;

                        }

                    }

                }

                if (!pronto) {

                    situacao.mensagem =
                        `Baixando: ${arquivo.caminho}`;

                    informar();

                    const enderecoDownload = new URL(
                        endereco
                    );

                    enderecoDownload.searchParams.set(
                        "sl-download",
                        String(identificador)
                    );

                    const controlador =
                        new AbortController();

                    const limite = window.setTimeout(
                        () => controlador.abort(),
                        600000
                    );

                    try {

                        const resposta = await fetch(
                            enderecoDownload.href,
                            {
                                cache: "no-store",
                                signal: controlador.signal
                            }
                        );

                        if (resposta.status !== 200) {

                            throw new Error(
                                `Não foi possível baixar ${arquivo.caminho}.`
                            );

                        }

                        try {

                            await salvarArquivoComProgressoOffline(
                                cache,
                                chave,
                                resposta,
                                arquivo
                            );

                        } catch (erro) {

                            controlador.abort();

                            throw erro;

                        }

                        const salvo = await cache.match(
                            chave
                        );

                        if (
                            !(await conferirArquivoOffline(
                                salvo,
                                arquivo,
                                catalogo.blocoBytes
                            ))
                        ) {

                            await cache.delete(chave);

                            throw new Error(
                                `O arquivo ${arquivo.caminho} não corresponde à publicação. Tente novamente.`
                            );

                        }

                    } finally {

                        window.clearTimeout(limite);

                    }

                }

                if (!reutilizaveis.has(chave)) {

                    situacao.bytesConcluidos +=
                        arquivo.tamanho;

                }

                situacao.bytesRecebidos = 0;

                situacao.concluidos += 1;

                atualizarProgressoBytesOffline();

                informar();

            }

            situacao.mensagem =
                "Concluindo sua atualização…";

            informar();

            for (const arquivo of catalogo.arquivos) {

                const salvo = await cache.match(
                    chaveArquivoAtualizado(arquivo)
                );

                if (!salvo || salvo.status !== 200) {

                    throw new Error(
                        "Alguns arquivos não ficaram salvos. Tente novamente."
                    );

                }

            }

            // Confirma que a publicação não mudou
            // enquanto os arquivos eram baixados.
            await carregarCatalogoOffline(
                catalogo.versao
            );

            const publicacao = await caches.open(
                CACHE_PUBLICACAO
            );

            // Guarda a identificação da publicação anterior.
            if (
                anterior &&
                anterior.versao !== catalogo.versao
            ) {

                await publicacao.put(
                    ENDERECO_PUBLICACAO_ANTERIOR,
                    new Response(
                        JSON.stringify(anterior),
                        {
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    )
                );

            }

            // Ativa a coleção apenas depois de concluir tudo.
            await publicacao.put(
                ENDERECO_PUBLICACAO,
                new Response(
                    JSON.stringify(catalogo),
                    {
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                )
            );

            situacao.completo = true;
            situacao.progresso = 100;
            situacao.versao = catalogo.versao;

            situacao.mensagem =
                "Organizando sua coleção…";

            informar();

            situacao.arquivosAntigosRemovidos =
                await limparArquivosAntigosOffline(
                    catalogo
                );

            situacao.mensagem =
                "Sua coleção está disponível offline.";

        } catch (erro) {

            situacao.completo = false;

            situacao.mensagem =
                "A atualização não foi concluída. Sua coleção anterior foi mantida.";

            situacao.erro =
                erro.name === "QuotaExceededError"
                    ? "Não há espaço suficiente para salvar a atualização."
                    : erro.name === "AbortError"
                        ? "O download demorou demais. Confira sua conexão e tente novamente."
                        : erro instanceof TypeError
                            ? "A conexão falhou. Confira sua internet e tente novamente."
                            : erro.message;

        } finally {

            window.clearTimeout(tempoPreparacao);

            situacao.baixando = false;

            informar();

        }

        return obterEstado();

    }

    return {
        obterEstado,
        verificar,
        baixar
    };

})();