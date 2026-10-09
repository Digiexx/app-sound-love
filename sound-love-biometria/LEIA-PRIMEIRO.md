# Sound Love — desbloqueio pelo aparelho

O pacote acrescenta acesso rápido opcional. Os arquivos existentes são alterados apenas nos trechos abaixo. A atualização automática continua identificando a publicação pelo commit, como antes.

## 1. Dois arquivos novos

Copie `biometria.js` e `biometria.css` para a pasta principal do app, ao lado de `acesso.js` e `index.html`. Não coloque os arquivos na pasta Sound-Love-Android. Este guia não precisa ser publicado com o app.

## 2. Carregar o estilo no index.html

Pesquise `href="acesso.css"`. Selecione esta linha:

```html
    <link rel="stylesheet" href="acesso.css">
```

Substitua por:

```html
    <link rel="stylesheet" href="acesso.css">
    <link rel="stylesheet" href="biometria.css">
```

## 3. Carregar o módulo no index.html

Pesquise `<!-- Entrada e retomada após a atualização -->`. Selecione:

```html
    <!-- Entrada e retomada após a atualização -->
    <script src="acesso.js"></script>
```

Substitua por:

```html
    <!-- Desbloqueio opcional pelo aparelho -->
    <script src="biometria.js"></script>

    <!-- Entrada e retomada após a atualização -->
    <script src="acesso.js"></script>
```

Mantenha offline.js e atualizacao.js antes desse trecho.

## 4. Integrar ao acesso.js

Pesquise `formulario.addEventListener("submit"`. O bloco abaixo foi conferido na versão publicada. Se o seu bloco for diferente, envie o trecho atual antes de substituir.

Selecione este bloco completo:

```js
        formulario.addEventListener("submit", (evento) => {

            evento.preventDefault();

            if (campo.value !== SENHA_ACESSO) {

                erro.textContent =
                    "Senha incorreta. Tente novamente.";

                campo.setAttribute("aria-invalid", "true");
                campo.focus();
                campo.select();

                return;

            }

            campo.value = "";

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

        });
```

Substitua por este bloco completo:

```js
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
```

Mantenha o `campo.addEventListener("input", ...)` que vem depois, assim como a retomada do acesso após atualizações.

## 5. Publicação e teste no Android

Salve os arquivos e publique as alterações usando o processo habitual. Sugestão de commit: `feat: adiciona desbloqueio opcional pelo aparelho`.

Depois da publicação:

1. Abra o Sound Love com internet, permita a atualização concluir e digite o código correto.
2. Toque em **Ativar acesso rápido**. O Android ou navegador poderá chamar isso de criação de chave de acesso/passkey. Confirme com o método que ele oferecer.
3. Feche e abra o app novamente. Toque em **Desbloquear pelo aparelho** e confirme.
4. Cancele uma tentativa de desbloqueio. O app deve continuar bloqueado e permitir entrada pelo código.
5. Teste também no APK/TWA. A compatibilidade depende do navegador usado pelo APK e do aparelho.
6. Com a coleção já baixada, teste sem internet. O código continua como alternativa; a disponibilidade da chave de acesso sem conexão depende do autenticador/provedor.
7. Para desativar: entre pelo código e escolha **Desativar neste navegador**. Isso remove o vínculo local do Sound Love; uma chave criada no gerenciador de senhas pode continuar listada lá.

Em aparelhos sem suporte, a entrada pelo código permanece disponível. Se o cadastro não concluir, **Agora não** permite continuar. Atualizações normais preservam o cadastro local; limpar os dados do navegador pode apagá-lo.

## Alcance e validação

Este recurso é uma conveniência de entrada local para o app estático. Não cria contas no servidor e não criptografa ou torna privados os arquivos publicados no GitHub Pages. O aparelho decide entre digital, rosto ou PIN; o site não recebe a impressão digital.

O módulo grava apenas o identificador da credencial, sua chave pública e o escopo do app. O código do Sound Love não é gravado por este módulo. No desbloqueio, verifica o desafio novo, a origem, o domínio, a presença e verificação do usuário e a assinatura criptográfica.

Validação automática: 21 testes passaram, incluindo assinatura ECDSA real, recusa de assinatura adulterada, desafio antigo, outra origem, falta de verificação do usuário, cancelamento e falha de armazenamento. A janela nativa, o sensor e a compatibilidade com seu APK precisam do teste no aparelho real.
