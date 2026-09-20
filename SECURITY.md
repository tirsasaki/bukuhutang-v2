# Kebijakan Keamanan

Keamanan data pelanggan, transaksi, sesi pengguna, dan cadangan merupakan bagian penting dari Buku Piutang. Dokumen ini menjelaskan versi yang didukung dan cara melaporkan dugaan kerentanan dengan aman.

## Versi yang didukung

| Versi | Dukungan keamanan |
| --- | --- |
| Cabang `main` terbaru | Didukung |
| Penerapan produksi dari `main` terbaru | Didukung |
| Cabang pengembangan, pratinjau lama, atau fork pihak lain | Tidak didukung |

Proyek belum menerbitkan versi rilis bernomor. Perbaikan keamanan diberikan pada `main` terbaru.

## Melaporkan kerentanan

Jangan membuka issue publik yang berisi rincian kerentanan, data pelanggan, token, kata sandi, atau langkah eksploitasi.

Gunakan salah satu cara berikut:

1. Buka halaman [pelaporan kerentanan privat](https://github.com/tirsasaki/bukuhutang-v2/security/advisories/new) pada repositori ini dan buat laporan baru.
2. Jika pelaporan privat belum tersedia, buat issue publik tanpa rincian sensitif dengan judul **Permintaan kanal pelaporan keamanan**. Pemelihara akan menyediakan kanal privat untuk melanjutkan laporan.

Sertakan informasi berikut jika memungkinkan:

- Ringkasan masalah dan dampak yang diperkirakan.
- Bagian aplikasi, jalur API, atau versi kode yang terdampak.
- Langkah reproduksi yang minimal dan dapat diulang.
- Bukti konsep yang tidak memakai data pengguna lain.
- Saran perbaikan atau mitigasi, jika ada.
- Cara aman untuk menghubungi pelapor selama proses penanganan.

## Waktu tanggapan

Target penanganan laporan:

- Konfirmasi penerimaan dalam tiga hari kerja.
- Penilaian awal tingkat dampak dalam tujuh hari kerja.
- Pembaruan berkala sampai perbaikan atau mitigasi tersedia.

Waktu perbaikan bergantung pada tingkat dampak, kerumitan, dan kebutuhan koordinasi penerapan. Laporan yang valid akan diberi tahu sebelum rincian dipublikasikan.

## Ruang lingkup utama

Laporan berikut menjadi prioritas:

- Akses tanpa izin atau pengambilalihan sesi pengguna.
- Kebocoran data lintas akun akibat kegagalan RLS atau pemeriksaan `owner_id`.
- Perubahan atau penghapusan pelanggan, piutang, pembayaran, kasir, atau pengaturan toko tanpa otorisasi.
- Akses ke cadangan pengguna lain, manipulasi jalur cadangan, atau kebocoran token GitHub.
- Injeksi, cross-site scripting (XSS), pemalsuan permintaan, atau eksekusi kode.
- Kebocoran rahasia melalui log, respons API, berkas, atau hasil penerapan.
- Penyalahgunaan proses impor yang dapat merusak integritas data.

Temuan berikut biasanya tidak dianggap kerentanan tanpa bukti dampak nyata:

- Laporan otomatis tentang versi dependensi tanpa jalur eksploitasi pada aplikasi ini.
- Masalah pada peramban yang sudah tidak didukung.
- Saran penguatan konfigurasi tanpa risiko yang dapat dibuktikan.
- Serangan yang membutuhkan akses penuh ke akun Supabase, GitHub, atau Vercel milik pemilik.

## Aturan pengujian yang aman

- Gunakan akun, data, dan lingkungan yang Anda miliki atau telah diizinkan untuk diuji.
- Jangan mengakses, mengubah, mengunduh, atau menghapus data milik pengguna lain.
- Jangan melakukan serangan penolakan layanan, pemindaian massal, rekayasa sosial, atau pengujian yang mengganggu layanan produksi.
- Hentikan pengujian segera jika data pihak lain terlihat dan laporkan temuan tanpa menyimpan salinannya.
- Batasi bukti konsep pada tindakan minimum yang diperlukan untuk menunjukkan masalah.

## Jika rahasia terpapar

Jika token atau kunci rahasia ditemukan pada kode, log, atau penerapan:

1. Jangan menyalin atau menggunakannya di luar kebutuhan verifikasi minimum.
2. Laporkan lokasi rahasia secara privat.
3. Pemilik proyek harus segera mencabut dan mengganti rahasia tersebut.
4. Periksa log akses Supabase, GitHub, dan Vercel untuk aktivitas yang tidak dikenal.
5. Terapkan ulang aplikasi setelah variabel lingkungan diperbarui.

Terima kasih telah membantu menjaga Buku Piutang dan data penggunanya tetap aman.
