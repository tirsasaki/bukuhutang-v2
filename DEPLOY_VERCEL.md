# Penerapan ke Vercel

Aplikasi menggunakan Supabase untuk basis data dan proses masuk. Rahasia tidak disimpan di repositori.

## 1. Siapkan Supabase

1. Buat proyek baru di Supabase.
2. Buka **SQL Editor**, tempel isi `supabase/schema.sql`, lalu jalankan.
3. Buka **Authentication → Users** dan buat akun pemilik dengan alamat email serta kata sandi yang kuat.
4. Salin **Project URL** dan **anon public key** dari pengaturan API proyek.

Pendaftaran pengguna tidak tersedia dari aplikasi. Pengguna baru hanya dibuat oleh pemilik melalui dasbor Supabase.

## 2. Hubungkan repositori cadangan GitHub

1. Buat fine-grained personal access token di GitHub.
2. Batasi akses token hanya ke repositori privat `tirsasaki/bukuhutang-backup`.
3. Berikan izin **Contents: Read and write**. Izin lain tidak diperlukan.
4. Simpan token untuk dimasukkan sebagai variabel lingkungan Vercel. Jangan
   menaruh token di berkas atau kode sumber.

Cadangan baru disimpan di `backups/{id-pengguna}/` agar riwayat setiap akun
terpisah. Berkas lama `backups/{id-pengguna}.json` tetap dapat dipulihkan.

## 3. Siapkan Vercel

1. Impor repositori `tirsasaki/bukuhutang-v2` ke Vercel.
2. Tambahkan variabel berikut untuk lingkungan Production dan Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GITHUB_BACKUP_TOKEN`
   - `GITHUB_BACKUP_REPOSITORY` dengan nilai `tirsasaki/bukuhutang-backup`
   - `GITHUB_BACKUP_BRANCH` dengan nilai `main`
3. Jalankan penerapan ulang setelah variabel disimpan.

Nilai pada `.env.example` hanya contoh. Jangan memasukkan nilai asli ke GitHub.

## 4. Pulihkan data

1. Masuk ke situs Vercel menggunakan akun yang dibuat di Supabase.
2. Buka **Pengaturan Toko → Cadangan data**.
3. Pilih **Pulihkan** pada cadangan GitHub atau gunakan **Pilih berkas JSON**
   untuk memulihkan cadangan dari perangkat.
4. Cocokkan jumlah pelanggan, piutang, pembayaran, dan total saldo dengan situs lama sebelum memindahkan pemakaian harian.

Biarkan situs lama tetap aktif sampai pemeriksaan data selesai.

## Pembaruan skema

Jika basis data sudah pernah dibuat, jalankan berkas baru di dalam folder `supabase/migrations` secara berurutan melalui SQL Editor:

1. `supabase/migrations/20260917_add_cashiers.sql`
2. `supabase/migrations/20260917_add_multi_item_invoices.sql`
3. `supabase/migrations/20260917_fix_invoice_date_ambiguity.sql`
4. `supabase/migrations/20260917_add_payment_options.sql`
5. `supabase/migrations/20260917_add_overpayment_credit.sql`
6. `supabase/migrations/20260917_add_store_settings.sql`
7. `supabase/migrations/20260918_add_item_discounts.sql`
8. `supabase/migrations/20260919_sync_wholesale_total_and_discount.sql`

Migrasi kedua menambahkan nota otomatis, beberapa barang dalam satu nota, serta harga eceran dan grosir. Migrasi ketiga memperbaiki fungsi penghitung nomor nota. Migrasi keempat menambahkan pembayaran sebagian dan pelunasan seluruh piutang pelanggan. Migrasi kelima mencatat kelebihan pembayaran sebagai saldo pelanggan. Migrasi keenam menyimpan nama dan alamat toko. Jalankan migrasi secara berurutan sebelum memakai fitur terkait.

Migrasi ketujuh memperbarui fungsi pembuatan nota agar mendukung diskon nominal per barang. Migrasi ini tidak menambah kolom baru; nilai diskon diturunkan dari harga awal dan nilai akhir sehingga cadangan lama tetap kompatibel.

Migrasi kedelapan memastikan total grosir memakai rumus `jumlah × harga eceran − diskon` dan menyinkronkan penyimpanan harga grosir dengan harga eceran sebagai dasar perhitungan.
