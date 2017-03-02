# twitter_trend_bot
A slack bot for observing twitter trends.

# setup
## install packages
```sh
yarn install
```

## setup environment variables
- `SLACK_TOKEN` - [Slack token](https://api.slack.com/tokens) for posting messages. example: `xxxx-xxxxxxx-xxxxxxx`
- `SLACK_CHANNEL` - Slack channel id for posting messages to. example: `C000000000`
- `TWITTER_TOKENS` - Twitter tokens concatenated by `:` for seraching trend tweets. example `consumer_key:consumer_secret:access_token_key:access_token_secret`

# LICENSE
MIT.
