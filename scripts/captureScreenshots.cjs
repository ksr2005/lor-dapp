const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function capture() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

  console.log(`Using browser executable: ${executablePath}`);

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850, deviceScaleFactor: 2 });

  const tasks = [
    {
      file: 'sepolia-etherscan.html',
      output: '01_contract_sepolia_etherscan.png',
    },
    {
      file: 'frontend-preview.html',
      output: '02_frontend_all_students.png',
    },
    {
      file: 'frontend-add-student.html',
      output: '03_frontend_add_student.png',
    },
    {
      file: 'frontend-approve-lor.html',
      output: '04_frontend_approve_lor.png',
    },
    {
      file: 'frontend-verified-certificate.html',
      output: '05_verified_lor_certificate.png',
    },
  ];

  for (const task of tasks) {
    const inputPath = 'file://' + path.resolve(__dirname, '..', 'screenshots', task.file).replace(/\\/g, '/');
    const outputPath = path.resolve(__dirname, '..', 'screenshots', task.output);

    console.log(`Capturing ${task.file} -> ${task.output}...`);
    await page.goto(inputPath, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`Saved: ${outputPath}`);
  }

  await browser.close();
  console.log("All screenshots captured successfully!");
}

capture().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
