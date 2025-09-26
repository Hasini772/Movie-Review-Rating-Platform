// --- CONFIG ---
const OMDB_API_KEY = "317c089d"; // your key
const resultsEl = document.getElementById('results');
const favListEl = document.getElementById('favList');
const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('searchBtn');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreWrap = document.getElementById('loadMoreWrap');

let page = 1, currentQuery = '';
const LOCAL_KEY = 'movie_explorer_favs';

// --- UTILITIES ---
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

function saveFavs(list){ localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); }
function loadFavs(){ try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; } catch(e){ return []; } }

// --- FAVORITES ---
function addFavorite(movie){
  const list = loadFavs();
  if(!list.find(m => m.imdbID === movie.imdbID)){
    list.push(movie);
    saveFavs(list);
    renderFavorites();
  }
}
function removeFavorite(id){
  const list = loadFavs().filter(m => m.imdbID !== id);
  saveFavs(list);
  renderFavorites();
}

// --- REVIEWS ---
function getMovieReviews(id){
  try { return JSON.parse(localStorage.getItem("reviews_"+id)) || []; } catch(e){ return []; }
}
function saveMovieReviews(id, reviews){
  localStorage.setItem("reviews_"+id, JSON.stringify(reviews));
}
function editReview(movieId, index) {
  let reviews = getMovieReviews(movieId);
  const newText = prompt("Edit your review:", reviews[index].comment);
  if (newText !== null && newText.trim() !== "") {
    reviews[index].comment = newText.trim();
    saveMovieReviews(movieId, reviews);
    showDetails(movieId);
    refreshDisplayedRatings();
  }
}
function deleteReview(movieId, index) {
  let reviews = getMovieReviews(movieId);
  reviews.splice(index, 1);
  saveMovieReviews(movieId, reviews);
  showDetails(movieId);
  refreshDisplayedRatings();
}

// --- RENDER CARD (and cache genres on card) ---
function renderMovieCard(m){
  const div = document.createElement('div');
  div.className = 'card';
  // store imdbID for favorites & later use
  div.dataset.imdb = m.imdbID;

  const imgSrc = (m.Poster && m.Poster !== 'N/A') ? m.Poster : 'https://via.placeholder.com/300x450?text=No+Poster';
  const reviews = getMovieReviews(m.imdbID);
  const avgRating = reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0) / reviews.length).toFixed(1) : "N/A";

  div.innerHTML = `
    <img src="${imgSrc}" alt="${m.Title}" loading="lazy" />
    <h3>${m.Title}</h3>
    <p>${m.Year}</p>
    <p class="avgRating">⭐ ${avgRating}</p>
    <div style="margin-top:auto;display:flex;gap:.5rem;justify-content:center">
      <button data-id="${m.imdbID}" class="detailsBtn">Details</button>
      <button data-add="${m.imdbID}" class="favBtn">❤</button>
    </div>
  `;
  resultsEl.appendChild(div);

  // Fetch details once to cache Genre on the card (so filtering is fast)
  fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${m.imdbID}`)
    .then(r=>r.json())
    .then(data=>{
      if(data && data.Genre) div.dataset.genres = data.Genre; // e.g. "Action, Adventure"
    }).catch(()=>{ div.dataset.genres = ""; });

  // Poster click and details button open details modal
  div.querySelector('img').addEventListener('click', ()=> showDetails(m.imdbID));
  div.querySelector('.detailsBtn').addEventListener('click', ()=> showDetails(m.imdbID));
  div.querySelector('.favBtn').addEventListener('click', ()=> addFavorite(m));
}

function renderResults(list){
  resultsEl.innerHTML = '';
  list.forEach(renderMovieCard);
}

function renderFavorites(){
  const list = loadFavs();
  favListEl.innerHTML = '';
  if(list.length === 0){ favListEl.innerHTML = `<p class="muted">No favorites yet.</p>`; return; }
  list.forEach(m => {
    const d = document.createElement('div');
    d.className = 'card';
    d.dataset.imdb = m.imdbID;
    const imgSrc = (m.Poster && m.Poster !== 'N/A') ? m.Poster : 'https://via.placeholder.com/300x450?text=No+Poster';
    const reviews = getMovieReviews(m.imdbID);
    const avgRating = reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0) / reviews.length).toFixed(1) : "N/A";
    d.innerHTML = `
      <img src="${imgSrc}" alt="${m.Title}" loading="lazy"/>
      <h3>${m.Title}</h3>
      <p>${m.Year}</p>
      <p class="avgRating">⭐ ${avgRating}</p>
      <div style="display:flex;gap:.4rem;justify-content:center;margin-top:6px">
        <button data-open="${m.imdbID}" class="openFav">Open</button>
        <button data-remove="${m.imdbID}">Remove</button>
      </div>
    `;
    favListEl.appendChild(d);

    d.querySelector('button[data-remove]').addEventListener('click', ()=> removeFavorite(m.imdbID));
    d.querySelector('button.openFav').addEventListener('click', async ()=> {
      // fetch details and open modal
      const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${m.imdbID}&plot=full`);
      const data = await res.json();
      if(data) showDetails(m.imdbID); // showDetails will refetch details for modal so it's fine
    });
  });
}

