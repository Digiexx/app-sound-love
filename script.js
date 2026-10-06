/* =========================================
   SOUND LOVE — BASE DO APLICATIVO
   ========================================= */

window.SoundLove = (() => {

    "use strict";

    const categorias = window.SOUND_CATEGORIAS || [];
    const musicas = window.SOUND_MUSICAS || [];

    const pagina = document.getElementById("page");
    const menuDesktop = document.getElementById("desktop-nav");
    const menuCelular = document.getElementById("bottom-nav");
    const mensagem = document.getElementById("toast");

    const chaveDados = "sound-love-dados-v1";

    const estado = {
        pagina: "inicio",
        busca: "",
        categoria: "todas",
        ordem: "az"
    };

    let dados = {
        preferidas: {},
        classificacoes: {},
        tema: "carinho",
        momentos: [],

        efeitos: {
            animarCapa: true,
            particulas: true
        }
    };

    let tempoMensagem;

    /* Imagem provisória feita em código.
       Será usada quando a música não tiver capa. */

    const desenhoCapa = `
        <svg xmlns="http://www.w3.org/2000/svg"
             width="500" height="500"
             viewBox="0 0 500 500">

            <defs>
                <linearGradient id="fundo"
                                x2="0" y2="1">
                    <stop stop-color="#48106c"/>
                    <stop offset="1" stop-color="#10071f"/>
                </linearGradient>

                <linearGradient id="sol"
                                x2="0" y2="1">
                    <stop stop-color="#ffb9ea"/>
                    <stop offset="1" stop-color="#f800cd"/>
                </linearGradient>
            </defs>

            <rect width="500" height="500"
                  fill="url(#fundo)"/>

            <circle cx="250" cy="210" r="100"
                    fill="url(#sol)"/>

            <path d="M0 340 L100 230 L190 330
                     L300 245 L410 325 L500 260
                     V500 H0 Z"
                  fill="#27103e"/>

            <path d="M0 390 L140 320 L240 385
                     L355 310 L500 390 V500 H0 Z"
                  fill="#170b2b"/>

            <path d="M210 500 L245 350
                     L255 350 L290 500"
                  fill="#f800cd"
                  opacity=".45"/>

        </svg>
    `;

    const capaPadrao =
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(desenhoCapa);


    /* =====================================
       DADOS SALVOS
       ===================================== */

    function carregarDados() {

        try {

            const salvos = JSON.parse(
                localStorage.getItem(chaveDados)
            );

            if (!salvos || typeof salvos !== "object") {
                return;
            }

            dados.preferidas =
                salvos.preferidas &&
                typeof salvos.preferidas === "object"
                    ? salvos.preferidas
                    : {};

            dados.classificacoes =
                salvos.classificacoes &&
                typeof salvos.classificacoes === "object"
                    ? salvos.classificacoes
                    : {};

            dados.tema =
                typeof salvos.tema === "string"
                    ? salvos.tema
                    : "synthwave";

            dados.momentos =
                Array.isArray(salvos.momentos)
                    ? salvos.momentos
                    : [];

            dados.efeitos = {
                animarCapa:
                    typeof salvos.efeitos?.animarCapa === "boolean"
                        ? salvos.efeitos.animarCapa
                        : true,

                particulas:
                    typeof salvos.efeitos?.particulas === "boolean"
                        ? salvos.efeitos.particulas
                        : true
            };

        } catch {

            // Mantém os dados iniciais se não houver
            // um cadastro salvo válido.

        }

    }


    function salvarDados() {

        try {

            localStorage.setItem(
                chaveDados,
                JSON.stringify(dados)
            );

        } catch {

            avisar(
                "Não foi possível salvar as preferências."
            );

        }

    }


    /* =====================================
       FUNÇÕES AUXILIARES
       ===================================== */

    function textoSeguro(valor) {

        return String(valor ?? "").replace(
            /[&<>"']/g,
            caractere => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[caractere])
        );

    }


    function avisar(texto) {

        mensagem.textContent = texto;
        mensagem.style.display = "block";

        clearTimeout(tempoMensagem);

        tempoMensagem = setTimeout(() => {
            mensagem.style.display = "none";
        }, 3000);

    }


    function encontrarMusica(id) {

        return musicas.find(musica => musica.id === id);

    }


    function ehPreferida(musica) {

        if (
            Object.prototype.hasOwnProperty.call(
                dados.preferidas,
                musica.id
            )
        ) {

            return Boolean(
                dados.preferidas[musica.id]
            );

        }

        return Boolean(musica.preferida);

    }


    function categoriasDaMusica(musica) {

        const classificacao =
            dados.classificacoes[musica.id];

        const lista = Array.isArray(classificacao)
            ? classificacao
            : musica.categorias;

        return (Array.isArray(lista) ? lista : [])
            .filter(id =>
                categorias.some(
                    categoria => categoria.id === id
                )
            );

    }


    function nomesDasCategorias(musica) {

        return categoriasDaMusica(musica)
            .map(id =>
                categorias.find(
                    categoria => categoria.id === id
                ).nome
            )
            .join(" • ");

    }


    function imagemDaMusica(musica) {

        return `
            <img
                src="${textoSeguro(
                    musica.capa || capaPadrao
                )}"
                alt=""
                data-capa
            >
        `;

    }


    function alternarPreferida(id) {

        const musica = encontrarMusica(id);

        if (!musica) {
            return;
        }

        dados.preferidas[id] = !ehPreferida(musica);

        salvarDados();
        renderizar();

    }


    /* =====================================
       NAVEGAÇÃO
       ===================================== */

const paginasMenu = [
    { id: "inicio", nome: "Ouvir", icone: "♫" },
    { id: "musicas", nome: "Coleção", icone: "☷" },
    { id: "momentos", nome: "Momentos", icone: "♡" },
    { id: "ajustes", nome: "Ajustes", icone: "⚙" }
];

    function desenharMenus() {

        const html = paginasMenu.map(item => {

            const ativa =
                estado.pagina === item.id ||
                (
                    item.id === "musicas" &&
                    estado.pagina === "preferidas"
                );

            return `
                <a
                    href="#${item.id}"
                    class="${ativa ? "active" : ""}"
                    ${ativa ? 'aria-current="page"' : ""}
                >
                    <span>${item.icone}</span>
                    ${item.nome}
                </a>
            `;

        }).join("");

        menuDesktop.innerHTML = html;
        menuCelular.innerHTML = html;

    }


    function abrirPainelAjustes() {

        let painel =
            document.getElementById("painel-ajustes");

        if (!painel) {

            painel = document.createElement("dialog");

            painel.id = "painel-ajustes";
            painel.className = "painel-sound";

            painel.setAttribute(
                "aria-labelledby",
                "titulo-ajustes"
            );

            document.body.appendChild(painel);

        }

        const nomesClimas = {
            desejo: "Desejo",
            paixao: "Paixão",
            carinho: "Carinho",
            prazer: "Prazer"
        };

        const clima =
            document.documentElement.dataset.clima ||
            "carinho";

        painel.innerHTML = `
            <form method="dialog">

                <button
                    type="submit"
                    class="painel-sound-fechar"
                    aria-label="Fechar ajustes"
                >
                    ×
                </button>

            </form>

            <div class="ajustes-cabecalho">

                <span
                    class="ajustes-cabecalho-icone"
                    aria-hidden="true"
                >
                    ♡
                </span>

                <div class="ajustes-cabecalho-texto">

                    <span class="ajustes-assinatura">
                        SUA EXPERIÊNCIA
                    </span>

                    <h2 id="titulo-ajustes">
                        Seu Sound Love
                    </h2>

                    <p class="painel-sound-subtitulo">
                        Cada detalhe no seu ritmo.
                    </p>

                </div>

            </div>

            <button
                type="button"
                class="ajustes-clima"
                id="ajustes-escolher-clima"
            >
                <span>
                    <strong>Escolha seu tema</strong>

                    <small>
                        ${
                            textoSeguro(
                                nomesClimas[clima] || "Carinho"
                            )
                        }
                    </small>
                </span>

                <span aria-hidden="true">›</span>
            </button>

            <p class="painel-sound-rodape">
                Sua escolha de tema fica salva neste navegador.
            </p>

            <div class="ajustes-efeitos">

                <h3>Efeitos visuais</h3>

                <label class="ajustes-efeito">

                    <span>
                        <strong>Animar a capa</strong>
                        <small>Movimento suave na imagem.</small>
                    </span>

                    <span class="ajustes-interruptor">

                        <input
                            type="checkbox"
                            id="ajuste-animar-capa"
                            role="switch"
                            ${dados.efeitos.animarCapa ? "checked" : ""}
                        >

                        <span
                            class="ajustes-interruptor-status"
                            aria-hidden="true"
                        ></span>

                    </span>

                </label>

                <label class="ajustes-efeito">

                    <span>
                        <strong>Mostrar partículas</strong>
                        <small>Pontos de luz sobre a capa.</small>
                    </span>

                    <input
                        type="checkbox"
                        id="ajuste-particulas"
                        role="switch"
                        ${dados.efeitos.particulas ? "checked" : ""}
                    >

                </label>

            </div>

            <div class="ajustes-colecao">

                <span
                    class="ajustes-colecao-icone"
                    aria-hidden="true"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M9 18V5l12-2v13"/>
                        <path d="M9 9l12-2"/>
                        <ellipse cx="6" cy="18" rx="3" ry="3"/>
                        <ellipse cx="18" cy="16" rx="3" ry="3"/>
                    </svg>
                </span>

                <div class="ajustes-colecao-texto">

                    <strong>Sua coleção</strong>

                    <small>
                        Músicas para seus momentos.
                    </small>

                </div>

                <span class="ajustes-colecao-total">
                    ${window.SOUND_MUSICAS.length}
                </span>

            </div>


        `;

        painel
            .querySelector("#ajustes-escolher-clima")
            .addEventListener("click", () => {

                painel.close();

                executarAcao("open-themes");

            });

        const controlesEfeitos = [
            {
                seletor: "#ajuste-animar-capa",
                preferencia: "animarCapa",
                atributo: "animarCapa"
            },
            {
                seletor: "#ajuste-particulas",
                preferencia: "particulas",
                atributo: "particulas"
            }
        ];

        controlesEfeitos.forEach((controle) => {

            const campo =
                painel.querySelector(controle.seletor);

            document.documentElement.dataset[
                controle.atributo
            ] = String(
                dados.efeitos[controle.preferencia]
            );

            campo.addEventListener("change", () => {

                dados.efeitos[
                    controle.preferencia
                ] = campo.checked;

                document.documentElement.dataset[
                    controle.atributo
                ] = String(campo.checked);

                salvarDados();

            });

        });

        if (!painel.open) {

            painel.showModal();

        }

    }

    function abrirPainelMomentos() {

    let painel =
        document.getElementById("painel-momentos");

    if (!painel) {

        painel = document.createElement("dialog");

        painel.id = "painel-momentos";
        painel.className = "painel-sound";

        painel.setAttribute(
            "aria-labelledby",
            "titulo-momentos"
        );

        document.body.appendChild(painel);

    }

    painel.innerHTML = `
        <form method="dialog">

            <button
                type="submit"
                class="painel-sound-fechar"
                aria-label="Fechar momentos"
            >
                ×
            </button>

        </form>

        <div class="momentos-cabecalho">

            <span
                class="momentos-cabecalho-icone"
                aria-hidden="true"
            >
                ♡
            </span>

            <h2 id="titulo-momentos">
                Meus momentos
            </h2>

            <p class="painel-sound-subtitulo">
                Uma sequência de músicas para cada ocasião.
            </p>

        </div>

        <div class="momentos-vazio">

            <strong>
                Seu próximo momento começa aqui.
            </strong>

            <p>
                Em breve, você poderá reunir músicas,
                escolher a ordem e salvar suas sequências.
            </p>

        </div>
    `;

    if (!painel.open) {

        painel.showModal();

    }

}

function navegar(destino) {

        if (destino === "preferidas") {

            estado.categoria = "preferidas";
            estado.busca = "";

        }

        if (location.hash === "#" + destino) {

            estado.pagina = destino;
            renderizar();

        } else {

            location.hash = destino;

        }

    }


    /* =====================================
       COMPONENTES DAS MÚSICAS
       ===================================== */

    function linhaMusica(musica) {

        const preferida = ehPreferida(musica);

        return `
            <div class="row">

                ${imagemDaMusica(musica)}

                <button
                    class="song-copy"
                    data-action="play"
                    data-id="${textoSeguro(musica.id)}"
                    style="text-align:left"
                >
                    <strong>
                        ${textoSeguro(musica.titulo)}
                    </strong>

                    <small>
                        ${textoSeguro(
                            nomesDasCategorias(musica) ||
                            musica.artista ||
                            "Sua coleção"
                        )}
                    </small>
                </button>

                <button
                    class="heart ${preferida ? "on" : ""}"
                    data-action="favorite"
                    data-id="${textoSeguro(musica.id)}"
                    aria-label="${
                        preferida
                            ? "Remover das preferidas"
                            : "Adicionar às preferidas"
                    }"
                    aria-pressed="${preferida}"
                >
                    ${preferida ? "♥" : "♡"}
                </button>

                <button
                    data-action="classify"
                    data-id="${textoSeguro(musica.id)}"
                    aria-label="Classificar música"
                >
                    ◇
                </button>

            </div>
        `;

    }


    function filtrosCategorias() {

        const filtros = [
            { id: "todas", nome: "Todas" },
            { id: "preferidas", nome: "Preferidas" },
            ...categorias,
            { id: "sem-categoria", nome: "Sem categoria" }
        ];

        return `
            <div class="chips">

                ${filtros.map(categoria => `
                    <button
                        data-action="filter"
                        data-id="${textoSeguro(categoria.id)}"
                        class="${
                            estado.categoria === categoria.id
                                ? "active"
                                : ""
                        }"
                    >
                        ${textoSeguro(categoria.nome)}
                    </button>
                `).join("")}

            </div>
        `;

    }


    function musicasFiltradas() {

        const busca =
            estado.busca.toLocaleLowerCase("pt-BR");

        return musicas.filter(musica => {

            const nomeCompleto =
                `${musica.titulo} ${musica.artista || ""}`
                    .toLocaleLowerCase("pt-BR");

            const combinaBusca =
                nomeCompleto.includes(busca);

            const classificacoes =
                categoriasDaMusica(musica);

            let combinaCategoria = true;

            if (estado.categoria === "preferidas") {

                combinaCategoria = ehPreferida(musica);

            } else if (
                estado.categoria === "sem-categoria"
            ) {

                combinaCategoria =
                    classificacoes.length === 0;

            } else if (estado.categoria !== "todas") {

                combinaCategoria =
                    classificacoes.includes(
                        estado.categoria
                    );

            }

            return combinaBusca && combinaCategoria;

        }).sort((a, b) => {

            const comparacao =
                String(a.titulo || "").localeCompare(
                    String(b.titulo || ""),
                    "pt-BR"
                );

            return estado.ordem === "za"
                ? -comparacao
                : comparacao;

        });

    }


    function vazio(titulo, descricao) {

        return `
            <div class="empty">

                ${imagemDaMusica({})}

                <h2>${textoSeguro(titulo)}</h2>

                <p>${textoSeguro(descricao)}</p>

            </div>
        `;

    }


    /* =====================================
       PÁGINA INICIAL
       ===================================== */

    function paginaInicio() {

        const preferidas = musicas.filter(ehPreferida);

        return `
            <div class="section-head">

                <h2 style="margin-top:0">
                    Suas preferidas
                </h2>

                <a href="#preferidas">
                    Ver todas ›
                </a>

            </div>

            ${
                preferidas.length
                    ? `
                        <div class="favorites">

                            ${preferidas.map(musica => `
                                <div class="favorite">

                                    <button
                                        data-action="play"
                                        data-id="${
                                            textoSeguro(musica.id)
                                        }"
                                        style="
                                            background:transparent;
                                            border:0;
                                            padding:0;
                                        "
                                    >
                                        ${imagemDaMusica(musica)}

                                        <strong>
                                            ${
                                                textoSeguro(
                                                    musica.titulo
                                                )
                                            }
                                        </strong>
                                    </button>

                                    <button
                                        class="heart on"
                                        data-action="favorite"
                                        data-id="${
                                            textoSeguro(musica.id)
                                        }"
                                        aria-label="
                                            Remover das preferidas
                                        "
                                    >
                                        ♥
                                    </button>

                                </div>
                            `).join("")}

                        </div>
                    `
                    : `
                        <p>
                            Toque no coração de uma música
                            para encontrá-la aqui.
                        </p>
                    `
            }

            <div class="hero">

                <div>

                    <p>SUA COLEÇÃO. SEU MOMENTO.</p>

                    <h1>Entre no seu ritmo.</h1>

                    <p>Sound Love • Synthwave</p>

                </div>

                <button
                    class="play"
                    data-action="browse"
                    aria-label="Explorar músicas"
                >
                    ▶
                </button>

            </div>

            <h2>Categorias</h2>

            <div class="chips">

                ${categorias.map(categoria => `
                    <button
                        data-action="category"
                        data-id="${textoSeguro(categoria.id)}"
                    >
                        ${textoSeguro(categoria.icone)}
                        ${textoSeguro(categoria.nome)}
                    </button>
                `).join("")}

            </div>

            <div class="section-head">

                <h2>Sua coleção</h2>

                <a href="#musicas">Ver todas ›</a>

            </div>

            ${
                musicas.length
                    ? musicas.slice(0, 5)
                        .map(linhaMusica)
                        .join("")
                    : vazio(
                        "Sua coleção começa aqui",
                        "Ainda não há músicas cadastradas."
                    )
            }

            <div class="panel">

                <h2 style="margin-top:0">
                    Monte seu momento
                </h2>

                <p>
                    Suas músicas organizadas para
                    cada ocasião.
                </p>

                <button
                    class="primary"
                    data-action="moments"
                >
                    Meus momentos ›
                </button>

            </div>
        `;

    }


    /* =====================================
       BIBLIOTECA E BUSCA
       ===================================== */

    function paginaBiblioteca() {

        return `
            <h1>${
                estado.pagina === "preferidas"
                    ? "Suas preferidas"
                    : "Minha coleção"
            }</h1>

            <p>Encontre a música para o seu momento.</p>

            <div class="toolbar">

                <input
                    type="search"
                    id="search"
                    placeholder="Buscar músicas"
                    aria-label="Buscar músicas"
                    value="${textoSeguro(estado.busca)}"
                >

                <select
                    id="sort"
                    aria-label="Ordenar músicas"
                >

                    <option
                        value="az"
                        ${estado.ordem === "az"
                            ? "selected"
                            : ""}
                    >
                        A–Z
                    </option>

                    <option
                        value="za"
                        ${estado.ordem === "za"
                            ? "selected"
                            : ""}
                    >
                        Z–A
                    </option>

                </select>

            </div>

            ${filtrosCategorias()}

            <p id="result-count"></p>

            <div id="song-list"></div>
        `;

    }


    function atualizarLista() {

        const lista = document.getElementById("song-list");
        const contador =
            document.getElementById("result-count");

        if (!lista || !contador) {
            return;
        }

        const resultado = musicasFiltradas();

        contador.textContent =
            resultado.length === 1
                ? "1 música"
                : `${resultado.length} músicas`;

        lista.innerHTML = resultado.length
            ? resultado.map(linhaMusica).join("")
            : vazio(
                "Nenhuma música encontrada",
                "Tente outra busca ou categoria."
            );

    }


    /* =====================================
       DESENHAR PÁGINAS
       ===================================== */

    function renderizar() {

    desenharMenus();

    if (estado.pagina === "inicio") {

        pagina.innerHTML = paginaPlayer();

    } else if (
        estado.pagina === "musicas" ||
        estado.pagina === "preferidas"
    ) {

        pagina.innerHTML = paginaBiblioteca();

        atualizarLista();

    } else if ((estado.pagina === "player" || estado.pagina === "inicio")) {

        pagina.innerHTML = paginaPlayer();

{
  const barraProgresso = document.getElementById("player-seek");

  const percentualProgresso =
    Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100))
      : 0;

  if (barraProgresso) {
    barraProgresso.style.setProperty(
      "--progresso",
      `${percentualProgresso}%`
    );
  }
}

    } else if (estado.pagina === "momentos") {

        pagina.innerHTML = vazio(
            "Meus momentos",
            "A criação das sequências será ativada nas próximas etapas."
        );

    } else if (estado.pagina === "ajustes") {

        pagina.innerHTML = `
            <h1>Seu Sound Love</h1>

            <p>Personalize sua experiência.</p>

            <div class="panel">

                <h2 style="margin-top:0">
                    Tema Synthwave
                </h2>

                <p>
                    Roxo profundo, rosa neon
                    e suas músicas em destaque.
                </p>

            </div>
        `;

    } else {

        estado.pagina = "inicio";
        pagina.innerHTML = paginaPlayer();

    }

    atualizarMiniPlayer();

}

    /* =====================================
   PLAYER DE MÚSICA
   ===================================== */

