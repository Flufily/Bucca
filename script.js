const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let userIsAdmin = false;

// ==========================================
// 2. DOM-ELEMENTE SAMMELN
// ==========================================
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminControls = document.getElementById('adminControls');
const newsContainer = document.getElementById('newsContainer');
const pilotsContainer = document.getElementById('pilotsContainer');
const roleBadge = document.getElementById('roleBadge');

const pledgeFleetContainer = document.getElementById('pledgeFleetContainer');
const ingameFleetContainer = document.getElementById('ingameFleetContainer');

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const authMessage = document.getElementById('authMessage');

// Admin Inputs
const shipNameInput = document.getElementById('shipNameInput');
const shipMfgInput = document.getElementById('shipMfgInput');
const shipClassInput = document.getElementById('shipClassInput');
const shipTypeInput = document.getElementById('shipTypeInput'); 
const newsTitleInput = document.getElementById('newsTitleInput');
const newsContentInput = document.getElementById('newsContentInput');
const pilotNameInput = document.getElementById('pilotNameInput');
const pilotSpecInput = document.getElementById('pilotSpecInput');

const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addShipBtn = document.getElementById('addShipBtn');
const addNewsBtn = document.getElementById('addNewsBtn');
const addPilotBtn = document.getElementById('addPilotBtn');

// ==========================================
// 3. UI-STEUERUNG & ROLES
// ==========================================
function showMessage(text, isError = false) {
    authMessage.textContent = text;
    authMessage.classList.remove('hidden', 'text-scCyan', 'text-red-500');
    authMessage.classList.add(isError ? 'text-red-500' : 'text-scCyan');
}

async function updateUI(user) {
    if (user) {
        authSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');

        await checkAdminStatus(user.id);

        roleBadge.classList.remove('hidden', 'border-scOrange', 'text-scOrange', 'border-scCyan', 'text-scCyan');
        if (userIsAdmin) {
            roleBadge.textContent = "Freigabe: ADMIN";
            roleBadge.classList.add('border-scOrange', 'text-scOrange');
            adminControls.classList.remove('hidden');
        } else {
            roleBadge.textContent = "Freigabe: MEMBER";
            roleBadge.classList.add('border-scCyan', 'text-scCyan');
            adminControls.classList.add('hidden');
        }

        await loadFleetData();
        await loadNewsData();
        await loadPilotsData();
    } else {
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        adminControls.classList.add('hidden');
        roleBadge.classList.add('hidden');
        userIsAdmin = false;
    }
}

async function checkAdminStatus(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single();

        userIsAdmin = data && data.is_admin === true;
    } catch (err) {
        console.error("Fehler bei Rollenprüfung:", err);
        userIsAdmin = false;
    }
}

// ==========================================
// 4. DATEN LADEN UND RENDERN
// ==========================================
async function loadFleetData() {
    const { data: ships, error } = await supabaseClient.from('ships').select('*').order('name', { ascending: true });
    if (error) return console.error(error.message);

    pledgeFleetContainer.innerHTML = '';
    ingameFleetContainer.innerHTML = '';

    ships.forEach(ship => {
        const shipCard = document.createElement('div');
        const accentClass = ship.is_pledge ? "hover:border-scCyan" : "hover:border-scOrange";
        
        shipCard.className = `bg-scDark/60 border border-gray-800 p-3 rounded flex justify-between items-center group ${accentClass} transition-all duration-300`;
        shipCard.innerHTML = `
            <div>
                <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">${ship.manufacturer}</p>
                <h3 class="text-sm text-white font-bold group-hover:text-white transition-colors">${ship.name}</h3>
                <span class="text-[9px] text-gray-400 uppercase tracking-wider">${ship.ship_class}</span>
            </div>
        `;

        if (userIsAdmin) {
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = "✕";
            deleteBtn.className = "text-gray-600 hover:text-red-500 font-bold px-2 transition-colors text-xs";
            deleteBtn.addEventListener('click', () => deleteShip(ship.id));
            shipCard.appendChild(deleteBtn);
        }

        if (ship.is_pledge) {
            pledgeFleetContainer.appendChild(shipCard);
        } else {
            ingameFleetContainer.appendChild(shipCard);
        }
    });

    if(pledgeFleetContainer.children.length === 0) {
        pledgeFleetContainer.innerHTML = `<p class="text-xs text-gray-600 italic">Keine Schiffe registriert.</p>`;
    }
    if(ingameFleetContainer.children.length === 0) {
        ingameFleetContainer.innerHTML = `<p class="text-xs text-gray-600 italic">Keine Schiffe registriert.</p>`;
    }
}

