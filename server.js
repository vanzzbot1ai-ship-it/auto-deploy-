const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USER = process.env.GITHUB_USER;
const VC_TOKEN = process.env.VC_TOKEN;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/deploy', async (req, res) => {
    const { repoName, htmlContent } = req.body;

    if (!GITHUB_TOKEN || !VC_TOKEN) {
        return res.status(500).json({ message: "Token API belum disetting di .env, Bro!" });
    }

    try {
        console.log(`[1/3] Membuat repository: ${repoName}...`);
        
        const repoResponse = await axios.post('https://api.github.com/user/repos', {
            name: repoName,
            auto_init: true,
            private: false
        }, { 
            headers: { Authorization: `token ${GITHUB_TOKEN}` } 
        });

        const repoData = repoResponse.data;

        console.log(`[2/3] Mengupload index.html ke GitHub...`);

        await axios.put(`https://api.github.com/repos/${GITHUB_USER}/${repoName}/contents/index.html`, {
            message: "Auto Deploy via Vanz-Deployer",
            content: Buffer.from(htmlContent).toString('base64')
        }, { 
            headers: { Authorization: `token ${GITHUB_TOKEN}` } 
        });

                console.log(`[3/3] Memerintahkan Vercel untuk deploy ke Production...`);

        const vercelDeploy = await axios.post(
            'https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1', 
            {
                name: repoName,
                project: repoName,
                // INI KUNCINYA: Pakai target production
                target: 'production', 
                gitSource: {
                    type: 'github',
                    repoId: repoData.id.toString(),
                    ref: 'main'
                },
                projectSettings: {
                    framework: null,
                    installCommand: null,
                    buildCommand: null,
                    outputDirectory: null
                }
            }, 
            { 
                headers: { Authorization: `Bearer ${VC_TOKEN}` } 
            }
        );

        // Biar URL yang dikirim balik itu domain bersihnya
        // Kita rapihin URL-nya (buang awalan https:// kalau ada)
        const cleanUrl = repoName + '.vercel.app';

        res.json({
            message: "Gokil! Web berhasil dideploy ke Production.",
            url: `https://${cleanUrl}`
        });
        
            
