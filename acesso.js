/* =========================================
   SOUND LOVE — ENTRADA COM SENHA
   ========================================= */

(() => {

    "use strict";

    // Para mudar a senha, altere somente esta linha.
    const SENHA_ACESSO = "121210";

    if (
        "serviceWorker" in navigator &&
        window.isSecureContext
    ) {

        navigator.serviceWorker
            .register("./service-worker.js")
            .catch((erro) => {

                console.error(
                    "Não foi possível registrar o service worker:",
                    erro
                );

            });

    }

    let conviteInstalacao = null;

    window.addEventListener(
        "beforeinstallprompt",
        (evento) => {

            evento.preventDefault();

            conviteInstalacao = evento;

            window.dispatchEvent(
                new Event("sound-love-instalacao-disponivel")
            );

        }
    );

    window.addEventListener("appinstalled", () => {

        conviteInstalacao = null;

        document
            .getElementById("instalacao-sound-love")
            ?.close();

    });

        function abrirConviteInstalacao() {

        const instalado =
            window.matchMedia(
                "(display-mode: standalone)"
            ).matches ||
            navigator.standalone === true;

        if (instalado) {
            return;
        }

        const painel = document.createElement("dialog");

        painel.id = "instalacao-sound-love";

        painel.setAttribute(
            "aria-labelledby",
            "instalacao-sound-titulo"
        );

        painel.innerHTML = `
            <div class="entrada-sound-conteudo">

                <span
                    class="entrada-sound-coracao"
                    aria-hidden="true"
                >
                    ♡
                </span>

                <p class="entrada-sound-assinatura">
                    SOUND LOVE
                </p>

                <h1 id="instalacao-sound-titulo">
                    Seu clima, sempre perto.
                </h1>

                <p class="entrada-sound-descricao">
                    Instale o Sound Love para abrir
                    seus momentos direto da tela inicial.
                </p>

                <button
                    type="button"
                    id="instalacao-sound-botao"
                >
                    Instalar Sound Love
                </button>

                <p
                    id="instalacao-sound-instrucoes"
                    class="entrada-sound-descricao"
                    aria-live="polite"
                ></p>

                <button
                    type="button"
                    id="instalacao-sound-depois"
                >
                    Continuar no navegador

                    <span aria-hidden="true"> →</span>
                </button>

            </div>
        `;

        document.body.appendChild(painel);

        const botao =
            painel.querySelector("#instalacao-sound-botao");

        const instrucoes =
            painel.querySelector(
                "#instalacao-sound-instrucoes"
            );

        const atualizarBotao = () => {

            botao.textContent = conviteInstalacao
                ? "Instalar Sound Love"
                : "Como instalar";

        };

        atualizarBotao();

        window.addEventListener(
            "sound-love-instalacao-disponivel",
            atualizarBotao
        );

        painel.addEventListener("close", () => {

            window.removeEventListener(
                "sound-love-instalacao-disponivel",
                atualizarBotao
            );

            painel.remove();

        }, { once: true });

        painel
            .querySelector("#instalacao-sound-depois")
            .addEventListener("click", () => {
                painel.close();
            });

        botao.addEventListener("click", async () => {

            if (!conviteInstalacao) {

                const aparelhoApple =
                    /iPhone|iPad|iPod/.test(
                        navigator.userAgent
                    ) ||
                    (
                        navigator.platform === "MacIntel" &&
                        navigator.maxTouchPoints > 1
                    );

                instrucoes.textContent = aparelhoApple
                    ? "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início."
                    : "Abra o menu do navegador e procure Instalar aplicativo ou Adicionar à tela inicial. Se abriu pelo WhatsApp, abra este link no navegador do celular.";

                return;

            }

            const convite = conviteInstalacao;

            conviteInstalacao = null;
            botao.disabled = true;

            try {

                await convite.prompt();

                const escolha = await convite.userChoice;

                if (escolha.outcome === "accepted") {

                    painel.close();

                } else {

                    instrucoes.textContent =
                        "Você pode continuar no navegador e instalar depois.";

                }

            } catch {

                instrucoes.textContent =
                    "Abra o menu do navegador para instalar o Sound Love.";

            } finally {

                botao.disabled = false;
                atualizarBotao();

            }

        });

        painel.showModal();

    }

    function retomarAcessoAtualizacao() {

        let retomada;

        try {

            const salvo = sessionStorage.getItem(
                "sound-love-retomar-acesso"
            );

            // A retomada só pode ser usada uma vez.
            sessionStorage.removeItem(
                "sound-love-retomar-acesso"
            );

            if (!salvo) {
                return false;
            }

            retomada = JSON.parse(salvo);

        } catch {

            return false;

        }

        const versaoAtual = document
            .querySelector('meta[name="sound-love-versao"]')
            ?.content;

        const endereco = new URL(
            window.location.href
        );

        if (
            !retomada ||
            typeof retomada !== "object" ||
            typeof retomada.versao !== "string" ||
            !retomada.versao ||
            retomada.versao !== versaoAtual ||
            retomada.versao !==
                endereco.searchParams.get("sl-atualizacao") ||
            !Number.isFinite(retomada.expira) ||
            retomada.expira <= Date.now() ||
            retomada.expira - Date.now() > 30000
        ) {
            return false;
        }

        return true;

    }

    window.addEventListener(
        "sound-love-atualizacao-liberada",
        () => {

            if (
                window.SoundLoveAcessoLiberado === true &&
                !document.getElementById(
                    "instalacao-sound-love"
                )
            ) {
                abrirConviteInstalacao();
            }

        }
    );

    function abrirEntrada() {

        if (document.getElementById("entrada-sound-love")) {
            return;
        }

        if (retomarAcessoAtualizacao()) {

            window.SoundLoveAcessoLiberado = true;

            window.dispatchEvent(
                new Event("sound-love-acesso-liberado")
            );

            abrirConviteInstalacao();

            return;

        }

        const entrada = document.createElement("dialog");

        entrada.id = "entrada-sound-love";

        entrada.setAttribute(
            "aria-labelledby",
            "entrada-sound-titulo"
        );

        entrada.innerHTML = `
            <div class="entrada-sound-conteudo">

                <span
                    class="entrada-sound-coracao"
                    aria-hidden="true"
                >
                    ♡
                </span>

                <p class="entrada-sound-assinatura">
                    SOUND LOVE
                </p>

                <h1 id="entrada-sound-titulo">
                    Entre no seu clima.
                </h1>

                <p class="entrada-sound-descricao">
                    Sua trilha para momentos
                    de prazer e romance.
                </p>

                <form id="entrada-sound-form">

                    <label for="entrada-sound-senha">
                        Sua senha de acesso
                    </label>

                    <div class="entrada-sound-pin">

                        <div
                            class="entrada-sound-pin-casas"
                            aria-hidden="true"
                        >
                            <span class="entrada-sound-pin-casa"></span>
                            <span class="entrada-sound-pin-casa"></span>
                            <span class="entrada-sound-pin-casa"></span>
                            <span class="entrada-sound-pin-casa"></span>
                            <span class="entrada-sound-pin-casa"></span>
                            <span class="entrada-sound-pin-casa"></span>
                        </div>

                    </div>

                    <div class="entrada-sound-campo">

                        <svg
                            class="entrada-sound-cadeado"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <rect
                                x="5"
                                y="10"
                                width="14"
                                height="11"
                                rx="3"
                            />
                            <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
                        </svg>

                        <input
                            id="entrada-sound-senha"
                            name="senha"
                            type="password"
                            inputmode="numeric"
                            autocomplete="off"
                            placeholder="Digite sua senha"
                            aria-describedby="entrada-sound-erro"
                            required
                        >

                        <button
                            id="entrada-sound-mostrar"
                            type="button"
                            aria-label="Mostrar senha"
                            aria-controls="entrada-sound-senha"
                            aria-pressed="false"
                        >
                            <svg
                                width="21"
                                height="21"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.6"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>

                    </div>

                    <p
                        id="entrada-sound-erro"
                        role="alert"
                        aria-live="polite"
                    ></p>

                    <button type="submit">
                        Entrar no Sound Love
                    </button>

                </form>

                <p class="entrada-sound-rodape">
                    Seus momentos merecem uma trilha.
                </p>

            </div>
        `;

        let acessoLiberado = false;

        // Mantém o aplicativo oculto até validar a senha.
        const bloqueioVisual = document.createElement("style");

        bloqueioVisual.textContent = `
            html[data-acesso-sound="bloqueado"] body > :not(dialog):not(script):not(style):not(link) {
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `;

        document.head.appendChild(bloqueioVisual);

        document.documentElement.dataset.acessoSound =
            "bloqueado";

        // Bloqueia também a interação por teclado.
        const elementosBloqueados = Array.from(
            document.body.children
        ).filter((elemento) => {
            return ![
                "DIALOG",
                "SCRIPT",
                "STYLE",
                "LINK"
            ].includes(elemento.tagName);
        }).map((elemento) => {
            const inertAnterior = elemento.inert;

            elemento.inert = true;

            return {
                elemento,
                inertAnterior
            };
        });

        function liberarConteudo() {

            acessoLiberado = true;

            elementosBloqueados.forEach((item) => {
                item.elemento.inert = item.inertAnterior;
            });

            delete document.documentElement.dataset.acessoSound;

            bloqueioVisual.remove();

        }

        function manterEntradaAberta() {

            if (
                acessoLiberado ||
                !entrada.isConnected ||
                entrada.open
            ) {
                return;
            }

            entrada.showModal();

        }

        entrada.setAttribute("closedby", "none");

        entrada.addEventListener("cancel", (evento) => {
            evento.preventDefault();
        });

        // Se o navegador fechar a janela sem autenticação,
        // o conteúdo continua bloqueado e a entrada reabre.
        entrada.addEventListener("close", () => {

            if (!acessoLiberado) {
                manterEntradaAberta();
            }

        });

        window.addEventListener(
            "pageshow",
            manterEntradaAberta
        );

        document.body.appendChild(entrada);

        const formulario =
            entrada.querySelector("#entrada-sound-form");

        const campo =
            entrada.querySelector("#entrada-sound-senha");

        const erro =
            entrada.querySelector("#entrada-sound-erro");

        const mostrarSenha =
            entrada.querySelector("#entrada-sound-mostrar");

        const painelCodigo =
            entrada.querySelector(".entrada-sound-pin");

        const casasCodigo = Array.from(
            entrada.querySelectorAll(".entrada-sound-pin-casa")
        );

        const campoAntigo =
            campo.closest(".entrada-sound-campo");

        if (
            painelCodigo &&
            casasCodigo.length === SENHA_ACESSO.length &&
            campoAntigo
        ) {

            // Usa o mesmo campo que já valida o acesso.
            painelCodigo.appendChild(campo);

            // Retira a caixa antiga do visual.
            campoAntigo.hidden = true;
            campoAntigo.style.display = "none";

            painelCodigo.style.position = "relative";

            campo.maxLength = SENHA_ACESSO.length;

            campo.setAttribute(
                "aria-label",
                "Código de acesso de seis dígitos"
            );

            // O campo recebe a digitação sobre os quadrados.
            // Os números serão representados por pontos.
            Object.assign(campo.style, {
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                minWidth: "0",
                minHeight: "0",
                margin: "0",
                padding: "0",
                border: "0",
                boxSizing: "border-box",
                opacity: "0",
                fontSize: "16px",
                cursor: "text",
                zIndex: "2"
            });

            function atualizarCasasCodigo() {

                const codigo = campo.value
                    .replace(/\D/g, "")
                    .slice(0, SENHA_ACESSO.length);

                if (campo.value !== codigo) {
                    campo.value = codigo;
                }

                const estaDigitando =
                    document.activeElement === campo;

                const posicaoAtiva = Math.min(
                    campo.selectionStart ?? codigo.length,
                    casasCodigo.length - 1
                );

                casasCodigo.forEach((casa, indice) => {

                    const preenchida =
                        indice < codigo.length;

                    casa.textContent =
                        preenchida ? "●" : "";

                    casa.classList.toggle(
                        "preenchida",
                        preenchida
                    );

                    casa.classList.toggle(
                        "ativa",
                        estaDigitando &&
                        indice === posicaoAtiva
                    );

                });

            }

            [
                "input",
                "focus",
                "blur",
                "click",
                "keyup",
                "select"
            ].forEach((nomeEvento) => {

                campo.addEventListener(
                    nomeEvento,
                    atualizarCasasCodigo
                );

            });

            atualizarCasasCodigo();

        }

        const ocultacaoVisualDisponivel =
            CSS.supports("-webkit-text-security", "disc");

        let codigoVisivel = false;

        campo.name = "codigo";
        campo.inputMode = "numeric";
        campo.autocomplete = "off";
        campo.maxLength = SENHA_ACESSO.length;

        campo.placeholder = "Digite seu código";
        campo.spellcheck = false;

        campo.setAttribute("autocapitalize", "off");

        formulario.setAttribute("autocomplete", "off");

        const rotuloCodigo = formulario.querySelector(
            'label[for="entrada-sound-senha"]'
        );

        if (rotuloCodigo) {
            rotuloCodigo.textContent = "Seu código de acesso";
        }

        function atualizarVisibilidadeCodigo() {

            if (ocultacaoVisualDisponivel) {

                campo.type = "text";

                campo.style.setProperty(
                    "-webkit-text-security",
                    codigoVisivel ? "none" : "disc"
                );

            } else {

                // Mantém os números ocultos nos navegadores
                // que não oferecem a ocultação visual.
                campo.type = codigoVisivel
                    ? "text"
                    : "password";

            }

            mostrarSenha.setAttribute(
                "aria-pressed",
                String(codigoVisivel)
            );

            mostrarSenha.setAttribute(
                "aria-label",
                codigoVisivel
                    ? "Ocultar código"
                    : "Mostrar código"
            );

        }

        campo.addEventListener("input", () => {

            campo.value = campo.value
                .replace(/[^0-9]/g, "")
                .slice(0, SENHA_ACESSO.length);

        });

        mostrarSenha.addEventListener("click", () => {

            codigoVisivel = !codigoVisivel;

            atualizarVisibilidadeCodigo();

        });

        atualizarVisibilidadeCodigo();

        function concluirEntrada() {

            if (acessoLiberado) {
                return;
            }

            campo.value = "";

            biometria?.encerrar();

            liberarConteudo();

            window.removeEventListener(
                "pageshow",
                manterEntradaAberta
            );

            entrada.close();
            entrada.remove();

            // A atualização poderá começar após o acesso.
            window.SoundLoveAcessoLiberado = true;

            window.dispatchEvent(
                new Event("sound-love-acesso-liberado")
            );

            abrirConviteInstalacao();

        }

        const biometria = window.SoundLoveBiometria?.preparar(
            entrada,
            formulario,
            concluirEntrada
        );

        let validandoAcesso = false;

        formulario.addEventListener("submit", async (evento) => {

            evento.preventDefault();

            if (
                validandoAcesso ||
                acessoLiberado ||
                biometria?.estaOcupado()
            ) {
                return;
            }

            if (campo.value !== SENHA_ACESSO) {

                erro.textContent =
                    "Senha incorreta. Tente novamente.";

                campo.setAttribute("aria-invalid", "true");
                campo.focus();
                campo.select();

                return;

            }

            validandoAcesso = true;
            campo.value = "";
            erro.textContent = "";

            try {

                // O cadastro só é oferecido depois do código correto.
                await biometria?.aoCodigoValido();

                concluirEntrada();

            } catch {

                erro.textContent =
                    "Não foi possível preparar o acesso rápido. Entre novamente com seu código.";

            } finally {

                validandoAcesso = false;

            }

        });

        campo.addEventListener("input", () => {

            erro.textContent = "";
            campo.removeAttribute("aria-invalid");

        });

        entrada.showModal();

    }

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            abrirEntrada,
            { once: true }
        );

    } else {

        abrirEntrada();

    }

})();