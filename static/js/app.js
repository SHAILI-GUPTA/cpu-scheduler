/**
 * CPU Scheduling Simulator & Visualizer Frontend Application
 * OS Lab 5 & 6 (FCFS, SJF, SRTN, Round Robin, Priority)
 * Multi-Step Wizard + Real-time Spacebar Process Scheduling + Pure Browser Execution Fallback
 */

// Color palette for processes
const PROCESS_COLORS = [
    '#6366f1', // Indigo
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#8b5cf6', // Violet
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#3b82f6', // Blue
    '#ef4444'  // Red
];

function getProcessColor(pid) {
    if (pid === 'IDLE') return '#334155';
    const num = parseInt(pid.replace(/\D/g, '')) || 1;
    return PROCESS_COLORS[(num - 1) % PROCESS_COLORS.length];
}

// Application State
const state = {
    currentStep: 1,
    algorithm: 'srtn',
    algorithmName: 'Shortest Remaining Time Next (SRTN)',
    preemptive: true,
    lowerIsHigher: true,
    timeQuantum: 2,
    processes: [
        { pid: 'P1', arrivalTime: 0, burstTime: 5, priority: 2 },
        { pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
        { pid: 'P3', arrivalTime: 2, burstTime: 8, priority: 3 },
        { pid: 'P4', arrivalTime: 3, burstTime: 2, priority: 2 }
    ],
    scheduleResult: null,
    // Step & Animation state
    isAnimating: false,
    isPaused: false,
    isStepScheduling: false,
    currentStepBlock: 0,
    animationSpeed: 1.0,
    timerId: null,
    maxTime: 0
};

// --- Finish & Reload Controller ---
function finishAndReload() {
    showToast('🏁 Finishing simulation... Reloading to Step 1!', 1500);
    setTimeout(() => {
        window.location.reload();
    }, 400);
}
window.finishAndReload = finishAndReload;

// --- Multi-Step Wizard Controller ---
function navigateToStep(stepNumber) {
    state.currentStep = stepNumber;

    // Toggle step views
    document.querySelectorAll('.step-view').forEach(view => view.classList.remove('active'));
    const targetView = document.getElementById(`viewStep${stepNumber}`);
    if (targetView) targetView.classList.add('active');

    // Update stepper indicators
    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`stepIndicator${i}`);
        if (!ind) continue;
        if (i === stepNumber) {
            ind.className = 'step-item active';
        } else if (i < stepNumber) {
            ind.className = 'step-item completed';
        } else {
            ind.className = 'step-item';
        }
    }

    const line1 = document.getElementById('stepLine1');
    const line2 = document.getElementById('stepLine2');
    if (line1) line1.className = stepNumber > 1 ? 'step-line active' : 'step-line';
    if (line2) line2.className = stepNumber > 2 ? 'step-line active' : 'step-line';

    // Context updates on step change
    if (stepNumber === 2) {
        updateStep2ContextUI();
        renderProcessInputs();
    } else if (stepNumber === 3) {
        updateStep3ContextUI();
        runSchedule(true);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.navigateToStep = navigateToStep;
window.selectAlgorithm = selectAlgorithm;

// --- Algorithm Names Mapping ---
const ALGO_NAMES = {
    'fcfs': 'First-Come, First-Served (FCFS)',
    'sjf': 'Shortest Job First (SJF)',
    'srtn': 'Shortest Remaining Time Next (SRTN)',
    'rr': 'Round Robin (RR)',
    'priority': 'Priority Scheduling'
};

function selectAlgorithm(algo, preemptive) {
    state.algorithm = algo;
    state.preemptive = preemptive;
    state.algorithmName = ALGO_NAMES[algo] || algo.toUpperCase();

    if (algo === 'priority') {
        state.algorithmName = preemptive ? 'Priority (Preemptive)' : 'Priority (Non-Preemptive)';
    }

    showToast(`Selected: ${state.algorithmName}`);
    navigateToStep(2);
}

function updateStep2ContextUI() {
    const isPri = state.algorithm === 'priority';
    const isRR = state.algorithm === 'rr';
    const isFCFS = state.algorithm === 'fcfs';

    // Update Pill
    const pillText = document.getElementById('currentAlgoPillText');
    if (pillText) pillText.innerText = `Selected: ${state.algorithmName}`;

    // Config bar controls
    const cfgPreemptiveGroup = document.getElementById('cfgPreemptiveGroup');
    const cfgQuantumGroup = document.getElementById('cfgQuantumGroup');
    const cfgPriorityOrderGroup = document.getElementById('cfgPriorityOrderGroup');

    if (cfgQuantumGroup) cfgQuantumGroup.style.display = isRR ? 'flex' : 'none';
    if (cfgPriorityOrderGroup) cfgPriorityOrderGroup.style.display = isPri ? 'flex' : 'none';

    const btnModeNP = document.getElementById('btnModeNP');
    const btnModeP = document.getElementById('btnModeP');

    if (btnModeNP && btnModeP) {
        if (state.preemptive) {
            btnModeP.classList.add('active');
            btnModeNP.classList.remove('active');
        } else {
            btnModeNP.classList.add('active');
            btnModeP.classList.remove('active');
        }

        if (isFCFS || isRR) {
            cfgPreemptiveGroup.style.opacity = '0.5';
            btnModeNP.style.pointerEvents = 'none';
            btnModeP.style.pointerEvents = 'none';
        } else {
            cfgPreemptiveGroup.style.opacity = '1';
            btnModeNP.style.pointerEvents = 'auto';
            btnModeP.style.pointerEvents = 'auto';
        }
    }

    // Highlight priority column
    document.querySelectorAll('.col-priority').forEach(el => {
        el.style.color = isPri ? 'var(--warning)' : '';
        el.style.fontWeight = isPri ? '700' : '';
    });
}

function updateStep3ContextUI() {
    const simPill = document.getElementById('simAlgoPillText');
    if (simPill) {
        let details = state.algorithmName;
        if (state.algorithm === 'rr') details += ` (Q = ${state.timeQuantum})`;
        simPill.innerText = details;
    }
}

// --- Process Inputs Management ---
function renderProcessInputs() {
    const body = document.getElementById('processInputBody');
    if (!body) return;
    body.innerHTML = '';
    const isPri = state.algorithm === 'priority';

    state.processes.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.id = `input-row-${p.pid}`;
        const color = getProcessColor(p.pid);

        tr.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="pid-pill" style="background: ${color};">${p.pid}</span>
                </div>
            </td>
            <td>
                <input type="number" class="proc-input" min="0" max="999" value="${p.arrivalTime}" 
                    data-field="arrivalTime" data-idx="${idx}">
            </td>
            <td>
                <input type="number" class="proc-input" min="1" max="999" value="${p.burstTime}" 
                    data-field="burstTime" data-idx="${idx}">
            </td>
            <td class="col-priority">
                <input type="number" class="proc-input" min="0" max="99" value="${p.priority || 1}" 
                    data-field="priority" data-idx="${idx}" ${isPri ? '' : 'style="opacity: 0.4;"'}>
            </td>
            <td style="text-align: center;">
                <button class="btn btn-danger btn-icon" data-delete="${idx}" title="Delete ${p.pid}">✕</button>
            </td>
        `;

        body.appendChild(tr);
    });

    // Input listeners
    body.querySelectorAll('.proc-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const idx = parseInt(e.target.getAttribute('data-idx'));
            const field = e.target.getAttribute('data-field');
            let val = parseInt(e.target.value);
            if (isNaN(val)) val = (field === 'burstTime') ? 1 : 0;
            if (field === 'burstTime') val = Math.max(1, val);
            if (field === 'arrivalTime') val = Math.max(0, val);
            state.processes[idx][field] = val;
        });
    });

    // Delete listeners
    body.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-delete'));
            const removed = state.processes.splice(idx, 1);
            showToast(`Deleted ${removed[0].pid}`);
            renderProcessInputs();
        });
    });
}

function addProcess(customProc = null) {
    const nextNum = state.processes.length + 1;
    const lastAT = state.processes.length > 0 ? Math.max(...state.processes.map(p => p.arrivalTime)) : 0;

    const newProc = customProc || {
        pid: `P${nextNum}`,
        arrivalTime: lastAT + 1,
        burstTime: Math.floor(Math.random() * 5) + 2,
        priority: Math.floor(Math.random() * 4) + 1
    };

    state.processes.push(newProc);
    if (state.currentStep === 2) {
        renderProcessInputs();
    }
    return newProc;
}

// ==============================================================================
// CLIENT-SIDE JAVASCRIPT SCHEDULING ENGINE (100% Zero-Backend Fallback)
// ==============================================================================

function jsCleanProcesses(procs) {
    return procs.map((p, i) => ({
        pid: String(p.pid || `P${i + 1}`).trim() || `P${i + 1}`,
        arrival_time: Math.max(0, parseInt(p.arrivalTime != null ? p.arrivalTime : p.arrival_time) || 0),
        burst_time: Math.max(1, parseInt(p.burstTime != null ? p.burstTime : p.burst_time) || 1),
        priority: parseInt(p.priority) || 1
    }));
}

function jsCalculateMetrics(processes, timeline) {
    const n = processes.length;
    if (n === 0) {
        return {
            processes: [],
            timeline: [],
            avg_tat: 0,
            avg_wt: 0,
            avg_rt: 0,
            cpu_utilization: 0,
            throughput: 0,
            total_time: 0,
            idle_time: 0
        };
    }

    const totalTat = processes.reduce((acc, p) => acc + p.turnaround_time, 0);
    const totalWt = processes.reduce((acc, p) => acc + p.waiting_time, 0);
    const totalRt = processes.reduce((acc, p) => acc + p.response_time, 0);

    const totalTime = timeline.length > 0 ? timeline[timeline.length - 1].end : 0;
    const idleTime = timeline
        .filter(b => b.pid === 'IDLE')
        .reduce((acc, b) => acc + (b.end - b.start), 0);
    const busyTime = totalTime - idleTime;

    const cpuUtil = totalTime > 0 ? (busyTime / totalTime) * 100 : 0;
    const throughput = totalTime > 0 ? (n / totalTime) : 0;

    return {
        processes,
        timeline,
        avg_tat: Number((totalTat / n).toFixed(2)),
        avg_wt: Number((totalWt / n).toFixed(2)),
        avg_rt: Number((totalRt / n).toFixed(2)),
        cpu_utilization: Number(cpuUtil.toFixed(2)),
        throughput: Number(throughput.toFixed(4)),
        total_time: totalTime,
        idle_time: idleTime
    };
}

function jsScheduleFCFS(procList) {
    const procs = [...procList].sort((a, b) => {
        if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
        return String(a.pid).localeCompare(String(b.pid));
    });

    const timeline = [];
    let currentTime = 0;
    const resultProcs = [];

    for (const p of procs) {
        const at = p.arrival_time;
        const bt = p.burst_time;

        if (currentTime < at) {
            timeline.push({ pid: 'IDLE', start: currentTime, end: at });
            currentTime = at;
        }

        const startTime = currentTime;
        currentTime += bt;
        const ct = currentTime;
        const tat = ct - at;
        const wt = tat - bt;
        const rt = startTime - at;

        timeline.push({ pid: String(p.pid), start: startTime, end: ct });
        resultProcs.push({
            pid: String(p.pid),
            arrival_time: at,
            burst_time: bt,
            priority: p.priority || 0,
            completion_time: ct,
            turnaround_time: tat,
            waiting_time: wt,
            response_time: rt
        });
    }

    resultProcs.sort((a, b) => {
        if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
        return String(a.pid).localeCompare(String(b.pid));
    });

    return jsCalculateMetrics(resultProcs, timeline);
}

function jsScheduleSJF(procList) {
    const procs = procList.map(p => ({ ...p, pid: String(p.pid) }));
    const n = procs.length;
    const completed = [];
    const timeline = [];
    let currentTime = 0;

    while (completed.length < n) {
        const available = procs.filter(p => p.arrival_time <= currentTime && !completed.some(c => c.pid === p.pid));

        if (available.length === 0) {
            const uncompleted = procs.filter(p => !completed.some(c => c.pid === p.pid));
            const nextArrival = Math.min(...uncompleted.map(p => p.arrival_time));
            timeline.push({ pid: 'IDLE', start: currentTime, end: nextArrival });
            currentTime = nextArrival;
            continue;
        }

        available.sort((a, b) => {
            if (a.burst_time !== b.burst_time) return a.burst_time - b.burst_time;
            if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
            return a.pid.localeCompare(b.pid);
        });

        const chosen = available[0];
        const startTime = currentTime;
        currentTime += chosen.burst_time;
        const ct = currentTime;
        const at = chosen.arrival_time;
        const bt = chosen.burst_time;
        const tat = ct - at;
        const wt = tat - bt;
        const rt = startTime - at;

        timeline.push({ pid: chosen.pid, start: startTime, end: ct });
        completed.push({
            pid: chosen.pid,
            arrival_time: at,
            burst_time: bt,
            priority: chosen.priority || 0,
            completion_time: ct,
            turnaround_time: tat,
            waiting_time: wt,
            response_time: rt
        });
    }

    completed.sort((a, b) => {
        if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
        return a.pid.localeCompare(b.pid);
    });

    return jsCalculateMetrics(completed, timeline);
}

function jsScheduleSRTN(procList) {
    const procs = procList.map(p => ({
        ...p,
        pid: String(p.pid),
        rem_bt: p.burst_time,
        first_cpu: -1
    }));
    const n = procs.length;
    let completedCount = 0;
    let currentTime = 0;
    const rawTimeline = [];
    const resultDict = {};

    if (procs.length > 0) {
        const earliestAt = Math.min(...procs.map(p => p.arrival_time));
        if (earliestAt > 0) {
            rawTimeline.push({ pid: 'IDLE', start: 0, end: earliestAt });
            currentTime = earliestAt;
        }
    }

    while (completedCount < n) {
        const available = procs.filter(p => p.arrival_time <= currentTime && p.rem_bt > 0);

        if (available.length === 0) {
            const uncompleted = procs.filter(p => p.rem_bt > 0);
            const nextAt = Math.min(...uncompleted.map(p => p.arrival_time));
            rawTimeline.push({ pid: 'IDLE', start: currentTime, end: nextAt });
            currentTime = nextAt;
            continue;
        }

        available.sort((a, b) => {
            if (a.rem_bt !== b.rem_bt) return a.rem_bt - b.rem_bt;
            if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
            return a.pid.localeCompare(b.pid);
        });

        const chosen = available[0];
        if (chosen.first_cpu === -1) {
            chosen.first_cpu = currentTime;
        }

        const nextEventTime = currentTime + chosen.rem_bt;
        const futureArrivals = procs.filter(p => p.arrival_time > currentTime && p.arrival_time < nextEventTime);

        let runDuration = chosen.rem_bt;
        futureArrivals.sort((a, b) => a.arrival_time - b.arrival_time);
        for (const fa of futureArrivals) {
            const timeAtFa = fa.arrival_time;
            const remChosenAtFa = chosen.rem_bt - (timeAtFa - currentTime);
            if (fa.burst_time < remChosenAtFa) {
                runDuration = timeAtFa - currentTime;
                break;
            }
        }

        const startTime = currentTime;
        currentTime += runDuration;
        chosen.rem_bt -= runDuration;

        rawTimeline.push({ pid: chosen.pid, start: startTime, end: currentTime });

        if (chosen.rem_bt === 0) {
            completedCount++;
            const ct = currentTime;
            const at = chosen.arrival_time;
            const bt = chosen.burst_time;
            const tat = ct - at;
            const wt = tat - bt;
            const rt = chosen.first_cpu - at;
            resultDict[chosen.pid] = {
                pid: chosen.pid,
                arrival_time: at,
                burst_time: bt,
                priority: chosen.priority || 0,
                completion_time: ct,
                turnaround_time: tat,
                waiting_time: wt,
                response_time: rt
            };
        }
    }

    const timeline = [];
    for (const b of rawTimeline) {
        if (timeline.length > 0 && timeline[timeline.length - 1].pid === b.pid) {
            timeline[timeline.length - 1].end = b.end;
        } else {
            timeline.push({ ...b });
        }
    }

    const resultProcs = procList.map(p => resultDict[String(p.pid)]);
    return jsCalculateMetrics(resultProcs, timeline);
}

function jsScheduleRoundRobin(procList, timeQuantum = 2) {
    const procs = procList.map(p => ({
        ...p,
        pid: String(p.pid),
        rem_bt: p.burst_time,
        first_cpu: -1
    }));
    const tq = Math.max(1, parseInt(timeQuantum) || 1);
    const n = procs.length;
    let currentTime = 0;
    const rawTimeline = [];
    const resultDict = {};

    const readyQueue = [];
    let completedCount = 0;
    const inQueue = new Set();

    const sortedProcs = [...procs].sort((a, b) => {
        if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
        return a.pid.localeCompare(b.pid);
    });

    function checkArrivals(t) {
        for (const p of sortedProcs) {
            if (p.arrival_time <= t && !inQueue.has(p.pid) && p.rem_bt > 0) {
                readyQueue.push(p);
                inQueue.add(p.pid);
            }
        }
    }

    checkArrivals(currentTime);

    while (completedCount < n) {
        if (readyQueue.length === 0) {
            const uncompleted = sortedProcs.filter(p => p.rem_bt > 0);
            const nextAt = Math.min(...uncompleted.map(p => p.arrival_time));
            rawTimeline.push({ pid: 'IDLE', start: currentTime, end: nextAt });
            currentTime = nextAt;
            checkArrivals(currentTime);
            continue;
        }

        const currProc = readyQueue.shift();

        if (currProc.first_cpu === -1) {
            currProc.first_cpu = currentTime;
        }

        const executeTime = Math.min(tq, currProc.rem_bt);
        const startTime = currentTime;
        currentTime += executeTime;
        currProc.rem_bt -= executeTime;

        rawTimeline.push({ pid: currProc.pid, start: startTime, end: currentTime });

        checkArrivals(currentTime);

        if (currProc.rem_bt === 0) {
            completedCount++;
            const ct = currentTime;
            const at = currProc.arrival_time;
            const bt = currProc.burst_time;
            const tat = ct - at;
            const wt = tat - bt;
            const rt = currProc.first_cpu - at;
            resultDict[currProc.pid] = {
                pid: currProc.pid,
                arrival_time: at,
                burst_time: bt,
                priority: currProc.priority || 0,
                completion_time: ct,
                turnaround_time: tat,
                waiting_time: wt,
                response_time: rt
            };
        } else {
            readyQueue.push(currProc);
        }
    }

    const timeline = [];
    for (const b of rawTimeline) {
        if (timeline.length > 0 && timeline[timeline.length - 1].pid === b.pid) {
            timeline[timeline.length - 1].end = b.end;
        } else {
            timeline.push({ ...b });
        }
    }

    const resultProcs = procList.map(p => resultDict[String(p.pid)]);
    return jsCalculateMetrics(resultProcs, timeline);
}

function jsSchedulePriority(procList, preemptive = false, lowerIsHigher = true) {
    const procs = procList.map(p => ({
        ...p,
        pid: String(p.pid),
        rem_bt: p.burst_time,
        first_cpu: -1,
        priority: p.priority != null ? p.priority : 0
    }));
    const n = procs.length;

    function comparePriority(a, b) {
        const pA = lowerIsHigher ? a.priority : -a.priority;
        const pB = lowerIsHigher ? b.priority : -b.priority;
        if (pA !== pB) return pA - pB;
        if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
        return a.pid.localeCompare(b.pid);
    }

    if (!preemptive) {
        const completed = [];
        const timeline = [];
        let currentTime = 0;

        while (completed.length < n) {
            const available = procs.filter(p => p.arrival_time <= currentTime && !completed.some(c => c.pid === p.pid));

            if (available.length === 0) {
                const uncompleted = procs.filter(p => !completed.some(c => c.pid === p.pid));
                const nextAt = Math.min(...uncompleted.map(p => p.arrival_time));
                timeline.push({ pid: 'IDLE', start: currentTime, end: nextAt });
                currentTime = nextAt;
                continue;
            }

            available.sort(comparePriority);
            const chosen = available[0];
            const startTime = currentTime;
            currentTime += chosen.burst_time;
            const ct = currentTime;
            const at = chosen.arrival_time;
            const bt = chosen.burst_time;
            const tat = ct - at;
            const wt = tat - bt;
            const rt = startTime - at;

            timeline.push({ pid: chosen.pid, start: startTime, end: ct });
            completed.push({
                pid: chosen.pid,
                arrival_time: at,
                burst_time: bt,
                priority: chosen.priority,
                completion_time: ct,
                turnaround_time: tat,
                waiting_time: wt,
                response_time: rt
            });
        }

        completed.sort((a, b) => {
            if (a.arrival_time !== b.arrival_time) return a.arrival_time - b.arrival_time;
            return a.pid.localeCompare(b.pid);
        });

        return jsCalculateMetrics(completed, timeline);
    } else {
        let completedCount = 0;
        let currentTime = 0;
        const rawTimeline = [];
        const resultDict = {};

        if (procs.length > 0) {
            const earliestAt = Math.min(...procs.map(p => p.arrival_time));
            if (earliestAt > 0) {
                rawTimeline.push({ pid: 'IDLE', start: 0, end: earliestAt });
                currentTime = earliestAt;
            }
        }

        while (completedCount < n) {
            const available = procs.filter(p => p.arrival_time <= currentTime && p.rem_bt > 0);

            if (available.length === 0) {
                const uncompleted = procs.filter(p => p.rem_bt > 0);
                const nextAt = Math.min(...uncompleted.map(p => p.arrival_time));
                rawTimeline.push({ pid: 'IDLE', start: currentTime, end: nextAt });
                currentTime = nextAt;
                continue;
            }

            available.sort(comparePriority);
            const chosen = available[0];

            if (chosen.first_cpu === -1) {
                chosen.first_cpu = currentTime;
            }

            const nextEventTime = currentTime + chosen.rem_bt;
            const futureArrivals = procs.filter(p => p.arrival_time > currentTime && p.arrival_time < nextEventTime);

            let runDuration = chosen.rem_bt;
            futureArrivals.sort((a, b) => a.arrival_time - b.arrival_time);
            for (const fa of futureArrivals) {
                if (comparePriority(fa, chosen) < 0) {
                    runDuration = fa.arrival_time - currentTime;
                    break;
                }
            }

            const startTime = currentTime;
            currentTime += runDuration;
            chosen.rem_bt -= runDuration;

            rawTimeline.push({ pid: chosen.pid, start: startTime, end: currentTime });

            if (chosen.rem_bt === 0) {
                completedCount++;
                const ct = currentTime;
                const at = chosen.arrival_time;
                const bt = chosen.burst_time;
                const tat = ct - at;
                const wt = tat - bt;
                const rt = chosen.first_cpu - at;
                resultDict[chosen.pid] = {
                    pid: chosen.pid,
                    arrival_time: at,
                    burst_time: bt,
                    priority: chosen.priority,
                    completion_time: ct,
                    turnaround_time: tat,
                    waiting_time: wt,
                    response_time: rt
                };
            }
        }

        const timeline = [];
        for (const b of rawTimeline) {
            if (timeline.length > 0 && timeline[timeline.length - 1].pid === b.pid) {
                timeline[timeline.length - 1].end = b.end;
            } else {
                timeline.push({ ...b });
            }
        }

        const resultProcs = procList.map(p => resultDict[String(p.pid)]);
        return jsCalculateMetrics(resultProcs, timeline);
    }
}

function jsComputeSchedule(algo, procs, preemptive = false, lowerIsHigher = true, timeQuantum = 2) {
    const cleaned = jsCleanProcesses(procs);
    let result = null;
    const a = (algo || 'fcfs').toLowerCase();

    if (a === 'fcfs') {
        result = jsScheduleFCFS(cleaned);
    } else if (a === 'sjf') {
        result = preemptive ? jsScheduleSRTN(cleaned) : jsScheduleSJF(cleaned);
    } else if (a === 'srtn' || a === 'srtf') {
        result = jsScheduleSRTN(cleaned);
    } else if (a === 'rr' || a === 'round_robin') {
        result = jsScheduleRoundRobin(cleaned, timeQuantum);
    } else if (a === 'priority') {
        result = jsSchedulePriority(cleaned, preemptive, lowerIsHigher);
    } else {
        result = jsScheduleFCFS(cleaned);
    }

    result.algorithm = a;
    result.preemptive = preemptive;
    result.time_quantum = timeQuantum;
    return result;
}

function jsComputeCompare(procs, timeQuantum = 2, lowerIsHigher = true) {
    const cleaned = jsCleanProcesses(procs);
    return {
        fcfs: jsScheduleFCFS(cleaned),
        sjf: jsScheduleSJF(cleaned),
        srtn: jsScheduleSRTN(cleaned),
        rr: jsScheduleRoundRobin(cleaned, timeQuantum),
        priority_np: jsSchedulePriority(cleaned, false, lowerIsHigher),
        priority_p: jsSchedulePriority(cleaned, true, lowerIsHigher)
    };
}

// ==============================================================================
// STEP-BY-STEP SIMULATION ENGINE (With Spacebar Progression & Screen-Fit Gantt)
// ==============================================================================

function startStepScheduling() {
    if (!state.scheduleResult) return;
    if (state.timerId) clearInterval(state.timerId);
    state.isAnimating = false;
    state.isPaused = false;
    state.isStepScheduling = true;
    state.currentStepBlock = 0;

    const btnStart = document.getElementById('btnStartStepScheduling');
    const btnNext = document.getElementById('btnNextStep');
    if (btnStart) btnStart.style.display = 'none';
    if (btnNext) {
        btnNext.style.display = 'inline-flex';
        btnNext.className = 'btn btn-warning';
        btnNext.disabled = false;
        btnNext.onclick = advanceNextProcessStep;
        btnNext.innerHTML = `<span>⏭️ Step Next Process <kbd class="kbd" style="background:#000; color:#fff; margin-left:4px;">Spacebar</kbd></span>`;
    }

    // Reset Gantt chart blocks (keep ruler ready)
    const chart = document.getElementById('ganttChart');
    if (chart) chart.innerHTML = '';
    renderGanttRuler(state.scheduleResult.timeline, state.scheduleResult.total_time);

    // Initial table in waiting state
    renderInitialTableState();

    // Reset Hardware & Clock
    document.getElementById('liveClockTime').innerText = 't = 0';
    document.getElementById('liveActiveJob').innerText = 'Ready to Schedule';
    document.getElementById('liveActiveJob').style.color = '#38bdf8';
    document.getElementById('liveRemBurst').innerText = '-';
    document.getElementById('cpuCoreLabel').innerText = 'READY';
    document.getElementById('cpuRing').style.opacity = '0.3';

    // Clear summary KPI cards initially until completed
    resetKPICards();

    updateReadyQueueAtTime(0);

    const totalSteps = state.scheduleResult.timeline.length;
    document.getElementById('stepCounterBadge').innerText = `Step 0 of ${totalSteps} (Press Spacebar)`;
    showToast(`🚀 Scheduling started! Press SPACEBAR or click 'Step Next Process' to schedule processes one by one.`, 3500);
}

function advanceNextProcessStep() {
    if (!state.scheduleResult) return;
    const timeline = state.scheduleResult.timeline;
    const totalSteps = timeline.length;
    const totalTime = state.scheduleResult.total_time;

    // If not started yet, start it!
    if (!state.isStepScheduling) {
        startStepScheduling();
        return;
    }

    if (state.currentStepBlock >= totalSteps) {
        showToast('All processes from the input queue have already been scheduled!');
        return;
    }

    const blockIdx = state.currentStepBlock;
    const block = timeline[blockIdx];
    const duration = block.end - block.start;
    const widthPct = (duration / totalTime) * 100;
    const chart = document.getElementById('ganttChart');

    // 1. Append Gantt block for this process
    const div = document.createElement('div');
    div.className = `gantt-block ${block.pid === 'IDLE' ? 'idle' : ''}`;
    div.id = `gantt-block-${blockIdx}`;
    div.style.width = `${widthPct}%`;
    div.style.animation = 'stepFadeIn 0.3s ease-out';
    if (block.pid !== 'IDLE') {
        div.style.backgroundColor = getProcessColor(block.pid);
    }
    div.title = `${block.pid} [Time: ${block.start} to ${block.end} | Duration: ${duration}]`;
    div.innerHTML = `
        <span class="gantt-block-title">${block.pid}</span>
        <span class="gantt-block-sub">(${duration})</span>
    `;
    chart.appendChild(div);

    // 2. Advance needle to block.end
    let needle = document.getElementById('ganttNeedle');
    if (!needle) {
        needle = document.createElement('div');
        needle.id = 'ganttNeedle';
        needle.className = 'gantt-needle';
        chart.appendChild(needle);
    }
    needle.style.left = `${(block.end / totalTime) * 100}%`;

    // 3. Update Hardware CPU unit & Clock
    document.getElementById('liveClockTime').innerText = `t = ${block.end} / ${totalTime}`;
    if (block.pid === 'IDLE') {
        document.getElementById('liveActiveJob').innerText = 'CPU Idle 💤';
        document.getElementById('liveActiveJob').style.color = '#94a3b8';
        document.getElementById('liveRemBurst').innerText = '-';
        document.getElementById('cpuCoreLabel').innerText = 'IDLE';
        document.getElementById('cpuRing').style.opacity = '0.2';
    } else {
        document.getElementById('liveActiveJob').innerText = block.pid;
        document.getElementById('liveActiveJob').style.color = getProcessColor(block.pid);
        document.getElementById('liveRemBurst').innerText = `${duration} units run`;
        document.getElementById('cpuCoreLabel').innerText = block.pid;
        document.getElementById('cpuRing').style.opacity = '1';
    }

    // 4. Update the Results Table for this step!
    updateStepResultsTable(block.end, block.pid);

    // 5. Update Kernel Ready Queue
    updateReadyQueueAtTime(block.end);

    state.currentStepBlock++;

    // 6. Update step badge & button state
    if (state.currentStepBlock < totalSteps) {
        const nextBlock = timeline[state.currentStepBlock];
        document.getElementById('stepCounterBadge').innerText = `Step ${state.currentStepBlock} of ${totalSteps} (Next: ${nextBlock.pid})`;
        showToast(`Loaded ${block.pid} (${block.start} ➔ ${block.end}) into table & chart. Press Spacebar for next process.`, 2000);
    } else {
        // Complete!
        document.getElementById('stepCounterBadge').innerText = `All Processes Scheduled! ✅ (${totalSteps} Steps)`;
        const btnNext = document.getElementById('btnNextStep');
        if (btnNext) {
            btnNext.innerHTML = `<span>🏁 Finish & Reload to First Page</span>`;
            btnNext.className = 'btn btn-primary';
            btnNext.disabled = false;
            btnNext.onclick = finishAndReload;
        }

        // Render final metrics and mathematical formula values
        renderFinalMetrics(state.scheduleResult);
        showToast('🎉 All processes successfully scheduled and loaded into the table!', 4000);

        // Highlight completion card
        const compCard = document.getElementById('completionCard');
        if (compCard) {
            compCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        if (state.isAnimating) {
            clearInterval(state.timerId);
            state.isAnimating = false;
            document.getElementById('btnPlayAnimation').disabled = false;
            document.getElementById('btnPauseAnimation').disabled = true;
            document.getElementById('playIcon').innerText = '🔄';
            document.getElementById('playText').innerText = 'Auto Play Animation';
        }
    }
}

function renderInitialTableState() {
    const body = document.getElementById('resultsTableBody');
    if (!body || !state.scheduleResult) return;
    body.innerHTML = '';
    const isPri = state.algorithm === 'priority';

    state.scheduleResult.processes.forEach(p => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-pid', p.pid);
        const color = getProcessColor(p.pid);

        tr.innerHTML = `
            <td>
                <span class="pid-pill" style="background: ${color}; width: 28px; height: 28px; font-size: 11px;">${p.pid}</span>
            </td>
            <td><span class="badge-status badge-ready">WAITING</span></td>
            <td>${p.arrival_time}</td>
            <td>${p.burst_time}</td>
            <td class="col-priority">${isPri ? p.priority : `<span style="color:var(--text-muted);">${p.priority}</span>`}</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
            <td>-</td>
        `;
        body.appendChild(tr);
    });
}

function updateStepResultsTable(currentTime, activePid) {
    if (!state.scheduleResult) return;
    const procs = state.scheduleResult.processes;

    document.querySelectorAll('#resultsTable tbody tr').forEach(tr => {
        const rowPid = tr.getAttribute('data-pid');
        const p = procs.find(proc => proc.pid === rowPid);
        if (!p) return;

        const cells = tr.querySelectorAll('td');
        const badge = tr.querySelector('.badge-status');

        if (p.completion_time <= currentTime) {
            tr.className = (activePid === rowPid) ? 'highlight-active' : 'highlight-done';
            if (badge) {
                badge.className = 'badge-status badge-done';
                badge.innerText = 'TERMINATED';
            }
            cells[5].innerHTML = `<strong>${p.completion_time}</strong>`;
            cells[6].innerHTML = `<strong style="color: #60a5fa;">${p.turnaround_time}</strong>`;
            cells[7].innerHTML = `<strong style="color: #34d399;">${p.waiting_time}</strong>`;
            cells[8].innerHTML = `${p.response_time}`;
        } else if (p.arrival_time <= currentTime) {
            if (activePid === rowPid) {
                tr.className = 'highlight-active';
                if (badge) {
                    badge.className = 'badge-status badge-running';
                    badge.innerText = 'RUNNING';
                }
            } else {
                tr.className = '';
                if (badge) {
                    badge.className = 'badge-status badge-ready';
                    badge.innerText = 'READY';
                }
            }
        } else {
            tr.className = '';
            if (badge) {
                badge.className = 'badge-status';
                badge.innerText = 'WAITING';
            }
        }
    });
}

function updateReadyQueueAtTime(t) {
    if (!state.scheduleResult) return;
    const procs = state.scheduleResult.processes;
    const queueList = [];

    procs.forEach(p => {
        if (p.arrival_time <= t && p.completion_time > t) {
            queueList.push(p.pid);
        }
    });

    const rqContainer = document.getElementById('readyQueuePipeline');
    document.getElementById('rqCount').innerText = `${queueList.length} Waiting`;

    if (queueList.length > 0) {
        rqContainer.innerHTML = queueList.map(pid => `
            <div class="rq-item">
                <span class="pid-pill" style="background:${getProcessColor(pid)}; width:20px; height:20px; font-size:10px;">${pid}</span>
                <span>${pid}</span>
            </div>
        `).join('');
    } else {
        rqContainer.innerHTML = '<div class="rq-empty">No processes waiting.</div>';
    }
}

function resetKPICards() {
    document.getElementById('statAvgTAT').innerText = '-';
    document.getElementById('statAvgWT').innerText = '-';
    document.getElementById('statAvgRT').innerText = '-';
    document.getElementById('statCpuUtil').innerText = '-';
    document.getElementById('statThroughput').innerText = '-';
    document.getElementById('liveFormulaSubstitution').innerHTML = '<em>Press Spacebar or Start Scheduling to begin loading processes...</em>';
}

function renderFinalMetrics(data) {
    document.getElementById('statAvgTAT').innerText = data.avg_tat.toFixed(2);
    document.getElementById('statAvgWT').innerText = data.avg_wt.toFixed(2);
    document.getElementById('statAvgRT').innerText = data.avg_rt.toFixed(2);
    document.getElementById('statCpuUtil').innerText = `${data.cpu_utilization.toFixed(1)}%`;
    document.getElementById('statThroughput').innerText = data.throughput.toFixed(3);

    const tatSum = data.processes.map(p => p.turnaround_time);
    const wtSum = data.processes.map(p => p.waiting_time);
    const n = data.processes.length;

    document.getElementById('liveFormulaSubstitution').innerHTML = `
        <div style="margin-bottom: 6px;">
            <strong>Avg Turnaround Time:</strong> (${tatSum.join(' + ')}) / ${n} = <span style="color:#60a5fa; font-weight:700;">${data.avg_tat} time units</span>
        </div>
        <div>
            <strong>Avg Waiting Time:</strong> (${wtSum.join(' + ')}) / ${n} = <span style="color:#34d399; font-weight:700;">${data.avg_wt} time units</span>
        </div>
    `;
}

function resetStepScheduling() {
    if (state.timerId) clearInterval(state.timerId);
    state.isAnimating = false;
    state.isPaused = false;
    state.isStepScheduling = false;
    state.currentStepBlock = 0;

    const btnStart = document.getElementById('btnStartStepScheduling');
    const btnNext = document.getElementById('btnNextStep');
    if (btnStart) btnStart.style.display = 'inline-flex';
    if (btnNext) {
        btnNext.style.display = 'none';
        btnNext.className = 'btn btn-warning';
        btnNext.innerHTML = `<span>⏭️ Step Next Process <kbd class="kbd" style="background:#000; color:#fff; margin-left:4px;">Spacebar</kbd></span>`;
        btnNext.onclick = advanceNextProcessStep;
    }

    document.getElementById('btnPlayAnimation').disabled = false;
    document.getElementById('btnPauseAnimation').disabled = true;
    document.getElementById('playIcon').innerText = '▶';
    document.getElementById('playText').innerText = 'Auto Play Animation';

    const chart = document.getElementById('ganttChart');
    if (chart) chart.innerHTML = '';
    const needle = document.getElementById('ganttNeedle');
    if (needle) needle.remove();

    if (state.scheduleResult) {
        renderGanttRuler(state.scheduleResult.timeline, state.scheduleResult.total_time);
        renderInitialTableState();
    }

    resetKPICards();
    document.getElementById('liveClockTime').innerText = 't = 0';
    document.getElementById('liveActiveJob').innerText = 'Ready';
    document.getElementById('liveRemBurst').innerText = '-';
    document.getElementById('cpuCoreLabel').innerText = 'READY';
    document.getElementById('cpuRing').style.opacity = '0.3';
    document.getElementById('stepCounterBadge').innerText = 'Ready to Start';

    showToast('Simulation reset to start state.');
}

// --- Auto Play Animation Controller ---
function startAnimation() {
    if (!state.scheduleResult) return;
    if (state.timerId) clearInterval(state.timerId);

    if (!state.isStepScheduling || state.currentStepBlock >= state.scheduleResult.timeline.length) {
        startStepScheduling();
    }

    state.isAnimating = true;
    state.isPaused = false;

    document.getElementById('btnPlayAnimation').disabled = true;
    document.getElementById('btnPauseAnimation').disabled = false;

    const interval = Math.max(250, Math.floor(1000 / state.animationSpeed));
    state.timerId = setInterval(() => {
        if (state.currentStepBlock < state.scheduleResult.timeline.length) {
            advanceNextProcessStep();
        } else {
            clearInterval(state.timerId);
            state.isAnimating = false;
            document.getElementById('btnPlayAnimation').disabled = false;
            document.getElementById('btnPauseAnimation').disabled = true;
            document.getElementById('playIcon').innerText = '🔄';
            document.getElementById('playText').innerText = 'Replay Animation';
        }
    }, interval);

    advanceNextProcessStep();
}

function pauseAnimation() {
    if (!state.isAnimating || state.isPaused) return;
    clearInterval(state.timerId);
    state.isPaused = true;
    document.getElementById('btnPauseAnimation').disabled = true;
    document.getElementById('btnPlayAnimation').disabled = false;
    document.getElementById('playIcon').innerText = '▶';
    document.getElementById('playText').innerText = 'Resume';
    showToast('Simulation paused');
}

function resumeAnimation() {
    if (!state.isPaused) return;
    state.isPaused = false;
    document.getElementById('btnPauseAnimation').disabled = false;
    document.getElementById('btnPlayAnimation').disabled = true;
    const interval = Math.max(250, Math.floor(1000 / state.animationSpeed));
    state.timerId = setInterval(() => {
        if (state.currentStepBlock < state.scheduleResult.timeline.length) {
            advanceNextProcessStep();
        } else {
            clearInterval(state.timerId);
            state.isAnimating = false;
            document.getElementById('btnPlayAnimation').disabled = false;
            document.getElementById('btnPauseAnimation').disabled = true;
            document.getElementById('playIcon').innerText = '🔄';
            document.getElementById('playText').innerText = 'Replay Animation';
        }
    }, interval);
    showToast('Simulation resumed');
}

// --- Schedule API & Client Fallback Execution ---
async function runSchedule(prepareStepMode = true) {
    if (state.processes.length === 0) return;

    let data = null;
    const payload = {
        algorithm: state.algorithm,
        processes: state.processes.map(p => ({
            pid: p.pid,
            arrival_time: p.arrivalTime,
            burst_time: p.burstTime,
            priority: p.priority
        })),
        preemptive: state.preemptive,
        lower_is_higher: state.lowerIsHigher,
        time_quantum: state.timeQuantum
    };

    try {
        const res = await fetch('/api/schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            data = await res.json();
        }
    } catch (err) {
        console.log('Backend API not reachable, running client-side simulation engine.');
    }

    // Fallback to pure client-side simulation if server is offline or fails
    if (!data || data.error) {
        try {
            data = jsComputeSchedule(
                state.algorithm,
                state.processes,
                state.preemptive,
                state.lowerIsHigher,
                state.timeQuantum
            );
        } catch (calcErr) {
            console.error('JS Calculation error:', calcErr);
            showToast(`Calculation error: ${calcErr.message}`);
            return;
        }
    }

    state.scheduleResult = data;
    state.maxTime = data.total_time;

    if (prepareStepMode) {
        resetStepScheduling();
    } else {
        renderFullGanttChart(data.timeline, data.total_time);
        renderFinalMetrics(data);
    }
}

// --- Gantt Chart Ruler Renderer ---
function renderGanttRuler(timeline, totalTime) {
    const ruler = document.getElementById('ganttRuler');
    if (!ruler || !timeline || timeline.length === 0 || totalTime === 0) return;
    ruler.innerHTML = '';

    const timestamps = new Set([0, totalTime]);
    timeline.forEach(b => {
        timestamps.add(b.start);
        timestamps.add(b.end);
    });

    const sortedTimes = Array.from(timestamps).sort((a, b) => a - b);
    sortedTimes.forEach(t => {
        const leftPct = (t / totalTime) * 100;

        const tick = document.createElement('div');
        tick.className = 'ruler-tick';
        tick.style.left = `${leftPct}%`;
        ruler.appendChild(tick);

        const label = document.createElement('div');
        label.className = 'ruler-marker';
        label.style.left = `${leftPct}%`;
        label.innerText = t;
        ruler.appendChild(label);
    });
}

function renderFullGanttChart(timeline, totalTime) {
    const chart = document.getElementById('ganttChart');
    if (!chart || !timeline) return;
    chart.innerHTML = '';
    renderGanttRuler(timeline, totalTime);

    timeline.forEach((block, idx) => {
        const duration = block.end - block.start;
        const widthPct = (duration / totalTime) * 100;

        const div = document.createElement('div');
        div.className = `gantt-block ${block.pid === 'IDLE' ? 'idle' : ''}`;
        div.id = `gantt-block-${idx}`;
        div.style.width = `${widthPct}%`;

        if (block.pid !== 'IDLE') {
            div.style.backgroundColor = getProcessColor(block.pid);
        }
        div.title = `${block.pid} [Time: ${block.start} to ${block.end} | Duration: ${duration}]`;
        div.innerHTML = `
            <span class="gantt-block-title">${block.pid}</span>
            <span class="gantt-block-sub">(${duration})</span>
        `;
        chart.appendChild(div);
    });
}

// --- Compare All Algorithms ---
async function compareAllAlgorithms() {
    const modal = document.getElementById('compareModal');
    const tbody = document.getElementById('compareTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Calculating comparison...</td></tr>';
    modal.classList.add('active');

    let comp = null;
    const payload = {
        processes: state.processes.map(p => ({
            pid: p.pid,
            arrival_time: p.arrivalTime,
            burst_time: p.burstTime,
            priority: p.priority
        })),
        time_quantum: state.timeQuantum,
        lower_is_higher: state.lowerIsHigher
    };

    try {
        const res = await fetch('/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) comp = await res.json();
    } catch (e) {
        console.log('Server comparison unavailable, computing client-side.');
    }

    if (!comp || comp.error) {
        try {
            comp = jsComputeCompare(state.processes, state.timeQuantum, state.lowerIsHigher);
        } catch (calcErr) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#ef4444;">Comparison error: ${calcErr.message}</td></tr>`;
            return;
        }
    }

    tbody.innerHTML = '';
    const algos = [
        { key: 'fcfs', name: 'First-Come, First-Served (FCFS)' },
        { key: 'sjf', name: 'Shortest Job First (SJF Non-Preemptive)' },
        { key: 'srtn', name: 'Shortest Remaining Time Next (SRTN)' },
        { key: 'rr', name: `Round Robin (RR Q=${state.timeQuantum})` },
        { key: 'priority_np', name: 'Priority (Non-Preemptive)' },
        { key: 'priority_p', name: 'Priority (Preemptive)' }
    ];

    const minWT = Math.min(...algos.map(a => comp[a.key].avg_wt));

    algos.forEach(a => {
        const data = comp[a.key];
        const isBest = data.avg_wt === minWT;
        const tr = document.createElement('tr');
        if (isBest) tr.style.background = 'rgba(16, 185, 129, 0.12)';

        tr.innerHTML = `
            <td><strong>${a.name}</strong></td>
            <td style="color:#60a5fa; font-weight:700;">${data.avg_tat.toFixed(2)}</td>
            <td style="color:#34d399; font-weight:700;">${data.avg_wt.toFixed(2)}</td>
            <td>${data.avg_rt.toFixed(2)}</td>
            <td>${data.cpu_utilization.toFixed(1)}%</td>
            <td>${data.total_time}</td>
            <td>${isBest ? '🏆 <strong style="color:#34d399;">Optimal (Min Waiting)</strong>' : '<span style="color:var(--text-muted);">Standard</span>'}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Notification Toast ---
function showToast(msg, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// --- C Code Loader for Modal ---
const PRESET_C_CODES = {"fcfs": {"filename": "lab5_fcfs.c", "code": "/*\n * Lab 5: First-Come, First-Served (FCFS) CPU Scheduling in C\n * Course: 20CP207P - Operating Systems Lab\n */\n\n#include <stdio.h>\n\nstruct Process {\n    int pid;\n    int at; // Arrival Time\n    int bt; // Burst Time\n    int ct; // Completion Time\n    int tat;// Turnaround Time\n    int wt; // Waiting Time\n    int rt; // Response Time\n};\n\nvoid sort_by_arrival(struct Process p[], int n) {\n    for (int i = 0; i < n - 1; i++) {\n        for (int j = 0; j < n - i - 1; j++) {\n            if (p[j].at > p[j + 1].at || (p[j].at == p[j + 1].at && p[j].pid > p[j + 1].pid)) {\n                struct Process temp = p[j];\n                p[j] = p[j + 1];\n                p[j + 1] = temp;\n            }\n        }\n    }\n}\n\nint main() {\n    int n;\n    printf(\"=== FCFS CPU Scheduling Algorithm ===\\n\");\n    printf(\"Enter number of processes: \");\n    if (scanf(\"%d\", &n) != 1 || n <= 0) return 0;\n\n    struct Process p[n];\n    for (int i = 0; i < n; i++) {\n        p[i].pid = i + 1;\n        printf(\"Process P%d - Arrival Time: \", i + 1);\n        scanf(\"%d\", &p[i].at);\n        printf(\"Process P%d - Burst Time: \", i + 1);\n        scanf(\"%d\", &p[i].bt);\n    }\n\n    sort_by_arrival(p, n);\n\n    int current_time = 0;\n    float total_tat = 0, total_wt = 0, total_rt = 0;\n\n    printf(\"\\n--- Gantt Chart ---\\n|\");\n    for (int i = 0; i < n; i++) {\n        if (current_time < p[i].at) {\n            printf(\" IDLE (%d-%d) |\", current_time, p[i].at);\n            current_time = p[i].at;\n        }\n        int start_time = current_time;\n        current_time += p[i].bt;\n        p[i].ct = current_time;\n        p[i].tat = p[i].ct - p[i].at;\n        p[i].wt = p[i].tat - p[i].bt;\n        p[i].rt = start_time - p[i].at;\n\n        total_tat += p[i].tat;\n        total_wt += p[i].wt;\n        total_rt += p[i].rt;\n\n        printf(\"  P%d (%d-%d)  |\", p[i].pid, start_time, p[i].ct);\n    }\n    printf(\"\\n\");\n\n    printf(\"\\n--- Process Scheduling Table ---\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    printf(\"| PID | AT | BT | CT | TAT | WT | RT |\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    for (int i = 0; i < n; i++) {\n        printf(\"| P%-2d | %-2d | %-2d | %-2d | %-3d | %-2d | %-2d |\\n\",\n               p[i].pid, p[i].at, p[i].bt, p[i].ct, p[i].tat, p[i].wt, p[i].rt);\n    }\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n\n    printf(\"\\nAverage Turnaround Time = %.2f\\n\", total_tat / n);\n    printf(\"Average Waiting Time    = %.2f\\n\", total_wt / n);\n    printf(\"Average Response Time   = %.2f\\n\", total_rt / n);\n\n    return 0;\n}\n"}, "sjf": {"filename": "lab5_sjf.c", "code": "/*\n * Lab 5: Shortest Job First (SJF - Non-Preemptive) CPU Scheduling in C\n * Course: 20CP207P - Operating Systems Lab\n */\n\n#include <stdio.h>\n#include <stdbool.h>\n\nstruct Process {\n    int pid;\n    int at; // Arrival Time\n    int bt; // Burst Time\n    int ct; // Completion Time\n    int tat;// Turnaround Time\n    int wt; // Waiting Time\n    int rt; // Response Time\n    bool completed;\n};\n\nint main() {\n    int n;\n    printf(\"=== SJF (Non-Preemptive) CPU Scheduling Algorithm ===\\n\");\n    printf(\"Enter number of processes: \");\n    if (scanf(\"%d\", &n) != 1 || n <= 0) return 0;\n\n    struct Process p[n];\n    for (int i = 0; i < n; i++) {\n        p[i].pid = i + 1;\n        printf(\"Process P%d - Arrival Time: \", i + 1);\n        scanf(\"%d\", &p[i].at);\n        printf(\"Process P%d - Burst Time: \", i + 1);\n        scanf(\"%d\", &p[i].bt);\n        p[i].completed = false;\n    }\n\n    int completed_count = 0;\n    int current_time = 0;\n    float total_tat = 0, total_wt = 0, total_rt = 0;\n\n    printf(\"\\n--- Gantt Chart ---\\n|\");\n\n    while (completed_count < n) {\n        int best_idx = -1;\n        int min_bt = 1e9;\n\n        for (int i = 0; i < n; i++) {\n            if (!p[i].completed && p[i].at <= current_time) {\n                if (p[i].bt < min_bt) {\n                    min_bt = p[i].bt;\n                    best_idx = i;\n                } else if (p[i].bt == min_bt) {\n                    if (p[i].at < p[best_idx].at) {\n                        best_idx = i;\n                    }\n                }\n            }\n        }\n\n        if (best_idx == -1) {\n            // Find earliest arrival among uncompleted\n            int next_at = 1e9;\n            for (int i = 0; i < n; i++) {\n                if (!p[i].completed && p[i].at < next_at) {\n                    next_at = p[i].at;\n                }\n            }\n            printf(\" IDLE (%d-%d) |\", current_time, next_at);\n            current_time = next_at;\n            continue;\n        }\n\n        int start_time = current_time;\n        current_time += p[best_idx].bt;\n        p[best_idx].ct = current_time;\n        p[best_idx].tat = p[best_idx].ct - p[best_idx].at;\n        p[best_idx].wt = p[best_idx].tat - p[best_idx].bt;\n        p[best_idx].rt = start_time - p[best_idx].at;\n        p[best_idx].completed = true;\n        completed_count++;\n\n        total_tat += p[best_idx].tat;\n        total_wt += p[best_idx].wt;\n        total_rt += p[best_idx].rt;\n\n        printf(\"  P%d (%d-%d)  |\", p[best_idx].pid, start_time, current_time);\n    }\n    printf(\"\\n\");\n\n    printf(\"\\n--- Process Scheduling Table ---\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    printf(\"| PID | AT | BT | CT | TAT | WT | RT |\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    for (int i = 0; i < n; i++) {\n        printf(\"| P%-2d | %-2d | %-2d | %-2d | %-3d | %-2d | %-2d |\\n\",\n               p[i].pid, p[i].at, p[i].bt, p[i].ct, p[i].tat, p[i].wt, p[i].rt);\n    }\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n\n    printf(\"\\nAverage Turnaround Time = %.2f\\n\", total_tat / n);\n    printf(\"Average Waiting Time    = %.2f\\n\", total_wt / n);\n    printf(\"Average Response Time   = %.2f\\n\", total_rt / n);\n\n    return 0;\n}\n"}, "rr": {"filename": "lab6_round_robin.c", "code": "/*\n * Lab 6: Round Robin (RR) CPU Scheduling in C\n * Course: 20CP207P - Operating Systems Lab\n */\n\n#include <stdio.h>\n#include <stdbool.h>\n\nstruct Process {\n    int pid;\n    int at;     // Arrival Time\n    int bt;     // Burst Time\n    int rem_bt; // Remaining Burst Time\n    int ct;     // Completion Time\n    int tat;    // Turnaround Time\n    int wt;     // Waiting Time\n    int rt;     // Response Time\n    int first_cpu;\n};\n\nint main() {\n    int n, tq;\n    printf(\"=== Round Robin (RR) CPU Scheduling Algorithm ===\\n\");\n    printf(\"Enter number of processes: \");\n    if (scanf(\"%d\", &n) != 1 || n <= 0) return 0;\n\n    struct Process p[n];\n    for (int i = 0; i < n; i++) {\n        p[i].pid = i + 1;\n        printf(\"Process P%d - Arrival Time: \", i + 1);\n        scanf(\"%d\", &p[i].at);\n        printf(\"Process P%d - Burst Time: \", i + 1);\n        scanf(\"%d\", &p[i].bt);\n        p[i].rem_bt = p[i].bt;\n        p[i].first_cpu = -1;\n    }\n\n    printf(\"Enter Time Quantum: \");\n    scanf(\"%d\", &tq);\n    if (tq <= 0) tq = 1;\n\n    // Sort by arrival time initially\n    for (int i = 0; i < n - 1; i++) {\n        for (int j = 0; j < n - i - 1; j++) {\n            if (p[j].at > p[j + 1].at) {\n                struct Process temp = p[j];\n                p[j] = p[j + 1];\n                p[j + 1] = temp;\n            }\n        }\n    }\n\n    int queue[1000];\n    int front = 0, rear = 0;\n    bool in_queue[n];\n    for (int i = 0; i < n; i++) in_queue[i] = false;\n\n    int current_time = 0;\n    int completed = 0;\n    float total_tat = 0, total_wt = 0, total_rt = 0;\n\n    // Push initial arrivals\n    for (int i = 0; i < n; i++) {\n        if (p[i].at <= current_time) {\n            queue[rear++] = i;\n            in_queue[i] = true;\n        }\n    }\n\n    printf(\"\\n--- Gantt Chart ---\\n|\");\n\n    while (completed < n) {\n        if (front == rear) {\n            // Queue is empty, find next arrival\n            int next_at = 1e9;\n            for (int i = 0; i < n; i++) {\n                if (p[i].rem_bt > 0 && p[i].at < next_at) {\n                    next_at = p[i].at;\n                }\n            }\n            printf(\" IDLE (%d-%d) |\", current_time, next_at);\n            current_time = next_at;\n            for (int i = 0; i < n; i++) {\n                if (p[i].at <= current_time && !in_queue[i] && p[i].rem_bt > 0) {\n                    queue[rear++] = i;\n                    in_queue[i] = true;\n                }\n            }\n            continue;\n        }\n\n        int idx = queue[front++];\n\n        if (p[idx].first_cpu == -1) {\n            p[idx].first_cpu = current_time;\n        }\n\n        int exec_time = (p[idx].rem_bt < tq) ? p[idx].rem_bt : tq;\n        int start_time = current_time;\n        current_time += exec_time;\n        p[idx].rem_bt -= exec_time;\n\n        printf(\"  P%d (%d-%d)  |\", p[idx].pid, start_time, current_time);\n\n        // Check for new arrivals while executing\n        for (int i = 0; i < n; i++) {\n            if (p[i].at <= current_time && !in_queue[i] && p[i].rem_bt > 0) {\n                queue[rear++] = i;\n                in_queue[i] = true;\n            }\n        }\n\n        if (p[idx].rem_bt == 0) {\n            completed++;\n            p[idx].ct = current_time;\n            p[idx].tat = p[idx].ct - p[idx].at;\n            p[idx].wt = p[idx].tat - p[idx].bt;\n            p[idx].rt = p[idx].first_cpu - p[idx].at;\n\n            total_tat += p[idx].tat;\n            total_wt += p[idx].wt;\n            total_rt += p[idx].rt;\n        } else {\n            queue[rear++] = idx;\n        }\n    }\n    printf(\"\\n\");\n\n    printf(\"\\n--- Process Scheduling Table ---\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    printf(\"| PID | AT | BT | CT | TAT | WT | RT |\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    for (int i = 0; i < n; i++) {\n        printf(\"| P%-2d | %-2d | %-2d | %-2d | %-3d | %-2d | %-2d |\\n\",\n               p[i].pid, p[i].at, p[i].bt, p[i].ct, p[i].tat, p[i].wt, p[i].rt);\n    }\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n\n    printf(\"\\nAverage Turnaround Time = %.2f\\n\", total_tat / n);\n    printf(\"Average Waiting Time    = %.2f\\n\", total_wt / n);\n    printf(\"Average Response Time   = %.2f\\n\", total_rt / n);\n\n    return 0;\n}\n"}, "srtn": {"filename": "lab6_srtn.c", "code": "/*\n * Lab 6: Shortest Remaining Time Next (SRTN / Preemptive SJF) in C\n * Course: 20CP207P - Operating Systems Lab\n */\n\n#include <stdio.h>\n#include <stdbool.h>\n\nstruct Process {\n    int pid;\n    int at;     // Arrival Time\n    int bt;     // Burst Time\n    int rem_bt; // Remaining Burst Time\n    int ct;     // Completion Time\n    int tat;    // Turnaround Time\n    int wt;     // Waiting Time\n    int rt;     // Response Time\n    int first_cpu;\n};\n\nint main() {\n    int n;\n    printf(\"=== Shortest Remaining Time Next (SRTN) Scheduling ===\\n\");\n    printf(\"Enter number of processes: \");\n    if (scanf(\"%d\", &n) != 1 || n <= 0) return 0;\n\n    struct Process p[n];\n    for (int i = 0; i < n; i++) {\n        p[i].pid = i + 1;\n        printf(\"Process P%d - Arrival Time: \", i + 1);\n        scanf(\"%d\", &p[i].at);\n        printf(\"Process P%d - Burst Time: \", i + 1);\n        scanf(\"%d\", &p[i].bt);\n        p[i].rem_bt = p[i].bt;\n        p[i].first_cpu = -1;\n    }\n\n    int completed = 0, current_time = 0;\n    int last_pid = -1, block_start = 0;\n    float total_tat = 0, total_wt = 0, total_rt = 0;\n\n    printf(\"\\n--- Gantt Chart ---\\n|\");\n\n    while (completed < n) {\n        int best_idx = -1;\n        int min_rem = 1e9;\n\n        for (int i = 0; i < n; i++) {\n            if (p[i].at <= current_time && p[i].rem_bt > 0) {\n                if (p[i].rem_bt < min_rem) {\n                    min_rem = p[i].rem_bt;\n                    best_idx = i;\n                } else if (p[i].rem_bt == min_rem) {\n                    if (p[i].at < p[best_idx].at) {\n                        best_idx = i;\n                    }\n                }\n            }\n        }\n\n        if (best_idx == -1) {\n            if (last_pid != 0) {\n                if (last_pid != -1) {\n                    printf(\" P%d (%d-%d) |\", last_pid, block_start, current_time);\n                }\n                last_pid = 0;\n                block_start = current_time;\n            }\n            current_time++;\n            continue;\n        }\n\n        int curr_pid = p[best_idx].pid;\n        if (curr_pid != last_pid) {\n            if (last_pid > 0) {\n                printf(\" P%d (%d-%d) |\", last_pid, block_start, current_time);\n            } else if (last_pid == 0) {\n                printf(\" IDLE (%d-%d) |\", block_start, current_time);\n            }\n            last_pid = curr_pid;\n            block_start = current_time;\n        }\n\n        if (p[best_idx].first_cpu == -1) {\n            p[best_idx].first_cpu = current_time;\n        }\n\n        p[best_idx].rem_bt--;\n        current_time++;\n\n        if (p[best_idx].rem_bt == 0) {\n            completed++;\n            p[best_idx].ct = current_time;\n            p[best_idx].tat = p[best_idx].ct - p[best_idx].at;\n            p[best_idx].wt = p[best_idx].tat - p[best_idx].bt;\n            p[best_idx].rt = p[best_idx].first_cpu - p[best_idx].at;\n\n            total_tat += p[best_idx].tat;\n            total_wt += p[best_idx].wt;\n            total_rt += p[best_idx].rt;\n        }\n    }\n\n    if (last_pid > 0) {\n        printf(\" P%d (%d-%d) |\", last_pid, block_start, current_time);\n    }\n    printf(\"\\n\");\n\n    printf(\"\\n--- Process Scheduling Table ---\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    printf(\"| PID | AT | BT | CT | TAT | WT | RT |\\n\");\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n    for (int i = 0; i < n; i++) {\n        printf(\"| P%-2d | %-2d | %-2d | %-2d | %-3d | %-2d | %-2d |\\n\",\n               p[i].pid, p[i].at, p[i].bt, p[i].ct, p[i].tat, p[i].wt, p[i].rt);\n    }\n    printf(\"+-----+----+----+----+-----+----+----+\\n\");\n\n    printf(\"\\nAverage Turnaround Time = %.2f\\n\", total_tat / n);\n    printf(\"Average Waiting Time    = %.2f\\n\", total_wt / n);\n    printf(\"Average Response Time   = %.2f\\n\", total_rt / n);\n\n    return 0;\n}\n"}, "priority": {"filename": "priority.c", "code": "/*\n * Priority CPU Scheduling in C (Preemptive & Non-Preemptive)\n * Course: 20CP207P - Operating Systems Lab\n */\n\n#include <stdio.h>\n#include <stdbool.h>\n\nstruct Process {\n    int pid;\n    int at;       // Arrival Time\n    int bt;       // Burst Time\n    int priority; // Priority (lower number = higher priority)\n    int rem_bt;   // Remaining Burst Time\n    int ct;       // Completion Time\n    int tat;      // Turnaround Time\n    int wt;       // Waiting Time\n    int rt;       // Response Time\n    int first_cpu;\n    bool completed;\n};\n\nvoid run_non_preemptive(struct Process p[], int n) {\n    int completed_count = 0;\n    int current_time = 0;\n    float total_tat = 0, total_wt = 0, total_rt = 0;\n\n    printf(\"\\n--- Gantt Chart (Non-Preemptive Priority) ---\\n|\");\n\n    while (completed_count < n) {\n        int best_idx = -1;\n        int highest_pri = 1e9;\n\n        for (int i = 0; i < n; i++) {\n            if (!p[i].completed && p[i].at <= current_time) {\n                if (p[i].priority < highest_pri) {\n                    highest_pri = p[i].priority;\n                    best_idx = i;\n                } else if (p[i].priority == highest_pri) {\n                    if (p[i].at < p[best_idx].at) {\n                        best_idx = i;\n                    }\n                }\n            }\n        }\n\n        if (best_idx == -1) {\n            int next_at = 1e9;\n            for (int i = 0; i < n; i++) {\n                if (!p[i].completed && p[i].at < next_at) {\n                    next_at = p[i].at;\n                }\n            }\n            printf(\" IDLE (%d-%d) |\", current_time, next_at);\n            current_time = next_at;\n            continue;\n        }\n\n        int start_time = current_time;\n        current_time += p[best_idx].bt;\n        p[best_idx].ct = current_time;\n        p[best_idx].tat = p[best_idx].ct - p[best_idx].at;\n        p[best_idx].wt = p[best_idx].tat - p[best_idx].bt;\n        p[best_idx].rt = start_time - p[best_idx].at;\n        p[best_idx].completed = true;\n        completed_count++;\n\n        total_tat += p[best_idx].tat;\n        total_wt += p[best_idx].wt;\n        total_rt += p[best_idx].rt;\n\n        printf(\"  P%d (%d-%d)  |\", p[best_idx].pid, start_time, current_time);\n    }\n    printf(\"\\n\");\n\n    printf(\"\\n--- Process Scheduling Table ---\\n\");\n    printf(\"+-----+----+----+-----+----+-----+----+----+\\n\");\n    printf(\"| PID | AT | BT | PRI | CT | TAT | WT | RT |\\n\");\n    printf(\"+-----+----+----+-----+----+-----+----+----+\\n\");\n    for (int i = 0; i < n; i++) {\n        printf(\"| P%-2d | %-2d | %-2d | %-3d | %-2d | %-3d | %-2d | %-2d |\\n\",\n               p[i].pid, p[i].at, p[i].bt, p[i].priority, p[i].ct, p[i].tat, p[i].wt, p[i].rt);\n    }\n    printf(\"+-----+----+----+-----+----+-----+----+----+\\n\");\n\n    printf(\"\\nAverage Turnaround Time = %.2f\\n\", total_tat / n);\n    printf(\"Average Waiting Time    = %.2f\\n\", total_wt / n);\n    printf(\"Average Response Time   = %.2f\\n\", total_rt / n);\n}\n\nvoid run_preemptive(struct Process p[], int n) {\n    int completed_count = 0;\n    int current_time = 0;\n    int last_pid = -1, block_start = 0;\n    float total_tat = 0, total_wt = 0, total_rt = 0;\n\n    printf(\"\\n--- Gantt Chart (Preemptive Priority) ---\\n|\");\n\n    while (completed_count < n) {\n        int best_idx = -1;\n        int highest_pri = 1e9;\n\n        for (int i = 0; i < n; i++) {\n            if (p[i].at <= current_time && p[i].rem_bt > 0) {\n                if (p[i].priority < highest_pri) {\n                    highest_pri = p[i].priority;\n                    best_idx = i;\n                } else if (p[i].priority == highest_pri) {\n                    if (p[i].at < p[best_idx].at) {\n                        best_idx = i;\n                    }\n                }\n            }\n        }\n\n        if (best_idx == -1) {\n            if (last_pid != 0) {\n                if (last_pid != -1) {\n                    printf(\" P%d (%d-%d) |\", last_pid, block_start, current_time);\n                }\n                last_pid = 0;\n                block_start = current_time;\n            }\n            current_time++;\n            continue;\n        }\n\n        int curr_pid = p[best_idx].pid;\n        if (curr_pid != last_pid) {\n            if (last_pid > 0) {\n                printf(\" P%d (%d-%d) |\", last_pid, block_start, current_time);\n            } else if (last_pid == 0) {\n                printf(\" IDLE (%d-%d) |\", block_start, current_time);\n            }\n            last_pid = curr_pid;\n            block_start = current_time;\n        }\n\n        if (p[best_idx].first_cpu == -1) {\n            p[best_idx].first_cpu = current_time;\n        }\n\n        p[best_idx].rem_bt--;\n        current_time++;\n\n        if (p[best_idx].rem_bt == 0) {\n            completed_count++;\n            p[best_idx].ct = current_time;\n            p[best_idx].tat = p[best_idx].ct - p[best_idx].at;\n            p[best_idx].wt = p[best_idx].tat - p[best_idx].bt;\n            p[best_idx].rt = p[best_idx].first_cpu - p[best_idx].at;\n\n            total_tat += p[best_idx].tat;\n            total_wt += p[best_idx].wt;\n            total_rt += p[best_idx].rt;\n        }\n    }\n\n    if (last_pid > 0) {\n        printf(\" P%d (%d-%d) |\", last_pid, block_start, current_time);\n    }\n    printf(\"\\n\");\n\n    printf(\"\\n--- Process Scheduling Table ---\\n\");\n    printf(\"+-----+----+----+-----+----+-----+----+----+\\n\");\n    printf(\"| PID | AT | BT | PRI | CT | TAT | WT | RT |\\n\");\n    printf(\"+-----+----+----+-----+----+-----+----+----+\\n\");\n    for (int i = 0; i < n; i++) {\n        printf(\"| P%-2d | %-2d | %-2d | %-3d | %-2d | %-3d | %-2d | %-2d |\\n\",\n               p[i].pid, p[i].at, p[i].bt, p[i].priority, p[i].ct, p[i].tat, p[i].wt, p[i].rt);\n    }\n    printf(\"+-----+----+----+-----+----+-----+----+----+\\n\");\n\n    printf(\"\\nAverage Turnaround Time = %.2f\\n\", total_tat / n);\n    printf(\"Average Waiting Time    = %.2f\\n\", total_wt / n);\n    printf(\"Average Response Time   = %.2f\\n\", total_rt / n);\n}\n\nint main() {\n    int n, mode;\n    printf(\"=== Priority CPU Scheduling Algorithm ===\\n\");\n    printf(\"Choose Mode:\\n 1. Non-Preemptive Priority\\n 2. Preemptive Priority\\nEnter choice (1 or 2): \");\n    if (scanf(\"%d\", &mode) != 1) return 0;\n\n    printf(\"Enter number of processes: \");\n    if (scanf(\"%d\", &n) != 1 || n <= 0) return 0;\n\n    struct Process p[n];\n    for (int i = 0; i < n; i++) {\n        p[i].pid = i + 1;\n        printf(\"Process P%d - Arrival Time: \", i + 1);\n        scanf(\"%d\", &p[i].at);\n        printf(\"Process P%d - Burst Time: \", i + 1);\n        scanf(\"%d\", &p[i].bt);\n        printf(\"Process P%d - Priority (lower num = higher pri): \", i + 1);\n        scanf(\"%d\", &p[i].priority);\n        p[i].rem_bt = p[i].bt;\n        p[i].first_cpu = -1;\n        p[i].completed = false;\n    }\n\n    if (mode == 2) {\n        run_preemptive(p, n);\n    } else {\n        run_non_preemptive(p, n);\n    }\n\n    return 0;\n}\n"}};

async function loadCCode(algoName) {
    const pre = document.getElementById('cCodePre');
    const fn = document.getElementById('cCodeFileName');
    const key = (algoName || 'fcfs').toLowerCase();
    pre.innerText = '// Loading C source code...';

    try {
        const res = await fetch(`/api/c_code/${key}`);
        if (res.ok) {
            const data = await res.json();
            fn.innerText = data.filename;
            pre.innerText = data.code;
            return;
        }
    } catch (err) {
        // Fallback to embedded preset
    }

    if (PRESET_C_CODES[key]) {
        fn.innerText = PRESET_C_CODES[key].filename;
        pre.innerText = PRESET_C_CODES[key].code;
    } else {
        pre.innerText = `// Could not load C code for ${algoName}`;
    }
}