async function loadNewsData() {
    const { data: newsItems, error } = await supabaseClient.from('news').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error.message);

    newsContainer.innerHTML = '';
    if(newsItems.length === 0) {
        newsContainer.innerHTML = `<p class="text-xs text-gray-600 italic">Keine aktuellen Comm-Links.</p>`;
        return;
    }
    newsItems.forEach(item => {
        const newsCard = document.createElement('div');
        newsCard.className = "border-l-2 border-scCyan/40 bg-scDark/40 p-3 rounded-r flex justify-between items-start";
        newsCard.innerHTML = `
            <div class="flex-1 pr-4">
                <h4 class="text-white text-sm font-bold tracking-wide">${item.title}</h4>
                <p class="text-xs text-gray-400 mt-1 whitespace-pre-wrap">${item.content}</p>
            </div>
        `;
        if (userIsAdmin) {
            const deleteNewsBtn = document.createElement('button');
            deleteNewsBtn.innerHTML = "✕";
            deleteNewsBtn.className = "text-gray-600 hover:text-red-500 font-bold px-1 transition-colors text-xs";
            deleteNewsBtn.addEventListener('click', () => deleteNews(item.id));
            newsCard.appendChild(deleteNewsBtn);
        }
        newsContainer.appendChild(newsCard);
    });
}

async function loadPilotsData() {
    const { data: pilots, error } = await supabaseClient.from('pilots').select('*').order('name', { ascending: true });
    if (error) return console.error(error.message);

    pilotsContainer.innerHTML = '';
    if(pilots.length === 0) {
        pilotsContainer.innerHTML = `<p class="text-xs text-gray-600 italic">Keine Piloten im Roster registriert.</p>`;
        return;
    }

    pilots.forEach(pilot => {
        const pilotCard = document.createElement('div');
        pilotCard.className = "bg-scDark/60 border border-gray-800 p-3 rounded flex justify-between items-center group hover:border-scOrange/50 transition-all duration-300";
        pilotCard.innerHTML = `
            <div>
                <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Akte // Status: Aktiv</p>
                <h3 class="text-sm text-white font-bold group-hover:text-scOrange transition-colors">${pilot.name}</h3>
                <span class="text-[9px] text-scOrange/70 uppercase tracking-wider">${pilot.specialization}</span>
            </div>
        `;

        if (userIsAdmin) {
            const deletePilotBtn = document.createElement('button');
            deletePilotBtn.innerHTML = "✕";
            deletePilotBtn.className = "text-gray-600 hover:text-red-500 font-bold px-2 transition-colors text-xs";
            deletePilotBtn.addEventListener('click', () => deletePilot(pilot.id));
            pilotCard.appendChild(deletePilotBtn);
        }

        pilotsContainer.appendChild(pilotCard);
    });
}

// ==========================================
// 5. ADMIN AKTIONEN
// ==========================================
addShipBtn.addEventListener('click', async () => {
    const name = shipNameInput.value.trim();
    const manufacturer = shipMfgInput.value.trim();
    const ship_class = shipClassInput.value.trim();
    const is_pledge = shipTypeInput.value === 'true';

    if(!name || !manufacturer || !ship_class) return alert("Felder ausfüllen!");

    const { error } = await supabaseClient
        .from('ships')
        .insert([{ name, manufacturer, ship_class, is_pledge }]);

    if(error) alert(error.message);
    else { 
        shipNameInput.value = ''; shipMfgInput.value = ''; shipClassInput.value = ''; 
        await loadFleetData(); 
    }
});

