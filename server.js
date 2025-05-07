const express = require("express");
const path = require("path");
const AWS = require("aws-sdk");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

// Hata yakalama middleware'i
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Something broke!');
});

// AWS S3 Konfigürasyonu
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Multer konfigürasyonu
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to parse JSON body
app.use(express.json());

// URL'den etkinlik adını al ve statik dosyaları serve et
app.use((req, res, next) => {
    try {
        const eventName = req.headers['x-event-name'] || '';
        console.log('Event Name:', eventName);
        if (eventName) {
            req.eventName = eventName;
            const staticPath = path.join(__dirname, eventName);
            if (fs.existsSync(staticPath)) {
                app.use('/', express.static(staticPath));
            } else {
                console.error('Project directory not found:', staticPath);
            }
        }
        next();
    } catch (error) {
        console.error('Error in middleware:', error);
        next(error);
    }
});

// Route handlers
app.get("/", (req, res) => {
    try {
        const eventDir = req.eventName || '';
        const indexPath = path.join(__dirname, eventDir, "index.html");
        console.log('Serving index.html from:', indexPath);
        if (!fs.existsSync(indexPath)) {
            console.error('File not found:', indexPath);
            return res.status(404).send('Project not found');
        }
        res.sendFile(indexPath);
    } catch (error) {
        console.error('Error serving index:', error);
        res.status(500).send('Error serving index page');
    }
});

app.get("/map", (req, res) => {
    try {
        const eventDir = req.eventName || '';
        const mapPath = path.join(__dirname, eventDir, "map.html");
        console.log('Serving map.html from:', mapPath);
        if (!fs.existsSync(mapPath)) {
            console.error('File not found:', mapPath);
            return res.status(404).send('Map page not found');
        }
        res.sendFile(mapPath);
    } catch (error) {
        console.error('Error serving map:', error);
        res.status(500).send('Error serving map page');
    }
});

app.get("/upload", (req, res) => {
    try {
        const eventDir = req.eventName || '';
        const uploadPath = path.join(__dirname, eventDir, "upload.html");
        console.log('Serving upload.html from:', uploadPath);
        if (!fs.existsSync(uploadPath)) {
            console.error('File not found:', uploadPath);
            return res.status(404).send('Upload page not found');
        }
        res.sendFile(uploadPath);
    } catch (error) {
        console.error('Error serving upload:', error);
        res.status(500).send('Error serving upload page');
    }
});

app.get("/files", (req, res) => {
    try {
        const eventDir = req.eventName || '';
        const filesPath = path.join(__dirname, eventDir, "files.html");
        console.log('Serving files.html from:', filesPath);
        if (!fs.existsSync(filesPath)) {
            console.error('File not found:', filesPath);
            return res.status(404).send('Files page not found');
        }
        res.sendFile(filesPath);
    } catch (error) {
        console.error('Error serving files:', error);
        res.status(500).send('Error serving files page');
    }
});

// API routes
app.get("/api/check-auth", (req, res) => {
    const authHeader = req.headers.authorization;
    const USER = process.env.FILE_USER;
    const PASS = process.env.FILE_PASS;

    if (authHeader) {
        const [scheme, credentials] = authHeader.split(' ');

        if (scheme === 'Basic' && credentials) {
            const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');

            if (username === USER && password === PASS) {
                return res.sendStatus(200);
            }
        }
    }

    res.sendStatus(401);
});

app.get("/api/files", async (req, res) => {
    try {
        const params = { Bucket: BUCKET_NAME, Prefix: "uploads/" };
        const data = await s3.listObjectsV2(params).promise();

        if (!data.Contents || data.Contents.length === 0) {
            return res.json([]);
        }

        const files = data.Contents.map(file => {
            const signedUrl = s3.getSignedUrl('getObject', {
                Bucket: BUCKET_NAME,
                Key: file.Key,
                Expires: 36000
            });
            return {
                name: path.basename(file.Key),
                url: signedUrl
            };
        });

        res.json(files);
    } catch (error) {
        console.error("Dosya listeleme hatası:", error);
        res.status(500).json({ error: "Dosyalar getirilemedi" });
    }
});

app.post("/api/delete-file", async (req, res) => {
    const authHeader = req.headers.authorization;
    const USER = process.env.FILE_USER;
    const PASS = process.env.FILE_PASS;

    if (authHeader) {
        const [scheme, credentials] = authHeader.split(' ');

        if (scheme === 'Basic' && credentials) {
            const [username, password] = Buffer.from(credentials, 'base64').toString().split(':');

            if (username === USER && password === PASS) {
                const { fileName } = req.body;

                if (!fileName) {
                    return res.status(400).json({ error: "Silinecek dosya adı belirtilmedi." });
                }

                const params = {
                    Bucket: BUCKET_NAME,
                    Key: fileName
                };

                try {
                    await s3.deleteObject(params).promise();
                    return res.json({ message: `${fileName} başarıyla silindi.` });
                } catch (error) {
                    console.error("Dosya silme hatası:", error);
                    return res.status(500).json({ error: "Dosya silinirken bir hata oluştu." });
                }
            }
        }
    }

    return res.sendStatus(401);
});

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;

        const params = {
            Bucket: BUCKET_NAME,
            Key: `uploads/${Date.now()}-${file.originalname}`,
            Body: file.buffer,
            ContentType: file.mimetype
        };

        const data = await s3.upload(params).promise();

        res.json({
            message: "Dosya başarıyla yüklendi!",
            file: data
        });
    } catch (error) {
        console.error("Dosya yükleme hatası:", error);
        res.status(500).json({ error: "Dosya yüklenemedi" });
    }
});

// Sunucuyu başlat
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Current directory:', __dirname);
    console.log('Environment variables:', {
        PORT: process.env.PORT,
        AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
        AWS_REGION: process.env.AWS_REGION,
        FILE_USER: process.env.FILE_USER
    });
});