const WD_JP = ["日", "月", "火", "水", "木", "金", "土"];
const PRESET_VALUES = ["7:00-16:00", "9:00-18:00", "13:00-22:00", "休", "有"];

const authGate = document.getElementById('authGate');
const adminMain = document.getElementById('adminMain');
const userInfo = document.getElementById('userInfo');
const headerControls = document.getElementById('headerControls');
const loginBtn = document.getElementById('loginBtn');

const memberList = document.getElementById('memberList');
const newMemberName = document.getElementById('newMemberName');
const addMemberBtn = document.getElementById('addMemberBtn');
const saveMembersBtn = document.getElementById('saveMembersBtn');

const monthSelect = document.getElementById('monthSelect');
const newMonthToggleBtn = document.getElementById('newMonthToggleBtn');
const deleteMonthBtn = document.getElementById('deleteMonthBtn');
const newMonthForm = document.getElementById('newMonthForm');
const newYear = document.getElementById('newYear');
const newMonth = document.getElementById('newMonth');
const copyPrevCheck = document.getElementById('copyPrevCheck');
const createMonthBtn = document.getElementById('createMonthBtn');
const cancelNewMonthBtn = document.getElementById('cancelNewMonthBtn');
const shiftGrid = document.getElementById('shiftGrid');
const saveMonthBtn = document.getElementById('saveMonthBtn');
const toast = document.getElementById('toast');

let SHIFT_DATA = { members: [], months: {} };
let currentMonthKey = null;
let gridRows = [];               // member names shown as rows in the grid
let gridDates = [];              // date strings (YYYY-MM-DD) for the current month
let cellValues = {};             // { name: { dateStr: time } }

function pad2(n) { return String(n).padStart(2, '0'); }
function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }

function showToast(msg, isError) {
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => { toast.className = 'toast'; }, 2600);
}

// ---------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------
function updateAuthUI(user) {
  headerControls.innerHTML = '';
  if (user) {
    userInfo.textContent = `ログイン中: ${user.email}`;
    const btn = document.createElement('button');
    btn.className = 'ghost';
    btn.textContent = 'ログアウト';
    btn.onclick = () => netlifyIdentity.logout();
    headerControls.appendChild(btn);
    authGate.classList.add('hidden');
    adminMain.style.display = 'block';
  } else {
    userInfo.textContent = '未ログイン';
    authGate.classList.remove('hidden');
    adminMain.style.display = 'none';
  }
}

async function apiFetch(url, options = {}) {
  const user = netlifyIdentity.currentUser();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (user) {
    const token = await user.jwt();
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, Object.assign({}, options, { headers }));
}

// ---------------------------------------------------------------------
// data loading
// ---------------------------------------------------------------------
async function loadData() {
  const res = await fetch('/.netlify/functions/get-data', { cache: 'no-store' });
  SHIFT_DATA = await res.json();
}

function renderMemberList() {
  memberList.innerHTML = '';
  SHIFT_DATA.members.forEach((name) => {
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `<input type="text" value="${escapeAttr(name)}"><button class="danger" type="button">削除</button>`;
    row.querySelector('button').onclick = () => row.remove();
    memberList.appendChild(row);
  });
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function currentMemberNamesFromPanel() {
  return Array.from(memberList.querySelectorAll('input[type="text"]'))
    .map((i) => i.value.trim())
    .filter((v) => v.length > 0);
}

addMemberBtn.addEventListener('click', () => {
  const name = newMemberName.value.trim();
  if (!name) return;
  const row = document.createElement('div');
  row.className = 'member-row';
  row.innerHTML = `<input type="text" value="${escapeAttr(name)}"><button class="danger" type="button">削除</button>`;
  row.querySelector('button').onclick = () => row.remove();
  memberList.appendChild(row);
  newMemberName.value = '';
});

saveMembersBtn.addEventListener('click', async () => {
  const members = currentMemberNamesFromPanel();
  try {
    const res = await apiFetch('/.netlify/functions/save-members', {
      method: 'POST',
      body: JSON.stringify({ members }),
    });
    if (!res.ok) throw new Error(await res.text());
    SHIFT_DATA.members = members;
    showToast('メンバー構成を保存しました');
  } catch (e) {
    showToast('保存に失敗しました: ' + e.message, true);
  }
});

// ---------------------------------------------------------------------
// month select / grid
// ---------------------------------------------------------------------
function buildMonthOptions(selectKey) {
  const keys = Object.keys(SHIFT_DATA.months).sort();
  monthSelect.innerHTML = '';
  keys.forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = SHIFT_DATA.months[k].label || k;
    monthSelect.appendChild(opt);
  });
  if (selectKey && keys.includes(selectKey)) {
    monthSelect.value = selectKey;
  } else if (keys.length) {
    monthSelect.value = keys[keys.length - 1];
  }
  return keys;
}

