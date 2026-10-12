/*
 * Lab 6: Round Robin (RR) CPU Scheduling in C
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
    int n, tq;
    printf("=== Round Robin (RR) CPU Scheduling Algorithm ===\n");
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

    printf("Enter Time Quantum: ");
    scanf("%d", &tq);
    if (tq <= 0) tq = 1;

    // Sort by arrival time initially
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (p[j].at > p[j + 1].at) {
                struct Process temp = p[j];
                p[j] = p[j + 1];
                p[j + 1] = temp;
            }
        }
    }

    int queue[1000];
    int front = 0, rear = 0;
    bool in_queue[n];
    for (int i = 0; i < n; i++) in_queue[i] = false;

    int current_time = 0;
    int completed = 0;
    float total_tat = 0, total_wt = 0, total_rt = 0;

    // Push initial arrivals
    for (int i = 0; i < n; i++) {
        if (p[i].at <= current_time) {
            queue[rear++] = i;
            in_queue[i] = true;
        }
    }

    printf("\n--- Gantt Chart ---\n|");

    while (completed < n) {
        if (front == rear) {
            // Queue is empty, find next arrival
            int next_at = 1e9;
            for (int i = 0; i < n; i++) {
                if (p[i].rem_bt > 0 && p[i].at < next_at) {
                    next_at = p[i].at;
                }
            }
            printf(" IDLE (%d-%d) |", current_time, next_at);
            current_time = next_at;
            for (int i = 0; i < n; i++) {
                if (p[i].at <= current_time && !in_queue[i] && p[i].rem_bt > 0) {
                    queue[rear++] = i;
                    in_queue[i] = true;
                }
            }
            continue;
        }

        int idx = queue[front++];

        if (p[idx].first_cpu == -1) {
            p[idx].first_cpu = current_time;
        }

        int exec_time = (p[idx].rem_bt < tq) ? p[idx].rem_bt : tq;
        int start_time = current_time;
        current_time += exec_time;
        p[idx].rem_bt -= exec_time;

        printf("  P%d (%d-%d)  |", p[idx].pid, start_time, current_time);

        // Check for new arrivals while executing
        for (int i = 0; i < n; i++) {
            if (p[i].at <= current_time && !in_queue[i] && p[i].rem_bt > 0) {
                queue[rear++] = i;
                in_queue[i] = true;
            }
        }

        if (p[idx].rem_bt == 0) {
            completed++;
            p[idx].ct = current_time;
            p[idx].tat = p[idx].ct - p[idx].at;
            p[idx].wt = p[idx].tat - p[idx].bt;
            p[idx].rt = p[idx].first_cpu - p[idx].at;

            total_tat += p[idx].tat;
            total_wt += p[idx].wt;
            total_rt += p[idx].rt;
        } else {
            queue[rear++] = idx;
        }
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
