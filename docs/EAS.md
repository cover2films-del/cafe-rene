# Build for an iPhone with EAS

No EAS build, signing, upload, App Store submission or real-device run has been performed. The JavaScript bundles were checked with Metro/Hermes only. You must use your own Expo and Apple accounts.

## One-time setup

1. Install Node 24 LTS, run `npm ci` at the monorepo root, and choose a permanent reverse-domain bundle identifier that you own. Replace `uk.co.caferene.gloucester` in `apps/mobile/app.config.ts` (or supply IOS_BUNDLE_IDENTIFIER and ANDROID_PACKAGE consistently in every EAS environment). Do this before registering the App ID.
2. Join the paid Apple Developer Program for ad hoc distribution and App Store/TestFlight. Confirm the business has authorised the app, its name, logo and content.
3. Deploy a **private demonstration** API and web app to your chosen HTTPS hosting. No hosting has been provisioned here. Installed native builds need an API accessible outside your laptop.
4. From `apps/mobile`:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` links your Expo account and writes the real project ID. Keep that ID in app config. If prompted to convert the TypeScript config manually, insert the returned `extra.eas.projectId` and `owner` without replacing existing extra values. They are intentionally absent in this source, rather than fabricated.

5. Set non-secret API/web URLs in each EAS environment. EXPO_PUBLIC variables are public bundle content; never place provider keys or session/webhook secrets here.

```sh
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://YOUR-DEMO-API --visibility plaintext
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_WEB_URL --value https://YOUR-DEMO-WEB --visibility plaintext
```

Repeat for development and production when those builds are needed. Production remains a demonstration until real adapters are implemented and authorised. `.env` files are ignored and are not a substitute for EAS remote environment settings.

## Register your iPhone and make an installable preview

From `apps/mobile`:

```sh
npx eas-cli@latest device:create
```

Open the registration link on the iPhone, follow the device-profile steps to register its UDID, and include it in the ad hoc provisioning profile when prompted during the build. Then:

```sh
npx eas-cli@latest build --platform ios --profile preview
```

Allow EAS to manage your Apple signing credentials only after reviewing the prompts. Install the finished build using the EAS installation link on the registered iPhone. Devices registered later require a newly provisioned build or EAS resign workflow. This is an internal/ad hoc distribution, not a simulator build.

For development with a custom development client:

```sh
npx eas-cli@latest build --platform ios --profile development
npx expo start --dev-client
```

Android demonstration APK:

```sh
npx eas-cli@latest build --platform android --profile preview
```

## Production and TestFlight (commands only; execute after explicit release approval)

Set the real production API/web URL environment, permanent IDs, Expo project, signing credentials and App Store Connect app record. Prepare screenshots from actual devices, icon/splash assets, app description/support URL, age rating, reviewed privacy policy, privacy nutrition disclosures, account-deletion information, demo review credentials and camera/location explanations. Audit dependencies and test on current iOS/Android devices, denied permissions, slow network, dynamic text, VoiceOver/TalkBack, safe areas and keyboard handling.

```sh
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production --latest
```

The submit command uploads to App Store Connect/TestFlight; it does not by itself complete App Review or release the app. Configure the Apple team/App Store Connect app when prompted or in your private EAS configuration. No credentials are committed here.

Permissions: camera for table/check-in scanning, foreground location for optional proximity assistance. No microphone recording, background location or always-on tracking is enabled. Deep links use `caferene://order?table=SIGNED_REFERENCE` and `caferene://checkin?ref=SIGNED_REFERENCE`. Web table QR links remain usable without installing the app. Universal links require a real owned domain, entitlement configuration and association files and are not configured in the demo.

References checked 11 November 2026: [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/) and [Expo monorepo guidance](https://docs.expo.dev/guides/monorepos/). The EAS configuration lives in the app workspace; npm installation runs at the monorepo root. Default internal build links can be accessible to anyone with the link; use your Expo project settings to restrict unauthenticated build access when needed.

## Current preview configuration

The preview profile now points EXPO_PUBLIC_API_URL and EXPO_PUBLIC_WEB_URL at `https://cafe-rene.onrender.com`, so the installed preview will not try to contact the iPhone's localhost. The replaceable proposed package/bundle ID is `uk.co.caferene.gloucester`; confirm ownership/availability before the first signed build. `extra.eas.projectId` must still be linked to your own Expo project with `eas init`.

When ready, authenticate through EAS's secure sign-in/device-registration/signing prompts. Alternatively, an Expo token can be provided through environment **secret settings** as EXPO_TOKEN. Do not paste Expo/Apple passwords, tokens, recovery codes or signing keys into chat. EAS should manage Apple credentials through its signing workflow. No signed build or installation has been performed. The preview profile uses the deployed demonstration API with mock payments/POS.
