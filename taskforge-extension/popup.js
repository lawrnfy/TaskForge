const $ = (q) => document.querySelector(q);
const $$ = (q) => document.querySelectorAll(q);
const fmt = (n) => n < 10 ? "0" + n : n;

async function send(msg) {
  return await chrome.runtime.sendMessage(msg);
}

let state = { tasks: [], settings: {}, stats: {}, pomodoro: {} };
let tickInterval = null;
let currentFilter = 'all';

// Enhanced state management
function updateState(newState) {
  state = { ...state, ...newState };
  renderAll();
}

function renderAll() {
  renderStats();
  renderTasks();
  renderTimer();
  renderSessionInfo();
  updateEmptyState();
}

function renderStats() {
  const credits = state.stats?.creditsThisMonth || 0;
  const toFree = Math.max(0, 100 - credits);
  const streak = state.stats?.streakDays || 0;
  
  $("#credits").textContent = credits;
  $("#toFree").textContent = toFree;
  $("#streak").textContent = streak + "d";
  
  // Add visual feedback for progress
  const progressPercent = (credits / 100) * 100;
  $("#credits").style.background = `linear-gradient(90deg, var(--accent) ${progressPercent}%, transparent ${progressPercent}%)`;
  $("#credits").style.webkitBackgroundClip = 'text';
  $("#credits").style.webkitTextFillColor = 'transparent';
}