const audio = document.getElementById("audio");
const miniPlayer = document.getElementById("mini");

const reproducao = {
    musicaId: null,
    fila: [],
    indice: -1,
    repetir: false,
    aleatorio: false,
    erro: false
};

let tentativaReproducao = 0;


function musicaAtual() {

    return encontrarMusica(reproducao.musicaId);

}


function formatarTempo(segundos) {

    if (!Number.isFinite(segundos)) {
        return "0:00";
    }

    const minutos = Math.floor(segundos / 60);

    const restante = Math.floor(segundos % 60)
        .toString()
        .padStart(2, "0");

    return `${minutos}:${restante}`;

}


function capaPlayer(musica, classe = "") {

    return `
        <img
            class="${classe}"
            src="${textoSeguro(
                musica.capa || capaPadrao
            )}"
            alt=""
            data-capa
        >
    `;

}


function atualizarMiniPlayer() {

    const musica = musicaAtual();

    if (!musica || estado.pagina === "player" || estado.pagina === "inicio") {

        miniPlayer.style.display = "none";
        return;

    }

    miniPlayer.style.display = "block";

    miniPlayer.innerHTML = `
        <div class="row">

            ${capaPlayer(musica)}

            <button
                class="song-copy"
                data-action="open-player"
                style="text-align:left"
            >
                <strong>
                    ${textoSeguro(musica.titulo)}
                </strong>

                <small>
                    ${
                        reproducao.erro
                            ? "Arquivo indisponível"
                            : textoSeguro(
                                musica.artista ||
                                "Sua coleção"
                            )
                    }
                </small>
            </button>

            <button
                class="play"
                data-action="toggle-play"
                aria-label="${
                    audio.paused ? "Tocar" : "Pausar"
                }"
            >
                ${audio.paused ? "▶" : "❚❚"}
            </button>

            <button
                data-action="next-track"
                aria-label="Próxima música"
            >
                ▸▸
            </button>

        </div>
    `;

}


