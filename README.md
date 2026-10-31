# Dashboard Statistik Klien Jaringan

Dashboard React untuk memantau jumlah klien (DHCP, Dynamic, Hotspot, Guest) di kawasan **Gatsu**, **Ancol**, dan **Pejaten**, sesi **Pagi** dan **Siang**. Hanya dapat diakses dari jaringan BRIN.

## Fitur
- **Pencarian Pemilik Perangkat (MAC / Username)**: Cari data pemilik perangkat jaringan berdasarkan Username atau MAC Address lengkap dengan informasi hostname, waktu dibuat, dan waktu diperbarui
- Tema **terang dan gelap**: tombol di pojok kanan atas, mengikuti pengaturan perangkat saat pertama dibuka, pilihan diingat, tanpa kedip saat halaman dimuat
- Grafik garis tegas dan berwarna (SVG buatan sendiri, tanpa library chart). Garis menggambar dirinya setiap kali kawasan, sesi, atau rentang diganti, titik data muncul berurutan dan tooltip dan penanda saat disentuh atau diarahkan kursor
- Kawasan dan sesi (Pagi, Siang, Pagi & siang) dipilih lewat **dropdown daftar**
- Rentang memakai tombol dengan penanda geser; tabel menampilkan seluruh data pada rentang dengan scrollbar bertema
- Kartu ringkas: angka berhitung naik, selisih dari pencatatan sebelumnya, grafik mini: klik kartu untuk fokus ke satu garis
- Tabel pencatatan terbaru muncul berurutan, waktu dalam WIB
- Animasi otomatis mati bagi pengguna yang mengaktifkan "Kurangi gerakan" di perangkatnya
- Muat ulang otomatis tiap 5 menit
- Responsif untuk desktop, tablet, dan HP
- Pembatasan akses IP di server, plus proxy API

## Aturan data
- **Sesi ditentukan dari jam WIB**, bukan dari label API: pencatatan sebelum 12.00 WIB = Pagi, 12.00 WIB ke atas = Siang. Data dari endpoint `pagi` dan `siang` digabung per kawasan (id yang sama dihitung sekali), lalu diklasifikasi ulang.
- **Rentang N hari** dimulai pukul 00.00 WIB pada tanggal (hari ini - N) sampai waktu pembaruan terakhir. Contoh pada 16 Okt: 30 hari = 16 Sep sampai 16 Okt, 7 hari = 9 Okt sampai 16 Okt. Sumbu grafik mengikuti rentang tersebut.
- **Semua** menampilkan seluruh data, dari pencatatan pertama sampai hari terbaru.
- **Sumbu per hari.** Setiap tanggal yang ada datanya mendapat satu kolom sama lebar, dan titik diletakkan di dalam kolom harinya sesuai jam. Label dan garis tanggal berada tepat di tengah kolom, sejajar dengan titik data hari itu. Tanggal tanpa data dilewati (tidak ada ruang kosong) dan garis langsung menyambung ke tanggal berikutnya yang ada. Karena itu jarak antar-kolom tidak mencerminkan lamanya periode yang dilewati; rentang yang diminta dan rentang data yang tersedia ditulis di atas grafik.
- **Detail sumber data API** (di bawah tabel) menampilkan jumlah dan rentang tanggal yang benar-benar diterima dari tiap endpoint, untuk memeriksa apakah API membatasi jumlah data.

## Struktur
```
client-dashboard/
├─ server/index.js          Server produksi: pembatas IP, proxy API, file statis
├─ src/
│  ├─ main.jsx              Titik masuk React
│  ├─ App.jsx               Halaman utama dan state filter
│  ├─ api.js                Pemanggilan dan perapian data API
│  ├─ constants.js          Kawasan, sesi, metrik, warna
│  ├─ styles.css            Seluruh gaya
│  ├─ components/           Chart, Select, Segmented, KpiStrip, RangeInfo, SourceInfo, DataTable, dll.
│  ├─ hooks/                useDashboardData (ambil API), useDashboardView (rentang & sesi), useTheme, useCountUp
│  └─ utils/                time (WIB, sesi), dataset (jendela & seri), chartMath (celah, path), format
├─ public/theme-init.js     Menerapkan tema sebelum halaman tampil
├─ vite.config.js
├─ .env.example
└─ package.json
```

