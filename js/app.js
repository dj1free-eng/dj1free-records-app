const DATA_URL = "data/catalog.json";
const PREVIEW_SECONDS = 30;

function $(sel){ return document.querySelector(sel); }
function qs(name){ return new URLSearchParams(location.search).get(name); }
function byId(arr, id){ return arr.find(x => x.id === id); }
function setBg(el, url){ el.style.backgroundImage = `url("${url}")`; }
function fmtTime(sec){
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

async function loadData(){
  const res = await fetch(DATA_URL, { cache: "no-cache" });
  if(!res.ok) throw new Error("No se pudo cargar data/catalog.json");
  return res.json();
}

/* =========================
   BOTONES EXTERNOS (FIX)
   ========================= */
function setExternalButtonState(btnEl, url, platform) {
  const hasUrl = typeof url === "string" && url.trim() !== "";

  // Limpieza total
  btnEl.classList.remove("is-available", "is-unavailable", "spotify", "ytmusic");

  if (hasUrl) {
    btnEl.classList.add("is-available", platform);
    btnEl.href = url.trim();
    btnEl.target = "_blank";
    btnEl.rel = "noopener noreferrer";
    btnEl.setAttribute("aria-disabled", "false");
    btnEl.removeAttribute("tabindex");
  } else {
    btnEl.classList.add("is-unavailable");
    btnEl.removeAttribute("href");
    btnEl.setAttribute("aria-disabled", "true");
    btnEl.setAttribute("tabindex", "-1");
  }
}

function allReleasesSortedByRecency(data){
  const out = [];
  for(const a of data.artists){
    for(const r of (a.releases||[])){
      out.push({
        ...r,
        artistId: a.id,
        artistName: a.name,
        artistHero: a.heroImage
      });
    }
  }
  // Orden por novedad: year desc, y si empatan, por title desc (estable simple)
  out.sort((x,y) => (y.year||0)-(x.year||0) || (y.title||"").localeCompare(x.title||""));
  return out;
}

function allTracksSortedByRecency(data){
  // Usamos el orden de releases por novedad y dentro el orden del tracklist
  const releases = allReleasesSortedByRecency(data);
  const result = [];
  for(const r of releases){
    for(const tid of (r.trackIds||[])){
      const t = byId(data.tracks, tid);
      if(t) result.push(t);
    }
  }
  return result;
}

async function init(){
  const data = await loadData();
  document.querySelectorAll("[data-label-name]").forEach(el => el.textContent = data.labelName);

  const page = document.body.getAttribute("data-page");
  if(page === "home") renderHome(data);
  if(page === "artists") renderArtists(data);
  if(page === "artist") renderArtist(data);
  if(page === "album") renderAlbum(data);
  if(page === "track") renderTrack(data);

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}

function renderHome(data){
  const featuredTrack = byId(data.tracks, data.featured?.trackId) || data.tracks[0];
  const artist = byId(data.artists, featuredTrack.artistId);

  $("#heroKicker").textContent = data.featured?.headline || "Destacado";
  $("#heroTitle").textContent = `${artist?.name || ""} - "${featuredTrack.title}"`;
  setBg($("#heroImg"), featuredTrack.cover);

  $("#ctaPlay").addEventListener("click", () => {
    location.href = `cancion.html?id=${encodeURIComponent(featuredTrack.id)}`;
  });

  const recentTracks = allTracksSortedByRecency(data).slice(0, 8);
  const recTracks = allTracksSortedByRecency(data).slice(2, 10);

  fillTrackRow("#rowNovedades", data, recentTracks);
  fillTrackRow("#rowRecomendado", data, recTracks);

  const rowArtists = $("#rowArtists");
  rowArtists.innerHTML = "";
  data.artists.forEach(a => {
    const card = document.createElement("a");
    card.className = "card";
    card.href = `artista.html?id=${encodeURIComponent(a.id)}`;
    card.innerHTML = `
      <div class="cover" style="background-image:url('${a.heroImage}')"></div>
      <div class="label">${a.name}</div>
    `;
    rowArtists.appendChild(card);
  });

  $("#goArtists").addEventListener("click", () => location.href = "artistas.html");
  $("#goFav").addEventListener("click", () => alert("Favoritos: siguiente sprint."));
}

function fillTrackRow(containerSel, data, tracks){
  const wrap = document.querySelector(containerSel);
  wrap.innerHTML = "";
  tracks.forEach(t => {
    const card = document.createElement("a");
    card.className = "card";
    card.href = `cancion.html?id=${encodeURIComponent(t.id)}`;
    card.innerHTML = `
      <div class="cover" style="background-image:url('${t.cover}')"></div>
      <div class="label">${t.title}</div>
    `;
    wrap.appendChild(card);
  });
}

function renderArtists(data){
  const list = $("#artistList");
  list.innerHTML = "";
  data.artists.forEach(a => {
    const item = document.createElement("a");
    item.className = "listItem";
    item.href = `artista.html?id=${encodeURIComponent(a.id)}`;
    item.innerHTML = `
      <div class="row">
        <div class="thumb" style="background-image:url('${a.heroImage}')"></div>
        <div>
          <div class="liTitle">${a.name}</div>
          <div class="liSub">${a.tagline || ""}</div>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderArtist(data){
  const id = qs("id") || data.artists[0].id;
  const a = byId(data.artists, id);
  if(!a) return;

  $("#artistTitle").textContent = a.name;
  $("#artistName").textContent = a.name;
  $("#artistBio").textContent = a.bio || "";
  setBg($("#artistHeroImg"), a.heroImage);

  // Orden por novedad
  const releases = [...(a.releases || [])].sort((x,y) => (y.year||0)-(x.year||0) || (y.title||"").localeCompare(x.title||""));

  const grid = $("#releaseGrid");
  grid.innerHTML = "";
  releases.forEach(r => {
    const el = document.createElement("a");
    el.className = "release";

    const href = (r.type === "album")
      ? `album.html?id=${encodeURIComponent(r.id)}&artist=${encodeURIComponent(a.id)}`
      : `cancion.html?id=${encodeURIComponent(r.trackIds?.[0] || "")}`;

    el.href = href;
    el.innerHTML = `
      <div class="cover" style="background-image:url('${r.cover}')"></div>
      <div class="playBadge">▶</div>
      <div class="name">${r.title}</div>
    `;
    grid.appendChild(el);
  });
}

function renderAlbum(data){
  const albumId = qs("id");
  const artistId = qs("artist");

  const artist = byId(data.artists, artistId) || data.artists.find(a => (a.releases||[]).some(r => r.id === albumId));
  const release = artist?.releases?.find(r => r.id === albumId);

  if(!artist || !release){
    $("#albumHeader").textContent = "ÁLBUM";
    $("#albumTitle").textContent = "No encontrado";
    return;
  }

  $("#albumHeader").textContent = "ÁLBUM";
  $("#albumTitle").textContent = release.title;
  $("#albumArtist").textContent = artist.name;
  setBg($("#albumCover"), release.cover);

  const list = $("#albumTrackList");
  list.innerHTML = "";

  (release.trackIds || []).forEach((tid, idx) => {
    const t = byId(data.tracks, tid);
    if(!t) return;

    const row = document.createElement("div");
    row.className = "trackRow";
    row.innerHTML = `
      <div class="trackLeft">
        <div class="trackNum">#${idx+1}</div>
        <div class="trackName">${t.title}</div>
      </div>
      <div class="trackRight">
        <a class="trackPlay" href="cancion.html?id=${encodeURIComponent(t.id)}" title="Abrir">▶</a>
      </div>
    `;
    list.appendChild(row);
  });
}

function renderTrack(data){
  const id = qs("id") || data.tracks[0].id;
  const t = byId(data.tracks, id);
  if(!t) return;

  const a = byId(data.artists, t.artistId);

  $("#trackTitle").textContent = t.title;
  $("#trackHeader").textContent = "CANCIÓN";
  $("#trackAlbum").textContent = t.album || "";
  $("#trackArtistLine").textContent = a?.name || "";
  $("#trackBlurb").textContent = t.blurb || "";
  setBg($("#trackCover"), t.cover);

  // ====== BOTONES EXTERNOS (AQUÍ ESTABA EL FALLO) ======
  const btnSpotify = document.getElementById("btnSpotify");
  const btnYtMusic = document.getElementById("btnYtMusic");

  setExternalButtonState(btnSpotify, t.spotifyUrl, "spotify");
  setExternalButtonState(btnYtMusic, t.ytMusicUrl, "ytmusic");
  // ====================================================

  // Previews: SIEMPRE 30s
  const dur = PREVIEW_SECONDS;
  $("#timeLeft").textContent = fmtTime(dur);
  $("#timeNow").textContent = "0:00";

  const audio = new Audio(t.previewUrl);
  audio.preload = "metadata";

  let playing = false;

  const fill = $("#seekFill");
  const dot = $("#seekDot");

  function clampTime(){
    if(audio.currentTime > dur){
      audio.pause();
      audio.currentTime = dur;
      playing = false;
      $("#btnPlay").textContent = "▶";
    }
  }

  function updateUI(){
    const cur = Math.min(audio.currentTime || 0, dur);
    const pct = (cur / dur) * 100;
    fill.style.width = `${pct}%`;
    dot.style.left = `${pct}%`;
    $("#timeNow").textContent = fmtTime(cur);
  }

  const btnPlay = $("#btnPlay");
  btnPlay.addEventListener("click", async () => {
    if(!playing){
      try{
        if((audio.currentTime||0) >= dur) audio.currentTime = 0;
        await audio.play();
        playing = true;
        btnPlay.textContent = "❚❚";
      }catch{
        // iOS: requiere gesto, ya lo hay
      }
    }else{
      audio.pause();
      playing = false;
      btnPlay.textContent = "▶";
    }
  });

  $("#btnBack").addEventListener("click", () => {
    audio.currentTime = Math.max(0, (audio.currentTime||0) - 10);
    updateUI();
  });

  $("#btnFwd").addEventListener("click", () => {
    audio.currentTime = Math.min(dur, (audio.currentTime||0) + 10);
    updateUI();
  });

  $("#seekBar").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(dur, pct * dur));
    updateUI();
  });

  audio.addEventListener("timeupdate", () => { clampTime(); updateUI(); });
  audio.addEventListener("ended", () => { playing = false; btnPlay.textContent = "▶"; });
}

init().catch(err => {
  console.error(err);
  alert("Error cargando la app. Revisa data/catalog.json y rutas de archivos.");
});