function renderTasks() {
  const select = $("#taskSelect");
  const list = $("#taskList");
  
  // Clear and rebuild task select
  select.innerHTML = '<option value="">Choose a task...</option>';
  
  // Filter tasks based on current filter
  let filteredTasks = [...state.tasks];
  switch (currentFilter) {
    case 'high':
      filteredTasks = filteredTasks.filter(t => t.importance >= 4);
      break;
    case 'recent':
      filteredTasks = filteredTasks.slice(-5); // Last 5 tasks
      break;
  }
  
  // Add to select dropdown
  filteredTasks.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = `${t.title} (${t.effortMin}m, ${t.importance}★)`;
    select.appendChild(opt);
  });
  
  // Render task list
  list.innerHTML = '';
  filteredTasks.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task';
    li.dataset.taskId = t.id;
    
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
      <span>${t.title}</span>
      <span class="tag imp">${t.importance}★</span>
      <span class="tag min">${t.effortMin}m</span>
    `;
    
    const act = document.createElement('div');
    act.className = 'actions';
    
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start';
    startBtn.onclick = () => startFor(t.id, t.effortMin);
    
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => editTask(t.id);
    
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => delTask(t.id);
    
    act.append(startBtn, editBtn, delBtn);
    li.append(meta, act);
    list.appendChild(li);
  });
}

function renderTimer() {
  const p = state.pomodoro || {};
  const start = p.startAt || 0;
  const end = p.endAt || 0;
  const now = Date.now();
  
  let ms = Math.max(0, p.active ? 
    (p.paused ? (p.remainingMs || 0) : end - now) : 
    (state.settings?.workMin || 25) * 60000
  );
  
  const mm = Math.floor(ms / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  $("#time").textContent = `${fmt(mm)}:${fmt(ss)}`;
  
  // Update timer section styling based on state
  const timerSection = $("#timerSection");
  if (p.active) {
    timerSection.classList.add('active');
    if (p.paused) {
      timerSection.classList.add('paused');
      timerSection.classList.remove('running');
    } else {
      timerSection.classList.add('running');
      timerSection.classList.remove('paused');
    }
  } else {
    timerSection.classList.remove('active', 'running', 'paused');
  }
  
  // Toggle button visibility
  $("#start").style.display = p.active ? 'none' : 'inline-block';
  $("#pause").style.display = (p.active && !p.paused) ? 'inline-block' : 'none';
  $("#resume").style.display = (p.active && p.paused) ? 'inline-block' : 'none';
  $("#stop").style.display = p.active ? 'inline-block' : 'none';
}

function renderSessionInfo() {
  const p = state.pomodoro || {};
  const sessionInfo = $("#sessionInfo");
  const currentTaskName = $("#currentTaskName");
  const progressFill = $("#progressFill");
  
  if (p.active && p.taskId) {
    const task = state.tasks.find(t => t.id === p.taskId);
    if (task) {
      currentTaskName.textContent = task.title;
      sessionInfo.style.display = 'block';
      
      // Calculate progress
      const totalMs = p.endAt - p.startAt;
      const elapsedMs = p.paused ? (p.startAt + totalMs - p.remainingMs - p.startAt) : (Date.now() - p.startAt);
      const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
      progressFill.style.width = `${progress}%`;
    }
  } else {
    sessionInfo.style.display = 'none';
  }
}

function updateEmptyState() {
  const emptyState = $("#emptyState");
  const taskList = $("#taskList");
  
  if (state.tasks.length === 0) {
    emptyState.style.display = 'block';
    taskList.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    taskList.style.display = 'block';
  }
}

async function load() {
  try {
    state = await send({ type: 'GET_STATE' });
    renderAll();
    
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(renderTimer, 1000);
  } catch (error) {
    console.error('Failed to load state:', error);
  }
}

async function addTask() {
  const title = $("#tTitle").value.trim();
  if (!title) return;
  
  const importance = Number($("#tImportance").value || 3);
  const effortMin = Number($("#tEffort").value || 25);
  
  try {
    await send({ type: 'ADD_TASK', title, importance, effortMin });
    $("#tTitle").value = '';
    
    // Add success animation
    const addBtn = $("#addTask");
    addBtn.classList.add('success');
    setTimeout(() => addBtn.classList.remove('success'), 1000);
    
    await load();
  } catch (error) {
    console.error('Failed to add task:', error);
  }
}

async function delTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  
  try {
    await send({ type: 'DELETE_TASK', taskId: id });
    await load();
  } catch (error) {
    console.error('Failed to delete task:', error);
  }
}

async function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  
  // Simple inline editing for now
  const newTitle = prompt('Edit task title:', task.title);
  if (newTitle && newTitle.trim() !== task.title) {
    // This would need a new message type in background.js
    console.log('Edit functionality needs backend support');
  }
}

async function start() {
  try {
    await send({ type: 'START_POMODORO' });
    await load();
  } catch (error) {
    console.error('Failed to start pomodoro:', error);
  }
}

async function startFor(taskId, duration) {
  try {
    await send({ type: 'START_POMODORO', taskId, durationMin: duration });
    await load();
  } catch (error) {
    console.error('Failed to start pomodoro for task:', error);
  }
}

async function pause() {
  try {
    await send({ type: 'PAUSE_POMODORO' });
    await load();
  } catch (error) {
    console.error('Failed to pause pomodoro:', error);
  }
}

async function resume() {
  try {
    await send({ type: 'RESUME_POMODORO' });
    await load();
  } catch (error) {
    console.error('Failed to resume pomodoro:', error);
  }
}

async function stop() {
  if (!confirm('Are you sure you want to stop the current session? You won\'t earn credits.')) return;
  
  try {
    await send({ type: 'STOP_POMODORO' });
    await load();
  } catch (error) {
    console.error('Failed to stop pomodoro:', error);
  }
}

// Filter functionality
function setupFilters() {
  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Update active state
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      // Update filter
      currentFilter = e.target.dataset.filter;
      renderTasks();
    });
  });
}

// Event listeners
function setupEventListeners() {
  $("#addTask").addEventListener('click', addTask);
  $("#start").addEventListener('click', start);
  $("#startForTask").addEventListener('click', () => {
    const id = $("#taskSelect").value;
    const task = state.tasks.find(t => t.id === id);
    if (task) startFor(task.id, task.effortMin);
  });
  $("#pause").addEventListener('click', pause);
  $("#resume").addEventListener('click', resume);
  $("#stop").addEventListener('click', stop);
  
  $("#openOptions").addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  
  $("#openStats").addEventListener('click', (e) => {
    e.preventDefault();
    // TODO: Open stats page
    console.log('Stats page not implemented yet');
  });
  
  // Enter key support for adding tasks
  $("#tTitle").addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
  
  // Enter key support for effort input
  $("#tEffort").addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupFilters();
  load();
});
