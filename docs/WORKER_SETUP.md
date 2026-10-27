# Home worker setup — ThinkCentre + laptop

**Product:** Trace Market Intelligence (`TraceMI/0.1`)  
**Purpose:** connect the mini PC so you can set it up from the laptop, then leave the PC on the **home ISP** as the only SEC identity.

The laptop is a **keyboard and screen**. It is **not** the internet path for EDGAR.

**OS:** Windows 11 Pro is enough. Linux as the only operating system was never required. WSL is optional.

Related: [INGEST_WORKER_HOST.md](./INGEST_WORKER_HOST.md), [STATUS.md](./STATUS.md), [DATA_STORAGE.md](./DATA_STORAGE.md) (if present on this branch).

This agent and Hostinger/Vercel must **never** get the three ingest flags.

---

## What “through the laptop” means

| OK | Not OK |
| --- | --- |
| Mini PC on **its own** Ethernet (or Wi‑Fi) to **your router** | Mini PC using the laptop as a hotspot, ICS, or USB tether |
| Laptop on the same LAN; **Remote Desktop** into the PC | Laptop VPN / travel Wi‑Fi as the worker’s exit |
| After setup, unplug the monitor; PC stays powered | Sleep, lid-close, or “when I shut the laptop the worker dies” |

SEC will see **one public IPv4** — the house/office ISP. That is the point. Sharing the laptop’s connection gives you a second, unstable identity (and often CGNAT or a phone carrier).

```text
   [ThinkCentre] --Ethernet--> [Home router] --ISP--> www.sec.gov
         ^
         |  same LAN only (RDP / SSH)
   [Your laptop]
```

No inbound port-forward from the internet is required for ingest. The worker only needs **outbound HTTPS (443)**.

---

## 0. If you have no monitor (HP Elitebook + ThinkCentre)

You do **not** need to buy a computer monitor for everyday use. You **do** need a picture **once**, so you can turn on Remote Desktop. After that, the Elitebook is the screen.

### What will not work

Do **not** run an HDMI cable from the ThinkCentre into the Elitebook’s HDMI port. On that laptop, HDMI and USB‑C are **outputs** (laptop → TV). They cannot show another computer’s screen. A USB thumb drive also cannot carry video.

The M715q’s video ports on the back are almost always **two DisplayPort** sockets (wide, not HDMI). Your TV/laptop cables are usually HDMI. You will likely need a **DisplayPort-to-HDMI** cable or adapter.

### Choose one way to see the first screen

Pick **one**. Easiest is A.

**A — Borrow a TV or any monitor for 20 minutes (recommended)**

Buy or borrow:

- Ethernet cable (mini PC → home router)  
- USB keyboard and USB mouse  
- **DisplayPort-to-HDMI** cable (or DP cable if the TV/monitor has DisplayPort)  
- The ThinkCentre’s own power brick  

Steps:

1. Put the ThinkCentre on a table next to the TV.  
2. Power brick into the wall and into the mini PC.  
3. Ethernet from the mini PC’s **LAN** port (square with a clip, like a fat phone jack) into your **router**, not into the laptop.  
4. DisplayPort on the mini PC → HDMI on the TV. Set the TV to that HDMI input.  
5. Plug keyboard and mouse into the mini PC’s USB ports.  
6. Press the power button on the ThinkCentre. Wait for Windows.  
7. Do **section 1** below (Remote Desktop + never sleep). Write down the PC name and the LAN IP (example: `192.168.1.40`).  
8. Unplug the TV. Leave **power + Ethernet** connected. From now on, use the Elitebook (step B’s Remote Desktop part).

**B — Use the Elitebook as a screen (needs one extra gadget)**

Buy a **USB HDMI video capture** dongle (search “HDMI to USB capture”). Also buy DisplayPort-to-HDMI if the mini PC has no HDMI.

1. ThinkCentre DisplayPort → HDMI → **capture dongle** → USB on the Elitebook.  
2. Keyboard and mouse still plug into the **ThinkCentre**, not the laptop.  
3. On the Elitebook, open the capture app (often “USB Video” in the Camera app, or VLC → Open Capture Device). You are watching the mini PC; you are not using the laptop as a Windows “second monitor.”  
4. Ethernet still goes ThinkCentre → **router**.  
5. Finish section 1, then you can put the capture dongle away and use Remote Desktop.

