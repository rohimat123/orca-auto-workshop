# ORCA Auto Workshop — Tim Karyawan Live, Menu Upgrades & Alur Order Google Form

Menambahkan daftar **6 Karyawan Workshop** berjajar horizontal dengan sinkronisasi status **On Duty / Off Duty** otomatis melalui Google Sheets & Apps Script, menambahkan langkah **Upgrades** ($400 per item, maksimal 4 item) di atas Nitro pada Kalkulator Biaya, serta menuntaskan alur pengiriman order aman melalui **Google Form → Google Sheets → Apps Script → Discord Embed**.

## User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh keputusan utama berikut sudah diselaraskan dengan pilihan Anda pada tahap klarifikasi sebelumnya. Silakan tinjau sebelum proses implementasi dimulai.

- **Cakupan Fitur (Terkonfirmasi)**: Mengerjakan ketiganya sekaligus — **6 Kartu Karyawan** tepat sebelum bagian *Tipe Kendaraan*, **Menu Upgrades** di Kalkulator Biaya, serta penyelesaian & verifikasi **alur order Google Form → Apps Script → Discord**.
- **Posisi & Interaksi Menu Upgrades (Terkonfirmasi)**: Kartu terpisah tepat **di atas Nitro** (menjadi langkah `03. Upgrades`, menggeser Nitro ke `04.`, Modifikasi Body ke `05.`, dan Velg ke `06.`), dilengkapi tombol pilih masing-masing (**Engine**, **Body**, **Alarm**, **Fuel Tank** @ `$400.00`) serta tombol cepat **Pilih Semua 4 Upgrades**.
- **Sumber Status Karyawan (Terkonfirmasi)**: Sinkronisasi otomatis melalui **Google Sheets / Apps Script** (endpoint publik JSON `doGet()` pada proyek Apps Script yang sama). Untuk sinkronisasi dari pesan channel Discord privat (`1344920657431105546 / 1573656138895855626 / 1573657908812587100`), Apps Script juga menyediakan opsi pembacaan terjadwal menggunakan token bot yang disimpan aman di *Script Properties* — atau admin cukup memperbarui kolom status langsung di tab **Karyawan** Google Sheets.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Tim Karyawan Workshop (6 Kolom Horizontal)**: Menampilkan 6 mekanik/staf ORCA Auto Workshop berjajar rapi dari kiri ke kanan sebelum bagian *Tipe Kendaraan*. Setiap kartu menampilkan **Foto Karyawan**, **Nama Karyawan**, **Jabatan**, dan status **On Duty / Off Duty** yang ditarik langsung dari Google Sheets / Apps Script (dengan tampilan default bawaan yang siap pakai sebelum URL feed dikonfigurasi).
  2. **Kalkulator Upgrades ($400 × 1–4)**: Memberi pelanggan kebebasan memilih hingga 4 paket upgrade performa & keamanan — **Engine**, **Body**, **Alarm**, dan **Fuel Tank** — masing-masing seharga **$400.00** (maksimal **$1,600.00**), terhitung otomatis di Ringkasan Belanja dan ikut terkirim ke laporan Discord.
  3. **Alur Order Aman via Google Form**: Memutus ketergantungan pada webhook langsung di browser/Vercel. Pesanan dikirim lewat `POST (no-cors)` ke Google Form, tercatat otomatis ke Google Sheets sebagai database pesanan, lalu Apps Script mengirim pesan **Discord Embed** rapi (blok kode rata kolom + tanggal WIB + tag `@mechanic`) menggunakan URL webhook baru yang tersimpan tersembunyi di server Google.
- **Target Audience**: Pelanggan bengkel (pembeli modifikasi WAA & Locolow) yang ingin mengecek mekanik bertugas, menyusun estimasi biaya lengkap termasuk Upgrades, lalu mengirim pesanan langsung ke Discord workshop.
- **Key Value**: Transparansi staf yang sedang bertugas secara real-time, perhitungan biaya upgrades yang akurat tanpa salah hitung, dan perlindungan penuh terhadap URL Webhook Discord baru agar tidak bisa dibobol dari sisi klien.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Mengecek Tim Karyawan Bertugas**:
   - Pengguna membuka halaman utama → tepat di bawah Hero dan sebelum *Tipe Kendaraan*, tampil 1 baris berisi **6 kartu karyawan** berjajar dari kiri ke kanan.
   - Setiap kartu memperlihatkan potret karyawan rasio `1:1` (tajam, tanpa gambar pecah), nama lengkap, jabatan, dan label teks status yang tegas (**On Duty** atau **Off Duty**).
   - Di sudut kanan atas header bagian ini tersedia ringkasan jumlah mekanik aktif (mis. `3 On Duty · 6 Staf`) serta tombol **Perbarui Status** untuk memuat ulang data terbaru dari Google Sheets / Apps Script.
