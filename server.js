const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'APK Builder API is running!',
        version: '1.0.0'
    });
});

// Generate endpoint
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

        // For now, return a test response
        // Nanti kita akan integrate dengan GitHub Actions
        res.json({
            success: true,
            appName: appName,
            url: url,
            packageName: packageName || `com.${appName.toLowerCase().replace(/\s/g, '')}`,
            downloadUrl: 'https://example.com/test.apk',
            message: 'APK berjaya dihasilkan! 🎉 (Test mode)'
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
    console.log(`🚀 Server running on port ${PORT}`);
});
