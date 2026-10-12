/*
 * Lab 6: Shortest Remaining Time Next (SRTN / Preemptive SJF) in C
 * Course: 20CP207P - Operating Systems Lab
 */

#include <stdio.h>
#include <stdbool.h>

struct Process {
    int pid;
    int at;     // Arrival Time
    int bt;     // Burst Time
    int rem_bt; // Remaining Burst Time
    int ct;     // Completion Time
    int tat;    // Turnaround Time
    int wt;     // Waiting Time
    int rt;     // Response Time
    int first_cpu;
};

int main() {
    int n;
    printf("=== Shortest Remaining Time Next (SRTN) Scheduling ===\n");
    printf("Enter number of processes: ");
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    struct Process p[n];
    for (int i = 0; i < n; i++) {
        p[i].pid = i + 1;
        printf("Process P%d - Arrival Time: ", i + 1);
        scanf("%d", &p[i].at);
        printf("Process P%d - Burst Time: ", i + 1);
        scanf("%d", &p[i].bt);
        p[i].rem_bt = p[i].bt;
        p[i].first_cpu = -1;
    }

    int completed = 0, current_time = 0;
    int last_pid = -1, block_start = 0;
    float total_tat = 0, total_wt = 0, total_rt = 0;

    printf("\n--- Gantt Chart ---\n|");

    while (completed < n) {
        int best_idx = -1;
        int min_rem = 1e9;

        for (int i = 0; i < n; i++) {
            if (p[i].at <= current_time && p[i].rem_bt > 0) {
                if (p[i].rem_bt < min_rem) {
                    min_rem = p[i].rem_bt;
                    best_idx = i;
                } else if (p[i].rem_bt == min_rem) {
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
            completed++;
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
    printf("+-----+----+----+----+-----+----+----+\n");
    printf("| PID | AT | BT | CT | TAT | WT | RT |\n");
    printf("+-----+----+----+----+-----+----+----+\n");
    for (int i = 0; i < n; i++) {
        printf("| P%-2d | %-2d | %-2d | %-2d | %-3d | %-2d | %-2d |\n",
               p[i].pid, p[i].at, p[i].bt, p[i].ct, p[i].tat, p[i].wt, p[i].rt);
    }
    printf("+-----+----+----+----+-----+----+----+\n");

    printf("\nAverage Turnaround Time = %.2f\n", total_tat / n);
    printf("Average Waiting Time    = %.2f\n", total_wt / n);
    printf("Average Response Time   = %.2f\n", total_rt / n);

    return 0;
}