// --- Initialize Event Listeners ---
function setupEventListeners() {
    // Top Stepper Tabs (1, 2, 3)
    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`stepIndicator${i}`);
        if (ind) {
            ind.addEventListener('click', () => navigateToStep(i));
        }
    }

    // Step 1: Algorithm Showcase Cards & Buttons
    document.querySelectorAll('.algo-card').forEach(card => {
        card.addEventListener('click', () => {
            const algo = card.getAttribute('data-algo');
            const preemptive = card.getAttribute('data-preemptive') === 'true';
            selectAlgorithm(algo, preemptive);
        });
    });

    document.querySelectorAll('.algo-card button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.algo-card');
            if (card) {
                const algo = card.getAttribute('data-algo');
                const preemptive = card.getAttribute('data-preemptive') === 'true';
                selectAlgorithm(algo, preemptive);
            }
        });
    });

    // Step 2: Algorithm Configuration Controls
    const btnModeNP = document.getElementById('btnModeNP');
    const btnModeP = document.getElementById('btnModeP');
    if (btnModeNP) {
        btnModeNP.addEventListener('click', () => {
            state.preemptive = false;
            if (state.algorithm === 'srtn') {
                state.algorithm = 'sjf';
                state.algorithmName = 'Shortest Job First (SJF)';
            }
            updateStep2ContextUI();
        });
    }

    if (btnModeP) {
        btnModeP.addEventListener('click', () => {
            state.preemptive = true;
            if (state.algorithm === 'sjf') {
                state.algorithm = 'srtn';
                state.algorithmName = 'Shortest Remaining Time Next (SRTN)';
            }
            updateStep2ContextUI();
        });
    }

    const tqInput = document.getElementById('timeQuantum');
    if (tqInput) {
        tqInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value) || 1;
            val = Math.max(1, Math.min(50, val));
            state.timeQuantum = val;
            e.target.value = val;
        });
    }

    const btnDec = document.getElementById('btnDecTQ');
    const btnInc = document.getElementById('btnIncTQ');
    if (btnDec) {
        btnDec.addEventListener('click', () => {
            if (state.timeQuantum > 1) {
                state.timeQuantum--;
                tqInput.value = state.timeQuantum;
            }
        });
    }
    if (btnInc) {
        btnInc.addEventListener('click', () => {
            if (state.timeQuantum < 50) {
                state.timeQuantum++;
                tqInput.value = state.timeQuantum;
            }
        });
    }

    const btnPriLower = document.getElementById('btnPriLower');
    const btnPriHigher = document.getElementById('btnPriHigher');
    if (btnPriLower && btnPriHigher) {
        btnPriLower.addEventListener('click', () => {
            btnPriLower.classList.add('active');
            btnPriHigher.classList.remove('active');
            state.lowerIsHigher = true;
        });
        btnPriHigher.addEventListener('click', () => {
            btnPriHigher.classList.add('active');
            btnPriLower.classList.remove('active');
            state.lowerIsHigher = false;
        });
    }

    // Step 2 Action Buttons
    document.getElementById('btnAddProcess').addEventListener('click', () => addProcess());
    document.getElementById('btnClearProcs').addEventListener('click', () => {
        state.processes = [];
        renderProcessInputs();
        showToast('Cleared all processes.');
    });

    document.getElementById('btnRandomize').addEventListener('click', () => {
        const count = 4 + Math.floor(Math.random() * 2);
        const procs = [];
        for (let i = 1; i <= count; i++) {
            procs.push({
                pid: `P${i}`,
                arrivalTime: i === 1 ? 0 : Math.floor(Math.random() * (i * 2)),
                burstTime: Math.floor(Math.random() * 6) + 2,
                priority: Math.floor(Math.random() * 5) + 1
            });
        }
        state.processes = procs;
        renderProcessInputs();
        showToast('Generated random processes!');
    });

    document.getElementById('btnLoadDemo').addEventListener('click', () => {
        state.processes = [
            { pid: 'P1', arrivalTime: 0, burstTime: 4, priority: 2 },
            { pid: 'P2', arrivalTime: 1, burstTime: 3, priority: 1 },
            { pid: 'P3', arrivalTime: 2, burstTime: 1, priority: 3 },
            { pid: 'P4', arrivalTime: 3, burstTime: 2, priority: 2 },
            { pid: 'P5', arrivalTime: 4, burstTime: 5, priority: 4 }
        ];
        renderProcessInputs();
        showToast('Loaded standard OS demo dataset!');
    });

    document.getElementById('btnGoToSim').addEventListener('click', () => {
        navigateToStep(3);
    });

    // Step 3 Controls
    const btnStartScheduling = document.getElementById('btnStartStepScheduling');
    if (btnStartScheduling) {
        btnStartScheduling.addEventListener('click', () => startStepScheduling());
    }

    const btnNext = document.getElementById('btnNextStep');
    if (btnNext) {
        btnNext.addEventListener('click', () => advanceNextProcessStep());
    }

    document.getElementById('btnPlayAnimation').addEventListener('click', () => {
        if (state.isPaused) resumeAnimation();
        else startAnimation();
    });

    document.getElementById('btnPauseAnimation').addEventListener('click', () => pauseAnimation());
    document.getElementById('btnRestartAnimation').addEventListener('click', () => resetStepScheduling());

    // Finish & Reload Buttons (Top and Completion Card)
    const btnFinishReload = document.getElementById('btnFinishReload');
    if (btnFinishReload) {
        btnFinishReload.addEventListener('click', finishAndReload);
    }
    const btnTopFinish = document.getElementById('btnTopFinish');
    if (btnTopFinish) {
        btnTopFinish.addEventListener('click', finishAndReload);
    }

    // Animation Speed Slider
    document.getElementById('speedSlider').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        state.animationSpeed = val;
        document.getElementById('speedValue').innerText = `${val.toFixed(2)}x`;
        if (state.isAnimating && !state.isPaused) {
            clearInterval(state.timerId);
            const interval = Math.max(250, Math.floor(1000 / state.animationSpeed));
            state.timerId = setInterval(() => {
                if (state.currentStepBlock < state.scheduleResult.timeline.length) {
                    advanceNextProcessStep();
                } else {
                    clearInterval(state.timerId);
                    state.isAnimating = false;
                    document.getElementById('btnPlayAnimation').disabled = false;
                    document.getElementById('btnPauseAnimation').disabled = true;
                    document.getElementById('playIcon').innerText = '🔄';
                    document.getElementById('playText').innerText = 'Auto Play Animation';
                }
            }, interval);
        }
    });

    // Global Spacebar Listener:
    // If on Step 3: Advances and loads the next process into Gantt & table one-by-one!
    // If on Step 2: Appends new process row!
    window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            if (state.currentStep === 3) {
                advanceNextProcessStep();
            } else if (state.currentStep === 2) {
                addProcess();
                showToast(`➕ Added Process P${state.processes.length} via Spacebar!`);
            }
        }
    });

    // Compare Modal
    document.getElementById('btnCompareAll').addEventListener('click', () => compareAllAlgorithms());
    document.getElementById('btnCloseCompareModal').addEventListener('click', () => {
        document.getElementById('compareModal').classList.remove('active');
    });

    // C Code Modal
    document.getElementById('btnOpenCCode').addEventListener('click', () => {
        document.getElementById('cCodeModal').classList.add('active');
        loadCCode(state.algorithm);
    });

    document.getElementById('btnCloseCModal').addEventListener('click', () => {
        document.getElementById('cCodeModal').classList.remove('active');
    });

    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadCCode(tab.getAttribute('data-ccode'));
        });
    });

    document.getElementById('btnCopyCCode').addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('cCodePre').innerText).then(() => {
            showToast('✅ C Code copied to clipboard!');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    navigateToStep(1); // Start at Algorithm Showcase
});