2. **Memilih Upgrades di Kalkulator Biaya**:
   - Pengguna masuk ke bagian *Hitung Total Biaya Sebelum Order*.
   - Pada langkah **`03. Upgrades (Maks. 4 · $400.00 / item)`** tepat di atas Nitro:
     - Tersedia tombol cepat **Pilih Semua 4 Upgrades ($1,600.00)** dan tombol **Kosongkan** (muncul saat minimal 1 upgrade dipilih).
     - Grid 4 tombol interaktif (**Engine**, **Body**, **Alarm**, **Fuel Tank**) yang masing-masing menampilkan harga `$400.00` dalam format angka tabular (`tabular-nums`).
   - Setiap klik langsung memperbarui daftar item di **Ringkasan Belanja**, lencana jumlah item di Navbar, dan **Total Biaya Belanja**. Item upgrade juga bisa dihapus satuan lewat ikon hapus di Ringkasan Belanja atau dibersihkan lewat tombol **Reset**.
3. **Mengirim Pesanan via Google Form ke Discord**:
   - Pengguna mengisi kolom wajib **Nama Pembeli** di Ringkasan Belanja lalu menekan **Kirim Order ke Discord**.
   - Semua pilihan (termasuk daftar Upgrades, Paintjob/Warna, Nitro, Body Mod, dan Velg) diformat menjadi 4 kolom terstruktur lalu dikirim ke Google Form.
   - Google Sheets mencatat pesanan dan Apps Script langsung mengirim **Discord Embed** bergaris aksen biru + blok kode monospace + tag `@mechanic`.

### Visual Identity & Theme

- **Aesthetic Direction**: Industrial automotive workshop — tegas, presisi, bersih, konsisten penuh dengan identitas visual ORCA Auto Workshop yang sudah ada.
- **Color Palette & Mood (60-30-10)**:
  - **Seksi Tim Karyawan (Light Surface)**: Latar `#F6F7F9`, kartu `#FFFFFF` dengan batas garis tipis `border-[#DCE1E8]`, teks utama `#111317`, teks sekunder `#525C6A`, aksen kicker `#D93025`. Status **On Duty** menggunakan teks kontras tinggi hijau gelap `#15803D` disertai label eksplisit `On Duty`, sedangkan **Off Duty** menggunakan netral `#6B7280` dengan label `Off Duty` — tanpa kapsul/pill warna mencolok dan tanpa titik animasi berkedip.
  - **Kartu Upgrades di Kalkulator (Dark Surface)**: Konsisten dengan kartu kalkulator lainnya (`bg-[#181B22]`, `border-[#2A2F3A]`, tombol tidak aktif `bg-[#111317]`, tombol aktif `bg-white text-[#111317]`, harga `$400.00` menggunakan `font-mono tabular-nums`).
- **Typography & Hierarchy**:
  - Mempertahankan pasangan huruf eksisting **Barlow Condensed** (`font-display`) untuk judul bagian dengan `text-wrap: balance`, **Plus Jakarta Sans** untuk teks dan tombol, serta **JetBrains Mono** (`tabular-nums`) untuk harga dan hitungan.
