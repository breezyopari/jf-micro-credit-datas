/* FIREBASE CONFIGURATION & INITIALIZATION */
const firebaseConfig = {
  apiKey: "AIzaSyAJaNc_Ah5KDEAzch4VvqRoY4pqcGIBvaA",
  authDomain: "jf-micro-credit-datas.firebaseapp.com",
  projectId: "jf-micro-credit-datas",
  storageBucket: "jf-micro-credit-datas.firebasestorage.app",
  messagingSenderId: "755353254789",
  appId: "1:755353254789:web:250d36fb89df00c532a2ec",
  measurementId: "G-8H452QVR50"
};

// Anzisha Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* UTENDAJI NA DATA VARIABLES */
let registeredUsers = [];
let clients = [];
let loans = [];
let repayments = [];
let systemLogs = [];

let currentUser = null;
let selectedFilesBase64 = [];
let chartInstance = null;
const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

/* REAL-TIME LISTENERS KUTOKA FIREBASE */
function listenToFirestore() {
    db.collection('users').onSnapshot(snapshot => {
        registeredUsers = snapshot.docs.map(doc => doc.data());
        renderAll();
    });
    db.collection('clients').onSnapshot(snapshot => {
        clients = snapshot.docs.map(doc => doc.data());
        renderAll();
    });
    db.collection('loans').onSnapshot(snapshot => {
        loans = snapshot.docs.map(doc => doc.data());
        renderAll();
    });
    db.collection('repayments').onSnapshot(snapshot => {
        repayments = snapshot.docs.map(doc => doc.data());
        renderAll();
    });
    db.collection('logs').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
        systemLogs = snapshot.docs.map(doc => doc.data());
        if (sessionStorage.getItem('jf_admin_active') === 'true') {
            renderAdminView();
        }
    });
}
listenToFirestore();

function addLog(action, user) {
    const log = {
        id: 'LOG-' + Date.now(),
        user: user || (currentUser ? currentUser.username : 'System'),
        action: action,
        timestamp: new Date().toLocaleString()
    };
    db.collection('logs').doc(log.id).set(log);
}

/* AUTHENTICATION CONTROL */
function showAuth(type) {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('hidden');
    
    const loginForm = document.getElementById('userLoginForm');
    if (loginForm) loginForm.classList.toggle('hidden', type !== 'login');
    
    const regForm = document.getElementById('userRegisterForm');
    if (regForm) regForm.classList.toggle('hidden', type !== 'register');
}

function hideAuth() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
}

async function handleUserRegister(e) {
    e.preventDefault();
    const fullname = document.getElementById('regFullName').value;
    const username = document.getElementById('regUser').value;
    const password = document.getElementById('regPass').value;

    if (registeredUsers.some(u => u.username === username)) {
        alert('Username hii tayari ipo!');
        return;
    }

    const newUser = { 
        fullname, 
        username, 
        password, 
        role: 'user', 
        avatar: defaultAvatar,
        registeredAt: new Date().toISOString()
    };

    // Hifadhi Taarifa za User mpya kwenye Firebase Firestore
    await db.collection('users').doc(username).set(newUser);
    addLog(`Afisa mpya amejisajili: ${username}`, username);
    alert('Akaunti imetengenezwa kikamilifu! Unaweza kuingia sasa.');
    showAuth('login');
}

async function handleUserLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    const found = registeredUsers.find(u => u.username === username && u.password === password);
    if (!found) {
        alert('Username au Password sio sahihi!');
        return;
    }
    currentUser = found;

    // Rekodi Login Sessions kwenye Firebase Logs
    await db.collection('user_sessions').add({
        username: currentUser.username,
        loginTime: new Date().toISOString()
    });

    addLog(`Afisa ameingia kwenye mfumo`, currentUser.username);
    startSession();
}

function handleAdminLogin(e) {
    e.preventDefault();
    const u = document.getElementById('adminUser').value;
    const p = document.getElementById('adminPass').value;

    if (u === 'admin' && p === 'admin123') {
        sessionStorage.setItem('jf_admin_active', 'true');
        addLog(`Admin ameingia kwenye Admin Panel`, 'admin');
        document.getElementById('adminAuthLayout').classList.add('hidden');
        document.getElementById('adminMainLayout').classList.remove('hidden');
        renderAdminView();
    } else {
        alert('Credentials za Admin si sahihi!');
    }
}

