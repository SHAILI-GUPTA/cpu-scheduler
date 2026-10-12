"""
CPU Scheduling Algorithms Engine
Supports:
- First-Come, First-Served (FCFS)
- Shortest Job First (SJF) - Non-Preemptive
- Shortest Remaining Time Next (SRTN / SRTF) - Preemptive SJF
- Round Robin (RR) with configurable Time Quantum
- Priority Scheduling - Non-Preemptive
- Priority Scheduling - Preemptive
"""

from typing import List, Dict, Any

def calculate_metrics(processes: List[Dict[str, Any]], timeline: List[Dict[str, Any]]) -> Dict[str, Any]:
    n = len(processes)
    if n == 0:
        return {
            "processes": [],
            "timeline": [],
            "avg_tat": 0,
            "avg_wt": 0,
            "avg_rt": 0,
            "cpu_utilization": 0,
            "throughput": 0,
            "total_time": 0,
            "idle_time": 0
        }

    total_tat = sum(p["turnaround_time"] for p in processes)
    total_wt = sum(p["waiting_time"] for p in processes)
    total_rt = sum(p["response_time"] for p in processes)

    total_time = timeline[-1]["end"] if timeline else 0
    idle_time = sum(b["end"] - b["start"] for b in timeline if b["pid"] == "IDLE")
    busy_time = total_time - idle_time

    cpu_utilization = (busy_time / total_time * 100) if total_time > 0 else 0
    throughput = (n / total_time) if total_time > 0 else 0

    return {
        "processes": processes,
        "timeline": timeline,
        "avg_tat": round(total_tat / n, 2),
        "avg_wt": round(total_wt / n, 2),
        "avg_rt": round(total_rt / n, 2),
        "cpu_utilization": round(cpu_utilization, 2),
        "throughput": round(throughput, 4),
        "total_time": total_time,
        "idle_time": idle_time
    }