**C — Do not do this first:** guessing Windows setup with no picture at all. Too easy to get stuck on a login you cannot see.

### After you have Remote Desktop

On the **Elitebook**, same house Wi‑Fi as the router:

1. Press the Windows key, type `Remote Desktop Connection`, open it.  
2. Computer: the LAN IP you wrote down (or the PC name).  
3. Sign in with the Windows user you created on the ThinkCentre.  
4. You should see the ThinkCentre desktop on the laptop. The mini PC no longer needs a TV.

Then continue this file from **section 3** (Node.js + Git on Windows — no Linux required).

---

## 1. Physical connectivity (do this first)

1. Plug the M715q into **wall power**. It must stay on 24/7.  
2. Plug **Ethernet** from the mini PC into the router or a switch on that router. Prefer Ethernet over Wi‑Fi.  
3. First boot: see **section 0** if you have no monitor. The Elitebook HDMI port cannot receive the mini PC’s picture.  
4. Install/activate **Windows 11 Pro** (you already have Pro — you need it for Remote Desktop).  
5. Windows Settings → System → Remote Desktop → **On**. Note the PC name and the LAN IPv4 (Settings → Network → Ethernet).  
6. Settings → System → Power: **never sleep / never hibernate** on plugged in. Fast Startup **off**.  
   In admin PowerShell: `powercfg /change standby-timeout-ac 0` and `powercfg /hibernate off`.  
7. Optional: in the router, **DHCP reservation** so the mini PC always gets the same LAN IP (e.g. `192.168.1.40`).  
8. From the **laptop on the same Wi‑Fi/LAN**, open Remote Desktop and connect to that LAN IP. After this works, you can put the mini PC in a closet with only power + Ethernet.

**Check the public IP from the mini PC** (browser or PowerShell), not from the laptop:

```powershell
(Invoke-RestMethod https://api.ipify.org)
```

That address should be your home ISP. If it looks like a datacenter or you share a CGNAT (many “5G home” and some fiber gateways), ask the ISP for a **public IPv4**. Do not add a VPN to “fix” it.

---

## 2. Optional: reach the PC when you are not home

Do **not** open Remote Desktop or SSH to the whole internet.

If you need to log in from elsewhere later:

- **Tailscale** (or similar) on the mini PC **and** the laptop, **exit node off**, “use this machine as exit” off.  
- You SSH/RDP **over Tailscale**.  
- All SEC and Hostinger traffic must still leave via the **default route = home router**.

A full-tunnel VPN or “secure browser” on the worker will put EDGAR on the wrong IP again.

---

## 3. Software on the mini PC (from RDP)

**You keep Windows 11 Pro.** The project never required wiping the ThinkCentre and installing Linux as the only OS. The worker is **Node.js**. It runs on Windows.

The cloud VPS tries (Hetzner, DigitalOcean) happened to be Ubuntu. That was the VPS image, not a rule that the home box must be Linux.

Two valid ways:

