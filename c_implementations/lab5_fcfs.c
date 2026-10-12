/*
 * Lab 5: First-Come, First-Served (FCFS) CPU Scheduling in C
 * Course: 20CP207P - Operating Systems Lab
 */

#include <stdio.h>

struct Process {
    int pid;
    int at; // Arrival Time
    int bt; // Burst Time
    int ct; // Completion Time
    int tat;// Turnaround Time
    int wt; // Waiting Time
    int rt; // Response Time
};

void sort_by_arrival(struct Process p[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (p[j].at > p[j + 1].at || (p[j].at == p[j + 1].at && p[j].pid > p[j + 1].pid)) {
                struct Process temp = p[j];
                p[j] = p[j + 1];
                p[j + 1] = temp;
            }
        }
    }
}

int main() {
    int n;
    printf("=== FCFS CPU Scheduling Algorithm ===\n");
    printf("Enter number of processes: ");
    if (scanf("%d", &n) != 1 || n <= 0) return 0;

    struct Process p[n];
    for (int i = 0; i < n; i++) {
        p[i].pid = i + 1;
        printf("Process P%d - Arrival Time: ", i + 1);
        scanf("%d", &p[i].at);
        printf("Process P%d - Burst Time: ", i + 1);
        scanf("%d", &p[i].bt);
    }

    sort_by_arrival(p, n);

    int current_time = 0;
    float total_tat = 0, total_wt = 0, total_rt = 0;

    printf("\n--- Gantt Chart ---\n|");
    for (int i = 0; i < n; i++) {
        if (current_time < p[i].at) {
            printf(" IDLE (%d-%d) |", current_time, p[i].at);
            current_time = p[i].at;
        }
        int start_time = current_time;
        current_time += p[i].bt;
        p[i].ct = current_time;
        p[i].tat = p[i].ct - p[i].at;
        p[i].wt = p[i].tat - p[i].bt;
        p[i].rt = start_time - p[i].at;

        total_tat += p[i].tat;
        total_wt += p[i].wt;
        total_rt += p[i].rt;

        printf("  P%d (%d-%d)  |", p[i].pid, start_time, p[i].ct);
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
