/*
 TaskForge — Background (MV3 Service Worker)
 Data model (chrome.storage.local):
   tasks: Task[]
   settings: {
      accent: "blue"|"green"|"orange",
      workMin: number, breakMin: number,
      blockedSites: string[], // hostnames
      siteBlockEnabled: boolean,
      dailyEscalationCap: number // default 6
   }
   stats: {
      creditsThisMonth: number,
      streakDays: number,
      lastPomodoroDate: string, // YYYY-MM-DD
      lastCreditResetMonth: string // YYYY-MM
   }
   pomodoro: {
      active: boolean,
      taskId: string|null,
      startAt: number, // ms
      endAt: number,   // ms
      paused: boolean,
      pausedAt: number|null,
      remainingMs: number|null,
      hadPause: boolean
   }
   reminders: {
      [taskId: string]: { level: number, sentToday: number, nextAt: number|null }
   }
*/

const CREDIT_BASE = 1;
const CREDIT_GOAL = 100;
const MULTIPLIER = (importance=3) => {
  if (importance >= 5) return 2.0;
  if (importance >= 3) return 1.5;
  return 1.0;
};
const STREAK_BONUSES = { 5: 5, 10: 10, 30: 50 };
const ESCALATION_DELAYS_MIN = [0, 5, 15, 45];
const DAILY_ESCALATION_CAP = 6;

// Utility: storage helpers
const getAll = (keys) => new Promise(res => chrome.storage.local.get(keys, res));
const setAll = (obj) => new Promise(res => chrome.storage.local.set(obj, res));

// Init
chrome.runtime.onInstalled.addListener(async () => {
  const now = new Date();
  const monthStr = now.toISOString().slice(0,7);
  const init = await getAll(["tasks","settings","stats","pomodoro","reminders"]);
  if (!init.settings) {
    await setAll({ settings: {
      accent: "blue",
      workMin: 25,
      breakMin: 5,
      blockedSites: ["youtube.com","twitter.com","reddit.com"],
      siteBlockEnabled: true,
      dailyEscalationCap: DAILY_ESCALATION_CAP
    }});
  }
  if (!init.stats) {
    await setAll({ stats: {
      creditsThisMonth: 0,
      streakDays: 0,
      lastPomodoroDate: "",
      lastCreditResetMonth: monthStr
    }});
  }
  if (!init.tasks) await setAll({ tasks: [] });
  if (!init.pomodoro) await setAll({ pomodoro: {
    active: false, taskId: null, startAt: 0, endAt: 0, paused: false,
    pausedAt: null, remainingMs: null, hadPause: false
  }});
  if (!init.reminders) await setAll({ reminders: {} });

  // Badging tick (1/min) to keep time display fresh
  chrome.alarms.create("badge_tick", { periodInMinutes: 1 });
  // Daily reset (00:01 local)
  const nextMidnight = new Date();
  nextMidnight.setHours(24,1,0,0);
  chrome.alarms.create("daily_reset", { when: nextMidnight.getTime(), periodInMinutes: 1440 });
});

// Badge tick
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "badge_tick") return updateBadge();
  if (alarm.name === "daily_reset") return dailyReset();
  if (alarm.name.startsWith("reminder:")) return handleReminderAlarm(alarm.name.split(":")[1]);
  if (alarm.name === "pomodoro_end") return completePomodoro();
  if (alarm.name === "break_end") return endBreak();
});

async function dailyReset(){
  const { reminders, stats } = await getAll(["reminders","stats"]);
  // Reset per-day escalation counters
  for (const id in reminders||{}) reminders[id].sentToday = 0;
  // Monthly credit reset
  const now = new Date();
  const monthStr = now.toISOString().slice(0,7);
  if ((stats?.lastCreditResetMonth||"") !== monthStr) {
    stats.creditsThisMonth = 0;
    stats.lastCreditResetMonth = monthStr;
  }
  await setAll({ reminders, stats });
}

