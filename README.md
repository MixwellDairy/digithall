# DigiHall - Digital Hall Pass System

DigiHall is a locally hosted, self-hosted alternative to SmartPass for K-12 schools. It helps manage student movement, improve safety, and reduce classroom disruptions.

## Features
- **Real-Time Monitoring:** Bird's-eye view of all student movement in the hall.
- **Encounter Prevention:** Restrict specific students from being out simultaneously.
- **Room Capacity:** Set limits on how many students can be in a room (e.g., restroom) at once.
- **Daily Pass Limits:** Prevent excessive hallway usage with credit-based limits (Round-Trip vs. One-Way).
- **Per-Room Timers:** Custom duration limits (e.g., 5-minute bathroom timer).
- **Kiosk Mode:** Transform any classroom tablet/computer into a check-in/out station.
- **Flagging & Accountability:** Track student history and flag students for warnings.
- **CSV Reporting:** Export complete hall usage records for analysis.

## Installation

### Windows
1.  Run `install.bat`.
2.  Start the system with `start.bat`.

### macOS / Linux
1.  Run `./install.sh`.
2.  Start the system with `./start.sh`.

## Setup
- **Admin Login:** Default username `admin`, password `admin123`.
- **Kiosk Mode:** Navigate to `/kiosk` and select the classroom to activate Kiosk Mode.
- **Staff/Student Access:** Hosted on the host computer's local IP address (e.g., `http://192.168.1.10:3000`).

## Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion, Lucide icons.
- **Backend:** Node.js, Express, Prisma, SQLite, Socket.io.
