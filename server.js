const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USER = process.env.GITHUB_USER;
const VC_TOKEN = process.env.VC_TOKEN;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/deploy', async (req, res) => {
    const { repoName, htmlContent } = req.body;

    try {
        // 1. Buat Repo di GitHub
        const repo = await axios.post('https://api.github.com/user/repos', {
            name: repoName,
            auto_init: true
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });

        // 2. Upload file index.html
        await axios.put(`https://api.github.com/repos/${GITHUB_USER}/${repoName}/contents/index.html`, {
            message: "Auto deploy",
            content: Buffer.from(htmlContent).toString('base64')
        }, { headers: { Authorization: `token ${GITHUB_TOKEN}` } });

        // 3. Deploy ke Vercel
        // Pakai endpoint 'deployments' tapi jangan lupa kasih project name yang sama
        const deploy = await axios.post('https://api.vercel.com/v13/deployments', {
            name: repoName,
            project: repoName, 
            gitSource: {
                type: 'github',
                repoId: repo.data.id.toString(),
                ref: 'main'
            }
        }, { headers: { Authorization: `Bearer ${VC_TOKEN}` } });

        // Response balik ke Front-end pakai domain yang singkat
        res.json({
            message: "Berhasil dideploy!",
            url: `https://${repoName}.vercel.app`
        });

    } catch (error) {
        console.error(error.response ? error.response.data : error.message);
        res.status(500).json({ message: "Gagal deploy", error: error.message });
    }
});

// WAJIB UNTUK VERCEL: Export module, bukan app.listen saja
module.exports = app;