async function deleteShip(id) {
    if(confirm("Schiff aus der Flotte entfernen?")) {
        const { error } = await supabaseClient.from('ships').delete().eq('id', id);
        if(error) alert(error.message); else await loadFleetData();
    }
}

addNewsBtn.addEventListener('click', async () => {
    const title = newsTitleInput.value.trim();
    const content = newsContentInput.value.trim();
    if(!title || !content) return alert("Felder ausfüllen!");
    const { error } = await supabaseClient.from('news').insert([{ title, content }]);
    if(error) alert(error.message);
    else { newsTitleInput.value = ''; newsContentInput.value = ''; await loadNewsData(); }
});

async function deleteNews(id) {
    if(confirm("Meldung löschen?")) {
        const { error } = await supabaseClient.from('news').delete().eq('id', id);
        if(error) alert(error.message); else await loadNewsData();
    }
}

addPilotBtn.addEventListener('click', async () => {
    const name = pilotNameInput.value.trim();
    const specialization = pilotSpecInput.value.trim();
    if(!name || !specialization) return alert("Felder ausfüllen!");
    const { error } = await supabaseClient.from('pilots').insert([{ name, specialization }]);
    if(error) alert(error.message);
    else { pilotNameInput.value = ''; pilotSpecInput.value = ''; await loadPilotsData(); }
});

async function deletePilot(id) {
    if(confirm("Pilot aus dem Roster streichen?")) {
        const { error } = await supabaseClient.from('pilots').delete().eq('id', id);
        if(error) alert(error.message); else await loadPilotsData();
    }
}

// ==========================================
// 6. LOGIN / LOGOUT & SESSION
// ==========================================
loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if(!email || !password) return showMessage('Zugangsdaten eingeben', true);
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showMessage(error.message, true);
    else { showMessage('Login erfolgreich!'); updateUI(data.user); }
});

logoutBtn.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) { updateUI(null); emailInput.value = ''; passwordInput.value = ''; }
});

// ==========================================
// 7. 🛸 SCI-FI HUD CURSOR LOGIC (MIT TRAIL)
// ==========================================
function initSciFiCursor() {
    const dot = document.createElement('div');
    const glow = document.createElement('div');
    
    dot.className = 'sc-cursor-dot';
    glow.className = 'sc-cursor-glow';
    
    document.body.appendChild(dot);
    document.body.appendChild(glow);

    window.addEventListener('mousemove', (e) => {
        dot.style.left = e.clientX + 'px';
        dot.style.top = e.clientY + 'px';
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';

        // 🎇 Quanten-Schweif (Particle Trail) generieren
        const now = Date.now();
        // Erzeugt alle 25 Millisekunden einen Partikel für flüssige Optik ohne Lags
        if (!window.lastTrailSpawn || now - window.lastTrailSpawn > 25) {
            const particle = document.createElement('div');
            const isLocked = document.body.classList.contains('sc-target-lock');
            
            particle.className = isLocked ? 'sc-trail-particle orange' : 'sc-trail-particle';
            particle.style.left = e.clientX + 'px';
            particle.style.top = e.clientY + 'px';
            
            document.body.appendChild(particle);
            
            // Löscht das Element nach Ablauf der CSS-Animation aus dem System
            setTimeout(() => {
                particle.remove();
            }, 400);
            
            window.lastTrailSpawn = now;
        }
    });

    document.addEventListener('mouseover', (e) => {
        const target = e.target;
        if (
            target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'SELECT' || 
            target.tagName === 'A' || 
            target.tagName === 'TEXTAREA' ||
            target.closest('button')
        ) {
            document.body.classList.add('sc-target-lock');
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target;
        if (
            target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'SELECT' || 
            target.tagName === 'A' || 
            target.tagName === 'TEXTAREA' ||
            !e.relatedTarget
        ) {
            document.body.classList.remove('sc-target-lock');
        }
    });
}

// App initialisieren & Cursor starten
async function initApp() {
    initSciFiCursor(); 
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) updateUI(session.user);
    supabaseClient.auth.onAuthStateChange((_event, session) => { updateUI(session?.user ?? null); });
}
initApp();