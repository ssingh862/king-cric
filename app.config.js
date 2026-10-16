/** Default production API — used in APK/EAS builds when .env is not present. */
const DEFAULT_API_URL = 'https://king-cric.onrender.com';

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL,
  },
});