| Track | What you install | When to use |
| --- | --- | --- |
| **A — Windows (default for this PC)** | [Node.js 22 LTS](https://nodejs.org/) for Windows, Git for Windows | Matches the machine you bought. Use this unless NTFS gets painfully slow on the first extract. |
| **B — WSL2 Ubuntu (optional)** | Linux *inside* Windows; you still boot Windows | Slightly better for hundreds of thousands of small JSON files. **Not required.** |

### Track A — PowerShell on Windows (no Ubuntu)

Install **Node.js 22 LTS** and **Git for Windows** (defaults are fine). Then in **PowerShell**:

```powershell
node -v    # v22.x
git clone https://github.com/r3s0lv343vr/Market-Intelligence-Platform.git
cd Market-Intelligence-Platform\apps\web
npm install
npm test
npm run ingest:sec
```

`ingest:sec` must print the locked User-Agent and **refuse** to contact EDGAR.

Keep the repo on this PC’s disk (e.g. `C:\trace\Market-Intelligence-Platform`). Do not run the worker from a USB stick or a OneDrive-synced folder.

### Track B — WSL2 (optional)

Only if you want it. Admin PowerShell once: `wsl --install -d Ubuntu-24.04`. Then clone and `npm` in the **Ubuntu** window, under `/home/you/...`, not `/mnt/c/...`.

**256 GB note:** leave Windows updates room. Prefer a **512 GB** swap if you have not bought the disk yet. Do not also use this box as a Steam/photo drive.

---

## 4. Environment (only on this machine)

Create `apps/web/.env.worker` on this PC only (do not commit, do not copy to Hostinger/Vercel):

```bash
# apps/web/.env.worker  — worker host only
TRACE_INGEST_HOST_ROLE=worker
TRACE_INGEST_ENABLED=true
TRACE_INGEST_CONFIRM=TraceMI/0.1
```

Load it only when you intend a live night:

**Windows PowerShell** (track A):

```powershell
cd C:\trace\Market-Intelligence-Platform\apps\web
Get-Content .env.worker | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k,$v = $_.Split('=',2); Set-Item -Path "Env:$k" -Value $v
}
```

**Ubuntu** (track B only): `set -a && source .env.worker && set +a`

Until the refuse test is green, **leave those unset**.

---

## 5. Tasks you set once, then leave

### Refuse test (no flags)

```powershell
cd C:\trace\Market-Intelligence-Platform\apps\web
npm run ingest:worker:once
```

You should see a refuse / fixture result with **`contactedSec` false**. If it tries SEC, stop.

### One live try (flags on, you watching)

Load `.env.worker` (track A or B), then:

```powershell
npm run ingest:worker:once
```

- **200 + bronze files** → first night worked. Leave the timer (below).  
- **403/429** → circuit; **do not retry**. Unset the three variables. Email webmaster if it is a real block. Do not add a VPS.

### Nightly timer (after a successful `once`)

**Track A (Windows):** Task Scheduler, trigger **At startup**, action:

`C:\Program Files\nodejs\npm.cmd`  
arguments: `run ingest:worker`  
start in: `C:\trace\Market-Intelligence-Platform\apps\web`  

Set the three ingest variables on the task (or a `.env` loader) **only after** a successful watched `once`. Run whether user is logged on or not.

**Track B (WSL, optional):** startup task runs `wsl.exe` with `npm run ingest:worker` inside Ubuntu.

`ingest:worker` **sleeps until 3:30 a.m. America/New_York**. Windows Update: keep it off that hour. A dedicated local Windows user that auto-starts is fine on a box that never leaves the house.

Do not also run ingest on the laptop, Hostinger, Vercel, or Cursor.

---

## 6. Connectivity the *product* needs

| Path | Required now? | How |
| --- | --- | --- |
| Mini PC → `www.sec.gov` :443 | Yes, for live bronze | Home ISP, identified User-Agent |
| Mini PC → GitHub :443 | Yes, to clone/pull | Same ISP |
| Laptop → mini PC :3389 | Yes, for setup | **LAN only** (or Tailscale) |
| Mini PC → Hostinger | Later | Outbound `scp`/`rsync` of **packs**, after silver/gold. Not EDGAR from Hostinger |
| Internet → mini PC | No | Do not port-forward |

The website stays on Hostinger. Users never wait on this PC. After gold exists, you copy packs **out**; you do not point DNS at the ThinkCentre.

---

## 7. Leave-it-alone checklist

- [ ] Ethernet to the **router**, not the laptop  
- [ ] Public IP checked **on the mini PC**  
- [ ] Sleep/hibernate off; power + Ethernet only  
- [ ] RDP from laptop works  
- [ ] Node 22 + `npm test` green (Windows **or** optional WSL)  
- [ ] `ingest:sec` / `ingest:worker:once` **without** flags refuses SEC  
- [ ] One live `once` when you are ready — then timer, not a second IP  
- [ ] `.env.worker` never on Vercel/Hostinger/git  

If you want this agent to walk a **refuse-only** log you paste, do that. Do not ask this cloud environment to set the three flags or call EDGAR.