// --- API CALLS ---
async function searchMovies(q, p=1){
  if(!q) return [];
  try {
    const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(q)}&type=movie&page=${p}`);
    const data = await res.json();
    if(data.Response === "True") {
      return { results: data.Search, total: parseInt(data.totalResults || 0,10) };
    } else {
      return { results: [], total: 0, error: data.Error };
    }
  } catch(err){
    console.error(err);
    return { results: [], total: 0, error: 'Network error' };
  }
}

async function showDetails(imdbID){
  try{
    const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}&plot=full`);
    const data = await res.json();
    if(!data || data.Response === "False"){ modalBody.innerHTML = `<p>Unable to load details.</p>`; show(modal); return; }

    let reviews = getMovieReviews(imdbID);
    let avgRating = reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0) / reviews.length).toFixed(1) : "N/A";

    modalBody.innerHTML = `
      <div style="display:flex;gap:1rem;flex-wrap:wrap">
        <img style="width:200px;border-radius:6px" src="${data.Poster!=='N/A'?data.Poster:'https://via.placeholder.com/300x450'}" alt="${data.Title}">
        <div style="flex:1;min-width:200px">
          <h2>${data.Title} (${data.Year})</h2>
          <p><strong>Genre:</strong> ${data.Genre}</p>
          <p><strong>Runtime:</strong> ${data.Runtime}</p>
          <p><strong>IMDb Rating:</strong> ${data.imdbRating}</p>
          <p><strong>User Rating:</strong> ⭐ ${avgRating}</p>
          <p>${data.Plot}</p>
          <p><em>Director:</em> ${data.Director}</p>
          <p><strong>Cast:</strong> ${data.Actors}</p>
        </div>
      </div>
      <hr>
      <h3>User Reviews</h3>
      <div id="reviewList">
        ${reviews.length ? reviews.map((r,i)=>`
          <div class="review-item">
            <p>⭐ ${r.rating} — ${escapeHtml(r.comment)}</p>
            <div>
              <button onclick="editReview('${imdbID}', ${i})">✏️</button>
              <button onclick="deleteReview('${imdbID}', ${i})">🗑️</button>
            </div>
          </div>
        `).join('') : '<p>No reviews yet.</p>'}
      </div>
      <form id="reviewForm">
        <label>Rate (1–5): <input type="number" min="1" max="5" name="rating" required></label>
        <br><br>
        <textarea name="comment" placeholder="Write your review..." required style="width:100%;min-height:70px"></textarea>
        <br>
        <button type="submit">Submit Review</button>
      </form>
    `;

    const form = modalBody.querySelector('#reviewForm');
    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      const rating = parseInt(form.rating.value,10);
      const comment = form.comment.value.trim();
      if(!rating || !comment) { alert('Please enter a rating and comment'); return; }

      reviews.push({rating,comment});
      saveMovieReviews(imdbID, reviews);

      // refresh modal and UI
      showDetails(imdbID);
      refreshDisplayedRatings();
      renderFavorites();
    });

    show(modal);
  }catch(err){ console.error(err); modalBody.innerHTML = `<p>Error loading details.</p>`; show(modal); }
}

// small helper to avoid injecting raw html from user comments
function escapeHtml(str){
  return str.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; });
}

// --- RATING REFRESH ---
function refreshDisplayedRatings(){
  document.querySelectorAll('.card').forEach(card=>{
    const id = card.querySelector('.detailsBtn')?.getAttribute('data-id') || card.querySelector('button[data-remove]')?.getAttribute('data-remove') || card.dataset.imdb;
    if(id){
      const reviews = getMovieReviews(id);
      const avgRating = reviews.length ? (reviews.reduce((a,r)=>a+r.rating,0) / reviews.length).toFixed(1) : "N/A";
      const ratingEl = card.querySelector('.avgRating');
      if(ratingEl) ratingEl.textContent = `⭐ ${avgRating}`;
    }
  });
}

// --- SEARCH HANDLERS ---
async function doSearch(reset=true){
  const q = queryInput.value.trim();
  if(!q) return;
  if(reset){ page=1; resultsEl.innerHTML=''; }
  currentQuery = q;
  const {results, total, error} = await searchMovies(q, page);
  if(error && page===1){ resultsEl.innerHTML = `<p class="center">${error}</p>`; hide(loadMoreWrap); return; }
  results.forEach(renderMovieCard);
  if(results.length && (page*10) < total){ show(loadMoreWrap); } else { hide(loadMoreWrap); }
}

// --- GENRE FILTER ---
function filterByGenre(genre){
  document.querySelectorAll('.card').forEach(card=>{
    const genres = (card.dataset.genres || '').toLowerCase();
    if(!genre || genre === 'All') {
      card.style.display = '';
      return;
    }
    if(genres.includes(genre.toLowerCase())) card.style.display = '';
    else card.style.display = 'none';
  });
}

// --- UI EVENTS ---
searchBtn.addEventListener('click', ()=> doSearch(true));
loadMoreBtn.addEventListener('click', ()=> { page++; doSearch(false); });
closeModal.addEventListener('click', ()=> hide(modal));
window.addEventListener('click', (e)=> { if(e.target === modal) hide(modal); });

// debounced search on typing
let debounceTimer;
queryInput.addEventListener('input', ()=>{
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=> { doSearch(true); }, 500);
});

// initial render
renderFavorites();
