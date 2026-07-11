const appJson = require('./app.json');

/** Default production API — used in APK/EAS builds when .env is not present. */
const DEFAULT_API_URL = 'https://king-cric-production.up.railway.app';

module.exports = () => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL,
  },
});
