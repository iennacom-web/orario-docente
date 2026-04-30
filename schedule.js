export const DAYS = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
export const MORNING_HOURS = [8,9,10,11,12,13,14];
export const FULL_DAY_HOURS = [8,9,10,11,12,13,14,15,16,17,18];

const STORAGE_KEY = 'docente_orario_v3';
const TEACHER_KEY = 'docente_nome_v3';
const CONFIG_KEY = 'docente_config_v3';

export function getDefaultConfig(){
  return {
    configured: false,
    pomeridiano: false,
    hours: MORNING_HOURS
  };
}

function normalizeHours(hours){
  if (!Array.isArray(hours)) return MORNING_HOURS;
  const cleaned = [...new Set(hours.map(Number))]
    .filter(h => Number.isInteger(h) && h >= 6 && h <= 20)
    .sort((a,b) => a-b);
  return cleaned.length ? cleaned : MORNING_HOURS;
}

function getConfig(){
  try{
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return getDefaultConfig();
    const parsed = JSON.parse(raw);
    const pomeridiano = !!parsed.pomeridiano;
    return {
      configured: !!parsed.configured,
      pomeridiano,
      hours: normalizeHours(parsed.hours || (pomeridiano ? FULL_DAY_HOURS : MORNING_HOURS))
    };
  }catch(e){
    return getDefaultConfig();
  }
}

function setConfig(config){
  const pomeridiano = !!config.pomeridiano;
  const hours = normalizeHours(config.hours || (pomeridiano ? FULL_DAY_HOURS : MORNING_HOURS));
  localStorage.setItem(CONFIG_KEY, JSON.stringify({configured:true, pomeridiano, hours}));
}

function emptySchedule(hours = getConfig().hours){
  const s = {};
  for (const day of DAYS){
    s[day] = {};
    for (const h of hours) s[day][h] = null;
  }
  return s;
}

function normalizeSchedule(parsed, hours = getConfig().hours){
  const base = emptySchedule(hours);
  if (!parsed || typeof parsed !== 'object') return base;

  for (const day of DAYS){
    if (!parsed[day] || typeof parsed[day] !== 'object') continue;
    for (const h of hours){
      const value = parsed[day][h] ?? parsed[day][String(h)] ?? null;
      base[day][h] = typeof value === 'string' && value.trim() ? value.trim() : null;
    }
  }
  return base;
}

function closestHour(h, hours = getConfig().hours){
  for (let i = hours.length - 1; i >= 0; i--){
    if (hours[i] <= h) return hours[i];
  }
  return hours[0];
}

const scheduleStore = {
  getConfig,
  setConfig,
  isConfigured(){
    return getConfig().configured;
  },
  getHours(){
    return getConfig().hours;
  },
  get(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptySchedule();
      return normalizeSchedule(JSON.parse(raw));
    }catch(e){
      return emptySchedule();
    }
  },
  set(obj){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSchedule(obj)));
  },
  resetSchedule(){
    localStorage.removeItem(STORAGE_KEY);
  },
  resetAll(){
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TEACHER_KEY);
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem('alertsEnabled');
  },
  loadFromJSON(txt){
    const parsed = JSON.parse(txt);
    const config = parsed.config || null;
    if (config){
      this.setConfig({
        pomeridiano: !!config.pomeridiano,
        hours: config.hours || config.ore || (config.pomeridiano ? FULL_DAY_HOURS : MORNING_HOURS)
      });
    }
    const schedule = parsed.orario || parsed.schedule || parsed;
    this.set(schedule);
    if (parsed.docente || parsed.teacher) this.setTeacher(parsed.docente || parsed.teacher);
  },
  exportObject(){
    const config = this.getConfig();
    return {
      docente: this.getTeacher(),
      esportatoIl: new Date().toISOString(),
      config: {
        pomeridiano: config.pomeridiano,
        hours: config.hours
      },
      orario: this.get()
    };
  },
  getTeacher(){
    return localStorage.getItem(TEACHER_KEY) || '';
  },
  setTeacher(name){
    localStorage.setItem(TEACHER_KEY, (name || '').trim());
  },
  nowSlot(date = new Date()){
    const dow = date.getDay();
    const dayIndex = dow === 0 ? -1 : dow - 1;
    const dayName = (dayIndex >= 0 && dayIndex < DAYS.length) ? DAYS[dayIndex] : null;
    const hours = this.getHours();
    const hour = date.getHours();
    return {dayName, hour: closestHour(hour, hours)};
  },
  getLesson(dayName, hour){
    if (!dayName) return null;
    const s = this.get();
    return s[dayName] && s[dayName][hour] ? s[dayName][hour] : null;
  },
  findNextLessonNotification(fromDate = new Date(), minutesBefore = 5){
    const schedule = this.get();
    const hours = this.getHours();
    const start = new Date(fromDate.getTime() + 1000);

    for (let offset = 0; offset < 14; offset++){
      const d = new Date(start);
      d.setDate(start.getDate() + offset);
      const dow = d.getDay();
      if (dow === 0) continue;
      const dayIndex = dow - 1;
      if (dayIndex < 0 || dayIndex >= DAYS.length) continue;
      const dayName = DAYS[dayIndex];

      for (const hour of hours){
        const lesson = schedule[dayName]?.[hour];
        if (!lesson) continue;
        const lessonStart = new Date(d);
        lessonStart.setHours(hour, 0, 0, 0);
        const notifyAt = new Date(lessonStart.getTime() - minutesBefore * 60 * 1000);
        if (notifyAt > fromDate){
          return {notifyAt, lessonStart, dayName, hour, lesson};
        }
      }
    }
    return null;
  }
};

function pad(n){ return n.toString().padStart(2,'0'); }
export function formatNow(d){
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export { scheduleStore };