function paginaPlayer() {

    const musica = musicaAtual();

    if (!musica) {

        return vazio(
            "Escolha uma música",
            "Abra sua coleção para começar."
        );

    }

    const preferida = ehPreferida(musica);

    const duracaoValida =
        Number.isFinite(audio.duration) &&
        audio.duration > 0;

    const progresso = duracaoValida
        ? Math.min(
            100,
            Math.max(
                0,
                (audio.currentTime / audio.duration) * 100
            )
        )
        : 0;

    return `
        <div class="player player-imersivo">

            <div class="player-capa-ampla">

                ${capaPlayer(musica, "album")}

                <div
                    class="player-particulas"
                    aria-hidden="true"
                >
                    <span style="--x:12%; --tempo:9s; --atraso:-3s; --tamanho:3px"></span>
                    <span style="--x:28%; --tempo:12s; --atraso:-8s; --tamanho:5px"></span>
                    <span style="--x:45%; --tempo:10s; --atraso:-5s; --tamanho:3px"></span>
                    <span style="--x:63%; --tempo:14s; --atraso:-10s; --tamanho:4px"></span>
                    <span style="--x:78%; --tempo:11s; --atraso:-2s; --tamanho:3px"></span>
                    <span style="--x:90%; --tempo:13s; --atraso:-7s; --tamanho:5px"></span>
                </div>

            </div>

            <div class="player-conteudo">

                <div class="player-cabecalho">

                    <div class="player-identidade">

                        <h1>
                            ${textoSeguro(musica.titulo)}
                        </h1>

                        <p>
                            ${textoSeguro(
                                musica.artista || "Sua coleção"
                            )}
                        </p>

                    </div>

                    <div class="player-acoes">

                        <button
                            class="player-acao"
                            data-action="classify"
                            data-id="${textoSeguro(musica.id)}"
                            aria-label="Classificar música"
                            title="Classificar música"
                        >
                            <svg
                                width="21"
                                height="21"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.7"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M20 13 13 20a2 2 0 0 1-2.8 0L3 12.8V3h9.8l7.2 7.2a2 2 0 0 1 0 2.8Z"/>
                                <circle cx="7.5" cy="7.5" r="1"/>
                            </svg>
                        </button>

                        <button
                            class="player-acao player-favorita ${
                                preferida ? "on" : ""
                            }"
                            data-action="favorite"
                            data-id="${textoSeguro(musica.id)}"
                            aria-label="${
                                preferida
                                    ? "Remover das preferidas"
                                    : "Adicionar às preferidas"
                            }"
                            title="${
                                preferida
                                    ? "Remover das preferidas"
                                    : "Adicionar às preferidas"
                            }"
                            aria-pressed="${preferida}"
                        >
                            <svg
                                width="23"
                                height="23"
                                viewBox="0 0 24 24"
                                fill="${
                                    preferida
                                        ? "currentColor"
                                        : "none"
                                }"
                                stroke="currentColor"
                                stroke-width="1.7"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>
                            </svg>
                        </button>

                    </div>

                </div>

                <input
                    class="seek"
                    id="player-seek"
                    type="range"
                    min="0"
                    max="${duracaoValida ? audio.duration : 0}"
                    value="${audio.currentTime || 0}"
                    step="0.1"
                    style="--progresso:${progresso}%"
                    aria-label="Posição da música"
                    ${duracaoValida ? "" : "disabled"}
                >

                <div class="times">

                    <span id="player-elapsed">
                        ${formatarTempo(audio.currentTime)}
                    </span>

                    <span id="player-duration">
                        ${formatarTempo(audio.duration)}
                    </span>

                </div>

                <div class="controls">

                    <button
                        data-action="repeat-track"
                        class="${
                            reproducao.repetir ? "active" : ""
                        }"
                        aria-label="Repetir música"
                        aria-pressed="${reproducao.repetir}"
                    >
                        ↻
                    </button>

                    <button
                        data-action="previous-track"
                        aria-label="Música anterior"
                    >
                        ◂◂
                    </button>

                    <button
                        class="play"
                        data-action="toggle-play"
                        aria-label="${
                            audio.paused ? "Tocar" : "Pausar"
                        }"
                    >
                        ${audio.paused ? "▶" : "❚❚"}
                    </button>

                    <button
                        data-action="next-track"
                        aria-label="Próxima música"
                    >
                        ▸▸
                    </button>

                    <button
                        data-action="shuffle-tracks"
                        class="${
                            reproducao.aleatorio ? "active" : ""
                        }"
                        aria-label="Reprodução aleatória"
                        aria-pressed="${reproducao.aleatorio}"
                    >
                        ⤨
                    </button>

                </div>

                <label class="player-volume-linha">

                    <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.7"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M11 5 6 9H3v6h3l5 4V5Z"/>
                        <path d="M15 8a6 6 0 0 1 0 8"/>
                        <path d="M18 5a10 10 0 0 1 0 14"/>
                    </svg>

                    <input
                        class="volume"
                        id="player-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value="${audio.volume}"
                        style="--volume:${audio.volume * 100}%"
                        aria-label="Volume"
                    >

                </label>

                ${
                    reproducao.erro
                        ? `
                            <div class="error">

                                <strong>
                                    Não foi possível tocar
                                </strong>

                                <p>
                                    Confira o nome do MP3
                                    e seu caminho em musicas.js.
                                </p>

                                <button
                                    data-action="retry-track"
                                >
                                    Tentar novamente
                                </button>

                            </div>
                        `
                        : ""
                }

            </div>

        </div>
    `;

}

