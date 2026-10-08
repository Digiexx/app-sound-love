/* =========================================
   SOUND LOVE — ATUALIZAÇÃO AUTOMÁTICA
   ========================================= */

(() => {

    "use strict";

    const versaoAberta = document
        .querySelector('meta[name="sound-love-versao"]')
        ?.content;

    // A identificação é gerada pelo GitHub na publicação.
    // No ambiente local, este módulo fica desativado.
    if (!versaoAberta) {
        return;
    }

    const enderecoVersao =
        new URL("versao.json", document.baseURI);

    let verificando = false;
    let ultimaVerificacao = 0;
    let versaoPendente = "";
    let atualizando = false;

    function aplicarAtualizacao() {

        if (
            !versaoPendente ||
            atualizando ||
            document.visibilityState !== "visible" ||
            !navigator.onLine
        ) {
            return;
        }

        const downloadEmAndamento =
            window.SoundLoveOffline
                ?.obterEstado()
                .baixando === true;

        if (downloadEmAndamento) {
            return;
        }

        const app = window.SoundLove;

        // Aguarda a integração com o player.
        if (typeof app?.estaTocando !== "function") {
            return;
        }

        if (app.estaTocando()) {
            return;
        }

        // Aguarda o usuário terminar de usar um painel.
        if (document.querySelector("dialog[open]")) {
            return;
        }

        const endereco = new URL(window.location.href);

        // Evita recarregamentos repetidos caso a publicação
        // ainda esteja sendo distribuída pelo servidor.
        if (
            endereco.searchParams.get("sl-atualizacao") ===
            versaoPendente
        ) {
            return;
        }

        atualizando = true;

        endereco.searchParams.set(
            "sl-atualizacao",
            versaoPendente
        );

        window.location.replace(endereco.href);

    }

    async function verificarAtualizacao() {

        if (
            verificando ||
            atualizando ||
            !navigator.onLine ||
            document.visibilityState !== "visible"
        ) {
            return;
        }

        if (Date.now() - ultimaVerificacao < 10000) {
            aplicarAtualizacao();
            return;
        }

        verificando = true;
        ultimaVerificacao = Date.now();

        const controlador = new AbortController();

        const limite = window.setTimeout(() => {
            controlador.abort();
        }, 10000);

        try {

            const resposta = await fetch(enderecoVersao, {
                cache: "no-store",
                signal: controlador.signal
            });

            if (!resposta.ok) {
                return;
            }

            const publicacao = await resposta.json();

            if (
                typeof publicacao.versao !== "string" ||
                !publicacao.versao
            ) {
                return;
            }

            versaoPendente =
                publicacao.versao !== versaoAberta
                    ? publicacao.versao
                    : "";

            aplicarAtualizacao();

        } catch {

            // Se a internet falhar, tenta novamente depois.

        } finally {

            window.clearTimeout(limite);
            verificando = false;

        }

    }

    document.addEventListener("visibilitychange", () => {

        if (document.visibilityState === "visible") {
            verificarAtualizacao();
        }

    });

    window.addEventListener(
        "online",
        verificarAtualizacao
    );

    window.addEventListener(
        "pageshow",
        verificarAtualizacao
    );

    window.setInterval(verificarAtualizacao, 60000);

    window.setInterval(aplicarAtualizacao, 5000);

    verificarAtualizacao();

})();