function adminLogout() {
    sessionStorage.removeItem('jf_admin_active');
    window.location.reload();
}

function startSession() {
    hideAuth();
    const home = document.getElementById('homePage');
    if (home) home.classList.add('hidden');
    
    const layout = document.getElementById('appLayout');
    if (layout) layout.classList.remove('hidden');

    if(document.getElementById('welcomeUserHeading')) document.getElementById('welcomeUserHeading').innerText = `Habari, ${currentUser.fullname || currentUser.username}!`;
    if(document.getElementById('topBarUser')) document.getElementById('topBarUser').innerText = currentUser.username;
    if(document.getElementById('topBarAvatar')) document.getElementById('topBarAvatar').src = currentUser.avatar || defaultAvatar;

    switchTab('dashboard');
    renderAll();
}

function logout() {
    currentUser = null;
    const layout = document.getElementById('appLayout');
    if (layout) layout.classList.add('hidden');
    
    const home = document.getElementById('homePage');
    if (home) home.classList.remove('hidden');
}

/* NAVIGATION ENGINE */
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('bottom-nav-active'));

    const activeContent = document.getElementById(`tab-${tabId}`);
    if(activeContent) activeContent.classList.remove('hidden');
    
    const activeNav = document.getElementById(`nav-${tabId}`);
    if(activeNav) activeNav.classList.add('bottom-nav-active');

    if (tabId === 'dashboard') renderChart();
}

function switchAdminTab(tabId) {
    document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('bottom-nav-active'));

    const activeContent = document.getElementById(`admin-tab-${tabId}`);
    if(activeContent) activeContent.classList.remove('hidden');
    
    const activeNav = document.getElementById(`admin-nav-${tabId}`);
    if(activeNav) activeNav.classList.add('bottom-nav-active');

    if (tabId === 'forms') {
        renderAdminLoansTable();
    } else if (tabId === 'overview') {
        renderAdminView();
    }
}

/* DATA OPERATIONS */
function validateFiles(input) {
    const files = input.files;
    const badge = document.getElementById('fileCountBadge');
    selectedFilesBase64 = [];

    if (files.length < 4) {
        if(badge) {
            badge.className = "text-[11px] font-bold text-rose-600";
            badge.innerText = `Kurasa: ${files.length} / 4 MINIMUM (Inahitajika 4+)`;
        }
        return;
    }

    if(badge) {
        badge.className = "text-[11px] font-bold text-emerald-600";
        badge.innerText = `Kurasa: ${files.length} / 4 OK!`;
    }

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) { selectedFilesBase64.push(e.target.result); };
        reader.readAsDataURL(file);
    });
}

async function saveClient(e) {
    e.preventDefault();
    if (selectedFilesBase64.length < 4) {
        alert('Tafadhali upload angalau kurasa 4 za fomu!');
        return;
    }

    const newClient = {
        id: 'C-' + Math.floor(100 + Math.random() * 900),
        name: document.getElementById('cName').value,
        phone: document.getElementById('cPhone').value,
        nida: document.getElementById('cNida').value,
        address: document.getElementById('cAddress').value,
        guarantor: document.getElementById('cGuarantor').value,
        officer: currentUser ? currentUser.username : 'Admin',
        documents: selectedFilesBase64
    };

    await db.collection('clients').doc(newClient.id).set(newClient);
    addLog(`Mteja mpya amesajiliwa: ${newClient.name} (${newClient.id})`);
    document.getElementById('clientForm').reset();
    selectedFilesBase64 = [];
    alert('Mteja amesajiliwa kikamilifu!');
}