async function iniciarAudio() {

    const tentativa = ++tentativaReproducao;

    try {

        await audio.play();

    } catch (erro) {

        if (
            tentativa !== tentativaReproducao ||
            erro.name === "AbortError"
        ) {
            return;
        }

        if (erro.name === "NotAllowedError") {

            avisar("Toque no botão para iniciar a música.");

        } else {

            reproducao.erro = true;
            renderizar();

        }

    }

}


function carregarFaixa() {

    const musica = musicaAtual();

    if (!musica) {
        return;
    }

    reproducao.erro = false;

    audio.src = musica.arquivo;
    audio.load();

    iniciarAudio();
    renderizar();

}


function tocarMusica(id) {

    const musica = encontrarMusica(id);

    if (!musica) {
        return;
    }

    const lista = musicasFiltradas();

    reproducao.fila = lista.some(item => item.id === id)
        ? lista.map(item => item.id)
        : musicas.map(item => item.id);

    reproducao.indice = reproducao.fila.indexOf(id);
    reproducao.musicaId = id;

    carregarFaixa();
    navegar("player");

}


function alternarReproducao() {

    if (!musicaAtual()) {
        return;
    }

    if (reproducao.erro) {

        carregarFaixa();
        return;

    }

    if (audio.paused) {

        iniciarAudio();

    } else {

        audio.pause();

    }

}


