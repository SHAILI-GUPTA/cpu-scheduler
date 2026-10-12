# ⚡ CPU Scheduling Simulator & Visualizer (OS Lab 5 & 6 + Priority)

A state-of-the-art, interactive, web-based CPU Scheduling Visualizer built for **Operating Systems Labs (20CP207P Lab 5 & Lab 6)** and practical study.

This project features **dual execution modes**:
1. **100% Client-Side Pure JavaScript Engine**: Runs directly in any web browser without needing Python installed, perfect for static Vercel, Netlify, or GitHub Pages deployment!
2. **Python Flask Serverless / WSGI Engine**: Powered by clean algorithms in `scheduler.py` for local Python execution and Vercel serverless functions.

---

## 🌟 Key Features

1. **Multi-Step Guided Wizard Workflow**:
   - **Step 1: Algorithm Showcase**: Visual cards for FCFS, SJF, SRTN, Round Robin, Priority (Preemptive & Non-Preemptive) with direct selection.
   - **Step 2: Process Queue Configuration**: Interactive table to configure Arrival Time ($AT$), Burst Time ($BT$), Priority, and Time Quantum ($Q$). Includes Demo presets and Randomizer.
   - **Step 3: Live Simulation & Execution**: Screen-fit Gantt chart, Hardware CPU Core, Ready Queue, Results Table, and Mathematical Formulas.

2. **Interactive Step-by-Step Scheduling via Spacebar**:
   - Click **"🚀 Start Scheduling Algorithm"** or press <kbd>Spacebar</kbd> to load processes one-by-one into the Gantt chart and results table.
   - Live hardware status shows the current CPU Core state (Running/Idle), clock timestamp ($t$), and the real-time Ready Queue.
   - Individual table rows transition through `WAITING` ➔ `READY` ➔ `RUNNING` ➔ `TERMINATED`.

3. **Auto-Fit Screen Gantt Chart**:
   - Proportionally scales to **100% of your screen width** — no horizontal scrolling required.
   - Real-time scrubbing needle and ruler with exact timestamp markers.

4. **🏁 Finish & Reload to First Page**:
   - A dedicated **"🏁 Finish & Reload to First Page"** button appears at the end of simulation (both in the top navigation bar, the main control deck, and in the bottom completion card).
   - Smoothly resets the entire simulation state and reloads the application back to Step 1.

5. **Side-by-Side Algorithm Comparison**:
   - Evaluate FCFS, SJF, SRTN, RR, Priority Non-Preemptive, and Priority Preemptive on your current process queue.
   - Automatically highlights the optimal algorithm with minimal average waiting time.

6. **Embedded University C Language Source Programs**:
   - Instant access to standalone, compilable C code for all Lab 5 & Lab 6 algorithms via the in-app modal.

---

## 🚀 Step-by-Step Vercel Deployment Guide

You can deploy this project to **Vercel** in less than 2 minutes using either **Method 1 (GitHub - Recommended)** or **Method 2 (Vercel CLI)**.

### Method 1: Deploy via GitHub (Recommended & Easiest)

1. **Initialize Git Repository and Push to GitHub**:
   Open PowerShell or Terminal in the project folder:
   ```bash
   cd C:\Users\shail\.gemini\antigravity\scratch\cpu_scheduler
   git init
   git add .
   git commit -m "Initial commit of CPU Scheduling Simulator"
   ```
   Create a new repository on your [GitHub](https://github.com/new) account (e.g., `cpu-scheduling-simulator`), then run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/cpu-scheduling-simulator.git
   git branch -M main
   git push -u origin main
   ```

2. **Import Project to Vercel**:
   - Log in to your [Vercel Dashboard](https://vercel.com).
   - Click **"Add New..."** ➔ **"Project"**.
   - Under *Import Git Repository*, select your repository `cpu-scheduling-simulator` and click **Import**.

3. **Deploy**:
   - **Framework Preset**: Leave as *Other*.
   - **Root Directory**: `./` (Default).
   - Click **Deploy**!
   - In approximately 20 seconds, your site is live with a public URL like `https://cpu-scheduling-simulator.vercel.app`!

---

### Method 2: Deploy via Vercel CLI (Direct Terminal Upload)

If you don't want to use GitHub, you can deploy straight from your computer:

1. **Install Vercel CLI**:
   ```powershell
   npm install -g vercel
   ```

2. **Login and Deploy**:
   In your project directory:
   ```powershell
   cd C:\Users\shail\.gemini\antigravity\scratch\cpu_scheduler
   vercel
   ```
   Follow the brief prompts:
   - *Set up and deploy?* ➔ `Y`
   - *Which scope?* ➔ Select your account
   - *Link to existing project?* ➔ `N`
   - *Project name?* ➔ `cpu-scheduling-simulator`
   - *In which directory is your code located?* ➔ `./`
   - *Want to modify settings?* ➔ `N`

3. **Production Deployment**:
   ```powershell
   vercel --prod
   ```
   Your app will be deployed and you will receive your live URL immediately.

---

## 💻 Running Locally (Optional)

If you want to run it on your local machine:

### Option A: Open directly in your browser (Zero installation!)
Simply double-click `index.html` or open it in Chrome / Edge / Firefox. The full application runs 100% in the browser.

### Option B: Run Python Server
```powershell
cd C:\Users\shail\.gemini\antigravity\scratch\cpu_scheduler
python scheduler.py
```
This automatically starts the Flask server on `http://127.0.0.1:5000` and launches your default web browser!

---

## 📁 Repository Structure

```
cpu_scheduler/
│
├── index.html                 # Root single-page entry for Vercel & static hosting
├── vercel.json                # Vercel deployment routing configuration
├── requirements.txt           # Python dependencies (flask)
├── scheduler.py               # Complete Python scheduling engine & local Flask launcher
├── README.md                  # Project documentation & deployment guide
│
├── api/
│   └── index.py               # Vercel serverless WSGI entry point
│
├── templates/
│   └── index.html             # Flask template copy
│
├── static/
│   ├── css/
│   │   └── style.css          # Modern dark UI, screen-fit Gantt, completion card
│   └── js/
│       └── app.js             # Client controller, spacebar progression, JS math engine
│
└── c_implementations/         # University OS Lab C source programs
    ├── lab5_fcfs.c            # Lab 5: FCFS in C
    ├── lab5_sjf.c             # Lab 5: SJF Non-Preemptive in C
    ├── lab6_srtn.c            # Lab 6: SRTN Preemptive SJF in C
    ├── lab6_round_robin.c     # Lab 6: Round Robin in C
    └── priority.c             # Priority Scheduling in C
```
