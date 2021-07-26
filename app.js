const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const rss_parser = require('xml2js').parseString;
// 9 수정해야됨 하루 전으로

const BLOG_NAME = "daycare-center";
(async () => {
  try {
    const browser = await puppeteer.launch({
        headless : false
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1000,
        height: 800
    });

    await page.goto('https://rss.blog.naver.com/kkodari1234.xml');
    const html = await page.$eval('.pretty-print', el => el.innerText);
    
    let pubList = [];
    rss_parser(html, (err, result) => {
      if (err) console.error(err);
      const items = result.rss.channel[0].item;
      pubList = items.filter((item) => {
        const now = new Date();
        const yesterday = new Date(now.setDate(now.getDate() - 1));
        const itemDate = new Date(item.pubDate[0]);
        return itemDate.toDateString() === yesterday.toDateString();
      });
    });
    // console.log(pubList);
    if (pubList.length === 0) {
      await page.screenshot({ path: `./log/${new Date().getTime()}.png` });
      return ;
    }
    await Promise.all(pubList.map(pubItem => main(page, pubItem)));
  }
  catch(error) {
    console.error(error);
  }
  finally {
    process.exit();
  }
})();

const main = async (page, pubItem) => {
  try {
    const LINK = pubItem.link[0];

    // 네이버 게시글 가져오기
    await page.goto(LINK);
    const iframe = page.frames().find(frame => frame.name() === 'mainFrame');
    const html = await iframe.content();
    const $ = cheerio.load(html);
    const title = $('.se-fs-.se-ff-').first().text();
    const content = $('.se-main-container').html();

    // 티스토리 인증
    await page.goto(`https://${BLOG_NAME}.tistory.com/manage/newpost/?type=post&returnURL=%2Fmanage%2Fposts%2F`);
    await page.click('.btn_login.link_kakao_id');
    await page.waitForSelector('input#id_email_2', {timeout: 60000});
    await page.click('input#id_email_2');
    await page.keyboard.type('dalcon');
    await page.click('label[for="id_password_3"]');
    await page.keyboard.type('2alsrnjs!');
    await page.click('button.btn_g.btn_confirm.submit');
    
    // 티스토리 게시글 발행
    await page.waitForNavigation();
    page.on('dialog', async dialog => {
        await dialog.dismiss();
    });
    await page.click('button#mceu_20-open');
    await page.waitForSelector('#mceu_34', {timeout: 60000});
    await page.click('#mceu_34');
    await page.click('textarea.textarea_tit');
    await page.keyboard.type(title);
    await page.click('pre.CodeMirror-line');
    await page.keyboard.type(content);
    await page.click('div.mce-widget.mce-btn');
    await page.click('div.mce-menu-item[aria-label="포토앨범"]');
    await page.click('button.btn.btn-default');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    await page.screenshot({ path: `./log/${new Date().getTime()}.png` });
    return page;
  } catch (error) {
    throw `출간 에러 ${error}`;
  }
}