function proximaMusica() {

    if (!reproducao.fila.length) {
        return;
    }

    let proximoIndice = reproducao.indice + 1;

    if (
        reproducao.aleatorio &&
        reproducao.fila.length > 1
    ) {

        const deslocamento =
            1 + Math.floor(
                Math.random() *
                (reproducao.fila.length - 1)
            );

        proximoIndice =
            (reproducao.indice + deslocamento) %
            reproducao.fila.length;

    }

    if (proximoIndice >= reproducao.fila.length) {

        audio.pause();

        avisar("Você chegou ao fim da sequência.");
        return;

    }

    reproducao.indice = proximoIndice;

    reproducao.musicaId =
        reproducao.fila[proximoIndice];

    carregarFaixa();

}


function musicaAnterior() {

    if (!musicaAtual()) {
        return;
    }

    if (
        audio.currentTime > 3 ||
        reproducao.indice <= 0
    ) {

        audio.currentTime = 0;
        iniciarAudio();
        return;

    }

    reproducao.indice -= 1;

    reproducao.musicaId =
        reproducao.fila[reproducao.indice];

    carregarFaixa();

}


// Prepara a barra assim que a duração da música estiver disponível.
function prepararBarraDeProgresso() {
    const barra = document.getElementById("player-seek");

    if (!barra) {
        return;
    }

    const duracaoValida =
        Number.isFinite(audio.duration) &&
        audio.duration > 0;

    barra.min = 0;
    barra.max = duracaoValida ? audio.duration : 0;
    barra.disabled = !duracaoValida;
    barra.value = duracaoValida ? audio.currentTime : 0;

    const percentual = duracaoValida
        ? (audio.currentTime / audio.duration) * 100
        : 0;

    barra.style.setProperty(
        "--progresso",
        `${percentual}%`
    );
}