## Prasyarat
- Node.js 18 atau lebih baru (disarankan 20 LTS) dan npm

## Instalasi
```bash
cd client-count-brin
npm install
```

## Mode pengembangan
```bash
npm run dev
```
Buka `http://localhost:5173`. Permintaan `/api/*` otomatis diteruskan ke `http://10.13.222.10:5010`. Mode ini hanya untuk pengembangan dan tidak membatasi IP untuk mengakses WebAPP tetapi tidak untuk mengakses IP. Pastikan gunakan VPN BRIN untuk mengakses secara lengkap.

## Menjalankan produksi
```bash
npm run preview      # menjalankan server di port 1818
```
Buka `http://IP-SERVER/localhost:1818` dari komputer atau HP yang tersambung ke jaringan BRIN.

Pengaturan lewat environment variable (lihat `.env.example`):

| Variabel | Default | Fungsi |
|---|---|---|
| `PORT` | `1818` | Port server |
| `HOST` | `0.0.0.0` | Alamat yang didengarkan |
| `API_CLIENT_COUNT_BASE` | `http://10.13.222.10:5010` | Alamat API statistik klien |
| `API_MAC_OWNER_BASE` | `http://10.13.222.10:5001` | Alamat API pemilik MAC / username |
| `API_BASE` | `http://10.13.222.10:5010` | Fallback kompatibilitas API Client Count |
| `ALLOWED_PREFIXES` | `103.` | Awalan IP yang diizinkan (pisahkan koma) |
| `ALLOW_LOCALHOST` | `true` | Izinkan `127.0.0.1` untuk uji di server |

### Menjalankan dengan Docker
Jalankan container dengan menentukan environment variable atau file `.env`:
```bash
docker build -t client-dashboard -f Dockerfile.stg .
docker run -d -p 1818:1818 \
  -e API_CLIENT_COUNT_BASE=http://10.13.222.10:5010 \
  -e API_MAC_OWNER_BASE=http://10.13.222.10:5001 \
  --name client-dashboard-app client-dashboard
```


### Menjalankan permanen dengan PM2
```bash
npm install -g pm2
pm2 start server/index.js --name client-dashboard
pm2 save && pm2 startup
```

## Pembatasan akses jaringan BRIN
Pembatasan **harus dilakukan di sisi server**, karena kode di browser mudah dilewati. Ada tiga lapis:

1. **Aplikasi (sudah aktif).** `server/index.js` menolak (HTTP 403) semua koneksi yang IP aslinya bukan `103.*`. Alamat dibaca dari koneksi socket, bukan dari header `X-Forwarded-For` yang bisa dipalsukan.
2. **Firewall server (disarankan).** Contoh Ubuntu:
   ```bash
   sudo ufw allow from 103.0.0.0/16 to any port 1818 proto tcp
   sudo ufw deny 1818/tcp
   ```
3. **Nginx (opsional).** Lihat `nginx.conf.example`. Jika memakai reverse proxy, Node hanya melihat IP proxy, jadi jalankan Node dengan `HOST=127.0.0.1 ALLOW_LOCALHOST=true` dan biarkan Nginx yang membatasi `103.0.0.0/16`.

Uji: dari jaringan BRIN halaman terbuka normal, dari luar (misalnya data seluler) muncul pesan 403.

## Pemecahan masalah
- **Halaman kosong / "gagal dimuat"**: pastikan server dashboard dapat mengakses `API_BASE`. Uji dengan `curl http://10.13.222.10:5010/client-count/gatsu/pagi` dari server tersebut.
- **403 padahal di jaringan BRIN**: IP Anda mungkin di luar `103.`. Lihat log `[blocked] ...` di terminal, lalu tambahkan awalan yang sesuai ke `ALLOWED_PREFIXES`.
- **Port sudah dipakai**: ganti dengan `PORT=8080`.
- **`dist` tidak ditemukan**: jalankan `npm run build` sebelum `npm run start`.
