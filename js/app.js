const DATA_URL = "catalog.json";
const PREVIEW_SECONDS = 30;

/* =========================
   Helpers
========================= */
function $(sel){ return document.querySelector(sel); }
function qs(name){ return new URLSearchParams(location.search).get(name); }
function byId(arr, id){ return arr.find(x => x.id === id); }
function fmtTime(sec){
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}
function setBg(el, url){
  if(!el) return;
  if(typeof url !== "string" || !url.trim()){
    el.style.backgroundImage = "none";
    return;
  }
  el.style.backgroundImage = `url("${encodeURI(url.trim())}")`;
}

/* =========================
   Carga de datos
========================= */
async function loadData(){
  const res = await fetch(DATA_URL + "?v=" + Date.now(), { cache:"no-store" });
  if(!res.ok) throw new Error("No se pudo cargar catalog.json");
  const raw = await res.json();
  return normalizeCatalog(raw);
}

/* =========================
   Normalizador
========================= */
function normalizeCatalog(raw){
  if(raw.labelName && Array.isArray(raw.tracks)) return raw;

  const labelName = raw.label || "dJ1fRee Records";
  const tracks = [];
  const artists = [];

  raw.artists.forEach(a=>{
    const releases = [];

    (a.albums||[]).forEach(alb=>{
      const cover = alb.cover;
      const trackIds = [];

      (alb.tracks||[]).forEach(t=>{
        trackIds.push(t.id);
        tracks.push({
          id: t.id,
          artistId: a.id,
          title: t.title,
          album: alb.title,
          cover,
          previewUrl: t.previewUrl || "",
          spotifyUrl: t.spotifyUrl || "",
          ytMusicUrl: t.ytMusicUrl || "",
          blurb: t.blurb || ""
        });
      });

      releases.push({
        id: alb.id,
        type:"album",
        title: alb.title,
        year: alb.year||0,
        cover,
        trackIds
      });
    });

    (a.singles||[]).forEach(s=>{
      tracks.push({
        id: s.id,
        artistId: a.id,
        title: s.title,
        album: "Single",
        cover: s.cover,
        previewUrl: s.previewUrl || "",
        spotifyUrl: s.spotifyUrl || "",
        ytMusicUrl: s.ytMusicUrl || "",
        blurb: s.blurb || ""
      });

      releases.push({
        id: s.id,
        type:"single",
        title: s.title,
        year: s.year||0,
        cover: s.cover,
        trackIds:[s.id]
      });
    });

    artists.push({
      id: a.id,
      name: a.name,
      heroImage: a.heroImage || a.banner,
      releases
    });
  });

  return {
    labelName,
    featured:{ headline:"Nuevo lanzamiento", trackId: tracks[0]?.id },
    artists,
    tracks
  };
}

/* =========================
   Botones externos
========================= */
function setExternalButtonState(btn, url, cls){
  if(!btn) return;
  btn.classList.remove("is-available","is-unavailable","spotify","ytmusic");

  if(typeof url === "string" && url.trim()){
    btn.classList.add("is-available", cls);
    btn.href = url.trim();
    btn.target = "_blank";
    btn.rel = "noopener";
  }else{
    btn.classList.add("is-unavailable");
    btn.removeAttribute("href");
  }
}

/* =========================
   INIT
========================= */
async function init(){
  const data = await loadData();

  const page = document.body.dataset.page;
  if(page==="home") renderHome(data);
  if(page==="track") renderTrack(data);
}

init().catch(err=>{
  console.error(err);
  alert("Error cargando la app");
});

/* =========================
   HOME
========================= */
function renderHome(data){
  const featured = byId(data.tracks, data.featured.trackId);
  if(!featured) return;

  setBg($("#heroImg"), featured.cover);
  $("#heroTitle").textContent = featured.title;

  $("#ctaPlay").onclick = ()=>{
    location.href = `cancion.html?id=${featured.id}`;
  };

  fillTrackRow("#rowNovedades", data.tracks.slice(0,6));
  fillTrackRow("#rowRecomendado", data.tracks.slice(3,9));
}

function fillTrackRow(containerSel, data, tracks){
  const wrap = document.querySelector(containerSel);
  if (!wrap) return;

  wrap.innerHTML = "";

  tracks.forEach(t => {
    const a = byId(data.artists, t.artistId);

    const card = document.createElement("a");
    card.className = "card";
    card.href = `cancion.html?id=${encodeURIComponent(t.id)}`;

    card.innerHTML = `
      <div class="cover"></div>
      <div class="label">${t.title}</div>
    `;

    const coverEl = card.querySelector(".cover");
    if (coverEl) {
      setBg(coverEl, t.cover);
    }

    wrap.appendChild(card);
  });
}

/* =========================
   TRACK
========================= */
function renderTrack(data){
  const id = qs("id");
  const t = byId(data.tracks, id);
  if(!t) return;

  const a = byId(data.artists, t.artistId);

  $("#trackTitle").textContent = t.title;
  $("#trackArtistLine").textContent = a?.name || "";
  $("#trackAlbum").textContent = t.album || "";
  setBg($("#trackCover"), t.cover);

  setExternalButtonState($("#btnSpotify"), t.spotifyUrl, "spotify");
  setExternalButtonState($("#btnYtMusic"), t.ytMusicUrl, "ytmusic");

  $("#timeLeft").textContent = "0:30";
  $("#timeNow").textContent = "0:00";

  if(!t.previewUrl) return;

  const audio = new Audio(encodeURI(t.previewUrl));
  let playing=false;

  $("#btnPlay").onclick = async ()=>{
    if(!playing){
      await audio.play();
      playing=true;
      $("#btnPlay").textContent="❚❚";
    }else{
      audio.pause();
      playing=false;
      $("#btnPlay").textContent="▶";
    }
  };

  audio.ontimeupdate=()=>{
    const cur=Math.min(audio.currentTime,30);
    $("#timeNow").textContent=fmtTime(cur);
    const pct=(cur/30)*100;
    $("#seekFill").style.width=pct+"%";
    $("#seekDot").style.left=pct+"%";
  };

  audio.onended=()=>{
    playing=false;
    $("#btnPlay").textContent="▶";
  };
}
