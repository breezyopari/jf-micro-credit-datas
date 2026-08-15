/* UTENDAJI NA MAWASILIANO YA MFUMO WOTE (SHARED LOGIC) */

let registeredUsers = JSON.parse(localStorage.getItem('jf_registered_users')) || [];
let clients = JSON.parse(localStorage.getItem('jf_clients')) || [];
let loans = JSON.parse(localStorage.getItem('jf_loans')) || [];
let repayments = JSON.parse(localStorage.getItem('jf_repayments')) || [];
let systemLogs = JSON.parse(localStorage.getItem('jf_system_logs')) || [];

let currentUser = null;
let selectedFilesBase64 = [];
let chartInstance = null;
const defaultAvatar = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

function saveData() {
    localStorage.setItem('jf_registered_users', JSON.stringify(registeredUsers));
    localStorage.setItem('jf_clients', JSON.stringify(clients));
    localStorage.setItem('jf_loans', JSON.stringify(loans));
    localStorage.setItem('jf_repayments', JSON.stringify(repayments));
    localStorage.setItem('jf_system_logs', JSON.stringify(systemLogs));
}

function addLog(action, user) {
    const log = {
        id: 'LOG-' + Date.now(),
        user: user || (currentUser ? currentUser.username : 'System'),
        action: action,
        timestamp: new Date().toLocaleString()
    };
    systemLogs.unshift(log);
    saveData();
}

/* AUTHENTICATION CONTROL */
function showAuth(type) {
    document.getElementById('authModal').classList.remove('hidden');
    document.getElementById('userLoginForm').classList.toggle('hidden', type !== 'login');
    document.getElementById('userRegisterForm').classList.toggle('hidden', type !== 'register');
}

function hideAuth() {
    document.getElementById('authModal').classList.add('hidden');
}

function handleUserRegister(e) {
    e.preventDefault();
    const fullname = document.getElementById('regFullName').value;
    const username = document.getElementById('regUser').value;
    const password = document.getElementById('regPass').value;

    if (registeredUsers.some(u => u.username === username)) {
        alert('Username hii tayari ipo!');
        return;
    }

    registeredUsers.push({ fullname, username, password, role: 'user', avatar: defaultAvatar });
    addLog(`Afisa mpya amejisajili: ${username}`, username);
    saveData();
    alert('Akaunti imetengenezwa! Subiri au ingia.');
    showAuth('login');
}

function handleUserLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    const found = registeredUsers.find(u => u.username === username && u.password === password);
    if (!found) {
        alert('Username au Password sio sahihi!');
        return;
    }
    currentUser = found;
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
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('appLayout').classList.remove('hidden');

    document.getElementById('welcomeUserHeading').innerText = `Habari, ${currentUser.fullname || currentUser.username}!`;
    document.getElementById('topBarUser').innerText = currentUser.username;
    document.getElementById('topBarAvatar').src = currentUser.avatar || defaultAvatar;

    document.getElementById('profileFullName').innerText = currentUser.fullname || currentUser.username;
    document.getElementById('profileRoleBadge').innerText = currentUser.role.toUpperCase();
    document.getElementById('profileImagePreview').src = currentUser.avatar || defaultAvatar;

    switchTab('dashboard');
    renderAll();
}

function logout() {
    currentUser = null;
    document.getElementById('appLayout').classList.add('hidden');
    document.getElementById('homePage').classList.remove('hidden');
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
}

/* DATA OPERATIONS */
function validateFiles(input) {
    const files = input.files;
    const badge = document.getElementById('fileCountBadge');
    selectedFilesBase64 = [];

    if (files.length < 4) {
        badge.className = "text-[11px] font-bold text-rose-600";
        badge.innerText = `Kurasa: ${files.length} / 4 MINIMUM (Inahitajika 4+)`;
        return;
    }

    badge.className = "text-[11px] font-bold text-emerald-600";
    badge.innerText = `Kurasa: ${files.length} / 4 OK!`;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) { selectedFilesBase64.push(e.target.result); };
        reader.readAsDataURL(file);
    });
}

function saveClient(e) {
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
        documents: selectedFilesBase64
    };

    clients.push(newClient);
    addLog(`Mteja mpya amesajiliwa: ${newClient.name} (${newClient.id})`);
    saveData();
    document.getElementById('clientForm').reset();
    selectedFilesBase64 = [];
    renderAll();
    alert('Mteja amesajiliwa kikamilifu!');
}

function submitLoan(e) {
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
        amount: amount,
        totalPayable: totalPayable,
        balance: totalPayable,
        status: 'PENDING',
        date: new Date().toISOString().split('T')[0]
    };

    loans.push(newLoan);
    addLog(`Ombi jipya la mkopo limewasilishwa: ${newLoan.id} - TZS ${amount}`);
    saveData();
    document.getElementById('loanForm').reset();
    renderAll();
    alert('Ombi la mkopo limewasilishwa! Subiri Approval ya Admin.');
}

function submitRepayment(e) {
    e.preventDefault();
    const loanId = document.getElementById('rLoanSelect').value;
    const amount = parseFloat(document.getElementById('rAmount').value);
    const ref = document.getElementById('rRef').value;

    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    loan.balance -= amount;
    if (loan.balance <= 0) {
        loan.balance = 0;
        loan.status = 'COMPLETED';
    }

    repayments.push({
        id: 'R-' + (repayments.length + 1),
        clientName: loan.clientName,
        amount: amount,
        ref: ref,
        date: new Date().toISOString().split('T')[0]
    });

    addLog(`Rejesho limerekodiwa: TZS ${amount} kwa Mkopo ${loan.id}`);
    saveData();
    document.getElementById('repayForm').reset();
    renderAll();
    alert('Rejesho limerekodiwa kikamilifu!');
}

