# Group Scheduler

Find a time that works for everyone. Group Scheduler lets a small group set up their recurring availability once and see who's free at a glance, instead of trading messages back and forth every week.
---

## Table of contents

- [How it works today](#how-it-works-today)
- [Roadmap](#roadmap)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Deploying](#deploying)
- [Opening this repo elsewhere](#opening-this-repo-elsewhere)
- [Contributing](#contributing)
- [License](#license)

---

## How it works today

1. **Sign in** with the shared 6-digit group code and pick your name from the example roster.
2. **Set your availability** in *User settings* — either mark whole days as fully busy, or give exact working hours per day.
3. **Browse the month** and open any day to see a graph of everyone's availability for that day.
4. **Tweak the look** in *Global settings* — busy color, and which hours of the day are shown on the daily graph.

Everything currently persists to `localStorage` in the browser, so it's great for demoing the UX but doesn't sync between people yet.

---

## Roadmap

Rough plan, roughly in the order it'll get built.

### Accounts & groups (next up)
- **Create a new group** flow: enter your name + a group name, and get back a fresh 6-digit code.
  - Code is valid for **1 month**.
  - The group leader can **regenerate** the code, rate-limited to **1 request per IP per month**.
- **Real login**: entering a code does an auth request to the server instead of just matching a constant.
- **Invites**: when someone new joins with the code, the group leader sees a pending request and has to **accept** them before they show up on the schedule.

### Scheduling improvements
- Custom **labels ** instead of the fixed work days                                  
- **Hover tooltips** on the hourly grid — hovering a "busy" cell should say whether it was auto-set from the weekly pattern or manually entered.

### Month view
- Small **percentage-busy indicator** on each day in the month view Chance of % to schedule day 

### Notifications
- When two or more people agree on a plan for a slot, notify everyone in the group:
  > *John and Anna have scheduled: **Beer Drinking***

### Out of scope for now, but interesting
- **[Hard]** Let someone **upload/scan a photo of their printed work schedule** and have it parsed automatically into working hours. Big lift (OCR + schedule parsing), parked for later.
### Server 
Self host server  

 
---

## Tech stack


---

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or newer
- npm (comes with Node) — yarn/pnpm work too, just swap the commands

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/group-scheduler.git
cd group-scheduler
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the dev server
```bash
npm run dev
```
This starts Vite's dev server, usually at **http://localhost:5173**, with hot reload — save a file and the browser updates instantly.

### 4. Sign in
Use group code `123456` and any of the example names (John Smith, Anna Juarez, Inga Vasily, Dmitri Petrov, Marie Elise, Tanya Lopes) to explore the app.

---

## Project structure

```
group-scheduler/
├── src/
│   ├── App.jsx        # all screens: login, calendar, day view, settings
│   ├── App.css         # theme + layout styles
│   └── main.jsx         # Vite entry point (renders <App />)
├── index.html
├── package.json
└── README.md
```

(Adjust paths above to match your actual layout if it differs — the important files are `App.jsx` and `App.css`.)

---