async function updateBadge(){
  const { pomodoro, settings } = await getAll(["pomodoro","settings"]);
  if (pomodoro?.active) {
    const now = Date.now();
    const ms = Math.max(0, (pomodoro.paused && pomodoro.remainingMs!=null) ? pomodoro.remainingMs : pomodoro.endAt - now);
    const minLeft = Math.ceil(ms/60000);
    chrome.action.setBadgeText({ text: String(minLeft) });
    chrome.action.setBadgeBackgroundColor({ color: settings?.accent === 'green' ? '#27E2A4' : settings?.accent === 'orange' ? '#FF8A3D' : '#3A9DF8' });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Reminder scheduling/escalation
async function scheduleNextReminder(task){
  const { reminders, settings } = await getAll(["reminders","settings"]);
  const r = reminders[task.id] || { level: 0, sentToday: 0, nextAt: null };
  if (r.sentToday >= (settings?.dailyEscalationCap||DAILY_ESCALATION_CAP)) return; // cap reached
  const delayMin = ESCALATION_DELAYS_MIN[Math.min(r.level, ESCALATION_DELAYS_MIN.length-1)];
  const when = Date.now() + delayMin*60000;
  r.nextAt = when;
  reminders[task.id] = r;
  await setAll({ reminders });
  chrome.alarms.create(`reminder:${task.id}`, { when });
}

async function handleReminderAlarm(taskId){
  const { tasks, reminders, settings } = await getAll(["tasks","reminders","settings"]);
  const task = (tasks||[]).find(t=>t.id===taskId);
  const r = reminders?.[taskId];
  if (!task || !r) return;
  // Send notification with CTA to start pomodoro
  if (r.sentToday < (settings?.dailyEscalationCap||DAILY_ESCALATION_CAP)){
    const notifId = `tf_${taskId}_${Date.now()}`;
    chrome.notifications.create(notifId, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Time to forge: " + task.title,
      message: `Est. ${task.effortMin}m • Importance ${task.importance}★`,
      priority: 2,
      requireInteraction: r.level >= 1,
      buttons: [{title: "Start Pomodoro"}, {title: "Snooze 15m"}]
    });
    r.level = Math.min(r.level+1, ESCALATION_DELAYS_MIN.length-1);
    r.sentToday += 1;
    await setAll({ reminders });
  }
}

chrome.notifications.onButtonClicked.addListener(async (notificationId, btnIdx)=>{
  if (!notificationId.startsWith("tf_")) return;
  const parts = notificationId.split("_");
  const taskId = parts[1];
  if (btnIdx === 0){
    startPomodoro({ taskId });
  } else if (btnIdx === 1){
    // Snooze 15m
    const { tasks } = await getAll(["tasks"]);
    const task = tasks.find(t=>t.id===taskId);
    if (task){
      chrome.alarms.create(`reminder:${task.id}`, { when: Date.now()+15*60000 });
    }
  }
});

// Tab gating during focus
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  maybeInjectBlocker(tabId, tab.url);
});
chrome.tabs.onActivated.addListener(async ({tabId})=>{
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) maybeInjectBlocker(tabId, tab.url);
});

async function maybeInjectBlocker(tabId, url){
  const { settings, pomodoro } = await getAll(["settings","pomodoro"]);
  if (!pomodoro?.active || !settings?.siteBlockEnabled) return;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./,'');
    if ((settings.blockedSites||[]).some(h => host.endsWith(h))){
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content_blocker.js"]
      });
    }
  } catch(e) {}
}

// Pomodoro lifecycle
async function startPomodoro({ taskId, durationMin }){
  const { settings, pomodoro, tasks } = await getAll(["settings","pomodoro","tasks"]);
  if (pomodoro?.active) return; // ignore if already active
  const task = (tasks||[]).find(t=>t.id===taskId) || null;
  const workMin = durationMin || settings?.workMin || 25;
  const startAt = Date.now();
  const endAt = startAt + workMin*60000;
  const next = { active: true, taskId: task?.id||null, startAt, endAt, paused: false, pausedAt: null, remainingMs: null, hadPause: false };
  await setAll({ pomodoro: next });
  chrome.alarms.create("pomodoro_end", { when: endAt });
  chrome.alarms.create("badge_tick", { periodInMinutes: 1 });
  // Notify + gate current tab
  chrome.notifications.create("pomodoro_started", {
    type: "basic", iconUrl: "icons/icon128.png", title: "Focus started",
    message: `Stay on task for ${workMin} minutes.`, priority: 1
  });
  // Gate all active tabs if needed
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) if (t.url) await maybeInjectBlocker(t.id, t.url);
  updateBadge();
}

async function pausePomodoro(){
  const { pomodoro } = await getAll(["pomodoro"]);
  if (!pomodoro?.active || pomodoro.paused) return;
  const remainingMs = Math.max(0, pomodoro.endAt - Date.now());
  pomodoro.paused = true; pomodoro.pausedAt = Date.now(); pomodoro.remainingMs = remainingMs; pomodoro.hadPause = true;
  await setAll({ pomodoro });
  chrome.alarms.clear("pomodoro_end");
  updateBadge();
}

