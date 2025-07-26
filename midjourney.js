const { chromium } = require('playwright');

const DISCORD_TOKEN = '***REMOVED***';
const SERVER_ID = '1393346810403098654';
const CHANNEL_ID = '1393347463989170206';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // Optional: use installed Chrome
  });

  console.log('Creating new browser context...')
;  const context = await browser.newContext();

  console.log('Injecting Discord token into localStorage...');
  await context.addInitScript(token => {
    window.localStorage.setItem('token', `"${token}"`);
  }, DISCORD_TOKEN);

  console.log('Opening new page...');
  const page = await context.newPage();

  console.log(`Navigating to Discord channel: ${SERVER_ID}/${CHANNEL_ID}`);
  await page.goto(`https://discord.com/channels/${SERVER_ID}/${CHANNEL_ID}`);

  console.log('Waiting for Discord to load session...');
  await page.waitForTimeout(6000);

  console.log('Fetching all message elements...');
  const messages = await page.$$('[data-list-item-id^="chat-messages"]');

  if (messages.length === 0) {
    console.log('No messages found in channel.');
    await browser.close();
    return;
  }

  const latest = messages[messages.length - 1];

  // Extract only the actual user message text from inside the message element
  const prompt = await latest.$eval('[class*="markup"]', el => el.innerText);
  console.log('Raw prompt extracted:', prompt);

  // Clean up prompt (remove any leftover /imagine prompt text or brackets)
  const cleanedPrompt = prompt
    .replace(/\/imagine prompt\s*/i, '')
    .replace(/[\[\]]/g, '')
    .trim();
  console.log('Cleaned prompt:', cleanedPrompt);

  console.log('Focusing message input box...');
  await page.click('[role="textbox"]');

  console.log('Typing "/imagine" to trigger slash command autocomplete...');
  console.log('Typing text:', '/imagine');
  await page.keyboard.type('/imagine');
  await page.waitForTimeout(3000);

  console.log('Waiting for autocomplete menu to appear...');
  await page.waitForSelector('div[role="listbox"]');
  await page.waitForTimeout(3000);


  console.log('Selecting /imagine command by pressing Enter...');
  await page.keyboard.press('Enter');

  console.log(`Typing prompt text: "${cleanedPrompt}"`);
  await page.keyboard.type(' ' + cleanedPrompt);

  console.log('Pressing Enter to send the command...');
  await page.keyboard.press('Enter');

  console.log('Prompt sent to MidJourney!');

  // === WAIT FOR MIDJOURNEY'S REPLY ===
  console.log('⏳ Waiting for MidJourney reply matching the prompt...');
  let mjMessage;
  const replyTimeout = Date.now() + 120000;

  while (Date.now() < replyTimeout) {
    const messages = await page.$$('[data-list-item-id^="chat-messages"]');
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const textContent = await msg.innerText().catch(() => '');
      if (textContent && textContent.includes(cleanedPrompt)) {
        mjMessage = msg;
        break;
      }
    }

    if (mjMessage) break;
    await page.waitForTimeout(3000);
  }

  if (!mjMessage) {
    console.error('❌ Timeout: No matching MidJourney message found.');
    return;
  }

  console.log('✅ Found MidJourney reply. Waiting for U1 button...');






 console.log('⏳ Waiting 50 seconds for generation...');
await page.waitForTimeout(50000);

console.log('🔍 Scanning for MidJourney reply...');
const updatedMessages = await page.$$('[data-list-item-id^="chat-messages"]');

let targetMessage = null;

for (let i = updatedMessages.length - 1; i >= 0; i--) {
  const msgText = await updatedMessages[i].innerText().catch(() => '');
  
  console.log(`Checking message #${i}:`, msgText.substring(0, 80) + '...');
  
  // Use case-insensitive exact match (can tweak if needed)
  if (msgText.toLowerCase().includes(cleanedPrompt.toLowerCase())) {
    targetMessage = updatedMessages[i];
    console.log('✅ MidJourney reply matched prompt:', msgText.substring(0, 80) + '...');
    break;
  }
}

if (!targetMessage) {
  console.error('❌ No MidJourney reply matched the prompt.');
  await browser.close();
  return;
}

// Double-check that the matched message’s text still includes the cleaned prompt exactly
const finalMsgText = await targetMessage.innerText();

if (!finalMsgText.toLowerCase().includes(cleanedPrompt.toLowerCase())) {
  console.error('❌ The matched message does not contain the expected prompt exactly. Aborting.');
  await browser.close();
  return;
}

console.log('🔎 Searching for U1 button inside the matched reply...');
const u1Button = await targetMessage.$('button:has-text("U1")');

if (!u1Button) {
  console.error('❌ U1 button not found inside the matched message.');
  await browser.close();
  return;
}

console.log('🖱️ Clicking U1 button to upscale the first image...');
await u1Button.click();

console.log('✅ U1 button clicked. Upscaling started.');







console.log('⏳ Waiting 10 seconds for upscaled image generation...');
await page.waitForTimeout(10000);






console.log('🔍 Searching for the upscaled image message...');

const allMessages = await page.$$('[data-list-item-id^="chat-messages"]');
let upscaleImageUrl = null;

for (let i = allMessages.length - 1; i >= 0; i--) {
  const message = allMessages[i];
  const imgs = await message.$$('img');

  for (const img of imgs) {
    const src = await img.getAttribute('src');
    if (
      src &&
      src.includes('media.discordapp.net') &&
      src.match(/\.(png|jpe?g|webp)(\?|$)/i) &&
      !src.includes('avatars')
    ) {
      // Clean the URL to remove resizing parameters
      upscaleImageUrl = src
        .replace(/([&?])(width|height)=\d+&?/g, '$1')  // remove width/height params
        .replace(/[&?]$/, ''); // clean up dangling & or ?
      
      // Optional: force format and quality
      upscaleImageUrl += upscaleImageUrl.includes('?') ? '&format=png&quality=lossless' : '?format=png&quality=lossless';

      console.log('✅ Upscaled image found:', upscaleImageUrl);
      break;
    }
  }

  if (upscaleImageUrl) break;
}

if (!upscaleImageUrl) {
  console.error('❌ Upscaled image not found after U1.');
}








// ✅ Send image to Make.com webhook
console.log('📤 Sending image URL to Make.com...');

const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/gegriwveym6i24koddrm84awmwnnaw11'; // replace with your webhook

try {
  const response = await fetch(MAKE_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: upscaleImageUrl }) // or { url: ... } if Make expects another key
  });

  if (response.ok) {
    console.log('✅ Image URL sent to Make successfully!');
  } else {
    console.error('❌ Failed to send to Make:', response.statusText);
  }
} catch (err) {
  console.error('❌ Error sending to Make:', err.message);
}finally {
    await browser.close(); // 👈 Ensures the browser is always closed
  }






})();