def schedule_fcfs(proc_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    procs = sorted(proc_list, key=lambda x: (x["arrival_time"], str(x["pid"])))
    timeline = []
    current_time = 0
    result_procs = []

    for p in procs:
        at = p["arrival_time"]
        bt = p["burst_time"]

        if current_time < at:
            timeline.append({"pid": "IDLE", "start": current_time, "end": at})
            current_time = at

        start_time = current_time
        current_time += bt
        ct = current_time
        tat = ct - at
        wt = tat - bt
        rt = start_time - at

        timeline.append({"pid": str(p["pid"]), "start": start_time, "end": ct})
        result_procs.append({
            "pid": str(p["pid"]),
            "arrival_time": at,
            "burst_time": bt,
            "priority": p.get("priority", 0),
            "completion_time": ct,
            "turnaround_time": tat,
            "waiting_time": wt,
            "response_time": rt
        })

    # Sort result_procs back by original pid if needed or by arrival
    result_procs.sort(key=lambda x: (x["arrival_time"], str(x["pid"])))
    return calculate_metrics(result_procs, timeline)

def schedule_sjf(proc_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Non-preemptive Shortest Job First
    procs = [dict(p) for p in proc_list]
    for p in procs:
        p["pid"] = str(p["pid"])
    n = len(procs)
    completed = []
    timeline = []
    current_time = 0

    while len(completed) < n:
        available = [p for p in procs if p["arrival_time"] <= current_time and p not in completed]

        if not available:
            # CPU is idle until the next arrival
            uncompleted = [p for p in procs if p not in completed]
            next_arrival = min(p["arrival_time"] for p in uncompleted)
            timeline.append({"pid": "IDLE", "start": current_time, "end": next_arrival})
            current_time = next_arrival
            continue

        # Choose process with shortest burst time; tie break by arrival time, then pid
        chosen = min(available, key=lambda x: (x["burst_time"], x["arrival_time"], x["pid"]))

        start_time = current_time
        current_time += chosen["burst_time"]
        ct = current_time
        at = chosen["arrival_time"]
        bt = chosen["burst_time"]
        tat = ct - at
        wt = tat - bt
        rt = start_time - at

        timeline.append({"pid": chosen["pid"], "start": start_time, "end": ct})
        completed.append({
            "pid": chosen["pid"],
            "arrival_time": at,
            "burst_time": bt,
            "priority": chosen.get("priority", 0),
            "completion_time": ct,
            "turnaround_time": tat,
            "waiting_time": wt,
            "response_time": rt
        })

    completed.sort(key=lambda x: (x["arrival_time"], str(x["pid"])))
    return calculate_metrics(completed, timeline)

def schedule_srtn(proc_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Preemptive Shortest Remaining Time Next (SRTF)
    procs = [dict(p) for p in proc_list]
    for p in procs:
        p["pid"] = str(p["pid"])
        p["rem_bt"] = p["burst_time"]
        p["first_cpu"] = -1

    n = len(procs)
    completed_count = 0
    current_time = 0
    raw_timeline = []
    result_dict = {}

    # Find earliest arrival
    if procs:
        earliest_at = min(p["arrival_time"] for p in procs)
        if earliest_at > 0:
            raw_timeline.append({"pid": "IDLE", "start": 0, "end": earliest_at})
            current_time = earliest_at

    while completed_count < n:
        available = [p for p in procs if p["arrival_time"] <= current_time and p["rem_bt"] > 0]

        if not available:
            uncompleted = [p for p in procs if p["rem_bt"] > 0]
            next_at = min(p["arrival_time"] for p in uncompleted)
            raw_timeline.append({"pid": "IDLE", "start": current_time, "end": next_at})
            current_time = next_at
            continue

        # Choose with smallest remaining burst time; tie break arrival, pid
        chosen = min(available, key=lambda x: (x["rem_bt"], x["arrival_time"], x["pid"]))

        if chosen["first_cpu"] == -1:
            chosen["first_cpu"] = current_time

        # Find how long this process can run without being preempted
        # It runs until either:
        # 1) It finishes (current_time + rem_bt)
        # 2) A new process arrives whose burst_time < chosen's remaining burst time at that arrival
        next_event_time = current_time + chosen["rem_bt"]
        future_arrivals = [p for p in procs if p["arrival_time"] > current_time and p["arrival_time"] < next_event_time]

        run_duration = chosen["rem_bt"]
        for fa in sorted(future_arrivals, key=lambda x: x["arrival_time"]):
            time_at_fa = fa["arrival_time"]
            rem_chosen_at_fa = chosen["rem_bt"] - (time_at_fa - current_time)
            if fa["burst_time"] < rem_chosen_at_fa:
                run_duration = time_at_fa - current_time
                break

        start_time = current_time
        current_time += run_duration
        chosen["rem_bt"] -= run_duration

        raw_timeline.append({"pid": chosen["pid"], "start": start_time, "end": current_time})

        if chosen["rem_bt"] == 0:
            completed_count += 1
            ct = current_time
            at = chosen["arrival_time"]
            bt = chosen["burst_time"]
            tat = ct - at
            wt = tat - bt
            rt = chosen["first_cpu"] - at
            result_dict[chosen["pid"]] = {
                "pid": chosen["pid"],
                "arrival_time": at,
                "burst_time": bt,
                "priority": chosen.get("priority", 0),
                "completion_time": ct,
                "turnaround_time": tat,
                "waiting_time": wt,
                "response_time": rt
            }

    # Merge contiguous timeline blocks with same pid
    timeline = []
    for b in raw_timeline:
        if timeline and timeline[-1]["pid"] == b["pid"]:
            timeline[-1]["end"] = b["end"]
        else:
            timeline.append(dict(b))

    result_procs = [result_dict[p["pid"]] for p in proc_list]
    return calculate_metrics(result_procs, timeline)

def schedule_round_robin(proc_list: List[Dict[str, Any]], time_quantum: int = 2) -> Dict[str, Any]:
    procs = [dict(p) for p in proc_list]
    for p in procs:
        p["pid"] = str(p["pid"])
        p["rem_bt"] = p["burst_time"]
        p["first_cpu"] = -1

    tq = max(1, int(time_quantum))
    n = len(procs)
    current_time = 0
    raw_timeline = []
    result_dict = {}

    ready_queue = []
    completed_count = 0
    in_queue = set()

    # Sort initial arrivals
    sorted_procs = sorted(procs, key=lambda x: (x["arrival_time"], x["pid"]))

    def check_arrivals(t):
        for p in sorted_procs:
            if p["arrival_time"] <= t and p["pid"] not in in_queue and p["rem_bt"] > 0:
                ready_queue.append(p)
                in_queue.add(p["pid"])

    check_arrivals(current_time)

    while completed_count < n:
        if not ready_queue:
            # Advance to next arrival
            uncompleted = [p for p in sorted_procs if p["rem_bt"] > 0]
            next_at = min(p["arrival_time"] for p in uncompleted)
            raw_timeline.append({"pid": "IDLE", "start": current_time, "end": next_at})
            current_time = next_at
            check_arrivals(current_time)
            continue

        curr_proc = ready_queue.pop(0)

        if curr_proc["first_cpu"] == -1:
            curr_proc["first_cpu"] = current_time

        execute_time = min(tq, curr_proc["rem_bt"])
        start_time = current_time
        current_time += execute_time
        curr_proc["rem_bt"] -= execute_time

        raw_timeline.append({"pid": curr_proc["pid"], "start": start_time, "end": current_time})

        # Check newly arrived processes during execution before putting curr_proc back
        check_arrivals(current_time)

        if curr_proc["rem_bt"] == 0:
            completed_count += 1
            ct = current_time
            at = curr_proc["arrival_time"]
            bt = curr_proc["burst_time"]
            tat = ct - at
            wt = tat - bt
            rt = curr_proc["first_cpu"] - at
            result_dict[curr_proc["pid"]] = {
                "pid": curr_proc["pid"],
                "arrival_time": at,
                "burst_time": bt,
                "priority": curr_proc.get("priority", 0),
                "completion_time": ct,
                "turnaround_time": tat,
                "waiting_time": wt,
                "response_time": rt
            }
        else:
            ready_queue.append(curr_proc)

    timeline = []
    for b in raw_timeline:
        if timeline and timeline[-1]["pid"] == b["pid"]:
            timeline[-1]["end"] = b["end"]
        else:
            timeline.append(dict(b))

    result_procs = [result_dict[p["pid"]] for p in proc_list]
    return calculate_metrics(result_procs, timeline)

def schedule_priority(proc_list: List[Dict[str, Any]], preemptive: bool = False, lower_is_higher: bool = True) -> Dict[str, Any]:
    procs = [dict(p) for p in proc_list]
    for p in procs:
        p["pid"] = str(p["pid"])
        p["rem_bt"] = p["burst_time"]
        p["first_cpu"] = -1
        p["priority"] = p.get("priority", 0)

    n = len(procs)

    def priority_sort_key(p):
        pri_val = p["priority"] if lower_is_higher else -p["priority"]
        return (pri_val, p["arrival_time"], p["pid"])

    if not preemptive:
        # Non-preemptive priority
        completed = []
        timeline = []
        current_time = 0

        while len(completed) < n:
            available = [p for p in procs if p["arrival_time"] <= current_time and p not in completed]
            if not available:
                uncompleted = [p for p in procs if p not in completed]
                next_at = min(p["arrival_time"] for p in uncompleted)
                timeline.append({"pid": "IDLE", "start": current_time, "end": next_at})
                current_time = next_at
                continue

            chosen = min(available, key=priority_sort_key)
            start_time = current_time
            current_time += chosen["burst_time"]
            ct = current_time
            at = chosen["arrival_time"]
            bt = chosen["burst_time"]
            tat = ct - at
            wt = tat - bt
            rt = start_time - at

            timeline.append({"pid": chosen["pid"], "start": start_time, "end": ct})
            completed.append({
                "pid": chosen["pid"],
                "arrival_time": at,
                "burst_time": bt,
                "priority": chosen["priority"],
                "completion_time": ct,
                "turnaround_time": tat,
                "waiting_time": wt,
                "response_time": rt
            })

        completed.sort(key=lambda x: (x["arrival_time"], str(x["pid"])))
        return calculate_metrics(completed, timeline)

    else:
        # Preemptive Priority
        completed_count = 0
        current_time = 0
        raw_timeline = []
        result_dict = {}

        earliest_at = min(p["arrival_time"] for p in procs) if procs else 0
        if earliest_at > 0:
            raw_timeline.append({"pid": "IDLE", "start": 0, "end": earliest_at})
            current_time = earliest_at

        while completed_count < n:
            available = [p for p in procs if p["arrival_time"] <= current_time and p["rem_bt"] > 0]
            if not available:
                uncompleted = [p for p in procs if p["rem_bt"] > 0]
                next_at = min(p["arrival_time"] for p in uncompleted)
                raw_timeline.append({"pid": "IDLE", "start": current_time, "end": next_at})
                current_time = next_at
                continue

            chosen = min(available, key=priority_sort_key)
            if chosen["first_cpu"] == -1:
                chosen["first_cpu"] = current_time

            # It runs until chosen completes or a process with higher priority arrives
            next_event_time = current_time + chosen["rem_bt"]
            future_arrivals = [p for p in procs if p["arrival_time"] > current_time and p["arrival_time"] < next_event_time]

            run_duration = chosen["rem_bt"]
            for fa in sorted(future_arrivals, key=lambda x: x["arrival_time"]):
                fa_key = priority_sort_key(fa)
                chosen_key = priority_sort_key(chosen)
                if fa_key < chosen_key: # higher priority
                    run_duration = fa["arrival_time"] - current_time
                    break

            start_time = current_time
            current_time += run_duration
            chosen["rem_bt"] -= run_duration

            raw_timeline.append({"pid": chosen["pid"], "start": start_time, "end": current_time})

            if chosen["rem_bt"] == 0:
                completed_count += 1
                ct = current_time
                at = chosen["arrival_time"]
                bt = chosen["burst_time"]
                tat = ct - at
                wt = tat - bt
                rt = chosen["first_cpu"] - at
                result_dict[chosen["pid"]] = {
                    "pid": chosen["pid"],
                    "arrival_time": at,
                    "burst_time": bt,
                    "priority": chosen["priority"],
                    "completion_time": ct,
                    "turnaround_time": tat,
                    "waiting_time": wt,
                    "response_time": rt
                }

        timeline = []
        for b in raw_timeline:
            if timeline and timeline[-1]["pid"] == b["pid"]:
                timeline[-1]["end"] = b["end"]
            else:
                timeline.append(dict(b))

        result_procs = [result_dict[p["pid"]] for p in proc_list]
        return calculate_metrics(result_procs, timeline)
