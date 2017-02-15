const Twitter = require('twitter');
const promisify = require('es6-promisify');
const {CronJob} = require('cron');
const {WebClient} = require('@slack/client');


const [consumer_key, consumer_secret, access_token_key, access_token_secret] = process.env.TWITTER_TOKENS.split(':');
const twitterClient = new Twitter({consumer_key, consumer_secret, access_token_key, access_token_secret});
const getTwitterTrends = async () => {
  const [{trends}] = await twitterClient.get('trends/place', {
    id: 23424856 // 日本
    // id: 1118370 // 東京
  });
  return trends;
};

const slackWebClient = new WebClient(process.env.SLACK_TOKEN);
const postMessage = async message => {
  await promisify(slackWebClient.chat.postMessage, slackWebClient.chat)(
    process.env.SLACK_CHANNEL,
    message,
    {as_user: true}
  );
};

const TREND_CACHE_EXPIRE_MSEC = 24 * 60 * 60 * 1000;
const trendsCache = {};
const run = async (isDry = false) => {
  // trendsCache からexpiredを取り除く
  for (const trendName in trendsCache) {
    if (trendsCache[trendName] < Date.now()) {
      delete trendsCache[trendName];
    }
  }

  const trends = await getTwitterTrends();
  console.log(`${trends.length}件のTwitterトレンドを取得`);

  const newTrends = trends.filter(t => !trendsCache.hasOwnProperty(t.name));
  console.log(`${newTrends.length}件の新着トレンド`);

  if (!isDry) {
    for (const trend of newTrends) {
      await postMessage(`<${trend.url}&f=tweets|${trend.name}>`);
    }
  }
  for (const trend of trends) {
    trendsCache[trend.name] = Date.now() + TREND_CACHE_EXPIRE_MSEC;
  }
  console.log(`${Object.keys(trendsCache).length}件キャッシュがあります`);
};

new CronJob({
  cronTime: '00 * * * * *',
  start   : true,
  timeZone: 'Asia/Tokyo',
  onTick  : () => run().catch(e => console.error(e))
});

// キャッシュ作成のため、起動時に一度ドライ実行
run(true);