async function submitLoan(e) {
    e.preventDefault();
    const clientId = document.getElementById('lClientSelect').value;
    const client = clients.find(c => c.id === clientId);
    const amount = parseFloat(document.getElementById('lAmount').value);
    const interest = parseFloat(document.getElementById('lInterest').value);
    const totalPayable = amount + (amount * (interest / 100));

    const newLoan = {
        id: 'L-' + Math.floor(1000 + Math.random() * 9000),
        clientId: clientId,
        clientName: client ? client.name : 'Unknown',
        phone: client ? client.phone : '-',
        officer: currentUser ? currentUser.username : 'Admin',
        amount: amount,
        totalPayable: totalPayable,
        balance: totalPayable,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0]
    };

    await db.collection('loans').doc(newLoan.id).set(newLoan);
    addLog(`Ombi jipya la mkopo limewasilishwa: ${newLoan.id} - TZS ${amount}`);
    document.getElementById('loanForm').reset();
    alert('Ombi la mkopo limewasilishwa! Subiri Approval ya Admin.');
}

async function submitRepayment(e) {
    e.preventDefault();
    const loanId = document.getElementById('rLoanSelect').value;
    const amount = parseFloat(document.getElementById('rAmount').value);
    const ref = document.getElementById('rRef').value;

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    let newBalance = loan.balance - amount;
    let newStatus = loan.status;
    if (newBalance <= 0) {
        newBalance = 0;
        newStatus = 'COMPLETED';
    }

    await db.collection('loans').doc(loan.id).update({ balance: newBalance, status: newStatus });

    const newRepayment = {
        id: 'R-' + (repayments.length + 1),
        loanId: loan.id,
        clientName: loan.clientName,
        amount: amount,
        ref: ref,
        date: new Date().toISOString().split('T')[0]
    };

    await db.collection('repayments').doc(newRepayment.id).set(newRepayment);
    addLog(`Rejesho limerekodiwa: TZS ${amount} kwa Mkopo ${loan.id}`);
    document.getElementById('repayForm').reset();
    alert('Rejesho limerekodiwa kikamilifu!');
}

/* SEARCH & FILTER LOGIC KWA AFISA */
function filterClientOptions(searchInputId, selectElementId, type) {
    const query = document.getElementById(searchInputId).value.toLowerCase();
    const select = document.getElementById(selectElementId);
    
    if (type === 'clients') {
        const filtered = clients.filter(c => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query) || c.phone.includes(query));
        select.innerHTML = filtered.map(c => `<option value="${c.id}">${c.name} (${c.id}) - ${c.phone}</option>`).join('');
    } else if (type === 'loans') {
        const approvedLoans = loans.filter(l => l.status === 'APPROVED');
        const filtered = approvedLoans.filter(l => l.clientName.toLowerCase().includes(query) || l.id.toLowerCase().includes(query));
        select.innerHTML = filtered.map(l => `<option value="${l.id}">${l.clientName} (Deni: TZS ${l.balance.toLocaleString()})</option>`).join('');
    }
}

/* ADMIN ACTIONS */
async function approveLoan(loanId) {
    await db.collection('loans').doc(loanId).update({ status: 'APPROVED' });
    addLog(`Mkopo ${loanId} WAMETHIBITISHWA na Admin`, 'admin');
}

async function rejectLoan(loanId) {
    await db.collection('loans').doc(loanId).update({ status: 'REJECTED' });
    addLog(`Mkopo ${loanId} UMEKATALOWA na Admin`, 'admin');
}

async function removeOfficer(username) {
    if (confirm(`Unahakika unataka kumuondoa afisa ${username}?`)) {
        await db.collection('users').doc(username).delete();
        addLog(`Afisa ${username} ameondolewa kwenye mfumo`, 'admin');
    }
}

