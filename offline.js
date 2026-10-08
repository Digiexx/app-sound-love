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

    async function baixar(versaoEsperada = "") {

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

            const identificador = Date.now();

            situacao.total = catalogo.arquivos.length;

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
                    (
                        confirmados.has(chave) ||
                        await conferirArquivoOffline(
                            existente,
                            arquivo,
                            catalogo.blocoBytes
                        )
                    );

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

                        await cache.put(chave, resposta);

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

                situacao.concluidos += 1;

                situacao.progresso = Math.floor(
                    (
                        situacao.concluidos /
                        situacao.total
                    ) * 100
                );

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