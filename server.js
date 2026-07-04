const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
// GENERATE APK - TRIGGER GITHUB ACTIONS
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
        const filename = `${appName.toLowerCase().replace(/\s/g, '-')}.apk`;

        // ============================================
        // TRY 1: GitHub Actions
        // ============================================
        try {
            console.log('Triggering GitHub Actions...');
            
            // GitHub Personal Access Token needed
            const githubToken = process.env.GITHUB_TOKEN;
            
            if (githubToken) {
                const githubResponse = await axios.post(
                    'https://api.github.com/repos/mindssoul2576/apk-builder_1.0/actions/workflows/build.yml/dispatches',
                    {
                        ref: 'main',
                        inputs: {
                            url: url,
                            app_name: appName,
                            package_name: packageId
                        }
                    },
                    {
                        headers: {
                            'Authorization': `token ${githubToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );

                if (githubResponse.status === 204) {
                    console.log('✅ GitHub Actions triggered successfully!');
                    
                    // Return a response telling user to wait
                    return res.json({
                        success: true,
                        appName: appName,
                        url: url,
                        packageName: packageId,
                        downloadUrl: `https://github.com/mindssoul2576/apk-builder_1.0/actions`,
                        method: 'GitHub Actions (Processing)',
                        message: 'APK sedang dibina di GitHub. Sila tunggu 3-5 minit dan download dari Actions tab.'
                    });
                }
            }
        } catch (githubError) {
            console.log('GitHub Actions failed:', githubError.message);
        }

        // ============================================
        // TRY 2: PWA2APK (Fallback)
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
        // TRY 3: AppMaker.xyz (Fallback)
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
            error: 'Failed to generate APK. Please try again later.'
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
