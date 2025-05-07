const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
    try {
        // 1. Get .ENV information
        console.log('\n=== AWS ve Sunucu Bilgileri ===');
        const envInfo = {
            AWS_ACCESS_KEY_ID: await question('AWS Access Key ID: '),
            AWS_SECRET_ACCESS_KEY: await question('AWS Secret Access Key: '),
            AWS_BUCKET_NAME: await question('AWS Bucket Name: '),
            AWS_REGION: await question('AWS Region: '),
            PORT: await question('Port numarası (örn: 5000): '),
            FILE_USER: await question('Dosya yükleme kullanıcı adı: '),
            FILE_PASS: await question('Dosya yükleme şifresi: ')
        };

        // 2. Get event name
        console.log('\n=== Etkinlik Bilgileri ===');
        const eventName = await question('Etkinlik ismi: ');

        // 3. Get location information
        console.log('\n=== Lokasyon Bilgileri ===');
        const locationCount = await question('Kaç lokasyon var? (1 veya 2): ');
        const locations = [];
        
        for (let i = 1; i <= parseInt(locationCount); i++) {
            const locationName = await question(`Lokasyon ${i} ismi: `);
            locations.push(locationName);
        }

        // 4. Get map links
        console.log('\n=== Harita Linkleri ===');
        const mapLinks = [];
        
        for (let i = 1; i <= parseInt(locationCount); i++) {
            console.log(`\nLokasyon ${i} için harita linkleri:`);
            const googleMapsLink = await question('Google Maps linki: ');
            const appleMapsLink = await question('Apple Maps linki: ');
            mapLinks.push({ google: googleMapsLink, apple: appleMapsLink });
        }

        // 5. Create project directory and copy files
        const projectDir = eventName.toLowerCase().replace(/\s+/g, '-');
        const targetDir = path.join(process.cwd(), projectDir);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir);
        }

        // List of files to copy
        const filesToCopy = [
            'files.html',
            'index.html',
            'map.html',
            'package.json',
            'package-lock.json',
            'server.js',
            'upload.html'
        ];

        // Copy specified files
        for (const file of filesToCopy) {
            const sourcePath = path.join(process.cwd(), file);
            const targetPath = path.join(targetDir, file);
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, targetPath);
            }
        }

        // Create .env file
        const envContent = Object.entries(envInfo)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        fs.writeFileSync(path.join(targetDir, '.env'), envContent);

        // Update index.html
        const indexPath = path.join(targetDir, 'index.html');
        let indexContent = fs.readFileSync(indexPath, 'utf8');
        indexContent = indexContent.replace(/<h1>.*?<\/h1>/, `<h1>${eventName}</h1>`);
        fs.writeFileSync(indexPath, indexContent);

        // Update map.html
        const mapPath = path.join(targetDir, 'map.html');
        let mapContent = fs.readFileSync(mapPath, 'utf8');
        
        // Update location names
        mapContent = mapContent.replace(/<button class="button kina".*?>(.*?)<\/button>/, 
            `<button class="button kina" onclick="openMaps1()">${locations[0]}</button>`);
        
        if (locations.length > 1) {
            mapContent = mapContent.replace(/<button class="button dugun".*?>(.*?)<\/button>/, 
                `<button class="button dugun" onclick="openMaps2()">${locations[1]}</button>`);
        } else {
            // Remove second location button if only one location
            mapContent = mapContent.replace(/<button class="button dugun".*?>(.*?)<\/button>/, '');
        }

        // Update map links
        mapContent = mapContent.replace(
            /let googleMapsUrl = `.*?`;/,
            `let googleMapsUrl = \`${mapLinks[0].google}\`;`
        );
        mapContent = mapContent.replace(
            /let appleMapsUrl = `.*?`;/,
            `let appleMapsUrl = \`${mapLinks[0].apple}\`;`
        );

        if (locations.length > 1) {
            mapContent = mapContent.replace(
                /function openMaps2\(\) {[\s\S]*?let googleMapsUrl = `.*?`;[\s\S]*?let appleMapsUrl = `.*?`;/,
                `function openMaps2() {
            let userAgent = navigator.userAgent.toLowerCase();
            let googleMapsUrl = \`${mapLinks[1].google}\`;
            let appleMapsUrl = \`${mapLinks[1].apple}\`;`
            );
        }

        fs.writeFileSync(mapPath, mapContent);

        // 6. Install dependencies and start the server
        console.log('\n=== Proje Kurulumu ===');
        console.log(`Proje "${projectDir}" klasörüne kopyalandı.`);
        console.log('Bağımlılıklar yükleniyor...');
        
        process.chdir(targetDir);
        exec('npm install', (error) => {
            if (error) {
                console.error('Bağımlılıklar yüklenirken hata oluştu:', error);
                return;
            }
            console.log('\nKurulum tamamlandı! Projeyi başlatmak için:');
            console.log(`cd ${projectDir}`);
            console.log('npm start');
        });

    } catch (error) {
        console.error('Kurulum sırasında bir hata oluştu:', error);
    } finally {
        rl.close();
    }
}

setup();