async function resumePomodoro(){
  const { pomodoro } = await getAll(["pomodoro"]);
  if (!pomodoro?.active || !pomodoro.paused) return;
  const endAt = Date.now() + (pomodoro.remainingMs||0);
  pomodoro.paused = false; pomodoro.pausedAt = null; pomodoro.endAt = endAt;
  await setAll({ pomodoro });
  chrome.alarms.create("pomodoro_end", { when: endAt });
  updateBadge();
}

async function stopPomodoro(){
  const { pomodoro } = await getAll(["pomodoro"]);
  if (!pomodoro?.active) return;
  await setAll({ pomodoro: { active:false, taskId:null, startAt:0, endAt:0, paused:false, pausedAt:null, remainingMs:null, hadPause:false } });
  chrome.alarms.clear("pomodoro_end");
  // Remove blockers
  chrome.tabs.query({}, (tabs)=>{
    for (const t of tabs) chrome.tabs.sendMessage(t.id, { type: 'TF_UNBLOCK' });
  });
  updateBadge();
}

async function completePomodoro(){
  const { tasks, pomodoro, stats } = await getAll(["tasks","pomodoro","stats"]);
  if (!pomodoro?.active) return;
  const task = (tasks||[]).find(t=>t.id===pomodoro.taskId) || { importance:3, title:"Pomodoro" };
  const today = new Date().toISOString().slice(0,10);
  let addCredits = CREDIT_BASE * MULTIPLIER(task.importance);
  if (pomodoro.hadPause) addCredits *= 0.5; // pause penalty
  stats.creditsThisMonth = Math.floor(stats.creditsThisMonth + addCredits);
  // Streaks
  if (stats.lastPomodoroDate !== today) {
    const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
    if (stats.lastPomodoroDate === yesterday) stats.streakDays += 1; else stats.streakDays = 1;
    stats.lastPomodoroDate = today;
    if (STREAK_BONUSES[stats.streakDays]) stats.creditsThisMonth += STREAK_BONUSES[stats.streakDays];
  }
  await setAll({ stats });
  // Clear active pomodoro
  await stopPomodoro();
  chrome.notifications.create("pomodoro_done", {
    type: "basic", iconUrl: "icons/icon128.png", title: "Pomodoro complete",
    message: `+${Math.round(addCredits)} credits • Streak ${stats.streakDays} days`, priority: 2
  });
}

async function endBreak(){
  chrome.notifications.create("break_done", {
    type: "basic", iconUrl: "icons/icon128.png", title: "Break over",
    message: "Ready for the next focus?",
    priority: 0
  });
}

// Messaging API for popup/options
chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  (async ()=>{
    switch(msg.type){
      case 'GET_STATE': {
        const data = await getAll(["tasks","settings","stats","pomodoro","reminders"]);
        sendResponse(data); break;
      }
      case 'ADD_TASK': {
        const { tasks } = await getAll(["tasks"]);
        const id = crypto.randomUUID();
        const task = { id, title: msg.title, importance: Number(msg.importance)||3, effortMin: Number(msg.effortMin)||25, dueAt: msg.dueAt||null, notes: msg.notes||"" };
        tasks.push(task);
        await setAll({ tasks });
        await scheduleNextReminder(task);
        sendResponse({ ok:true, task }); break;
      }
      case 'DELETE_TASK': {
        let { tasks, reminders } = await getAll(["tasks","reminders"]);
        tasks = (tasks||[]).filter(t=>t.id!==msg.taskId);
        if (reminders[msg.taskId]) { delete reminders[msg.taskId]; chrome.alarms.clear(`reminder:${msg.taskId}`); }
        await setAll({ tasks, reminders });
        sendResponse({ ok:true }); break;
      }
      case 'START_POMODORO': await startPomodoro({ taskId: msg.taskId, durationMin: msg.durationMin }); sendResponse({ ok:true }); break;
      case 'PAUSE_POMODORO': await pausePomodoro(); sendResponse({ ok:true }); break;
      case 'RESUME_POMODORO': await resumePomodoro(); sendResponse({ ok:true }); break;
      case 'STOP_POMODORO': await stopPomodoro(); sendResponse({ ok:true }); break;
      case 'UPDATE_SETTINGS': {
        const { settings } = await getAll(["settings"]);
        Object.assign(settings, msg.settings||{});
        await setAll({ settings });
        sendResponse({ ok:true }); break;
      }
      case 'REQUEST_NOTIFICATION_PERMISSION': {
        // MV3: permissions are granted at install; Chrome may quiet. We just ping a test notif.
        chrome.notifications.create("tf_ready", { type:'basic', iconUrl:'icons/icon128.png', title:'TaskForge', message:'Notifications enabled', priority:0 });
        sendResponse({ ok:true }); break;
      }
      default: sendResponse({ ok:false });
    }
  })();
  return true; // async
});