function loadMonthIntoGrid(key) {
  currentMonthKey = key;
  const month = SHIFT_DATA.months[key];
  gridDates = [];
  cellValues = {};
  const rowSet = [];

  if (month) {
    gridDates = Object.keys(month.shifts).sort();
    gridDates.forEach((dateStr) => {
      (month.shifts[dateStr] || []).forEach((entry) => {
        if (!rowSet.includes(entry.name)) rowSet.push(entry.name);
        if (!cellValues[entry.name]) cellValues[entry.name] = {};
        cellValues[entry.name][dateStr] = entry.time;
      });
    });
  }
  // make sure every current roster member has a row, even with no data yet
  SHIFT_DATA.members.forEach((name) => {
    if (!rowSet.includes(name)) rowSet.push(name);
    if (!cellValues[name]) cellValues[name] = {};
  });
  gridRows = rowSet;
  renderGrid();
}

function renderGrid() {
  shiftGrid.innerHTML = '';
  if (!currentMonthKey || gridDates.length === 0) {
    shiftGrid.innerHTML = '<tr><td style="padding:20px;color:var(--muted);">月を選択するか、新しい月を追加してください</td></tr>';
    return;
  }
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  const nameTh = document.createElement('th');
  nameTh.className = 'name-col';
  nameTh.textContent = '氏名';
  trh.appendChild(nameTh);
  gridDates.forEach((dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const wd = new Date(y, m - 1, d).getDay();
    const th = document.createElement('th');
    if (wd === 6) th.className = 'sat';
    if (wd === 0) th.className = 'sun';
    th.innerHTML = `${d}<br>${WD_JP[wd]}`;
    trh.appendChild(th);
  });
  const actionTh = document.createElement('th');
  actionTh.textContent = '';
  trh.appendChild(actionTh);
  thead.appendChild(trh);
  shiftGrid.appendChild(thead);

  const tbody = document.createElement('tbody');
  gridRows.forEach((name) => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.className = 'name-cell';
    nameTd.textContent = name;
    tr.appendChild(nameTd);

    gridDates.forEach((dateStr) => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.className = 'cell-input';
      input.setAttribute('list', 'presets');
      input.value = (cellValues[name] && cellValues[name][dateStr]) || '';
      input.addEventListener('change', () => {
        if (!cellValues[name]) cellValues[name] = {};
        cellValues[name][dateStr] = input.value.trim();
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    const actionTd = document.createElement('td');
    const rmBtn = document.createElement('button');
    rmBtn.className = 'danger';
    rmBtn.type = 'button';
    rmBtn.textContent = 'この月から除外';
    rmBtn.onclick = () => {
      gridRows = gridRows.filter((n) => n !== name);
      delete cellValues[name];
      renderGrid();
    };
    actionTd.appendChild(rmBtn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
  shiftGrid.appendChild(tbody);
}

monthSelect.addEventListener('change', () => loadMonthIntoGrid(monthSelect.value));

newMonthToggleBtn.addEventListener('click', () => {
  const now = new Date();
  newYear.value = now.getFullYear();
  newMonth.value = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2; // default: next month
  if (now.getMonth() + 2 > 12) newYear.value = now.getFullYear() + 1;
  newMonthForm.classList.toggle('open');
});
cancelNewMonthBtn.addEventListener('click', () => newMonthForm.classList.remove('open'));

createMonthBtn.addEventListener('click', () => {
  const y = parseInt(newYear.value, 10);
  const m = parseInt(newMonth.value, 10);
  if (!y || !m || m < 1 || m > 12) {
    showToast('年・月を正しく入力してください', true);
    return;
  }
  const key = `${y}-${pad2(m)}`;
  if (SHIFT_DATA.months[key]) {
    showToast('その月はすでに存在します。一覧から選択してください', true);
    monthSelect.value = key;
    loadMonthIntoGrid(key);
    newMonthForm.classList.remove('open');
    return;
  }

  const dim = daysInMonth(y, m);
  const dates = [];
  for (let d = 1; d <= dim; d++) dates.push(`${y}-${pad2(m)}-${pad2(d)}`);

  const rows = SHIFT_DATA.members.slice();
  const values = {};
  rows.forEach((n) => { values[n] = {}; });

  if (copyPrevCheck.checked) {
    const existingKeys = Object.keys(SHIFT_DATA.months).sort();
    const sourceKey = existingKeys.length ? existingKeys[existingKeys.length - 1] : null;
    if (sourceKey) {
      const sourceMonth = SHIFT_DATA.months[sourceKey];
      const sourceDates = Object.keys(sourceMonth.shifts).sort();
      if (sourceDates.length) {
        // build per-member array of values in day order from the source month
        const sourcePattern = {};
        sourceDates.forEach((ds, i) => {
          (sourceMonth.shifts[ds] || []).forEach((entry) => {
            if (!sourcePattern[entry.name]) sourcePattern[entry.name] = [];
            sourcePattern[entry.name][i] = entry.time;
          });
        });
        rows.forEach((name) => {
          const pat = sourcePattern[name];
          if (!pat || pat.length === 0) return;
          dates.forEach((ds, i) => {
            values[name][ds] = pat[i % pat.length] || '';
          });
        });
      }
    }
  }

  SHIFT_DATA.months[key] = { label: `${y}年${m}月`, note: '', shifts: {} };
  gridRows = rows;
  gridDates = dates;
  cellValues = values;
  currentMonthKey = key;

  buildMonthOptions(key);
  renderGrid();
  newMonthForm.classList.remove('open');
  showToast('下書きを作成しました。内容を確認して保存してください');
});

deleteMonthBtn.addEventListener('click', async () => {
  if (!currentMonthKey) return;
  if (!confirm(`${SHIFT_DATA.months[currentMonthKey]?.label || currentMonthKey} を削除します。よろしいですか？`)) return;
  try {
    const res = await apiFetch('/.netlify/functions/delete-month', {
      method: 'POST',
      body: JSON.stringify({ key: currentMonthKey }),
    });
    if (!res.ok) throw new Error(await res.text());
    delete SHIFT_DATA.months[currentMonthKey];
    const keys = buildMonthOptions();
    if (keys.length) {
      loadMonthIntoGrid(monthSelect.value);
    } else {
      currentMonthKey = null;
      gridRows = [];
      gridDates = [];
      renderGrid();
    }
    showToast('削除しました');
  } catch (e) {
    showToast('削除に失敗しました: ' + e.message, true);
  }
});

saveMonthBtn.addEventListener('click', async () => {
  if (!currentMonthKey) {
    showToast('月を選択または作成してください', true);
    return;
  }
  const shifts = {};
  gridDates.forEach((dateStr) => {
    shifts[dateStr] = gridRows
      .map((name) => ({ name, time: (cellValues[name] && cellValues[name][dateStr]) || '' }))
      .filter((entry) => entry.time.length > 0);
  });

  const [y, m] = currentMonthKey.split('-').map(Number);
  const label = `${y}年${m}月`;

  try {
    const res = await apiFetch('/.netlify/functions/save-month', {
      method: 'POST',
      body: JSON.stringify({ key: currentMonthKey, label, note: '', shifts }),
    });
    if (!res.ok) throw new Error(await res.text());
    SHIFT_DATA.months[currentMonthKey] = { label, note: '', shifts };
    buildMonthOptions(currentMonthKey);
    showToast('保存しました');
  } catch (e) {
    showToast('保存に失敗しました: ' + e.message, true);
  }
});

// ---------------------------------------------------------------------
// bootstrap
// ---------------------------------------------------------------------
loginBtn.addEventListener('click', () => netlifyIdentity.open('login'));

netlifyIdentity.on('init', async (user) => {
  updateAuthUI(user);
  if (user) {
    await loadData();
    renderMemberList();
    const keys = buildMonthOptions();
    if (keys.length) loadMonthIntoGrid(monthSelect.value);
  }
});
netlifyIdentity.on('login', async (user) => {
  updateAuthUI(user);
  netlifyIdentity.close();
  await loadData();
  renderMemberList();
  const keys = buildMonthOptions();
  if (keys.length) loadMonthIntoGrid(monthSelect.value);
});
netlifyIdentity.on('logout', () => updateAuthUI(null));

netlifyIdentity.init();