/* RENDERING VIEWS */
function renderAll() {
    const approved = loans.filter(l => l.status === 'APPROVED' || l.status === 'COMPLETED');
    
    if(document.getElementById('statWateja')) document.getElementById('statWateja').innerText = clients.length;
    if(document.getElementById('statDisbursed')) document.getElementById('statDisbursed').innerText = 'TZS ' + approved.reduce((s, l) => s + l.amount, 0).toLocaleString();
    if(document.getElementById('statCollected')) document.getElementById('statCollected').innerText = 'TZS ' + repayments.reduce((s, r) => s + r.amount, 0).toLocaleString();
    if(document.getElementById('statOutstanding')) document.getElementById('statOutstanding').innerText = 'TZS ' + approved.reduce((s, l) => s + l.balance, 0).toLocaleString();

    if(document.getElementById('clientTableBody')) {
        document.getElementById('clientTableBody').innerHTML = clients.map(c => `
            <tr class="hover:bg-slate-50">
                <td class="p-2 font-bold">${c.id}</td>
                <td class="p-2">${c.name}</td>
                <td class="p-2">${c.phone}</td>
            </tr>
        `).join('');
    }

    if(document.getElementById('lClientSelect')) {
        document.getElementById('lClientSelect').innerHTML = clients.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join('');
    }
    if(document.getElementById('rLoanSelect')) {
        document.getElementById('rLoanSelect').innerHTML = loans.filter(l => l.status === 'APPROVED').map(l => `<option value="${l.id}">${l.clientName} (TZS ${l.balance.toLocaleString()})</option>`).join('');
    }

    if(document.getElementById('loanTableBody')) {
        document.getElementById('loanTableBody').innerHTML = loans.map(l => `
            <tr class="hover:bg-slate-50">
                <td class="p-2 font-bold">${l.clientName}</td>
                <td class="p-2">TZS ${l.amount.toLocaleString()}</td>
                <td class="p-2 font-bold ${l.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'}">${l.status}</td>
            </tr>
        `).join('');
    }

    if(document.getElementById('repayTableBody')) {
        document.getElementById('repayTableBody').innerHTML = repayments.map(r => `
            <tr class="hover:bg-slate-50">
                <td class="p-2 text-slate-500">${r.date}</td>
                <td class="p-2 font-bold">${r.clientName}</td>
                <td class="p-2 text-emerald-600 font-bold">TZS ${r.amount.toLocaleString()}</td>
            </tr>
        `).join('');
    }

    renderChart();
}

