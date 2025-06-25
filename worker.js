import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    const browser = await puppeteer.launch(env.MYBROWSER, { keep_alive: 60_000 });
    const page = await browser.newPage();
    await page.goto("https://example.com");
    const metrics = await page.metrics();
    // await browser.close();
    return Response.json(metrics);
  },
};