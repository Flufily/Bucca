// ==========================================
// 1. SUPABASE INITIALISIERUNG
// ==========================================
const SUPABASE_URL = 'https://ebmkhqcgiidyvlgzibit.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVibWtocWNnaWlkeXZsZ3ppYml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMTUzMDksImV4cCI6MjA5NTU5MTMwOX0.pE-m-Nz2XnpPYqbjdIvI7ymXvTTR4ACCHSxrz0MOCfk';

// BEHOBEN: Wir nennen die Instanz 'supabaseClient', um den Namenskonflikt zu lösen!
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

// NEU: Getrennte Flotten-Container statt dem einen alten Container
const pledgeFleetContainer = document.getElementById('pledgeFleetContainer');
const ingameFleetContainer = document.getElementById('ingameFleetContainer');

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const authMessage = document.getElementById('authMessage');

// Admin Inputs
const shipNameInput = document.getElementById('shipNameInput');
const shipMfgInput = document.getElementById('shipMfgInput');
const shipClassInput = document.getElementById('shipClassInput');
const shipTypeInput = document.getElementById('shipTypeInput'); // NEU
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
            roleBadge.classList.add('border-scOrange', 'text-scOrange', 'sc-glow-orange');
            adminControls.classList.remove('hidden');
        } else {
            roleBadge.textContent = "Freigabe: MEMBER";
            roleBadge.classList.add('border-scCyan', 'text-scCyan', 'sc-glow-cyan');
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

// SCHIFFE LADEN (Jetzt mit Weiche für Pledge / Ingame)
async function loadFleetData() {
    const { data: ships, error } = await supabaseClient.from('ships').select('*').order('name', { ascending: true });
    if (error) return console.error(error.message);

    // Beide Hälften leeren vor dem Neu-Rendern
    pledgeFleetContainer.innerHTML = '';
    ingameFleetContainer.innerHTML = '';

    ships.forEach(ship => {
        const shipCard = document.createElement('div');
        
        // Design-Akzentfarbe anpassen, je nachdem ob Echtgeld-Pledge (Cyan) oder Ingame (Orange)
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

        // WEICHE: In welchen Hangar gehört das Schiff laut Datenbank?
        if (ship.is_pledge) {
            pledgeFleetContainer.appendChild(shipCard);
        } else {
            ingameFleetContainer.appendChild(shipCard);
        }
    });

    // Leer-Meldungen falls ein Bereich unbesetzt ist
    if(pledgeFleetContainer.children.length === 0) {
        pledgeFleetContainer.innerHTML = `<p class="text-xs text-gray-600 italic">Keine Schiffe registriert.</p>`;
    }
    if(ingameFleetContainer.children.length === 0) {
        ingameFleetContainer.innerHTML = `<p class="text-xs text-gray-600 italic">Keine Schiffe registriert.</p>`;
    }
}

// NEWS LADEN
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

// PILOTEN LADEN
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

// Schiff hinzufügen
addShipBtn.addEventListener('click', async () => {
    const name = shipNameInput.value.trim();
    const manufacturer = shipMfgInput.value.trim();
    const ship_class = shipClassInput.value.trim();
    // Der String aus dem Dropdown ('true' oder 'false') wird hier in einen echten Boolean gewandelt
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

// News hinzufügen
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

// Pilot hinzufügen
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

async function initApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) updateUI(session.user);
    supabaseClient.auth.onAuthStateChange((_event, session) => { updateUI(session?.user ?? null); });
}

window.onerror = function(message, source, lineno, colno, error) {
    alert("❌ SCRIPT CRASHED!\n\nFehler: " + message + "\nZeile: " + lineno);
    return false;
};

alert("🚀 Skript gestartet! Teste jetzt den Login-Button.");

initApp();