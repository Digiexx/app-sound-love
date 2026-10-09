/* =========================================
   SOUND LOVE — DESBLOQUEIO PELO APARELHO
   ========================================= */

(() => {
    "use strict";

    // Acesso rápido local. Não é autenticação de uma conta no servidor
    // nem criptografia dos arquivos publicados no GitHub Pages.
    const origem = window.location.origin;
    const rpId = window.location.hostname;
    const escopo = new URL(".", document.baseURI).pathname;
    const chaveRegistro = "sound-love-acesso-aparelho-v1:" + escopo;
    const encoder = new TextEncoder();
    let operacao = null;

    function codificar(valor) {
        return btoa(String.fromCharCode(...new Uint8Array(valor)))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodificar(valor) {
        if (typeof valor !== "string" || !/^[A-Za-z0-9_-]+$/.test(valor)) {
            throw new Error("O cadastro salvo não é válido. Entre com o código.");
        }
        const base = valor.replace(/-/g, "+").replace(/_/g, "/");
        return Uint8Array.from(atob(base + "=".repeat((4 - base.length % 4) % 4)),
            (letra) => letra.charCodeAt(0));
    }

    function iguais(a, b) {
        a = new Uint8Array(a);
        b = new Uint8Array(b);
        if (a.length !== b.length) return false;
        return a.every((valor, indice) => valor === b[indice]);
    }

    function lerRegistro() {
        try {
            const registro = JSON.parse(localStorage.getItem(chaveRegistro));
            if (!registro || registro.formato !== 1 || registro.origem !== origem ||
                registro.escopo !== escopo || registro.rpId !== rpId ||
                typeof registro.id !== "string" || registro.id.length > 2048 ||
                typeof registro.publica !== "string" || registro.publica.length > 1024 ||
                decodificar(registro.id).length === 0 ||
                decodificar(registro.publica).length === 0) return null;
            return registro;
        } catch {
            return null;
        }
    }

    async function disponivel() {
        try {
            if (!window.isSecureContext || !window.PublicKeyCredential ||
                !navigator.credentials?.create || !navigator.credentials?.get ||
                !window.crypto?.subtle) return false;
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch {
            return false;
        }
    }

    function conferirCliente(resposta, desafio, tipo) {
        const dados = JSON.parse(new TextDecoder().decode(resposta.clientDataJSON));
        if (dados.type !== tipo || dados.origin !== origem || dados.crossOrigin === true ||
            !iguais(decodificar(dados.challenge), desafio)) {
            throw new Error("Não foi possível validar o desbloqueio. Use seu código.");
        }
    }

    async function conferirAutenticador(valor) {
        const dados = new Uint8Array(valor);
        const hash = await crypto.subtle.digest("SHA-256", encoder.encode(rpId));
        // Os dois indicadores exigem presença e verificação do usuário.
        if (dados.length < 37 || !iguais(dados.slice(0, 32), hash) ||
            (dados[32] & 0x05) !== 0x05) {
            throw new Error("O aparelho não confirmou o desbloqueio. Use seu código.");
        }
    }

    // WebAuthn entrega ECDSA em DER. Web Crypto espera r e s de 32 bytes.
    function assinaturaBruta(valor) {
        const bytes = new Uint8Array(valor);
        let indice = 0;
        function lerComprimento() {
            const tamanho = bytes[indice++];
            if (tamanho === undefined || tamanho >= 128) {
                throw new Error("Assinatura de desbloqueio inválida.");
            }
            return tamanho;
        }
        if (bytes[indice++] !== 0x30 || lerComprimento() !== bytes.length - indice) {
            throw new Error("Assinatura de desbloqueio inválida.");
        }
        const resultado = new Uint8Array(64);
        for (let parte = 0; parte < 2; parte++) {
            if (bytes[indice++] !== 0x02) throw new Error("Assinatura inválida.");
            const tamanho = lerComprimento();
            const inteiro = bytes.slice(indice, indice + tamanho);
            indice += tamanho;
            if (!tamanho || inteiro.length !== tamanho || (inteiro[0] & 0x80) ||
                (tamanho > 1 && inteiro[0] === 0 && !(inteiro[1] & 0x80))) {
                throw new Error("Assinatura inválida.");
            }
            const numero = inteiro[0] === 0 ? inteiro.slice(1) : inteiro;
            if (numero.length > 32) throw new Error("Assinatura inválida.");
            resultado.set(numero, parte * 32 + 32 - numero.length);
        }
        if (indice !== bytes.length) throw new Error("Assinatura inválida.");
        return resultado;
    }

    async function executar(tarefa) {
        if (operacao) throw new Error("Já existe um desbloqueio em andamento.");
        const controle = new AbortController();
        operacao = controle;
        const limite = setTimeout(() => controle.abort(), 60000);
        try {
            return await tarefa(controle.signal);
        } finally {
            clearTimeout(limite);
            if (operacao === controle) operacao = null;
        }
    }

    async function cadastrar() {
        // Confira a disponibilidade do armazenamento antes de abrir o aparelho.
        const teste = chaveRegistro + ":teste";
        localStorage.setItem(teste, "1");
        localStorage.removeItem(teste);
        return executar(async (signal) => {
            const desafio = crypto.getRandomValues(new Uint8Array(32));
            const usuario = crypto.getRandomValues(new Uint8Array(32));
            const credencial = await navigator.credentials.create({
                signal,
                publicKey: {
                    challenge: desafio,
                    rp: { id: rpId, name: "Sound Love" },
                    user: {
                        id: usuario,
                        name: "sound-love-" + codificar(usuario).slice(0, 8),
                        displayName: "Sound Love — acesso rápido"
                    },
                    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        residentKey: "discouraged",
                        userVerification: "required"
                    },
                    attestation: "none",
                    timeout: 60000
                }
            });
            if (!credencial || credencial.type !== "public-key") {
                throw new Error("O cadastro não foi concluído.");
            }
            const resposta = credencial.response;
            if (!resposta.getPublicKey || !resposta.getPublicKeyAlgorithm ||
                !resposta.getAuthenticatorData || resposta.getPublicKeyAlgorithm() !== -7) {
                throw new Error("Este navegador não oferece o cadastro necessário. Use o código.");
            }
            conferirCliente(resposta, desafio, "webauthn.create");
            await conferirAutenticador(resposta.getAuthenticatorData());
            const publica = resposta.getPublicKey();
            if (!publica) throw new Error("O aparelho não forneceu a chave de verificação.");
            await crypto.subtle.importKey("spki", publica,
                { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
            const registro = {
                formato: 1, origem, escopo, rpId,
                id: codificar(credencial.rawId), publica: codificar(publica)
            };
            // Só troca um cadastro anterior depois de concluir a nova verificação.
            localStorage.setItem(chaveRegistro, JSON.stringify(registro));
            return registro;
        });
    }

    async function autenticar() {
        const registro = lerRegistro();
        if (!registro) throw new Error("Entre com o código para ativar o acesso rápido.");
        return executar(async (signal) => {
            const desafio = crypto.getRandomValues(new Uint8Array(32));
            const credencial = await navigator.credentials.get({
                signal,
                publicKey: {
                    challenge: desafio,
                    rpId,
                    allowCredentials: [{
                        type: "public-key",
                        id: decodificar(registro.id),
                        transports: ["internal"]
                    }],
                    userVerification: "required",
                    timeout: 60000
                }
            });
            if (!credencial || credencial.type !== "public-key" ||
                !iguais(credencial.rawId, decodificar(registro.id))) {
                throw new Error("O aparelho não reconheceu o cadastro. Use seu código.");
            }
            const resposta = credencial.response;
            conferirCliente(resposta, desafio, "webauthn.get");
            await conferirAutenticador(resposta.authenticatorData);
            const hashCliente = new Uint8Array(await crypto.subtle.digest(
                "SHA-256", resposta.clientDataJSON));
            const autenticador = new Uint8Array(resposta.authenticatorData);
            const mensagem = new Uint8Array(autenticador.length + hashCliente.length);
            mensagem.set(autenticador);
            mensagem.set(hashCliente, autenticador.length);
            const publica = await crypto.subtle.importKey("spki", decodificar(registro.publica),
                { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
            const valida = await crypto.subtle.verify(
                { name: "ECDSA", hash: "SHA-256" }, publica,
                assinaturaBruta(resposta.signature), mensagem);
            if (!valida) throw new Error("A assinatura do desbloqueio não é válida. Use seu código.");
            return true;
        });
    }

    function mensagemErro(erro) {
        if (erro?.name === "NotAllowedError" || erro?.name === "AbortError") {
            return "O desbloqueio foi cancelado ou não terminou. Tente novamente ou use seu código.";
        }
        if (erro?.name === "SecurityError" || erro?.name === "NotSupportedError") {
            return "Este navegador não permitiu o recurso. Você pode continuar com seu código.";
        }
        if (erro?.name === "QuotaExceededError") {
            return "Não foi possível salvar o cadastro neste navegador. Continue com seu código.";
        }
        return erro?.message || "Não foi possível concluir. Você pode usar seu código.";
    }

    function preparar(entrada, formulario, finalizar) {
        let ocupado = false;
        let encerrado = false;
        const pronto = disponivel();
        const area = document.createElement("section");
        area.className = "sound-biometria";
        area.hidden = true;
        area.innerHTML = `
            <button type="button" class="sound-biometria-principal">
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
                    aria-hidden="true">
                    <path d="M7 5a8 8 0 0 1 13 6v3M4 10a8 8 0 0 1 1-3"/>
                    <path d="M8 20c2-3 2-6 2-9a2 2 0 0 1 4 0c0 5-1 8-3 11"/>
                    <path d="M5 17c1-2 1-4 1-6a6 6 0 0 1 12 0c0 4-.5 7-2 10"/>
                    <path d="M3 13v2M12 11c0 3-.2 5-1 7"/>
                </svg>
                Desbloquear pelo aparelho
            </button>
            <p class="sound-biometria-ajuda">Digital, rosto ou PIN do aparelho.<br>Você também pode usar seu código abaixo.</p>
            <p class="sound-biometria-status" role="status" aria-live="polite"></p>
        `;
        formulario.before(area);
        const botao = area.querySelector("button");
        const status = area.querySelector(".sound-biometria-status");

        function bloquearFormulario(bloquear) {
            formulario.querySelectorAll("input, button").forEach((elemento) => {
                elemento.disabled = bloquear;
            });
            botao.disabled = bloquear;
            area.setAttribute("aria-busy", String(bloquear));
        }

        pronto.then((suporta) => {
            if (!encerrado && entrada.isConnected) area.hidden = !(suporta && lerRegistro());
        });

        botao.addEventListener("click", async () => {
            if (ocupado || encerrado) return;
            ocupado = true;
            bloquearFormulario(true);
            status.textContent = "Confirme o desbloqueio no aparelho…";
            try {
                await autenticar();
                if (!encerrado) finalizar();
            } catch (erro) {
                status.textContent = mensagemErro(erro);
            } finally {
                ocupado = false;
                bloquearFormulario(false);
            }
        });

        async function aoCodigoValido() {
            // Esta função deve ser chamada apenas depois de validar o código.
            if (encerrado || !(await pronto)) return;
            ocupado = true;
            area.hidden = true;
            formulario.hidden = true;
            const anterior = lerRegistro();
            const painel = document.createElement("section");
            painel.className = "sound-biometria";
            painel.innerHTML = `
                <h2>${anterior ? "Seu acesso rápido" : "Entre com um toque"}</h2>
                <p class="sound-biometria-ajuda">Use o desbloqueio que já existe no aparelho.<br>Seu código continua disponível.</p>
                <button type="button" data-biometria="ativar" class="sound-biometria-principal">
                    ${anterior ? "Cadastrar novamente" : "Ativar acesso rápido"}
                </button>
                <button type="button" data-biometria="continuar" class="sound-biometria-secundario">
                    ${anterior ? "Continuar no Sound Love" : "Agora não"}
                </button>
                ${anterior ? '<button type="button" data-biometria="remover" class="sound-biometria-secundario">Desativar neste navegador</button>' : ""}
                <p class="sound-biometria-status" role="status" aria-live="polite"></p>
            `;
            formulario.after(painel);
            const aviso = painel.querySelector(".sound-biometria-status");
            painel.querySelector('[data-biometria="ativar"]').focus();
            await new Promise((resolve) => {
                let cadastrando = false;
                painel.addEventListener("click", async (evento) => {
                    const acao = evento.target.closest("[data-biometria]")?.dataset.biometria;
                    if (!acao || cadastrando) return;
                    if (acao === "continuar") return resolve();
                    if (acao === "remover") {
                        try {
                            localStorage.removeItem(chaveRegistro);
                            resolve();
                        } catch (erro) {
                            aviso.textContent = mensagemErro(erro);
                        }
                        return;
                    }
                    cadastrando = true;
                    painel.setAttribute("aria-busy", "true");
                    painel.querySelectorAll("button").forEach((item) => item.disabled = true);
                    aviso.textContent = "Confirme a ativação no aparelho…";
                    try {
                        await cadastrar();
                        resolve();
                    } catch (erro) {
                        aviso.textContent = mensagemErro(erro);
                    } finally {
                        cadastrando = false;
                        painel.setAttribute("aria-busy", "false");
                        painel.querySelectorAll("button").forEach((item) => item.disabled = false);
                    }
                });
            });
            painel.remove();
            formulario.hidden = false;
            ocupado = false;
        }

        return Object.freeze({
            estaOcupado: () => ocupado,
            aoCodigoValido,
            encerrar() {
                encerrado = true;
                area.remove();
            }
        });
    }

    window.SoundLoveBiometria = Object.freeze({ preparar });
})();
