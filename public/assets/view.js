const monthSelect = document.getElementById('monthSelect');
const dayList = document.getElementById('dayList');
const monthNote = document.getElementById('monthNote');
const footerText = document.getElementById('footerText');
const todayBtn = document.getElementById('todayBtn');

const WD_JP = ["日", "月", "火", "水", "木", "金", "土"];

let SHIFT_DATA = { members: [], months: {} };

function pad2(n) { return String(n).padStart(2, '0'); }
function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}
function todayMonthKey() {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`;
}

async function loadData() {
  const res = await fetch('/.netlify/functions/get-data', { cache: 'no-store' });
  if (!res.ok) {
    dayList.innerHTML = '<div class="empty">データの読み込みに失敗しました。しばらくしてから再度お試しください。</div>';
    throw new Error('failed to load data');
  }
  SHIFT_DATA = await res.json();
}

function buildMonthOptions() {
  const monthKeys = Object.keys(SHIFT_DATA.months).sort();
  monthSelect.innerHTML = '';
  monthKeys.forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = SHIFT_DATA.months[k].label || k;
    monthSelect.appendChild(opt);
  });
  return monthKeys;
}

function renderMonth(key) {
  const month = SHIFT_DATA.months[key];
  dayList.innerHTML = '';
  if (!month) {
    dayList.innerHTML = '<div class="empty">データがありません</div>';
    monthNote.textContent = '';
    footerText.textContent = '';
    return;
  }
  monthNote.textContent = month.note || '';
  const dates = Object.keys(month.shifts).sort();
  const tStr = todayStr();

  dates.forEach((dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const wdIdx = new Date(y, m - 1, d).getDay();
    const card = document.createElement('div');
    card.className = 'day-card';
    card.id = 'day-' + dateStr;
    const isToday = dateStr === tStr;
    if (isToday) card.classList.add('today');

    const head = document.createElement('div');
    head.className = 'day-head';
    let wdClass = '';
    if (wdIdx === 6) wdClass = 'sat';
    if (wdIdx === 0) wdClass = 'sun';
    head.innerHTML = `
      <span class="date-num">${m}/${d}</span>
      <span class="wd ${wdClass}">${WD_JP[wdIdx]}</span>
      ${isToday ? '<span class="today-tag">今日</span>' : ''}
    `;
    card.appendChild(head);

    const people = document.createElement('div');
    people.className = 'people';
    (month.shifts[dateStr] || []).forEach((p) => {
      const row = document.createElement('div');
      row.className = 'person-row';
      let timeClass = '';
      if (p.time === '休') timeClass = 'off';
      else if (p.time === '有') timeClass = 'leave';
      const label = p.time === '休' ? '休み' : (p.time === '有' ? '有給休暇' : p.time);
      row.innerHTML = `
        <span class="person-name"></span>
        <span class="person-time ${timeClass}"></span>
      `;
      row.querySelector('.person-name').textContent = p.name;
      row.querySelector('.person-time').textContent = label;
      people.appendChild(row);
    });
    card.appendChild(people);
    dayList.appendChild(card);
  });

  footerText.textContent = '最終更新: ' + new Date().toLocaleDateString('ja-JP');

  if (key === todayMonthKey()) {
    setTimeout(() => {
      const el = document.getElementById('day-' + tStr);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    }, 30);
  }
}

monthSelect.addEventListener('change', () => renderMonth(monthSelect.value));
todayBtn.addEventListener('click', () => {
  const monthKeys = Object.keys(SHIFT_DATA.months);
  if (monthKeys.includes(todayMonthKey())) {
    monthSelect.value = todayMonthKey();
    renderMonth(todayMonthKey());
  } else {
    const el = document.getElementById('day-' + todayStr());
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

(async function init() {
  dayList.innerHTML = '<div class="empty">読み込み中…</div>';
  await loadData();
  const monthKeys = buildMonthOptions();
  if (monthKeys.length === 0) {
    dayList.innerHTML = '<div class="empty">まだシフトが登録されていません</div>';
    return;
  }
  const initial = monthKeys.includes(todayMonthKey()) ? todayMonthKey() : monthKeys[monthKeys.length - 1];
  monthSelect.value = initial;
  renderMonth(initial);
})();
