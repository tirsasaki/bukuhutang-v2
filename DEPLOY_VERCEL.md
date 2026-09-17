# Penerapan ke Vercel

Aplikasi menggunakan Supabase untuk basis data dan proses masuk. Rahasia tidak disimpan di repositori.

## 1. Siapkan Supabase

1. Buat proyek baru di Supabase.
2. Buka **SQL Editor**, tempel isi `supabase/schema.sql`, lalu jalankan.
3. Buka **Authentication → Users** dan buat akun pemilik dengan alamat email serta kata sandi yang kuat.
4. Salin **Project URL** dan **anon public key** dari pengaturan API proyek.

Pendaftaran pengguna tidak tersedia dari aplikasi. Pengguna baru hanya dibuat oleh pemilik melalui dasbor Supabase.

## 2. Siapkan Vercel

1. Impor repositori `tirsasaki/bukuhutang-v2` ke Vercel.
2. Tambahkan variabel berikut untuk lingkungan Production dan Preview:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Jalankan penerapan ulang setelah variabel disimpan.

Nilai pada `.env.example` hanya contoh. Jangan memasukkan nilai asli ke GitHub.

## 3. Pulihkan data

1. Masuk ke situs Vercel menggunakan akun yang dibuat di Supabase.
2. Pilih **Impor cadangan**.
3. Unggah berkas JSON dari repositori cadangan privat.
4. Cocokkan jumlah pelanggan, piutang, pembayaran, dan total saldo dengan situs lama sebelum memindahkan pemakaian harian.

Biarkan situs lama tetap aktif sampai pemeriksaan data selesai.
