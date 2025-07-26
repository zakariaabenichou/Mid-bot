require('dotenv').config(); 
const { chromium } = require('playwright');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SERVER_ID = process.env.SERVER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
  });

  console.log('Creating new browser context...');
  const context = await browser.newContext();

  console.log('Injecting Discord token into localStorage...');
  await context.addInitScript(token => {
    window.localStorage.setItem('token', `"${token}"`);
  }, DISCORD_TOKEN);

  console.log('Opening new page...');
  const page = await context.newPage();

  console.log(`Navigating to Discord channel: ${SERVER_ID}/${CHANNEL_ID}`);
  await page.goto(`https://discord.com/channels/${SERVER_ID}/${CHANNEL_ID}`);

  
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: upscaleImageUrl })
    });

    if (response.ok) {
      console.log('✅ Image URL sent to Make successfully!');
    } else {
      console.error('❌ Failed to send to Make:', response.statusText);
    }
  } catch (err) {
    console.error('❌ Error sending to Make:', err.message);
  } finally {
    await browser.close();
  }
})();
