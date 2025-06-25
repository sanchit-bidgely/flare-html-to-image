import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    // Only handle POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed. Use POST with JSON payload.', {
        status: 405,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    try {
      // Parse the request body
      const payload = await request.json();

      // Validate required fields
      if (!payload.html && !payload.url) {
        return new Response('Either "html" or "url" is required in the payload', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Launch browser
      const browser = await puppeteer.launch(env.MYBROWSER, { keep_alive: 60_000 });
      const page = await browser.newPage();

      // Set viewport if provided
      if (payload.viewport) {
        await page.setViewport({
          width: payload.viewport.width || 1920,
          height: payload.viewport.height || 1080,
          deviceScaleFactor: payload.viewport.deviceScaleFactor || 1
        });
      }

      // Navigate to URL or set HTML content
      if (payload.url) {
        await page.goto(payload.url, {
          waitUntil: payload.waitUntil || 'networkidle0',
          timeout: payload.timeout || 30000
        });
      } else if (payload.html) {
        await page.setContent(payload.html, {
          waitUntil: payload.waitUntil || 'networkidle0',
          timeout: payload.timeout || 30000
        });
      }

      // Wait for additional selector if provided
      if (payload.waitForSelector) {
        await page.waitForSelector(payload.waitForSelector, {
          timeout: payload.timeout || 30000
        });
      }

      // Take screenshot
      const screenshotOptions = {
        fullPage: payload.fullPage !== false, // default to true
      };

      // Add clip if provided
      if (payload.clip) {
        screenshotOptions.clip = payload.clip;
      }

      const screenshot = await page.screenshot(screenshotOptions);

      // Close browser (optional, can keep alive for performance)
      // await browser.close();

      // Return the image
      return new Response(screenshot, {
        headers: {
          'Content-Type': `image/${payload.format || 'png'}`,
          'Content-Disposition': `attachment; filename="screenshot.${payload.format || 'png'}"`
        }
      });

    } catch (error) {
      console.error('Error generating screenshot:', error);
      return new Response(`Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  },
};