- **Responsive Grid & Media Discipline**:
  - **Tim Karyawan**: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` dengan celah konsisten (`gap-4`) agar tepat 6 karyawan tampil sejajar dalam 1 baris penuh pada desktop `1440px`, dengan padding luar kontainer ≥ celah antar kartu.
  - **Foto Karyawan**: 6 potret mekanik profesional dihasilkan lewat `generate_image` (`1:1`) sebagai aset lokal bebas tautan eksternal rapuh, otomatis diganti bila Google Sheets menyertakan URL foto `https://` yang valid, serta dilengkapi fallback inisial bergaya bersih bila tautan eksternal gagal dimuat.

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Satu Proyek Google Apps Script untuk Dua Tugas (Order Embed + Status Karyawan)**
  - *Pilihan*: Menggunakan satu proyek Apps Script yang terhubung ke Google Sheets yang sama — fungsi `onFormSubmit(e)` untuk meneruskan order ke Discord Embed, dan fungsi `doGet()` untuk menyediakan daftar 6 karyawan beserta status `On Duty / Off Duty` dalam format JSON.
  - *Alasan*: Pemilik bengkel hanya perlu mengelola satu Spreadsheet dan satu proyek Apps Script saja (Tab 1: respons pesanan otomatis dari Google Form; Tab 2: daftar 6 karyawan).
  - *Alternatif yang Dipertimbangkan*: Memanggil Discord API langsung dari frontend/Vercel ditolak karena mengekspos token bot atau memerlukan server backend tambahan; memisahkan menjadi dua proyek Apps Script hanya menambah kerumitan perawatan.
- **Keputusan 2: Opsi Sinkronisasi Status dari Channel Discord di Sisi Apps Script**
  - *Pilihan*: Di dalam Apps Script, disediakan pula fungsi opsional `syncDutyStatusFromDiscord()` yang membaca pesan `1344920657431105546 / 1573656138895855626 / 1573657908812587100` memakai `DISCORD_BOT_TOKEN` di *Script Properties* dan menyimpannya ke Tab **Karyawan** tiap beberapa menit — namun jika pemilik belum ingin membuat Bot Discord, mengubah kolom `Status` (`On Duty` / `Off Duty`) langsung di Google Sheets sudah langsung memperbarui website.
  - *Alasan*: Memberi jalur termudah yang langsung bekerja hari ini sekaligus mendukung otomatisasi penuh dari pesan Discord referensi Anda tanpa membocorkan token apa pun ke web.
- **Keputusan 3: Upgrades Sebagai Multi-Select Independen di Atas Nitro**
  - *Pilihan*: Keempat upgrade (**Engine**, **Body**, **Alarm**, **Fuel Tank**) disimpan sebagai daftar ID terpilih (masing-masing `$400.00`, bisa pilih 0 hingga 4), tidak saling menghapus saat ganti kendaraan WAA ↔ Locolow karena semua kendaraan dapat memasang 4 upgrade dasar ini.
  - *Alasan*: Memudahkan pelanggan membandingkan mobil tanpa kehilangan pilihan upgrade, dan perhitungannya transparan di Ringkasan Belanja maupun di blok kode Discord.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND WEB (Static Vite SPA / Vercel)              │
│                                                                         │
│  ┌──────────────────────────────┐   ┌────────────────────────────────┐  │
│  │  Tim Karyawan (6 Kolom)      │   │  Kalkulator Biaya (6 Langkah)  │  │
│  │  • Foto, Nama, Jabatan       │   │  01. Kendaraan                 │  │
│  │  • Status On Duty / Off Duty │   │  02. Paintjob / Change Color   │  │
│  │  • Tombol Perbarui Status    │   │  03. Upgrades (4 × $400)  ◄────┼──┼─ BARU
│  └──────────────▲───────────────┘   │  04. Nitro (N2O)               │  │
│                 │                   │  05. Modifikasi Body           │  │
│    GET JSON     │                   │  06. Velg                      │  │
│    (Publik)     │                   │  + Nama Pembeli & Kirim Order  │  │
│                 │                   └───────────────┬────────────────┘  │
└─────────────────┼───────────────────────────────────┼───────────────────┘
                  │                                   │ HTTP POST (no-cors)
                  │                                   │ entry.<ID> fields