/* ADMIN ACTIONS */
function approveLoan(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
        loan.status = 'APPROVED';
        addLog(`Mkopo ${loan.id} WAMETHIBITISHWA na Admin`, 'admin');
        saveData();
        renderAdminView();
    }
}

function rejectLoan(loanId) {
    const loan = loans.find(l => l.id === loanId);
    if (loan) {
        loan.status = 'REJECTED';
        addLog(`Mkopo ${loan.id} UMEKATALOWA na Admin`, 'admin');
        saveData();
        renderAdminView();
    }
}

function removeOfficer(username) {
    if (confirm(`Unahakika unataka kumuondoa afisa ${username}?`)) {
        registeredUsers = registeredUsers.filter(u => u.username !== username);
        addLog(`Afisa ${username} ameondolewa kwenye mfumo`, 'admin');
        saveData();
        renderAdminView();
    }
}

/* RENDERING VIEWS */
function renderAll() {
    const approved = loans.filter(l => l.status === 'APPROVED' || l.status === 'COMPLETED');
    
    document.getElementById('statWateja').innerText = clients.length;
    document.getElementById('statDisbursed').innerText = 'TZS ' + approved.reduce((s, l) => s + l.amount, 0).toLocaleString();
    document.getElementById('statCollected').innerText = 'TZS ' + repayments.reduce((s, r) => s + r.amount, 0).toLocaleString();
    document.getElementById('statOutstanding').innerText = 'TZS ' + approved.reduce((s, l) => s + l.balance, 0).toLocaleString();

    document.getElementById('clientTableBody').innerHTML = clients.map(c => `
        <tr class="hover:bg-slate-50">
            <td class="p-2 font-bold">${c.id}</td>
            <td class="p-2">${c.name}</td>
            <td class="p-2">${c.phone}</td>
        </tr>
    `).join('');

    document.getElementById('lClientSelect').innerHTML = clients.map(c => `<option value="${c.id}">${c.name} (${c.id})</option>`).join('');
    document.getElementById('rLoanSelect').innerHTML = loans.filter(l => l.status === 'APPROVED').map(l => `<option value="${l.id}">${l.clientName} (TZS ${l.balance.toLocaleString()})</option>`).join('');

    document.getElementById('loanTableBody').innerHTML = loans.map(l => `
        <tr class="hover:bg-slate-50">
            <td class="p-2 font-bold">${l.clientName}</td>
            <td class="p-2">TZS ${l.amount.toLocaleString()}</td>
            <td class="p-2 font-bold ${l.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'}">${l.status}</td>
        </tr>
    `).join('');

    document.getElementById('repayTableBody').innerHTML = repayments.map(r => `
        <tr class="hover:bg-slate-50">
            <td class="p-2 text-slate-500">${r.date}</td>
            <td class="p-2 font-bold">${r.clientName}</td>
            <td class="p-2 text-emerald-600 font-bold">TZS ${r.amount.toLocaleString()}</td>
        </tr>
    `).join('');
}

function renderAdminView() {
    const approved = loans.filter(l => l.status === 'APPROVED' || l.status === 'COMPLETED');
    const totalDisbursed = approved.reduce((s, l) => s + l.amount, 0);
    const totalCollected = repayments.reduce((s, r) => s + r.amount, 0);
    const totalOutstanding = approved.reduce((s, l) => s + l.balance, 0);
    const totalProfit = approved.reduce((s, l) => s + (l.totalPayable - l.amount), 0);

    document.getElementById('admOut').innerText = 'TZS ' + totalOutstanding.toLocaleString();
    document.getElementById('admProf').innerText = 'TZS ' + totalProfit.toLocaleString();
    document.getElementById('admCol').innerText = 'TZS ' + totalCollected.toLocaleString();

    // Audit logs
    document.getElementById('adminAuditLogs').innerHTML = systemLogs.map(log => `
        <div class="p-2 bg-slate-900 border border-slate-700/60 rounded-xl text-[11px] flex justify-between items-center">
            <div>
                <span class="text-amber-400 font-bold">[${log.user}]</span>
                <span class="text-slate-200 ml-1">${log.action}</span>
            </div>
            <span class="text-[9px] text-slate-500">${log.timestamp}</span>
        </div>
    `).join('');

    // Pending Loans Approval
    const pending = loans.filter(l => l.status === 'PENDING');
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

    // Officers List
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

    // User Forms
    document.getElementById('adminUserFormsGrid').innerHTML = clients.map(c => `
        <div class="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex justify-between items-center">
            <div>
                <h5 class="font-bold text-white text-xs">${c.name}</h5>
                <p class="text-[10px] text-slate-400">NIDA: ${c.nida} | Simu: ${c.phone}</p>
            </div>
            <button onclick="viewDocs('${c.id}')" class="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl">Fomu (${c.documents ? c.documents.length : 0})</button>
        </div>
    `).join('');
}

function viewDocs(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.documents) return;

    document.getElementById('modalClientTitle').innerText = `Fomu za Mteja: ${client.name}`;
    document.getElementById('modalDocGrid').innerHTML = client.documents.map((doc, idx) => `
        <div class="border border-slate-700 rounded-xl p-2 bg-slate-950 space-y-1">
            <span class="text-[10px] font-bold text-slate-400">Ukurasa ${idx + 1}</span>
            <img src="${doc}" class="w-full h-auto rounded-lg">
        </div>
    `).join('');

    document.getElementById('docModal').classList.remove('hidden');
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
