/*
 * Lab 5: Shortest Job First (SJF - Non-Preemptive) CPU Scheduling in C
 * Course: 20CP207P - Operating Systems Lab
 */

#include <stdio.h>
#include <stdbool.h>

struct Process {
    int pid;
    int at; // Arrival Time
    int bt; // Burst Time
    int ct; // Completion Time
    int tat;// Turnaround Time
    int wt; // Waiting Time
    int rt; // Response Time
    bool completed;
};

int main() {
    int n;
    printf("=== SJF (Non-Preemptive) CPU Scheduling Algorithm ===\n");
    printf("Enter number of processes: ");
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    struct Process p[n];
    for (int i = 0; i < n; i++) {
        p[i].pid = i + 1;
        printf("Process P%d - Arrival Time: ", i + 1);
        scanf("%d", &p[i].at);
        printf("Process P%d - Burst Time: ", i + 1);
        scanf("%d", &p[i].bt);
        p[i].completed = false;
    }

    int completed_count = 0;
    int current_time = 0;
    float total_tat = 0, total_wt = 0, total_rt = 0;

    printf("\n--- Gantt Chart ---\n|");

    while (completed_count < n) {
        int best_idx = -1;
        int min_bt = 1e9;

        for (int i = 0; i < n; i++) {
            if (!p[i].completed && p[i].at <= current_time) {
                if (p[i].bt < min_bt) {
                    min_bt = p[i].bt;
                    best_idx = i;
                } else if (p[i].bt == min_bt) {
                    if (p[i].at < p[best_idx].at) {
                        best_idx = i;
                    }
                }
            }
        }

        if (best_idx == -1) {
            // Find earliest arrival among uncompleted
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
