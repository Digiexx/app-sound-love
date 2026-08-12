let musicDatabase = [
    { id: 1, title: "Sensual Night", artist: "Sound Love Beats", category: "favoritas", cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 7, title: "Massagem01", artist: "Love Prazer x", category: "favoritas", cover: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&auto=format&fit=crop&q=60", src: "musicas/massagem01.mp3" },
    { id: 2, title: "Veludo & Vinho", artist: "Romantic Vibes", category: "favoritas", cover: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=500&auto=format&fit=crop&q=60", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: 3, title: "Toque Suave", artist: "Relaxing Touch", category: "massagem", cover: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&auto=format&fit=crop&q=60", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: 4, title: "Aromas e Mãos", artist: "Spa Sessions", category: "massagem", cover: "https://images.unsplash.com/photo-1519823551738-c16a850ebf16?w=500&auto=format&fit=crop&q=60", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: 5, title: "Paixão Intensa", artist: "Deep Desire", category: "prazer", cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { id: 6, title: "Êxtase Total", artist: "Night Fever", category: "prazer", cover: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=500&auto=format&fit=crop&q=60", src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" }
];

const songListContainer = document.getElementById('song-list');
const audioElement = document.getElementById('audio-element');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const albumCover = document.getElementById('album-cover');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const categoryButtons = document.querySelectorAll('.cat-btn');

let currentView = 'favoritas';
let currentSongIndex = 0;
let isPlaying = false;
let currentPlaylist = [];

function initApp() {
    loadCategory(currentView);
    setupEvents();
}

function loadCategory(cat) {
    currentView = cat;
    if (cat === 'todas') {
        currentPlaylist = musicDatabase;
    } else {
        currentPlaylist = musicDatabase.filter(s => s.category === cat);
    }
    renderSongs();
    if(currentPlaylist.length > 0) {
        setSongInfo(currentPlaylist[0], false);
    }
}

function renderSongs() {
    songListContainer.innerHTML = '';
    currentPlaylist.forEach((song, idx) => {
        const card = document.createElement('div');
        card.classList.add('song-card');
        
        let categorySelectorHtml = '';
        if (currentView === 'todas') {
            categorySelectorHtml = `
                <select onchange="changeSongCategory(${song.id}, this.value)" onclick="event.stopPropagation()" class="cat-select">
                    <option value="favoritas" ${song.category === 'favoritas' ? 'selected' : ''}>Favoritas</option>
                    <option value="massagem" ${song.category === 'massagem' ? 'selected' : ''}>Massagem</option>
                    <option value="prazer" ${song.category === 'prazer' ? 'selected' : ''}>Prazer Máximo</option>
                </select>
            `;
        }

        card.innerHTML = `
            <div>
                <h4>${song.title}</h4>
                <span>${song.artist} ${currentView === 'todas' ? '• <i style="text-transform: capitalize; color: #ff2a75;">' + song.category + '</i>' : ''}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                ${categorySelectorHtml}
                <i class="fa-solid fa-play" style="color: #ff2a75; font-size: 0.8rem;"></i>
            </div>
        `;
        card.addEventListener('click', () => playSong(idx));
        songListContainer.appendChild(card);
    });
}

window.changeSongCategory = function(id, newCat) {
    const song = musicDatabase.find(s => s.id === id);
    if (song) {
        song.category = newCat;
        loadCategory(currentView);
    }
}

function setSongInfo(song, play = true) {
    currentTitle.textContent = song.title;
    currentArtist.textContent = song.artist;
    albumCover.src = song.cover;
    audioElement.src = song.src;
    if(play) {
        audioElement.play();
        isPlaying = true;
        updatePlayBtn();
    }
}

function playSong(index) {
    currentSongIndex = index;
    setSongInfo(currentPlaylist[currentSongIndex], true);
}

function togglePlay() {
    if(!audioElement.src) {
        playSong(0);
        return;
    }
    if(isPlaying) {
        audioElement.pause();
        isPlaying = false;
    } else {
        audioElement.play();
        isPlaying = true;
    }
    updatePlayBtn();
}

function updatePlayBtn() {
    playPauseBtn.innerHTML = isPlaying ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>';
}

function setupEvents() {
    playPauseBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', () => {
        if(currentPlaylist.length === 0) return;
        currentSongIndex = (currentSongIndex + 1) % currentPlaylist.length;
        playSong(currentSongIndex);
    });
    prevBtn.addEventListener('click', () => {
        if(currentPlaylist.length === 0) return;
        currentSongIndex = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playSong(currentSongIndex);
    });

    categoryButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadCategory(e.target.getAttribute('data-category'));
        });
    });

    audioElement.addEventListener('timeupdate', () => {
        if(audioElement.duration) {
            const p = (audioElement.currentTime / audioElement.duration) * 100;
            progress.style.width = `${p}%`;
            currentTimeEl.textContent = formatTime(audioElement.currentTime);
            durationEl.textContent = formatTime(audioElement.duration);
        }
    });

    progressBar.addEventListener('click', (e) => {
        const w = progressBar.clientWidth;
        audioElement.currentTime = (e.offsetX / w) * audioElement.duration;
    });

    audioElement.addEventListener('ended', () => nextBtn.click());
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

window.addEventListener('DOMContentLoaded', initApp);

// Lógica para exibir o Popup de Instalação PWA
let deferredPrompt;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const closeBanner = document.getElementById('close-banner');

window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o navegador de mostrar o prompt nativo automático (para mostrarmos o nosso personalizado)
    e.preventDefault();
    deferredPrompt = e;
    
    // Exibe o nosso banner/popup
    if (installBanner) {
        installBanner.style.display = 'block';
    }
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('Usuário aceitou instalar o app');
            }
            deferredPrompt = null;
            installBanner.style.display = 'none';
        }
    });
}

if (closeBanner) {
    closeBanner.addEventListener('click', () => {
        installBanner.style.display = 'none';
    });
}