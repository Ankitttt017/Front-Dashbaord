const QRCode = require('qrcode');

async function generateQR(text) {
    return QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' },
    });
}
module.exports = { generateQR };