audio.addEventListener(
    "loadedmetadata",
    prepararBarraDeProgresso
);

audio.addEventListener(
    "durationchange",
    prepararBarraDeProgresso
);

// Atualiza as barras ao arrastar os marcadores.
document.addEventListener("input", (evento) => {
    const controle = evento.target;

    if (controle.id === "player-volume") {
        const volume = Number(controle.value);

        audio.volume = volume;

        controle.style.setProperty(
            "--volume",
            `${volume * 100}%`
        );
    }

    if (
        controle.id === "player-seek" &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0
    ) {
        const novoTempo = Math.min(
            audio.duration,
            Math.max(0, Number(controle.value))
        );

        audio.currentTime = novoTempo;

        controle.style.setProperty(
            "--progresso",
            `${(novoTempo / audio.duration) * 100}%`
        );

        const decorrido =
            document.getElementById("player-elapsed");

        if (decorrido) {
            decorrido.textContent = formatarTempo(novoTempo);
        }
    }
});

// Atualiza o progresso e os tempos da música.
audio.addEventListener("timeupdate", () => {
    const barraProgresso =
        document.getElementById("player-seek");

    const barraVolume =
        document.getElementById("player-volume");

    const decorrido =
        document.getElementById("player-elapsed");

    const duracao =
        document.getElementById("player-duration");

    const percentualProgresso =
        Number.isFinite(audio.duration) && audio.duration > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (audio.currentTime / audio.duration) * 100
                )
            )
            : 0;

    if (barraProgresso) {
        barraProgresso.value = audio.currentTime;

        barraProgresso.style.setProperty(
            "--progresso",
            `${percentualProgresso}%`
        );
    }

    if (barraVolume) {
        barraVolume.style.setProperty(
            "--volume",
            `${audio.volume * 100}%`
        );
    }

    if (decorrido) {
        decorrido.textContent =
            formatarTempo(audio.currentTime);
    }

    if (duracao) {
        duracao.textContent =
            formatarTempo(audio.duration);
    }
});


audio.addEventListener("loadedmetadata", () => {

    const musica = musicaAtual();

    if (musica && Number.isFinite(audio.duration)) {

        musica.duracao = audio.duration;

    }

    if (estado.pagina === "player") {
        renderizar();
    }

});


audio.addEventListener("play", () => {

    if (estado.pagina === "player" || estado.pagina === "inicio") {

        renderizar();

    } else {

        atualizarMiniPlayer();

    }

});