┌─────────────────┼───────────────────────────────────▼───────────────────┐
│                 │      GOOGLE SERVER (Lapisan Perantara Aman)           │
│  ┌──────────────┴───────────────┐   ┌────────────────────────────────┐  │
│  │  Apps Script: doGet()        │   │  Google Form (formResponse)    │  │
│  │  Membaca Tab "Karyawan"      │   │  Otomatis catat ke Sheets      │  │
│  │  (opsional sync Bot Discord) │   └───────────────┬────────────────┘  │
│  └──────────────▲───────────────┘                   │ On Form Submit    │
│                 │                   ┌───────────────▼────────────────┐  │
│  ┌──────────────┴───────────────┐   │  Apps Script: onFormSubmit()   │  │
│  │  Google Sheets               │   │  • Baca DISCORD_WEBHOOK_URL    │  │
│  │  • Tab 1: Form Responses     │   │    dari Script Properties      │  │
│  │  • Tab 2: Karyawan (6 baris) │   │  • Format Discord Embed +      │  │
│  └──────────────────────────────┘   │    Tag Role @mechanic          │  │
│                                     └───────────────┬────────────────┘  │
└─────────────────────────────────────────────────────┼───────────────────┘
                                                      │ Server-to-Server
                                                      │ UrlFetchApp.fetch
                                      ┌───────────────▼───────────────────┐
                                      │      DISCORD WEBHOOK API          │
                                      │  Channel Order ORCA Auto Workshop │
                                      └───────────────────────────────────┘
```

### Data Model & State

- **Upgrades Catalog**: 4 item tetap — `upgrade-engine` (**Engine**), `upgrade-body` (**Body**), `upgrade-alarm` (**Alarm**), `upgrade-fuel-tank` (**Fuel Tank**), masing-masing berharga `$400.00`. Disimpan di state aplikasi sebagai array `upgradeIds: UpgradeId[]` (maksimal 4 item unik).
- **Order Breakdown & Google Form Payload**: `calculateOrder()` menggabungkan item Upgrades (kategori `Upgrades`) ke daftar `items` dan total biaya, sehingga otomatis muncul di Ringkasan Belanja dan di kolom `Rincian Item & Harga` + `Total Biaya` yang dikirim ke Google Form.
- **Employee Roster Model**: Array tepat 6 karyawan (`id`, `name`, `role`, `photoUrl`, `status: 'on-duty' | 'off-duty'`). Saat endpoint `VITE_STAFF_STATUS_API_URL` (URL Web App Apps Script) dikonfigurasi, frontend melakukan `fetch` JSON, memvalidasi struktur respons, dan memperbarui daftar 6 karyawan secara aman (dengan fallback ke 6 data bawaan bila belum dikonfigurasi atau jaringan bermasalah).

### Interactive Component & State Mapping

- **Tim Karyawan**: Memuat status otomatis saat halaman dibuka, menampilkan indikator muat halus dan tombol *Perbarui Status* untuk memuat ulang tanpa me-reload halaman, serta menampilkan pesan ramah jika gagal menyegarkan (sambil mempertahankan data terakhir).
- **Kartu 03. Upgrades**: Klik tiap kartu upgrade melakukan toggle aktif/nonaktif; klik **Pilih Semua 4 Upgrades** memilih keempatnya sekaligus (`$1,600.00`); klik **Kosongkan** menghapus semua upgrade; klik ikon hapus pada baris upgrade di Ringkasan Belanja menghapus upgrade tersebut saja; tombol **Reset** di Ringkasan Belanja ikut mengosongkan `upgradeIds`.
- **Pengiriman Google Form**: Tetap menerapkan validasi wajib **Nama Pembeli** (2–60 karakter), jeda anti-klik-ganda 5 detik, dan pesan status jelas bila variabel Google Form belum diatur.

### Security Safeguards

- **Rahasia hanya di server Google**: URL Webhook Discord baru dan token Bot Discord (opsional) hanya disimpan di **Google Apps Script → Project Settings → Script Properties** — tidak pernah ada di kode frontend, GitHub, ataupun Vercel.
- **Validasi tautan & sanitasi input**: URL Google Form dibatasi khusus ke `https://docs.google.com/forms/...`, URL feed karyawan dibatasi ke `https://script.google.com/...` / `https://script.googleusercontent.com/...`, foto karyawan eksternal hanya mengizinkan skema `https://` aman, dan input nama pembeli dibersihkan dari karakter *backtick* serta awalan formula spreadsheet (`=`, `+`, `-`, `@`).
- **Kunci mention Discord**: Payload Embed di Apps Script mengunci `allowed_mentions` khusus ke Role ID mechanic (`1572198506851213353`) agar tidak bisa memicu `@everyone` atau mention lain.
