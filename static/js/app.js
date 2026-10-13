// CPU Scheduling Simulator (client-side only)
// ------------------------------------------------------------
// Implements:
//   • Tab navigation (clickable steps)
//   • Algorithm selection
//   • Process input (pid, burst, optional priority)
//   • Space‑bar stepping through the schedule (adds a row per press)
//   • Finish & Reload button (returns to first step)
// ------------------------------------------------------------

// --- State ---------------------------------------------------
const steps = ["selectAlgo", "inputProcesses", "runSimulation", "showResults"];
let currentStep = 0;
let selectedAlgo = null; // "FCFS", "SJF", "Priority", "Round Robin"
let processes = [];
let schedule = [];

// --- Helper to create elements --------------------------------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.appendChild(
    typeof c === "string" ? document.createTextNode(c) : c
  );
  return node;
}

// --- Render tabs ------------------------------------------------
function renderTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', +t.dataset.step === currentStep);
  });
}

// --- Main view switcher ----------------------------------------
function showStep() {
  const container = document.getElementById('content');
  container.innerHTML = '';
  renderTabs();
  switch (steps[currentStep]) {
    case 'selectAlgo': renderAlgoSelection(container); break;
    case 'inputProcesses': renderProcessForm(container); break;
    case 'runSimulation': renderRun(container); break;
    case 'showResults': renderResults(container); break;
  }
}

// --- Step 0: Algorithm selection -------------------------------
function renderAlgoSelection(root) {
  const title = el('h2', {}, 'Select Scheduling Algorithm');
  const list = el('ul');
  const algos = ['FCFS', 'SJF', 'Priority', 'Round Robin'];
  algos.forEach(a => {
    const li = el('li', {style: 'cursor:pointer; margin:4px 0;'}, a);
    li.onclick = () => { selectedAlgo = a; nextStep(); };
    list.appendChild(li);
  });
  root.appendChild(title);
  root.appendChild(list);
}

// --- Step 1: Process input ------------------------------------
function renderProcessForm(root) {
  const title = el('h2', {}, 'Enter Processes (one per line)');
  const textarea = el('textarea', {rows:6, cols:50, placeholder: 'PID,BURST[,PRIORITY]'});
  const btn = el('button', {}, 'Save');
  btn.onclick = () => {
    const txt = textarea.value.trim();
    if (!txt) { alert('Please enter at least one process'); return; }
    processes = txt.split('\n').map(line => {
      const parts = line.split(',').map(p => p.trim());
      return {
        pid: parts[0] || `P${Math.random().toString(36).substr(2,4)}`,
        burst: +parts[1] || 0,
        priority: parts[2] ? +parts[2] : 0
      };
    }).filter(p => p.pid && p.burst > 0);
    nextStep();
  };
  root.appendChild(title);
  root.appendChild(textarea);
  root.appendChild(el('br'));
  root.appendChild(btn);
}

// --- Step 2: Run simulation (space‑bar) ----------------------
function renderRun(root) {
  const title = el('h2', {}, `Running ${selectedAlgo}`);
  const info = el('p', {}, 'Press the SPACEBAR to step through each process.');
  const table = el('table', {id:'schedTable', border:1},
    el('tr', {}, el('th', {}, 'Step'), el('th', {}, 'Process'))
  );
  root.appendChild(title);
  root.appendChild(info);
  root.appendChild(table);

  // Ensure we only have one handler
  document.body.onkeydown = e => {
    if (e.code === 'Space') {
      e.preventDefault();
      stepSimulation();
    }
  };
}

function stepSimulation() {
  if (!processes.length) return;
  // Simple schedulers – each press schedules the next process according to the chosen algorithm
  let proc;
  if (selectedAlgo === 'Round Robin') {
    const quantum = 2; // fixed for demo
    proc = processes[0];
    const exec = Math.min(proc.burst, quantum);
    schedule.push({step:schedule.length, pid:proc.pid, exec});
    proc.burst -= exec;
    if (proc.burst === 0) processes.shift();
  } else if (selectedAlgo === 'SJF') {
    processes.sort((a,b)=>a.burst-b.burst);
    proc = processes.shift();
    schedule.push({step:schedule.length, pid:proc.pid, exec:proc.burst});
  } else if (selectedAlgo === 'Priority') {
    processes.sort((a,b)=>a.priority-b.priority);
    proc = processes.shift();
    schedule.push({step:schedule.length, pid:proc.pid, exec:proc.burst});
  } else { // FCFS
    proc = processes.shift();
    schedule.push({step:schedule.length, pid:proc.pid, exec:proc.burst});
  }

  // Update UI table
  const tbl = document.getElementById('schedTable');
  const row = el('tr', {},
    el('td', {}, schedule.length-1),
    el('td', {}, schedule[schedule.length-1].pid)
  );
  tbl.appendChild(row);

  if (!processes.length) {
    // No more processes – move to results after a short pause
    document.body.onkeydown = null;
    setTimeout(() => nextStep(), 300);
  }
}

// --- Step 3: Results ------------------------------------------
function renderResults(root) {
  const title = el('h2', {}, 'Simulation Completed');
  const pre = el('pre', {}, JSON.stringify(schedule, null, 2));
  const finishBtn = document.getElementById('finishBtn');
  finishBtn.hidden = false;
  finishBtn.onclick = () => location.reload();
  root.appendChild(title);
  root.appendChild(pre);
}

function nextStep() {
  currentStep = Math.min(currentStep + 1, steps.length - 1);
  showStep();
}

// Initial render
showStep();
