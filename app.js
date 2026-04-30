import { scheduleStore, formatNow, DAYS, MORNING_HOURS, FULL_DAY_HOURS } from './schedule.js';

const ALERT_MINUTES_BEFORE = 5;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

const nowTimeEl = document.getElementById('nowTime');
const nowLessonEl = document.getElementById('nowLesson');
const teacherDisplayEl = document.getElementById('teacherDisplay');
const configDisplayEl = document.getElementById('configDisplay');
const dayStatusEl = document.getElementById('dayStatus');
const timetableEl = document.getElementById('timetable');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const fileInput = document.getElementById('scheduleFile');
const editBtn = document.getElementById('editBtn');
const settingsBtn = document.getElementById('settingsBtn');
const editor = document.getElementById('editor');
const editorGrid = document.getElementById('editorGrid');
const closeEditor = document.getElementById('closeEditor');
const saveSchedule = document.getElementById('saveSchedule');
const cancelEdit = document.getElementById('cancelEdit');
const alertsToggle = document.getElementById('alertsToggle');
const showAllDaysBtn = document.getElementById('showAllDays');
const showTodayBtn = document.getElementById('showToday');
const setupModal = document.getElementById('setupModal');
const setupTeacher = document.getElementById('setupTeacher');
const saveSetup = document.getElementById('saveSetup');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const cancelSettings = document.getElementById('cancelSettings');
const saveSettings = document.getElementById('saveSettings');
const teacherNameInput = document.getElementById('teacherName');
const onboardingHint = document.getElementById('onboardingHint');

let nextTimer = null;
let todayOnly = false;

init();

function init(){
  if (scheduleStore.isConfigured()) setupModal.classList.add('hidden');
  else setupModal.classList.remove('hidden');

  restoreAlertPreference();
  renderAll();
  setInterval(tick, 30_000);

  saveSetup.onclick = saveInitialSetup;
  settingsBtn.onclick = openSettings;
  closeSettings.onclick = closeSettingsFunc;
  cancelSettings.onclick = closeSettingsFunc;
  saveSettings.onclick = saveSettingsFunc;

  resetBtn.onclick = () => {
    if (!confirm('Vuoi cancellare orario, nome docente e impostazioni da questo dispositivo?')) return;
    scheduleStore.resetAll();
    alertsToggle.checked = false;
    cancelNextNotification();
    setupModal.classList.remove('hidden');
    renderAll();
  };

  exportBtn.onclick = exportSchedule;
  fileInput.onchange = importSchedule;
  editBtn.onclick = openEditor;
  closeEditor.onclick = closeEditorFunc;
  cancelEdit.onclick = closeEditorFunc;
  saveSchedule.onclick = saveEditor;

  showAllDaysBtn.onclick = () => {
    todayOnly = false;
    showAllDaysBtn.classList.add('active');
    showTodayBtn.classList.remove('active');
    renderTimetable();
  };

  showTodayBtn.onclick = () => {
    todayOnly = true;
    showTodayBtn.classList.add('active');
    showAllDaysBtn.classList.remove('active');
    renderTimetable();
  };

  alertsToggle.onchange = async () => {
    localStorage.setItem('alertsEnabled', alertsToggle.checked ? '1':'0');
    if (alertsToggle.checked) {
      const p = await requestNotificationPermission();
      if (p !== 'granted') {
        alert('Permesso notifiche negato. Su iPhone le notifiche web possono richiedere installazione sulla schermata Home.');
        alertsToggle.checked = false;
        localStorage.setItem('alertsEnabled', '0');
        cancelNextNotification();
        return;
      }
      scheduleNextNotification();
    } else {
      cancelNextNotification();
    }
  };
}

function saveInitialSetup(){
  const mode = document.querySelector('input[name="setupMode"]:checked')?.value || 'morning';
  const pomeridiano = mode === 'full';
  scheduleStore.setTeacher(setupTeacher.value);
  scheduleStore.setConfig({
    pomeridiano,
    hours: pomeridiano ? FULL_DAY_HOURS : MORNING_HOURS
  });
  setupModal.classList.add('hidden');
  renderAll();
}

function openSettings(){
  const config = scheduleStore.getConfig();
  teacherNameInput.value = scheduleStore.getTeacher();
  const selected = config.pomeridiano ? 'full' : 'morning';
  document.querySelectorAll('input[name="settingsMode"]').forEach(r => r.checked = r.value === selected);
  settingsModal.classList.remove('hidden');
}

function saveSettingsFunc(){
  const mode = document.querySelector('input[name="settingsMode"]:checked')?.value || 'morning';
  const pomeridiano = mode === 'full';
  scheduleStore.setTeacher(teacherNameInput.value);
  scheduleStore.setConfig({
    pomeridiano,
    hours: pomeridiano ? FULL_DAY_HOURS : MORNING_HOURS
  });
  closeSettingsFunc();
  renderAll();
  if (alertsToggle.checked) scheduleNextNotification();
}

function closeSettingsFunc(){
  settingsModal.classList.add('hidden');
}

function renderAll(){
  renderTeacherAndConfig();
  renderTimetable();
  tick();
}

async function importSchedule(e){
  const f = e.target.files[0];
  if (!f) return;
  try {
    const txt = await f.text();
    scheduleStore.loadFromJSON(txt);
    setupModal.classList.add('hidden');
    renderAll();
    if (alertsToggle.checked) scheduleNextNotification();
    alert('Orario importato correttamente.');
  } catch(err){
    alert('File JSON non valido o non compatibile.');
  } finally {
    fileInput.value = '';
  }
}