audio.addEventListener("pause", () => {

    if (estado.pagina === "player" || estado.pagina === "inicio") {

        renderizar();

    } else {

        atualizarMiniPlayer();

    }

});


audio.addEventListener("ended", () => {

    if (reproducao.repetir) {

        audio.currentTime = 0;
        iniciarAudio();

    } else {

        proximaMusica();

    }

});


audio.addEventListener("error", () => {

    reproducao.erro = true;
    renderizar();

});


document.addEventListener("input", evento => {

    if (evento.target.id === "player-seek") {

        if (Number.isFinite(audio.duration)) {

            audio.currentTime =
                Number(evento.target.value);

        }

    }

    if (evento.target.id === "player-volume") {

        audio.volume = Number(evento.target.value);

    }

});


    /* =====================================
       AÇÕES
       ===================================== */

       

    function abrirPainelClimas() {

        let painel =
            document.getElementById("painel-climas");

        if (!painel) {

            painel = document.createElement("dialog");

            painel.id = "painel-climas";

            painel.setAttribute(
                "aria-labelledby",
                "titulo-painel-climas"
            );

            painel.innerHTML = `
                <form method="dialog" class="climas-fechar">

                    <button
                        type="submit"
                        aria-label="Fechar opções de clima"
                    >
                        ×
                    </button>

                </form>

                <h2 id="titulo-painel-climas">
                    Seu clima hoje
                </h2>

                <p class="climas-subtitulo">
                    Como você quer sentir a música?
                </p>

                <div class="climas-grid">

                    <button
                        type="button"
                        class="clima-card clima-desejo"
                        data-action="select-mood"
                        data-id="desejo"
                    >
                        <span class="clima-imagem"></span>

                        <span class="clima-texto">
                            <strong>Desejo</strong>
                            <small>Sinta a intensidade.</small>
                        </span>
                    </button>

                    <button
                        type="button"
                        class="clima-card clima-paixao"
                        data-action="select-mood"
                        data-id="paixao"
                    >
                        <span class="clima-imagem"></span>

                        <span class="clima-texto">
                            <strong>Paixão</strong>
                            <small>A noite é nossa.</small>
                        </span>
                    </button>

                    <button
                        type="button"
                        class="clima-card clima-carinho"
                        data-action="select-mood"
                        data-id="carinho"
                    >
                        <span class="clima-imagem"></span>

                        <span class="clima-texto">
                            <strong>Carinho</strong>
                            <small>Mais perto, com carinho.</small>
                        </span>
                    </button>

                    <button
                        type="button"
                        class="clima-card clima-prazer"
                        data-action="select-mood"
                        data-id="prazer"
                    >
                        <span class="clima-imagem"></span>

                        <span class="clima-texto">
                            <strong>Prazer</strong>
                            <small>Aproveite cada instante.</small>
                        </span>
                    </button>

                </div>

                <p class="climas-rodape">
                    A música continua. O clima muda.
                </p>
            `;

            document.body.appendChild(painel);

        }

        if (!painel.open) {

            painel.showModal();

        }

    }

    function abrirClassificacao(id) {

        const musica = window.SOUND_MUSICAS.find(
            (item) => item.id === id
        );

        if (!musica) {
            return;
        }

        const categorias = window.SOUND_CATEGORIAS;

        const selecionadas =
            Array.isArray(dados.classificacoes[id])
                ? dados.classificacoes[id]
                : musica.categorias || [];

        document
            .getElementById("painel-classificacao")
            ?.remove();

        const painel = document.createElement("dialog");

        painel.id = "painel-classificacao";

        painel.setAttribute(
            "aria-labelledby",
            "titulo-classificacao"
        );

        painel.innerHTML = `
            <form id="form-classificacao">

                <button
                    type="button"
                    class="classificacao-fechar"
                    aria-label="Fechar classificação"
                >
                    ×
                </button>

                <h2 id="titulo-classificacao">
                    Escolha os momentos
                </h2>

                <p class="classificacao-musica">
                    ${textoSeguro(musica.titulo)}
                </p>

                <p class="classificacao-dica">
                    Você pode marcar mais de uma categoria.
                </p>

                <div class="classificacao-opcoes">

                    ${categorias.map((categoria) => `
                        <label class="classificacao-opcao">

                            <input
                                type="checkbox"
                                name="categoria"
                                value="${textoSeguro(categoria.id)}"
                                ${
                                    selecionadas.includes(categoria.id)
                                        ? "checked"
                                        : ""
                                }
                            >

                            <span class="classificacao-icone">
                                ${textoSeguro(categoria.icone || "◇")}
                            </span>

                            <span>
                                ${textoSeguro(categoria.nome)}
                            </span>

                        </label>
                    `).join("")}

                </div>

                <button
                    type="submit"
                    class="classificacao-salvar"
                >
                    Salvar categorias
                </button>

            </form>
        `;

        painel
            .querySelector(".classificacao-fechar")
            .addEventListener("click", () => {

                painel.close();

            });

        painel
            .querySelector("form")
            .addEventListener("submit", (evento) => {

                evento.preventDefault();

                dados.classificacoes[id] = Array.from(
                    painel.querySelectorAll(
                        'input[name="categoria"]:checked'
                    ),
                    (campo) => campo.value
                );

                salvarDados();

                painel.close();

                renderizar();

                avisar("Categorias salvas.");

            });

        document.body.appendChild(painel);

        painel.showModal();

    }

    function executarAcao(acao, id) {

        switch (acao) {

            case "favorite":

                alternarPreferida(id);
                break;

            case "classify":

                abrirClassificacao(id);
                break;

            case "browse":

                estado.busca = "";
                estado.categoria = "todas";

                navegar("musicas");
                break;

            case "search":

                estado.busca = "";
                estado.categoria = "todas";

                navegar("musicas");

                document.getElementById("search")?.focus();
                break;

            case "open-themes":

                abrirPainelClimas();

                document
                    .querySelectorAll(
                        "#painel-climas .clima-card"
                    )
                    .forEach((cartao) => {

                        cartao.setAttribute(
                            "aria-pressed",
                            String(
                                cartao.dataset.id ===
                                document.documentElement.dataset.clima
                            )
                        );

                    });

                break;

            case "select-mood": {

                const climasPermitidos = [
                    "desejo",
                    "paixao",
                    "carinho",
                    "prazer"
                ];

                if (!climasPermitidos.includes(id)) {
                    break;
                }

                document.documentElement.dataset.clima = id;

                dados.tema = id;

                salvarDados();

                document
                    .querySelectorAll(
                        "#painel-climas .clima-card"
                    )
                    .forEach((cartao) => {

                        cartao.setAttribute(
                            "aria-pressed",
                            String(cartao.dataset.id === id)
                        );

                    });

                document
                    .getElementById("painel-climas")
                    ?.close();

                break;

            }

            case "settings":

                navegar("ajustes");
                break;

            case "moments":

                navegar("momentos");
                break;

            case "category":

                estado.busca = "";
                estado.categoria = id;

                navegar("musicas");
                break;

            case "filter":

                estado.categoria = id;

                renderizar();
                break;

case "play":

    tocarMusica(id);
    break;

case "open-player":

    navegar("player");
    break;

case "back-library":

    navegar("musicas");
    break;

case "toggle-play":

    alternarReproducao();
    break;

case "next-track":

    proximaMusica();
    break;

case "previous-track":

    musicaAnterior();
    break;

case "repeat-track":

    reproducao.repetir = !reproducao.repetir;

    renderizar();

    avisar(
        reproducao.repetir
            ? "Repetir música ativado."
            : "Repetição desativada."
    );
    break;

case "shuffle-tracks":

    reproducao.aleatorio = !reproducao.aleatorio;

    renderizar();

    avisar(
        reproducao.aleatorio
            ? "Aleatório ativado."
            : "Aleatório desativado."
    );
    break;

case "retry-track":

    carregarFaixa();
    break;
        }

    }


    /* =====================================
       EVENTOS
       ===================================== */

    document.addEventListener("click", evento => {

        const botao =
            evento.target.closest("[data-action]");

        if (!botao) {
            return;
        }

        evento.preventDefault();

        executarAcao(
            botao.dataset.action,
            botao.dataset.id
        );

    });


    document.addEventListener("input", evento => {

        if (evento.target.id !== "search") {
            return;
        }

        estado.busca = evento.target.value;

        atualizarLista();

    });


    document.addEventListener("change", evento => {

        if (evento.target.id !== "sort") {
            return;
        }

        estado.ordem = evento.target.value;

        atualizarLista();

    });


    document.addEventListener("error", evento => {

        const imagem = evento.target;

        if (
            imagem.tagName !== "IMG" ||
            !imagem.hasAttribute("data-capa")
        ) {
            return;
        }

        imagem.removeAttribute("data-capa");
        imagem.src = capaPadrao;

    }, true);


    window.addEventListener("hashchange", () => {

        const destino =
            location.hash.substring(1) || "inicio";

        if (destino === "momentos") {

    const paginaAnterior =
        ["ajustes", "momentos"].includes(estado.pagina)
            ? "inicio"
            : estado.pagina;

    history.replaceState(
        null,
        "",
        "#" + paginaAnterior
    );

    abrirPainelMomentos();
    return;

}

if (destino === "ajustes") {

            const paginaAnterior =
                estado.pagina === "ajustes"
                    ? "inicio"
                    : estado.pagina;

            history.replaceState(
                null,
                "",
                "#" + paginaAnterior
            );

            abrirPainelAjustes();

            return;

        }

        estado.pagina = destino;

        if (estado.pagina === "preferidas") {

            estado.categoria = "preferidas";
            estado.busca = "";

        }

        renderizar();

        window.scrollTo(0, 0);

    });


    /* =====================================
       INICIALIZAÇÃO
       ===================================== */

      carregarDados();

    document.documentElement.dataset.animarCapa =
        String(dados.efeitos.animarCapa);

    document.documentElement.dataset.particulas =
        String(dados.efeitos.particulas);

    document.documentElement.dataset.clima =
        ["desejo", "paixao", "carinho", "prazer"].includes(dados.tema)
            ? dados.tema
            : "carinho";

// Prepara a primeira preferida, sem tocar automaticamente.
{
    const faixaInicial =
        musicas.find(musica => ehPreferida(musica)) ||
        musicas[0];

    if (faixaInicial) {
        reproducao.fila = musicas.map(musica => musica.id);

        reproducao.indice =
            reproducao.fila.indexOf(faixaInicial.id);

        reproducao.musicaId = faixaInicial.id;
        reproducao.erro = false;

        audio.pause();
        audio.src = faixaInicial.arquivo;
        audio.load();
    }
}

    estado.pagina =
        location.hash.substring(1) || "inicio";

    if (estado.pagina === "preferidas") {
        estado.categoria = "preferidas";
    }

    renderizar();


    /* Base disponível para os próximos módulos. */

    return {
        estaTocando: () => !audio.paused,
        categorias,
        musicas,
        estado,
        dados,
        capaPadrao,

        textoSeguro,
        avisar,
        salvarDados,
        encontrarMusica,
        ehPreferida,
        categoriasDaMusica,
        nomesDasCategorias,
        imagemDaMusica,
        alternarPreferida,
        navegar,
        musicasFiltradas,
        renderizar
    };

})();