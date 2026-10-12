/*
 * Priority CPU Scheduling in C (Preemptive & Non-Preemptive)
 * Course: 20CP207P - Operating Systems Lab
 */

#include <stdio.h>
#include <stdbool.h>

struct Process {
    int pid;
    int at;       // Arrival Time
    int bt;       // Burst Time
    int priority; // Priority (lower number = higher priority)
    int rem_bt;   // Remaining Burst Time
    int ct;       // Completion Time
    int tat;      // Turnaround Time
    int wt;       // Waiting Time
    int rt;       // Response Time
    int first_cpu;
    bool completed;
};

void run_non_preemptive(struct Process p[], int n) {
    int completed_count = 0;
    int current_time = 0;
    float total_tat = 0, total_wt = 0, total_rt = 0;

    printf("\n--- Gantt Chart (Non-Preemptive Priority) ---\n|");

    while (completed_count < n) {
        int best_idx = -1;
        int highest_pri = 1e9;

        for (int i = 0; i < n; i++) {
            if (!p[i].completed && p[i].at <= current_time) {
                if (p[i].priority < highest_pri) {
                    highest_pri = p[i].priority;
                    best_idx = i;
                } else if (p[i].priority == highest_pri) {
                    if (p[i].at < p[best_idx].at) {
                        best_idx = i;
                    }
                }
            }
        }

        if (best_idx == -1) {
            int next_at = 1e9;
            for (int i = 0; i < n; i++) {
                if (!p[i].completed && p[i].at < next_at) {
                    next_at = p[i].at;
                }
            }
            printf(" IDLE (%d-%d) |", current_time, next_at);
            current_time = next_at;
            continue;
        }

        int start_time = current_time;
        current_time += p[best_idx].bt;
        p[best_idx].ct = current_time;
        p[best_idx].tat = p[best_idx].ct - p[best_idx].at;
        p[best_idx].wt = p[best_idx].tat - p[best_idx].bt;
        p[best_idx].rt = start_time - p[best_idx].at;
        p[best_idx].completed = true;
        completed_count++;

        total_tat += p[best_idx].tat;
        total_wt += p[best_idx].wt;
        total_rt += p[best_idx].rt;

        printf("  P%d (%d-%d)  |", p[best_idx].pid, start_time, current_time);
    }
    printf("\n");

    printf("\n--- Process Scheduling Table ---\n");
    printf("+-----+----+----+-----+----+-----+----+----+\n");
    printf("| PID | AT | BT | PRI | CT | TAT | WT | RT |\n");
    printf("+-----+----+----+-----+----+-----+----+----+\n");
    for (int i = 0; i < n; i++) {
        printf("| P%-2d | %-2d | %-2d | %-3d | %-2d | %-3d | %-2d | %-2d |\n",
               p[i].pid, p[i].at, p[i].bt, p[i].priority, p[i].ct, p[i].tat, p[i].wt, p[i].rt);
    }
    printf("+-----+----+----+-----+----+-----+----+----+\n");

    printf("\nAverage Turnaround Time = %.2f\n", total_tat / n);
    printf("Average Waiting Time    = %.2f\n", total_wt / n);
    printf("Average Response Time   = %.2f\n", total_rt / n);
}

void run_preemptive(struct Process p[], int n) {
    int completed_count = 0;
    int current_time = 0;
    int last_pid = -1, block_start = 0;
    float total_tat = 0, total_wt = 0, total_rt = 0;

    printf("\n--- Gantt Chart (Preemptive Priority) ---\n|");

    while (completed_count < n) {
        int best_idx = -1;
        int highest_pri = 1e9;

        for (int i = 0; i < n; i++) {
            if (p[i].at <= current_time && p[i].rem_bt > 0) {
                if (p[i].priority < highest_pri) {
                    highest_pri = p[i].priority;
                    best_idx = i;
                } else if (p[i].priority == highest_pri) {
                    if (p[i].at < p[best_idx].at) {
                        best_idx = i;
                    }
                }
            }
        }

        if (best_idx == -1) {
            if (last_pid != 0) {
                if (last_pid != -1) {
                    printf(" P%d (%d-%d) |", last_pid, block_start, current_time);
                }
                last_pid = 0;
                block_start = current_time;
            }
            current_time++;
            continue;
        }

        int curr_pid = p[best_idx].pid;
        if (curr_pid != last_pid) {
            if (last_pid > 0) {
                printf(" P%d (%d-%d) |", last_pid, block_start, current_time);
            } else if (last_pid == 0) {
                printf(" IDLE (%d-%d) |", block_start, current_time);
            }
            last_pid = curr_pid;
            block_start = current_time;
        }

        if (p[best_idx].first_cpu == -1) {
            p[best_idx].first_cpu = current_time;
        }

        p[best_idx].rem_bt--;
        current_time++;

        if (p[best_idx].rem_bt == 0) {
            completed_count++;
            p[best_idx].ct = current_time;
            p[best_idx].tat = p[best_idx].ct - p[best_idx].at;
            p[best_idx].wt = p[best_idx].tat - p[best_idx].bt;
            p[best_idx].rt = p[best_idx].first_cpu - p[best_idx].at;

            total_tat += p[best_idx].tat;
            total_wt += p[best_idx].wt;
            total_rt += p[best_idx].rt;
        }
    }

    if (last_pid > 0) {
        printf(" P%d (%d-%d) |", last_pid, block_start, current_time);
    }
    printf("\n");

    printf("\n--- Process Scheduling Table ---\n");
    printf("+-----+----+----+-----+----+-----+----+----+\n");
    printf("| PID | AT | BT | PRI | CT | TAT | WT | RT |\n");
    printf("+-----+----+----+-----+----+-----+----+----+\n");
    for (int i = 0; i < n; i++) {
        printf("| P%-2d | %-2d | %-2d | %-3d | %-2d | %-3d | %-2d | %-2d |\n",
               p[i].pid, p[i].at, p[i].bt, p[i].priority, p[i].ct, p[i].tat, p[i].wt, p[i].rt);
    }
    printf("+-----+----+----+-----+----+-----+----+----+\n");

    printf("\nAverage Turnaround Time = %.2f\n", total_tat / n);
    printf("Average Waiting Time    = %.2f\n", total_wt / n);
    printf("Average Response Time   = %.2f\n", total_rt / n);
}

int main() {
    int n, mode;
    printf("=== Priority CPU Scheduling Algorithm ===\n");
    printf("Choose Mode:\n 1. Non-Preemptive Priority\n 2. Preemptive Priority\nEnter choice (1 or 2): ");
    if (scanf("%d", &mode) != 1) return 0;

    printf("Enter number of processes: ");
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    struct Process p[n];
    for (int i = 0; i < n; i++) {
        p[i].pid = i + 1;
        printf("Process P%d - Arrival Time: ", i + 1);
        scanf("%d", &p[i].at);
        printf("Process P%d - Burst Time: ", i + 1);
        scanf("%d", &p[i].bt);
        printf("Process P%d - Priority (lower num = higher pri): ", i + 1);
        scanf("%d", &p[i].priority);
        p[i].rem_bt = p[i].bt;
        p[i].first_cpu = -1;
        p[i].completed = false;
    }

    if (mode == 2) {
        run_preemptive(p, n);
    } else {
        run_non_preemptive(p, n);
    }

    return 0;
}