function renderAdminLoansTable() {
    const adminLoansTable = document.getElementById('adminLoansTable');
    if (!adminLoansTable) return;

    if (loans.length === 0) {
        adminLoansTable.innerHTML = `
            <tr>
                <td colspan="7" class="p-4 text-center text-slate-500 italic">
                    Hakuna taarifa za mikopo zilizopatikana.
                </td>
            </tr>`;
        return;
    }

    adminLoansTable.innerHTML = loans.map(loan => {
        const client = clients.find(c => c.id === loan.clientId || c.name === loan.clientName);
        const phone = loan.phone || (client ? client.phone : '-');
        const officer = loan.officer || 'Admin';

        return `
            <tr class="hover:bg-slate-800/40 border-b border-slate-700/50">
                <td class="p-2 font-mono text-amber-400 font-bold">${loan.id || 'N/A'}</td>
                <td class="p-2 font-bold text-white">${loan.clientName || 'Mteja'}</td>
                <td class="p-2 text-slate-300">${phone}</td>
                <td class="p-2 font-bold text-amber-400">TZS ${Number(loan.amount || 0).toLocaleString()}</td>
                <td class="p-2 text-slate-400">${officer}</td>
                <td class="p-2">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        loan.status === 'APPROVED' || loan.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        loan.status === 'REJECTED' || loan.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }">
                        ${loan.status || 'PENDING'}
                    </span>
                </td>
                <td class="p-2 text-right">
                    <button onclick="viewClientDocs('${loan.clientId || loan.id}')" class="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-[11px] font-bold hover:bg-amber-500 hover:text-slate-950 transition">
                        <i class="fa-solid fa-file-lines mr-1"></i> View Form
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewClientDocs(identifier) {
    let client = clients.find(c => c.id === identifier);
    if (!client) {
        const loan = loans.find(l => l.id === identifier);
        if (loan) {
            client = clients.find(c => c.id === loan.clientId || c.name === loan.clientName);
        }
    }

    if (!client || !client.documents || client.documents.length === 0) {
        alert('Hakuna fomu/nyaraka zilizopatikana kwa mteja huyu.');
        return;
    }

    document.getElementById('modalClientTitle').innerText = `Fomu za Mteja: ${client.name}`;
    document.getElementById('modalDocGrid').innerHTML = client.documents.map((doc, idx) => `
        <div class="border border-slate-700 rounded-xl p-2 bg-slate-950 space-y-1">
            <span class="text-[10px] font-bold text-slate-400">Ukurasa ${idx + 1}</span>
            <img src="${doc}" class="w-full h-auto rounded-lg">
        </div>
    `).join('');

    document.getElementById('docModal').classList.remove('hidden');
}

function renderAdminView() {
    const approved = loans.filter(l => l.status === 'APPROVED' || l.status === 'COMPLETED');
    const totalCollected = repayments.reduce((s, r) => s + r.amount, 0);
    const totalOutstanding = approved.reduce((s, l) => s + l.balance, 0);
    const totalProfit = approved.reduce((s, l) => s + (l.totalPayable - l.amount), 0);

    if(document.getElementById('admOut')) document.getElementById('admOut').innerText = 'TZS ' + totalOutstanding.toLocaleString();
    if(document.getElementById('admProf')) document.getElementById('admProf').innerText = 'TZS ' + totalProfit.toLocaleString();
    if(document.getElementById('admCol')) document.getElementById('admCol').innerText = 'TZS ' + totalCollected.toLocaleString();

    if(document.getElementById('adminAuditLogs')) {
        document.getElementById('adminAuditLogs').innerHTML = systemLogs.map(log => `
            <div class="p-2 bg-slate-900 border border-slate-700/60 rounded-xl text-[11px] flex justify-between items-center">
                <div>
                    <span class="text-amber-400 font-bold">[${log.user}]</span>
                    <span class="text-slate-200 ml-1">${log.action}</span>
                </div>
                <span class="text-[9px] text-slate-500">${log.timestamp}</span>
            </div>
        `).join('');
    }

    const pending = loans.filter(l => l.status === 'PENDING');
    if(document.getElementById('adminApprovalTable')) {
        document.getElementById('adminApprovalTable').innerHTML = pending.length === 0 ? 
            `<tr><td colspan="4" class="p-3 text-center text-slate-500">Hakuna maombi ya mikopo yanayosubiri.</td></tr>` :
            pending.map(l => `
                <tr>
                    <td class="p-2 font-bold text-amber-400">${l.id}</td>
                    <td class="p-2 text-white">${l.clientName}</td>
                    <td class="p-2 font-bold">TZS ${l.amount.toLocaleString()}</td>
                    <td class="p-2 flex gap-1">
                        <button onclick="approveLoan('${l.id}')" class="px-2 py-1 bg-emerald-500 text-slate-950 font-bold rounded">Kukubali</button>
                        <button onclick="rejectLoan('${l.id}')" class="px-2 py-1 bg-rose-600 text-white font-bold rounded">Kukataa</button>
                    </td>
                </tr>
            `).join('');
    }

    if(document.getElementById('adminOfficersTable')) {
        document.getElementById('adminOfficersTable').innerHTML = registeredUsers.map(u => `
            <tr>
                <td class="p-2 text-white font-semibold">${u.fullname || u.username}</td>
                <td class="p-2 text-slate-400">${u.username}</td>
                <td class="p-2"><span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">${u.role}</span></td>
                <td class="p-2">
                    <button onclick="removeOfficer('${u.username}')" class="px-2 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition rounded font-bold">Ondoa</button>
                </td>
            </tr>
        `).join('');
    }

    renderAdminLoansTable();
}

function closeDocModal() {
    document.getElementById('docModal').classList.add('hidden');
}

function renderChart() {
    const canvas = document.getElementById('financeChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    const approved = loans.filter(l => l.status === 'APPROVED' || l.status === 'COMPLETED');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mikopo', 'Marejesho', 'Nje'],
            datasets: [{
                data: [
                    approved.reduce((s, l) => s + l.amount, 0),
                    repayments.reduce((s, r) => s + r.amount, 0),
                    approved.reduce((s, l) => s + l.balance, 0)
                ],
                backgroundColor: ['#2563eb', '#10b981', '#f59e0b'],
                borderRadius: 6
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
