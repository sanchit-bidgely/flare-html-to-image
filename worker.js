import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const eventBody = await request.json();
      const browser = await puppeteer.launch(env.MYBROWSER, { keep_alive: 60_000 });
      const page = await browser.newPage();

      // Handle HTML content
      if (eventBody.html) {
        const screenshotOptions = {};
        let dimensions = {};
        let setViewport = false;

        if (eventBody.width && eventBody.height) {
          setViewport = true;
          dimensions.width = eventBody.width;
          dimensions.height = eventBody.height;
        } else {
          screenshotOptions.fullPage = true;
        }

        if (eventBody.qualityFactor) {
          setViewport = true;
          dimensions.deviceScaleFactor = eventBody.qualityFactor;
        }

        if (setViewport) {
          await page.setViewport(dimensions);
        }

        await page.setContent(eventBody.html, { waitUntil: 'networkidle2' });

        // Wait 2 seconds like Lambda function
        await new Promise(resolve => setTimeout(resolve, 2000));

        const screenshot = await page.screenshot(screenshotOptions);
        const screenshotBase64 = Buffer.from(screenshot).toString('base64');

        return new Response(JSON.stringify({
          statusCode: 200,
          headers: {
            'Content-Type': 'image/png'
          },
          body: screenshotBase64,
          isBase64Encoded: true
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // Handle URL screenshot
      if (eventBody.url) {
        const screenshotOptions = { fullPage: true };
        await page.setViewport({
          width: eventBody.width ? eventBody.width : 1280,
          height: 0
        });
        await page.goto(eventBody.url, { waitUntil: 'networkidle0' });

        const screenshot = await page.screenshot(screenshotOptions);
        const screenshotBase64 = Buffer.from(screenshot).toString('base64');

        return new Response(JSON.stringify({
          statusCode: 200,
          headers: {
            'Content-Type': 'image/png'
          },
          body: screenshotBase64,
          isBase64Encoded: true
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // Handle PDF generation
      if (eventBody.pdfURL) {
        await page.goto(eventBody.pdfURL, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ printBackground: true });

        return new Response(JSON.stringify({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/pdf'
          },
          body: pdf.toString('base64'),
          isBase64Encoded: true
        }), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      return new Response('No valid payload found', { status: 400 });

    } catch (error) {
      console.error('Error:', error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  },
};