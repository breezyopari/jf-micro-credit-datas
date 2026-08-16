// FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyAJaNc_Ah5KDEAzch4VvqRoY4pqcGIBvaA",
    authDomain: "jf-micro-credit-datas.firebaseapp.com",
    projectId: "jf-micro-credit-datas",
    storageBucket: "jf-micro-credit-datas.firebasestorage.app",
    messagingSenderId: "75535324789",
    appId: "1:75535324789:web:250d36fb89df00c532a2ed",
    measurementId: "G-8H452QVR50"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 1. HIFADHI AUDIT LOG YA LOGIN FIREBASE
function recordLoginToFirebase(username, role) {
    db.collection("login_logs").add({
        username: username,
        role: role,
        loginTime: firebase.firestore.FieldValue.serverTimestamp(),
        deviceAgent: navigator.userAgent
    }).catch(err => console.error("Error logging login history: ", err));
}

// 2. OFFICER LOGIN
function handleOfficerLogin(e) {
    e.preventDefault();
    const user = document.getElementById('officerUser').value.trim();
    const pass = document.getElementById('officerPass').value.trim();

    if (!user || !pass) {
        alert("Tafadhali ingiza Username na Password!");
        return;
    }

    sessionStorage.setItem('jf_officer_user', user);
    recordLoginToFirebase(user, "Afisa");

    document.getElementById('userAuthLayout').classList.add('hidden');
    document.getElementById('userMainLayout').classList.remove('hidden');
    document.getElementById('displayOfficerName').innerText = "AFISA: " + user.toUpperCase();

    loadRepaymentData();
}

function officerLogout() {
    sessionStorage.removeItem('jf_officer_user');
    window.location.reload();
}

// 3. ADMIN LOGIN
function handleAdminLogin(event) {
    event.preventDefault();
    const user = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value.trim();

    if (user === "admin" && pass === "admin123") {
        sessionStorage.setItem('jf_admin_active', 'true');
        recordLoginToFirebase(user, "Admin");

        document.getElementById('adminAuthLayout').classList.add('hidden');
        document.getElementById('adminMainLayout').classList.remove('hidden');
        renderAdminView();
    } else {
        alert("Username au Password ya Admin sio sahihi!");
    }
}

function adminLogout() {
    sessionStorage.removeItem('jf_admin_active');
    window.location.reload();
}

// 4. SWITCH TABS
function switchOfficerTab(tab) {
    document.querySelectorAll('.officer-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('bottom-nav-active'));

    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`off-nav-${tab}`).classList.add('bottom-nav-active');
}

function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('bottom-nav-active'));

    const selectedTab = document.getElementById(`admin-tab-${tabName}`);
    const selectedNav = document.getElementById(`admin-nav-${tabName}`);

    if (selectedTab) selectedTab.classList.remove('hidden');
    if (selectedNav) selectedNav.classList.add('bottom-nav-active');
}

// 5. WASILISHA MAOMBI YA MKOPO (FIREBASE)
function handleLoanApplication(e) {
    e.preventDefault();
    const clientName = document.getElementById('clientName').value.trim();
    const clientPhone = document.getElementById('clientPhone').value.trim();
    const loanAmount = document.getElementById('loanAmount').value;
    const loanDuration = document.getElementById('loanDuration').value;
    const officer = sessionStorage.getItem('jf_officer_user') || 'Afisa';

    db.collection("loans").add({
        clientName: clientName,
        phone: clientPhone,
        amount: parseFloat(loanAmount),
        duration: loanDuration,
        officer: officer,
        status: "Pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Ombi la mkopo limewasilishwa kikamilifu!");
        e.target.reset();
        loadRepaymentData();
    }).catch(err => alert("Hitilafu ya Mtandao: " + err.message));
}

// 6. PAKIA MIKOPO YA MAREJESHO KWENYE PORTAL YA AFISA
function loadRepaymentData() {
    const table = document.getElementById('repaymentClientsTable');
    if (!table) return;

    const currentOfficer = sessionStorage.getItem('jf_officer_user') || '';

    db.collection("loans").onSnapshot(snapshot => {
        table.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.officer === currentOfficer || currentOfficer === 'admin') {
                const row = `
                    <tr>
                        <td class="p-2 font-bold">${data.clientName || 'N/A'}</td>
                        <td class="p-2">${data.phone || 'N/A'}</td>
                        <td class="p-2 font-bold text-amber-400">TZS ${parseFloat(data.amount || 0).toLocaleString()}</td>
                        <td class="p-2 text-right">
                            <button class="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded text-[11px] hover:bg-amber-600">
                                Rejesha
                            </button>
                        </td>
                    </tr>
                `;
                table.innerHTML += row;
            }
        });
    });
}

// 7. LOAD ADMIN VIEW
function renderAdminView() {
    db.collection("loans").onSnapshot(snapshot => {
        const tableBody = document.getElementById('adminLoansTable');
        if (tableBody) tableBody.innerHTML = '';
        let totalOut = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const amount = parseFloat(data.amount || 0);
            totalOut += amount;

            if (tableBody) {
                const row = `
                    <tr>
                        <td class="p-2 font-mono">${doc.id.substring(0, 5)}</td>
                        <td class="p-2 font-bold">${data.clientName || 'N/A'}</td>
                        <td class="p-2">${data.phone || 'N/A'}</td>
                        <td class="p-2 font-bold text-amber-400">TZS ${amount.toLocaleString()}</td>
                        <td class="p-2">${data.officer || 'N/A'}</td>
                        <td class="p-2">
                            <span class="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded-full font-bold">
                                ${data.status || 'Active'}
                            </span>
                        </td>
                        <td class="p-2 text-right">
                            <button class="px-2 py-1 bg-slate-800 border border-slate-700 text-xs rounded">Tazama</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            }
        });

        const outElem = document.getElementById('admOut');
        if (outElem) outElem.innerText = `TZS ${totalOut.toLocaleString()}`;
    });

    // Login logs kutoka Firebase
    db.collection("login_logs").orderBy("loginTime", "desc").limit(10).onSnapshot(snapshot => {
        const logsContainer = document.getElementById('adminAuditLogs');
        if (!logsContainer) return;

        logsContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const log = doc.data();
            const time = log.loginTime ? new Date(log.loginTime.toDate()).toLocaleString() : 'Hivi punde';
            const item = `
                <div class="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-amber-400">${log.username}</span> (${log.role}) akaingia mfomoni
                    </div>
                    <span class="text-[10px] text-slate-500">${time}</span>
                </div>
            `;
            logsContainer.innerHTML += item;
        });
    });
}
