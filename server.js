const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================
// HEALTH CHECK
// ============================================

app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'APK Builder API is running!',
        version: '2.0.0'
    });
});

// ============================================
// GENERATE APK
// ============================================

app.post('/generate', async (req, res) => {
    try {
        const { url, appName, packageName } = req.body;
        
        if (!url || !appName) {
            return res.status(400).json({
                success: false,
                error: 'URL dan App Name diperlukan'
            });
        }

        console.log(`📱 Generating APK for: ${appName} (${url})`);

        const packageId = packageName || `com.${appName.toLowerCase().replace(/\s/g, '')}`;

        // ============================================
        // TRY 1: PWA2APK API
        // ============================================
        try {
            console.log('Trying PWA2APK...');
            
            const response = await axios.post(
                'https://pwa2apk.com/api/generate',
                {
                    url: url,
                    appName: appName,
                    packageName: packageId
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 120000
                }
            );

            let downloadUrl = null;
            if (response.data) {
                if (response.data.downloadUrl) downloadUrl = response.data.downloadUrl;
                else if (response.data.url) downloadUrl = response.data.url;
                else if (response.data.data && response.data.data.downloadUrl) downloadUrl = response.data.data.downloadUrl;
            }

            if (downloadUrl) {
                console.log('✅ PWA2APK success!');
                return res.json({
                    success: true,
                    appName: appName,
                    url: url,
                    packageName: packageId,
                    downloadUrl: downloadUrl,
                    method: 'PWA2APK (Real APK)',
                    message: 'APK berjaya dihasilkan! 🎉'
                });
            }
        } catch (pwaError) {
            console.log('PWA2APK failed:', pwaError.message);
        }

        // ============================================
        // TRY 2: AppMaker.xyz (Fallback)
        // ============================================
        try {
            console.log('Trying AppMaker...');
            
            const formData = new URLSearchParams();
            formData.append('url', url);
            formData.append('app_name', appName);
            formData.append('package_name', packageId);

            const appMakerResponse = await axios.post(
                'https://appmaker.xyz/pwa-to-apk/',
                formData.toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 120000
                }
            );

            // Extract download URL from HTML
            const html = typeof appMakerResponse.data === 'string' ? appMakerResponse.data : JSON.stringify(appMakerResponse.data);
            const patterns = [
                /https?:\/\/[^\s"']+\.apk/i,
                /https?:\/\/storage\.googleapis\.com[^\s"']+\.apk/i,
                /https?:\/\/[^\s"']+\.appmaker\.xyz[^\s"']+/i
            ];

            let downloadUrl = null;
            for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                    downloadUrl = match[0];
                    break;
                }
            }

            if (downloadUrl) {
                console.log('✅ AppMaker success!');
                return res.json({
                    success: true,
                    appName: appName,
                    url: url,
                    packageName: packageId,
                    downloadUrl: downloadUrl,
                    method: 'AppMaker (Real APK)',
                    message: 'APK berjaya dihasilkan! 🎉'
                });
            }
        } catch (appMakerError) {
            console.log('AppMaker failed:', appMakerError.message);
        }

        // ============================================
        // ALL FAILED
        // ============================================
        console.log('❌ All methods failed');
        return res.status(500).json({
            success: false,
            error: 'Failed to generate APK. Please try again later.',
            debug: 'All APK generation methods failed'
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Gagal generate APK: ' + error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 APK Builder running on port ${PORT}`);
});
