/* =========================================
   SOUND LOVE — DOWNLOAD PARA OUVIR OFFLINE
   ========================================= */

window.SoundLoveOffline = (() => {

    "use strict";

    const NOME_CACHE = "sound-love-offline-v1";

    const BASE = new URL("./", document.baseURI);

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

    async function verificar() {

        if (situacao.baixando) {
            return obterEstado();
        }

        if (!window.isSecureContext || !("caches" in window)) {

            situacao.completo = false;
            situacao.mensagem =
                "O modo offline precisa do app publicado em HTTPS.";

            informar();

            return obterEstado();

        }

        try {

            const arquivos = listarArquivos();

            const cache = await caches.open(NOME_CACHE);

            let encontrados = 0;

            for (const endereco of arquivos) {

                const resposta = await cache.match(endereco);

                if (resposta && resposta.status === 200) {
                    encontrados += 1;
                }

            }

            situacao.total = arquivos.length;
            situacao.concluidos = encontrados;

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

            situacao.completo = false;
            situacao.erro = erro.message;

            situacao.mensagem =
                "Não foi possível verificar os arquivos baixados.";

        }

        informar();

        return obterEstado();

    }

    async function baixar() {

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
                "Conecte-se à internet para baixar sua coleção.";

            informar();

            return obterEstado();

        }

        situacao.baixando = true;
        situacao.completo = false;
        situacao.progresso = 0;
        situacao.concluidos = 0;
        situacao.erro = "";

        situacao.mensagem = "Preparando o download…";

        informar();

        let tempoPreparacao;

        try {

            // Evita confirmar o download se o service worker
            // ainda não estiver pronto.
            await Promise.race([

                navigator.serviceWorker.ready,

                new Promise((_, rejeitar) => {

                    tempoPreparacao = window.setTimeout(
                        () => rejeitar(
                            new Error(
                                "O app ainda está preparando o modo offline. Feche, abra novamente e tente baixar."
                            )
                        ),
                        15000
                    );

                })

            ]);

            window.clearTimeout(tempoPreparacao);

            const arquivos = listarArquivos();

            const cache = await caches.open(NOME_CACHE);

            const identificador = Date.now();

            situacao.total = arquivos.length;

            for (const endereco of arquivos) {

                const nome = nomeArquivo(endereco);

                situacao.mensagem = `Baixando: ${nome}`;

                informar();

                // Um endereço exclusivo evita que o service
                // worker devolva uma cópia antiga no download.
                const enderecoDownload = new URL(endereco);

                enderecoDownload.searchParams.set(
                    "sl-download",
                    String(identificador)
                );

                const controlador = new AbortController();

                const limite = window.setTimeout(
                    () => controlador.abort(),
                    180000
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
                            `Não foi possível baixar ${nome}. Confira se o arquivo foi publicado.`
                        );

                    }

                    const tipo =
                        resposta.headers.get("Content-Type") || "";

                    if (
                        !/\.html$/i.test(new URL(endereco).pathname) &&
                        tipo.includes("text/html")
                    ) {

                        throw new Error(
                            `O endereço de ${nome} retornou uma página em vez do arquivo.`
                        );

                    }

                    // O endereço salvo é o original, sem
                    // o identificador temporário do download.
                    await cache.put(endereco, resposta);

                } finally {

                    window.clearTimeout(limite);

                }

                situacao.concluidos += 1;

                situacao.progresso = Math.floor(
                    (situacao.concluidos / situacao.total) * 100
                );

                informar();

            }

            situacao.mensagem =
                "Conferindo os arquivos baixados…";

            informar();

            for (const endereco of arquivos) {

                const salvo = await cache.match(endereco);

                if (!salvo || salvo.status !== 200) {

                    throw new Error(
                        "Alguns arquivos não ficaram salvos. Tente baixar novamente."
                    );

                }

            }

            situacao.completo = true;
            situacao.progresso = 100;

            situacao.mensagem =
                "Sua coleção está disponível offline.";

        } catch (erro) {

            situacao.completo = false;

            situacao.mensagem =
                "O download não foi concluído.";

            situacao.erro =
                erro.name === "QuotaExceededError"
                    ? "Não há espaço suficiente para salvar a coleção."
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