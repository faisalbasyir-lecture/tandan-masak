/*
 * content.js — seluruh konten belajar (data), terpisah dari logika aplikasi.
 * Sumber konten utama: materi kuliah "Manajemen Panen Kelapa Sawit" (Faisal Basyir,
 * Pertemuan 12–13, mata kuliah Budidaya dan Penanganan Pascapanen Kelapa Sawit, Politala),
 * yang merujuk Pahan (2012), Sirait dkk. (2023), dan Pergub Riau No. 77/2020.
 *
 * Tanda [CEK] = angka/klaim yang belum diverifikasi silang di luar slide dan perlu dicek dosen.
 * Tanda [CEK bahasa Banjar] = ungkapan bahasa Banjar yang perlu dicek penutur asli.
 */
window.KONTEN = (function () {
  'use strict';

  var fraksi = [
    { kode: '00', persen: '0% (buah hitam)', derajat: 'Sangat mentah', keputusan: 'Tidak dipanen', kelompok: 'tidak', min: 0, max: 0 },
    { kode: '0', persen: '1–12,5%', derajat: 'Mentah', keputusan: 'Tidak dipanen', kelompok: 'tidak', min: 1, max: 12.5 },
    { kode: '1', persen: '12,5–25%', derajat: 'Kurang matang', keputusan: 'Batas bawah panen', kelompok: 'batas', min: 12.5, max: 25 },
    { kode: '2', persen: '25–50%', derajat: 'Matang I', keputusan: 'Ideal', kelompok: 'ideal', min: 25, max: 50 },
    { kode: '3', persen: '50–75%', derajat: 'Matang II', keputusan: 'Ideal', kelompok: 'ideal', min: 50, max: 75 },
    { kode: '4', persen: '75–100%', derajat: 'Lewat matang I', keputusan: 'Segera dipanen; ALB naik', kelompok: 'segera', min: 75, max: 100 },
    { kode: '5', persen: 'Buah bagian dalam ikut lepas', derajat: 'Lewat matang II', keputusan: 'ALB tinggi', kelompok: 'terlambat', min: 100, max: 100 }
  ];

  var keputusan = [
    { id: 'tidak', label: 'Tidak dipanen, biarkan di pokok' },
    { id: 'batas', label: 'Batas bawah panen (boleh, belum ideal)' },
    { id: 'ideal', label: 'Ideal dipanen' },
    { id: 'segera', label: 'Segera dipanen; ALB mulai naik' },
    { id: 'terlambat', label: 'Lewat waktu panen; ALB sudah tinggi' }
  ];

  // Tandan di blok VR. Posisi pokok diatur di vr-components.js (urutan sama).
  var tandan = [
    { id: 'A', pokok: 1, sisi: 'kiri', fraksi: '2', seed: 11,
      warna: 'Jingga kemerahan; pangkal buah kekuningan.',
      catatan: 'Bekas buah lepas mulai banyak terlihat di sisi bawah tandan.' },
    { id: 'B', pokok: 2, sisi: 'kanan', fraksi: '00', seed: 23,
      warna: 'Hitam keunguan dan mengilap.',
      catatan: 'Permukaan tandan masih rapat; tidak ada bekas buah lepas.' },
    { id: 'C', pokok: 3, sisi: 'kiri', fraksi: '4', seed: 37,
      warna: 'Jingga kemerahan, agak kusam.',
      catatan: 'Sebagian besar buah luar sudah lepas; piringan penuh brondolan.' },
    { id: 'D', pokok: 4, sisi: 'kanan', fraksi: '1', seed: 41,
      warna: 'Merah tua kehitaman, mulai ada semburat jingga.',
      catatan: 'Ada beberapa bekas buah lepas.' },
    { id: 'E', pokok: 5, sisi: 'kiri', fraksi: '3', seed: 53,
      warna: 'Jingga kemerahan cerah.',
      catatan: 'Lebih dari separuh buah luar sudah lepas.' },
    { id: 'F', pokok: 6, sisi: 'kanan', fraksi: '0', seed: 67,
      warna: 'Hitam keunguan, semburat merah tua di pangkal buah.',
      catatan: 'Hanya sedikit bekas buah lepas.' },
    { id: 'G', pokok: 7, sisi: 'kiri', fraksi: '5', seed: 79,
      warna: 'Cokelat kemerahan kusam.',
      catatan: 'Buah luar sudah habis lepas; buah lapisan dalam juga mulai lepas.' }
  ];

  // Benda di TPH untuk aktivitas "Periksa TPH" (aturan TPH dari slide "Aturan TPH dan jadwal kerja pemanen").
  var tph = [
    { id: 'T1', judul: 'Tandan bertangkai pendek, tangkai menghadap ke atas, bernomor pemanen',
      pilihan: [
        { id: 'a', label: 'Sesuai aturan TPH' },
        { id: 'b', label: 'Tidak sesuai: tandan harus direbahkan' },
        { id: 'c', label: 'Tidak sesuai: nomor pemanen tidak diperlukan' }
      ], benar: 'a',
      jelas: 'Sesuai. TBS disusun berbaris (5–10 tandan per baris), tangkai menghadap ke atas, dan diberi nomor pemanen agar mutu buah bisa ditelusuri.' },
    { id: 'T2', judul: 'Tandan kosong (tanpa buah) ikut disusun di barisan TPH',
      pilihan: [
        { id: 'a', label: 'Sesuai, karena tetap menambah berat timbangan' },
        { id: 'b', label: 'Tidak sesuai: janjang kosong tidak ikut dikirim' },
        { id: 'c', label: 'Sesuai, asal diletakkan di ujung barisan' }
      ], benar: 'b',
      jelas: 'Janjang kosong tidak ikut dikirim. Saat sortasi, tandan kosong dikenai potongan 100% × persen tandan kosong.' },
    { id: 'T3', judul: 'Brondolan ditumpuk langsung di atas tanah, bercampur serasah',
      pilihan: [
        { id: 'a', label: 'Sesuai, yang penting brondolan sudah dikutip' },
        { id: 'b', label: 'Tidak sesuai: brondolan harus bersih dan diletakkan di atas alas karung' },
        { id: 'c', label: 'Tidak sesuai: brondolan tidak perlu dibawa ke TPH' }
      ], benar: 'b',
      jelas: 'Brondolan harus bersih dan ditaruh di atas alas karung. Brondolan kotor dikenai potongan 2 × berat kotoran.' },
    { id: 'T4', judul: 'Tandan dengan sisa tangkai panjang (jauh lebih dari 2 cm)',
      pilihan: [
        { id: 'a', label: 'Potong tangkainya sekarang di TPH' },
        { id: 'b', label: 'Catat sebagai tangkai panjang; tangkai tidak boleh dipotong di TPH' },
        { id: 'c', label: 'Sesuai, panjang tangkai tidak berpengaruh' }
      ], benar: 'b',
      jelas: 'Tangkai dipotong berbentuk V saat panen dengan sisa paling panjang 2 cm. Di TPH tangkai tidak boleh dipotong; temuan dicatat (potongan 1% × persen tangkai panjang).' }
  ];

  // Kuis sortasi (langkah 4)
  var kuis = [
    { id: 'q1', tipe: 'fraksi', lepas: 3, warna: 'Hitam keunguan', brondolan: 2,
      soal: 'Sampel 40 buah luar di sebuah tandan: 3 buah sudah lepas. Warna buah luar hitam keunguan. Tentukan fraksinya.',
      benar: '0', jelas: '3 ÷ 40 × 100% = 7,5%. Rentang 1–12,5% adalah Fraksi 0 (mentah): tidak dipanen.' },
    { id: 'q2', tipe: 'fraksi', lepas: 18, warna: 'Jingga kemerahan', brondolan: 10,
      soal: 'Sampel 40 buah luar: 18 buah sudah lepas. Warna jingga kemerahan, 10 brondolan di piringan. Tentukan fraksinya.',
      benar: '2', jelas: '18 ÷ 40 × 100% = 45%. Rentang 25–50% adalah Fraksi 2 (Matang I): ideal dipanen.' },
    { id: 'q3', tipe: 'fraksi', lepas: 27, warna: 'Jingga kemerahan cerah', brondolan: 17,
      soal: 'Sampel 40 buah luar: 27 buah sudah lepas. Tentukan fraksinya.',
      benar: '3', jelas: '27 ÷ 40 × 100% = 67,5%. Rentang 50–75% adalah Fraksi 3 (Matang II): ideal dipanen.' },
    { id: 'q4', tipe: 'pg',
      soal: 'Warna buah luar sudah jingga kemerahan, tetapi brondolan sulit lepas. Termasuk kelas mutu apa?',
      pilihan: ['Buah batu', 'Partenokarpi', 'Dimakan tikus', 'Tangkai panjang'], benar: 0,
      jelas: 'Buah batu: brondolan sulit lepas walau sudah matang. Karena itu, jumlah brondolan saja tidak cukup; warna juga diamati.' },
    { id: 'q5', tipe: 'pg',
      soal: 'Tandan didominasi brondolan kecil tanpa biji. Termasuk kelas mutu apa?',
      pilihan: ['Buah batu', 'Partenokarpi', 'Janjang kosong', 'Matang II'], benar: 1,
      jelas: 'Partenokarpi: didominasi brondolan kecil tanpa biji.' },
    { id: 'q6', tipe: 'pg',
      soal: 'Saat sortasi ditemukan tandan yang lebih dari 25% buah luarnya digerogoti. Termasuk kelas mutu apa, dan aspek apa yang perlu ditelusuri di kebun?',
      pilihan: ['Dimakan tikus; telusuri pengendalian hama di blok', 'Buah batu; telusuri pemupukan', 'Lewat matang; percepat rotasi', 'Partenokarpi; telusuri penyerbukan'], benar: 0,
      jelas: 'Kelas mutu "dimakan tikus" bila lebih dari 25% buah luar digerogoti. Temuan ini mengarah ke pengendalian hama di blok (aspek lingkungan, CPMK083).' },
    { id: 'q7', tipe: 'urut',
      soal: 'Klik empat kegiatan panen sesuai urutan yang benar.',
      item: ['Angkut ke PKS', 'Kutip brondolan', 'Potong TBS', 'Angkut ke TPH'],
      benar: ['Potong TBS', 'Kutip brondolan', 'Angkut ke TPH', 'Angkut ke PKS'],
      jelas: 'Urutan: potong TBS (hanya yang matang) → kutip brondolan → angkut ke TPH → angkut ke PKS pada hari panen.' },
    { id: 'q8', tipe: 'angka',
      soal: 'Sortasi 1.000 kg TBS menemukan 8% buah mentah (fraksi 00 dan 0). Berapa kg potongan timbangannya?',
      satuan: 'kg', benar: 40, toleransi: 0.5,
      jelas: 'Potongan buah mentah = 50% × persen buah mentah = 50% × 8% = 4% dari berat TBS. 4% × 1.000 kg = 40 kg.' },
    { id: 'q9', tipe: 'pg',
      soal: 'Kapan sebuah areal mulai dipanen?',
      pilihan: ['Lebih dari 60% pokok memiliki tandan matang dan BJR lebih dari 3 kg', 'Begitu ada satu tandan berwarna merah', 'Setelah tanaman berumur tepat 5 tahun', 'Bila brondolan di piringan lebih dari 50 butir'], benar: 0,
      jelas: 'Areal mulai dipanen bila lebih dari 60% pokok sudah memiliki tandan matang (kerapatan panen), BJR lebih dari 3 kg, dan tandan memenuhi kriteria matang panen.' }
  ];

  // Studi kasus (langkah 5). Tokoh dan desa fiktif.
  var kasus = {
    judul: 'Keputusan panen di kebun Acil Salmah',
    cerita: [
      'Acil Salmah mengelola 2 ha kebun sawit rakyat di Tanah Laut (tokoh dan kebun fiktif). Tanamannya berumur sekitar 8 tahun. Anaknya, Nanang, bekerja sebagai pemanen.',
      'Hari ini Selasa, musim hujan. Pedagang pengumpul biasanya datang dengan truk pada hari Kamis. Nanang sudah memeriksa 50 pokok untuk panen hari ini dan mencatat tandan berikut.'
    ],
    tabel: [
      ['Fraksi 00–0', '14 tandan'],
      ['Fraksi 1', '9 tandan'],
      ['Fraksi 2–3', '16 tandan'],
      ['Fraksi 4', '4 tandan'],
      ['Fraksi 5', '1 tandan']
    ],
    keputusan: [
      { id: 'd1', tanya: 'Tandan mana yang sebaiknya dipotong hari ini?',
        pilihan: [
          { id: 'a', label: 'Semua tandan yang mulai kemerahan, termasuk fraksi 0, supaya muatan truk penuh.',
            umpan: 'Kurang tepat. Fraksi 0 masih mentah: kadar minyaknya belum optimal dan dikenai potongan timbangan 50% × persen buah mentah.' },
          { id: 'b', label: 'Fraksi 2–3 dan fraksi 4–5 (fraksi 4–5 didahulukan); fraksi 00–0 dibiarkan; fraksi 1 ditunggu ke rotasi berikutnya.',
            umpan: 'Tepat. Fraksi 2–3 ideal. Fraksi 4–5 harus segera dipotong karena ALB naik dan brondolan terus jatuh. Fraksi 1 baru batas bawah panen; bila pusingan sekitar 7 hari terjaga, tandan itu akan lebih matang pada rotasi berikutnya.', skor: 2 },
          { id: 'c', label: 'Tunggu sampai semua tandan menjadi fraksi 4 agar beratnya maksimal.',
            umpan: 'Kurang tepat. Buah lewat matang memiliki ALB sekitar 4,0% (lebih tinggi dari buah matang 3,1–3,3%), dan makin banyak brondolan yang tercecer.' },
          { id: 'd', label: 'Hanya fraksi 2 dan 3; fraksi 4–5 dibiarkan karena ALB-nya tinggi.',
            umpan: 'Kurang tepat. Membiarkan fraksi 4–5 justru menambah losses: brondolan terus jatuh dan mutu makin turun. Keputusan untuk fraksi 4 adalah segera dipanen.' }
        ] },
      { id: 'd2', tanya: 'Hujan mulai turun. Nanang ingin cepat pulang. Bagaimana dengan brondolan?',
        pilihan: [
          { id: 'a', label: 'Tinggalkan brondolan di piringan; jumlahnya kecil.',
            umpan: 'Kurang tepat. Brondolan yang tertinggal adalah losses langsung. Bila porsi brondolan kurang dari 12,5%, ada potongan 30% × (12,5% − persen brondolan).' },
          { id: 'b', label: 'Kutip semua brondolan di piringan, ketiak pelepah, dan pasar rintis; bawa bersih di atas karung ke TPH.',
            umpan: 'Tepat. Seluruh brondolan dikutip bersih dan diletakkan di atas alas karung di TPH. Inilah "waja sampai kaputing": tuntas sampai butir terakhir.', skor: 2 },
          { id: 'c', label: 'Kutip brondolan sekalian dengan tanah dan serasah supaya cepat.',
            umpan: 'Kurang tepat. Brondolan kotor dikenai potongan 2 × berat kotoran.' }
        ] },
      { id: 'd3', tanya: 'Truk pedagang pengumpul baru datang hari Kamis. Apa rencana pengangkutan terbaik?',
        pilihan: [
          { id: 'a', label: 'Tumpuk TBS di TPH sampai Kamis, tutup dengan terpal.',
            umpan: 'Kurang tepat. TBS yang tidak diolah pada hari panen menjadi buah restan: enzim lipase terus bekerja sehingga ALB naik dan berat menyusut.' },
          { id: 'b', label: 'Sesuaikan hari panen dengan jadwal angkut, atau bergotong royong dengan kelompok tani menyewa angkutan bersama, agar TBS dan brondolan tiba di PKS pada hari panen.',
            umpan: 'Tepat. Targetnya seluruh TBS dan brondolan terangkut ke pabrik pada hari panen. Bekerja bersama kelompok tani ("kayuh baimbai") membuat angkutan lebih mungkin diatur.', skor: 2 },
          { id: 'c', label: 'Siram tandan dengan air setiap hari supaya tetap segar sampai Kamis.',
            umpan: 'Kurang tepat. Air tidak menghentikan kerja enzim lipase pada buah restan; ALB tetap naik. Yang menentukan adalah waktu sampai buah diolah.' }
        ] }
    ],
    hitung: [
      { id: 'c1', tanya: 'Di PKS, dari 2.400 kg TBS kiriman Acil Salmah ditemukan 5% buah mentah. Berapa kg potongan timbangannya?',
        benar: 60, toleransi: 0.5, jelas: '50% × 5% = 2,5%. 2,5% × 2.400 kg = 60 kg.' },
      { id: 'c2', tanya: 'Pada kiriman yang sama ditemukan 11% buah lewat matang. Berapa kg potongan untuk buah lewat matang?',
        benar: 36, toleransi: 0.5, jelas: '25% × (11% − 5%) = 25% × 6% = 1,5%. 1,5% × 2.400 kg = 36 kg.' }
    ],
    catatanAturan: 'Rumus potongan timbangan mengikuti materi kuliah (merujuk Pergub Riau No. 77/2020). Di Kalimantan Selatan, ikuti ketentuan PKS dan dinas perkebunan setempat.'
  };

  // Tes awal dan tes akhir (soal sama, urutan pilihan diacak di aplikasi)
  var tesSingkat = [
    { id: 'p1', soal: 'Fraksi kematangan yang ideal untuk dipanen adalah …',
      pilihan: ['Fraksi 2–3', 'Fraksi 00–0', 'Fraksi 4–5', 'Semua fraksi sama saja'], benar: 0 },
    { id: 'p2', soal: 'Fraksi kematangan tandan ditentukan terutama dari …',
      pilihan: ['Persentase buah luar yang membrondol (lepas)', 'Besar kecilnya tandan', 'Umur tanaman', 'Panjang tangkai tandan'], benar: 0 },
    { id: 'p3', soal: 'Mengapa TBS harus sampai di PKS pada hari panen?',
      pilihan: ['Pada buah restan ALB naik dan berat menyusut', 'Agar truk tidak menunggu lama', 'Supaya brondolan bertambah', 'Karena PKS hanya buka sehari'], benar: 0 }
  ];

  var refleksi = [
    { id: 'r1', tanya: 'Ciri apa yang paling menentukan fraksi kematangan? Mengapa warna saja tidak cukup?' },
    { id: 'r2', tanya: 'Kesalahan klasifikasi apa yang Anda buat hari ini, dan apa penyebabnya?' },
    { id: 'r3', tanya: 'Bagaimana Anda menjelaskan kriteria matang panen kepada pemanen di kebun rakyat dengan bahasa sederhana?' }
  ];

  // Ungkapan pemandu. [CEK bahasa Banjar] untuk semua teks "banjar".
  var pemandu = {
    nama: 'Julak Amat',
    peran: 'Mandor panen di kebun sawit rakyat, Tanah Laut (tokoh fiktif)',
    baris: {
      tujuan: { banjar: "Assalamu'alaikum! Salamat datang di kebun.", indo: 'Selamat datang di kebun. Saya Julak Amat, mandor panen. Hari ini kita belajar memilih tandan yang benar-benar matang.' },
      vr: { banjar: 'Ayuha, kita turun ka kebun!', indo: 'Ayo, kita turun ke kebun! Periksa setiap pokok: warna buah, bekas buah yang lepas, dan brondolan di piringan.' },
      hirang: { banjar: 'Buahnya masih hirang.', indo: 'Buahnya masih hitam. Jangan dipotong dulu; periksa lagi pada rotasi berikutnya.' },
      benar: { banjar: 'Bujur banar!', indo: 'Benar sekali!' },
      salah: { banjar: 'Kada papa.', indo: 'Tidak apa-apa. Bandingkan lagi hitungan Anda dengan tabel fraksi.' },
      tph: { banjar: 'Di TPH, buah disusun rapi.', indo: 'Di TPH, periksa susunan buah, tangkai, dan brondolan. Temukan yang tidak sesuai aturan.' },
      ar: { banjar: 'Cuba lihat tandan ini di meja pian.', indo: 'Coba lihat tandan ini di meja Anda. Bandingkan yang masih hitam dengan yang jingga kemerahan.' },
      kuis: { banjar: 'Wayahini kita ka TPH.', indo: 'Sekarang kita ke TPH untuk sortasi buah.' },
      kasus: { banjar: 'Acil Salmah handak batakun lawan pian.', indo: 'Acil Salmah ingin bertanya kepada Anda. Bantu ia mengambil keputusan panen.' },
      refleksi: { banjar: 'Pikirakan dulu, hanyar batakun lawan AI.', indo: 'Pikirkan dulu, baru bertanya kepada AI. Setelah itu, cek kembali jawabannya dengan materi.' },
      ringkasan: { banjar: 'Tarima kasih banyak!', indo: 'Terima kasih banyak! Ingat: kayuh baimbai, waja sampai kaputing — bekerja bersama, tuntas sampai akhir.' }
    }
  };

  var nilaiBanua = {
    kayuh: { nama: 'Kayuh Baimbai', arti: 'Mendayung bersama', syarat: 'Klasifikasi fraksi Anda sama dengan standar pada minimal 6 dari 7 tandan: satu kriteria untuk semua pemanen.' },
    waja: { nama: 'Waja Sampai Kaputing', arti: 'Teguh sampai ke ujung', syarat: 'Semua tandan diperiksa, semua tandan layak panen diangkut ke TPH bersama brondolannya, dan keempat temuan di TPH diperiksa.' },
    cek: { nama: 'Cek Dulu, Hanyar Percaya', arti: 'Periksa dulu, baru percaya', syarat: 'Jawaban AI ditempel dan dicek ulang dengan tabel fraksi di materi.' }
  };

  var layananAI = [
    { nama: 'ChatGPT', url: 'https://chatgpt.com/' },
    { nama: 'Gemini', url: 'https://gemini.google.com/' },
    { nama: 'Copilot', url: 'https://copilot.microsoft.com/' },
    { nama: 'DeepSeek', url: 'https://chat.deepseek.com/' }
  ];

  var rujukan = [
    'Basyir, F. Manajemen Panen Kelapa Sawit. Materi kuliah Pertemuan 12–13, Budidaya dan Penanganan Pascapanen Kelapa Sawit, D3 Agroindustri Politala.',
    'Pahan, I. (2012). Panduan Lengkap Kelapa Sawit: Manajemen Agribisnis dari Hulu hingga Hilir. Penebar Swadaya.',
    'Sirait, R.A., Supriyanto, G., & Priyambada. (2023). Pengaruh kematangan buah terhadap FFA dan besarnya kandungan minyak di pabrik kelapa sawit. AGROFORETECH, 1(1), 676–684.',
    'Peraturan Gubernur Riau No. 77 Tahun 2020 (rumus potongan timbangan, sebagaimana dikutip di materi kuliah).'
  ];

  return {
    fraksi: fraksi, keputusan: keputusan, tandan: tandan, tph: tph, kuis: kuis, kasus: kasus,
    tesSingkat: tesSingkat, refleksi: refleksi, pemandu: pemandu, nilaiBanua: nilaiBanua,
    layananAI: layananAI, rujukan: rujukan
  };
}());
