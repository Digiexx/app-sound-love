/* =========================================
   SOUND LOVE — ATUALIZAÇÃO AUTOMÁTICA
   ========================================= */

(() => {

    "use strict";

    const versaoAberta = document
        .querySelector('meta[name="sound-love-versao"]')
        ?.content;

    if (!versaoAberta) {
        return;
    }

    const enderecoVersao =
        new URL("versao.json", document.baseURI);

    let verificando = false;
    let ultimaVerificacao = 0;
    let versaoPendente = "";
    let versaoAdiada = "";
    let atualizando = false;
    let recarregando = false;
    let falhaPendente = false;
    let painel = null;

    function atualizarPainel(situacao) {

        if (!painel) {
            return;
        }

        const percentual = Math.min(
            100,
            Math.max(0, Number(situacao.progresso) || 0)
        );

        painel.querySelector(
            "#atualizacao-sound-progresso"
        ).value = percentual;

        painel.querySelector(
            "#atualizacao-sound-percentual"
        ).textContent = `${percentual}%`;

        painel.querySelector(
            "#atualizacao-sound-contagem"
        ).textContent = situacao.total
            ? `${situacao.concluidos} de ${situacao.total} arquivos`
            : "Preparando…";

        painel.querySelector(
            "#atualizacao-sound-status"
        ).textContent =
            situacao.mensagem ||
            "Preparando sua atualização…";

        const erro = painel.querySelector(
            "#atualizacao-sound-erro"
        );

        erro.textContent = situacao.erro || "";
        erro.hidden = !situacao.erro;

    }

    function fecharPainel() {

        if (!painel) {
            return;
        }

        const anterior = painel;

        painel = null;

        anterior.close();
        anterior.remove();

    }

    function liberarTela() {

        fecharPainel();

        window.dispatchEvent(
            new Event("sound-love-atualizacao-liberada")
        );

    }

    function abrirPainel() {

        if (painel) {
            return;
        }

        painel = document.createElement("dialog");

        painel.id = "atualizacao-sound-love";

        painel.setAttribute(
            "aria-labelledby",
            "atualizacao-sound-titulo"
        );

        painel.setAttribute("closedby", "none");

        painel.innerHTML = `
            <div class="atualizacao-sound-conteudo">

                <span
                    class="atualizacao-sound-emblema"
                    aria-hidden="true"
                >
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M12 3v12"/>
                        <path d="m7 10 5 5 5-5"/>
                        <path d="M5 16v4h14v-4"/>
                    </svg>
                </span>

                <p class="atualizacao-sound-assinatura">
                    SOUND LOVE
                </p>

                <h2 id="atualizacao-sound-titulo">
                    Preparando seu Sound Love…
                </h2>

                <p class="atualizacao-sound-descricao">
                    Sua trilha, com os novos detalhes.
                </p>

                <div class="atualizacao-sound-numeros">

                    <span id="atualizacao-sound-contagem">
                        Preparando…
                    </span>

                    <strong id="atualizacao-sound-percentual">
                        0%
                    </strong>

                </div>

                <progress
                    id="atualizacao-sound-progresso"
                    max="100"
                    value="0"
                    aria-label="Progresso da atualização"
                ></progress>

                <p
                    id="atualizacao-sound-status"
                    role="status"
                    aria-live="polite"
                >
                    Consultando a publicação…
                </p>

                <p
                    id="atualizacao-sound-erro"
                    role="alert"
                    hidden
                ></p>

                <div
                    class="atualizacao-sound-acoes"
                    id="atualizacao-sound-acoes"
                    hidden
                >

                    <button
                        type="button"
                        id="atualizacao-sound-tentar"
                    >
                        Tentar novamente
                    </button>

                    <button
                        type="button"
                        id="atualizacao-sound-continuar"
                    >
                        Continuar com a versão atual
                    </button>

                </div>

            </div>
        `;

        painel.addEventListener("cancel", (evento) => {
            evento.preventDefault();
        });

        const estePainel = painel;

        painel.addEventListener("close", () => {

            if (
                atualizando &&
                painel === estePainel &&
                estePainel.isConnected &&
                !estePainel.open
            ) {
                estePainel.showModal();
            }

        });

        painel.querySelector(
            "#atualizacao-sound-tentar"
        ).addEventListener("click", () => {

            if (!navigator.onLine) {

                atualizarPainel({
                    ...window.SoundLoveOffline.obterEstado(),
                    erro:
                        "Conecte-se à internet para tentar novamente."
                });

                return;

            }

            falhaPendente = false;
            versaoAdiada = "";

            aplicarAtualizacao();

        });

        painel.querySelector(
            "#atualizacao-sound-continuar"
        ).addEventListener("click", () => {

            versaoAdiada = versaoPendente;
            falhaPendente = false;

            liberarTela();

        });

        document.body.appendChild(painel);

        painel.showModal();

    }

    function mostrarFalha(mensagem) {

        falhaPendente = true;

        if (!painel) {
            return;
        }

        painel.querySelector(
            "#atualizacao-sound-titulo"
        ).textContent = "Vamos tentar outra vez?";

        painel.querySelector(
            "#atualizacao-sound-acoes"
        ).hidden = false;

        painel.setAttribute("aria-busy", "false");

        const erro = painel.querySelector(
            "#atualizacao-sound-erro"
        );

        erro.textContent = mensagem;
        erro.hidden = false;

    }

    async function aplicarAtualizacao() {

        if (
            !versaoPendente ||
            atualizando ||
            recarregando ||
            falhaPendente ||
            versaoAdiada === versaoPendente ||
            window.SoundLoveAcessoLiberado !== true ||
            !navigator.onLine ||
            document.visibilityState !== "visible"
        ) {
            return;
        }

        const offline = window.SoundLoveOffline;

        if (!offline || offline.obterEstado().baixando) {
            return;
        }

        const audioAtualizacao =
            document.getElementById("audio");

        if (
            audioAtualizacao &&
            !audioAtualizacao.paused &&
            !audioAtualizacao.ended
        ) {
            return;
        }

        const outroPainel = Array.from(
            document.querySelectorAll("dialog[open]")
        ).some((dialogo) => {

            return (
                dialogo.id !== "atualizacao-sound-love" &&
                dialogo.id !== "instalacao-sound-love"
            );

        });

        if (outroPainel) {
            return;
        }

        atualizando = true;

        const alvo = versaoPendente;

        try {

            const convite = document.getElementById(
                "instalacao-sound-love"
            );

            if (convite) {

                if (convite.open) {
                    convite.close();
                }

                convite.remove();

            }

            abrirPainel();

            painel.setAttribute("aria-busy", "true");

            painel.querySelector(
                "#atualizacao-sound-titulo"
            ).textContent = "Preparando seu Sound Love…";

            painel.querySelector(
                "#atualizacao-sound-acoes"
            ).hidden = true;

            atualizarPainel({
                progresso: 0,
                total: 0,
                concluidos: 0,
                mensagem: "Conferindo sua coleção…",
                erro: ""
            });

            const resultado = await offline.baixar(alvo);

            atualizarPainel(resultado);

            if (
                !resultado.completo ||
                resultado.versao !== alvo
            ) {

                mostrarFalha(
                    resultado.erro ||
                    "Não foi possível concluir a atualização. Tente novamente."
                );

                return;

            }

            versaoPendente = "";

            if (versaoAberta === resultado.versao) {

                atualizando = false;

                liberarTela();

                return;

            }

            const endereco = new URL(
                window.location.href
            );

            if (
                endereco.searchParams.get("sl-atualizacao") ===
                resultado.versao
            ) {

                versaoPendente = resultado.versao;

                mostrarFalha(
                    "A coleção foi salva, mas a nova tela ainda não abriu. Feche e abra o app novamente."
                );

                return;

            }

            // Prepara a retomada do acesso durante
            // este recarregamento da atualização.
            try {

                sessionStorage.setItem(
                    "sound-love-retomar-acesso",
                    JSON.stringify({
                        versao: resultado.versao,
                        expira: Date.now() + 30000
                    })
                );

            } catch {

                // A atualização continua mesmo
                // se esse armazenamento estiver indisponível.

            }

            endereco.searchParams.set(
                "sl-atualizacao",
                resultado.versao
            );

            recarregando = true;

            window.location.replace(endereco.href);

        } catch (erro) {

            recarregando = false;

            mostrarFalha(
                erro.message ||
                "Não foi possível atualizar agora."
            );

        } finally {

            if (!recarregando) {
                atualizando = false;
            }

        }

    }

    async function verificarAtualizacao() {

        if (
            verificando ||
            atualizando ||
            recarregando ||
            falhaPendente ||
            window.SoundLoveAcessoLiberado !== true ||
            !navigator.onLine ||
            document.visibilityState !== "visible" ||
            !window.SoundLoveOffline
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

            const salvo =
                await window.SoundLoveOffline.verificar();

            versaoPendente =
                publicacao.versao !== versaoAberta ||
                !salvo.completo ||
                salvo.versao !== publicacao.versao
                    ? publicacao.versao
                    : "";

            aplicarAtualizacao();

        } catch {

            // Sem conexão, mantém o app disponível
            // na versão salva.

        } finally {

            window.clearTimeout(limite);

            verificando = false;

        }

    }

    window.addEventListener(
        "sound-love-offline-status",
        (evento) => {
            atualizarPainel(evento.detail);
        }
    );

    window.addEventListener(
        "sound-love-acesso-liberado",
        verificarAtualizacao
    );

    document.addEventListener(
        "visibilitychange",
        () => {

            if (document.visibilityState === "visible") {
                verificarAtualizacao();
            }

        }
    );

    window.addEventListener("online", () => {

        versaoAdiada = "";
        falhaPendente = false;

        verificarAtualizacao();

    });

    window.addEventListener(
        "pageshow",
        verificarAtualizacao
    );

    window.setInterval(verificarAtualizacao, 60000);

    window.setInterval(aplicarAtualizacao, 3000);

    verificarAtualizacao();

})();