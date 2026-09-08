const appJson = require('./app.json');

/**
 * Reversed iOS OAuth client ID for Google Sign-In URL scheme.
 * Example: 123456789-abc.apps.googleusercontent.com
 *       -> com.googleusercontent.apps.123456789-abc
 */
function getGoogleIosUrlScheme(iosClientId) {
  if (!iosClientId || !iosClientId.endsWith('.apps.googleusercontent.com')) {
    return null;
  }

  const clientPrefix = iosClientId.replace('.apps.googleusercontent.com', '');
  return `com.googleusercontent.apps.${clientPrefix}`;
}

module.exports = () => {
  const expo = appJson.expo;
  const appleTeamId =
    process.env.EXPO_PUBLIC_APPLE_TEAM_ID ?? 'YOUR_APPLE_TEAM_ID';
  const googleIosScheme = getGoogleIosUrlScheme(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  );

  const urlSchemes = [expo.scheme];
  if (googleIosScheme) {
    urlSchemes.push(googleIosScheme);
  }

  const plugins = expo.plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-apple-authentication') {
      return ['expo-apple-authentication', { appleTeamId }];
    }

    if (plugin === 'expo-apple-authentication') {
      return ['expo-apple-authentication', { appleTeamId }];
    }

    return plugin;
  });

  return {
    ...expo,
    plugins,
    ios: {
      ...expo.ios,
      ...(urlSchemes.length > 0 && {
        infoPlist: {
          CFBundleURLTypes: [
            {
              CFBundleURLSchemes: urlSchemes,
            },
          ],
        },
      }),
    },
  };
};
