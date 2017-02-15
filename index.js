const Twitter = require('twitter');
const promisify = require('es6-promisify');
const _ = require('lodash');
const {CronJob} = require('cron');
const {WebClient} = require('@slack/client');


const [consumer_key, consumer_secret, access_token_key, access_token_secret] = process.env.TWITTER_TOKENS.split(':');
const twitterClient = new Twitter({consumer_key, consumer_secret, access_token_key, access_token_secret});
const getTwitterTrends = async id => {
  const [{trends}] = await twitterClient.get('trends/place', {
    id
  });
  return trends;
};

const TOP_TWEET_THRESHOLD_MSEC = 6 * 60 * 60 * 1000;
const getTopTweet = async (word, type = 'popular') => {
  const {statuses} = await twitterClient.get('search/tweets', {
    q          : word,
    result_type: type,
    count      : 50
  });

  const [topTweet] = statuses.filter(s => new Date(s.created_at).getTime() > Date.now() - TOP_TWEET_THRESHOLD_MSEC);
  return topTweet;
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

  // 23424856=Japan, 1118370=Tokyo
  const trends = _.uniqBy((await getTwitterTrends(23424856)).concat(await getTwitterTrends(1118370)), t => t.name);
  console.log(`Got ${trends.length} Twitter trends.`);
  // console.log(JSON.stringify(trends, null, 2));

  const newTrends = trends.filter(t => !trendsCache.hasOwnProperty(t.name));
  console.log(`Got new ${newTrends.length} Twitter trends.`);

  if (!isDry) {
    for (const trend of newTrends) {
      const topTweet = (await getTopTweet(trend.name, 'popular')) || (await getTopTweet(trend.name, 'mixed'));
      await postMessage(
        `<${trend.url}&f=tweets|${trend.name}>` +
        (topTweet ? ` <https://twitter.com/${topTweet.user.screen_name}/status/${topTweet.id_str}|:twitter:>` : '')
      );
    }
  }
  for (const trend of trends) {
    trendsCache[trend.name] = Date.now() + TREND_CACHE_EXPIRE_MSEC;
  }
  console.log(`There are ${Object.keys(trendsCache).length} tweet caches.`);
};

new CronJob({
  cronTime: '00 * * * * *',
  start   : true,
  timeZone: 'Asia/Tokyo',
  onTick  : () => run().catch(e => console.error(e))
});

// for initial cache creation, it should do dry-run first time.
run(true);