function exportSchedule(){
  const data = JSON.stringify(scheduleStore.exportObject(), null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const teacher = scheduleStore.getTeacher() || 'docente';
  const safeName = teacher.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'docente';
  const a = document.createElement('a');
  a.href = url;
  a.download = `orario-${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function saveEditor(){
  const hours = scheduleStore.getHours();
  const newSched = {};
  for (const day of DAYS) {
    newSched[day] = {};
    for (const h of hours) {
      const id = inputId(day, h);
      const val = document.getElementById(id).value.trim();
      newSched[day][h] = val || null;
    }
  }
  scheduleStore.set(newSched);
  closeEditorFunc();
  renderAll();
  if (alertsToggle.checked) scheduleNextNotification();
}

function renderTeacherAndConfig(){
  const name = scheduleStore.getTeacher();
  const config = scheduleStore.getConfig();
  teacherDisplayEl.textContent = name ? `Docente: ${name}` : 'Docente non impostato';
  configDisplayEl.textContent = config.pomeridiano ? 'Mattina + pomeriggio' : 'Solo mattina fino alla 7ª ora';
  onboardingHint.classList.toggle('hidden', scheduleStore.isConfigured() && !!name);
}

function renderTimetable(){
  timetableEl.innerHTML = '';
  const sched = scheduleStore.get();
  const hours = scheduleStore.getHours();
  const nowSlot = scheduleStore.nowSlot(new Date());

  for (const day of DAYS) {
    const isToday = nowSlot.dayName === day;
    if (todayOnly && !isToday) continue;

    const col = document.createElement('div');
    col.className = 'dayCol';
    if (isToday) col.classList.add('today');

    const title = document.createElement('div');
    title.className = 'dayTitle';
    title.innerHTML = `<span>${day}</span>${isToday ? '<span class="dayBadge">Oggi</span>' : ''}`;
    col.appendChild(title);

    for (const h of hours) {
      const rawText = sched[day] && sched[day][h] ? sched[day][h] : null;
      const text = rawText || 'Libero';
      const slot = document.createElement('div');
      slot.className = rawText ? 'slot' : 'slot free';
      slot.innerHTML = `<span class="slotHour">${h}:00</span><span class="slotText">${escapeHTML(text)}</span>`;
      if (isNowSlot(day, h)) slot.classList.add('now');
      col.appendChild(slot);
    }
    timetableEl.appendChild(col);
  }
}

function renderGrid(){
  editorGrid.innerHTML = '';
  const sched = scheduleStore.get();
  const hours = scheduleStore.getHours();
  for (const day of DAYS){
    const dayBlock = document.createElement('section');
    dayBlock.className = 'editorDay';
    const h3 = document.createElement('h3');
    h3.textContent = day;
    dayBlock.appendChild(h3);

    for (const h of hours){
      const row = document.createElement('label');
      row.className = 'editorRow';
      const span = document.createElement('span');
      span.textContent = `${h}:00`;
      const input = document.createElement('input');
      input.id = inputId(day, h);
      input.placeholder = 'Classe - Materia (Aula)';
      input.value = (sched[day] && sched[day][h]) || '';
      row.appendChild(span);
      row.appendChild(input);
      dayBlock.appendChild(row);
    }
    editorGrid.appendChild(dayBlock);
  }
}

function openEditor(){
  if (!scheduleStore.isConfigured()) setupModal.classList.remove('hidden');
  renderGrid();
  editor.classList.remove('hidden');
}

function closeEditorFunc(){
  editor.classList.add('hidden');
}

function tick(){
  const now = new Date();
  nowTimeEl.textContent = formatNow(now);
  const {dayName, hour} = scheduleStore.nowSlot(now);
  const lesson = scheduleStore.getLesson(dayName, hour);
  dayStatusEl.textContent = dayName || 'Fuori settimana';
  nowLessonEl.textContent = lesson ? `${hour}:00 — ${lesson}` : 'Nessuna lezione in questo orario';
  renderTimetable();
}

function isNowSlot(dayName, hour){
  const s = scheduleStore.nowSlot(new Date());
  return s.dayName === dayName && s.hour === hour;
}

async function requestNotificationPermission(){
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
}

function restoreAlertPreference(){
  const pref = localStorage.getItem('alertsEnabled') === '1';
  alertsToggle.checked = pref;
  if (pref) scheduleNextNotification();
}

function scheduleNextNotification(){
  cancelNextNotification();
  const next = scheduleStore.findNextLessonNotification(new Date(), ALERT_MINUTES_BEFORE);
  if (!next) return;

  const delay = Math.max(1000, next.notifyAt.getTime() - Date.now());
  nextTimer = setTimeout(async () => {
    await showLessonNotification(next);
    scheduleNextNotification();
  }, delay);
}

function cancelNextNotification(){
  if (!nextTimer) return;
  clearTimeout(nextTimer);
  nextTimer = null;
}

async function showLessonNotification(item){
  const title = `Tra ${ALERT_MINUTES_BEFORE} minuti: ${item.hour}:00`;
  const body = item.lesson;

  if (navigator.serviceWorker) {
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        tag:`slot-${item.dayName}-${item.hour}`,
        renotify:true
      });
      return;
    } catch(e) {}
  }
  if (Notification.permission === 'granted') new Notification(title, {body});
}

function inputId(day, h){
  return `cell-${day.replace(/[^a-z0-9]/gi, '')}-${h}`;
}

function escapeHTML(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}
