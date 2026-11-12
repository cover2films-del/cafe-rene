# EAS builds and automatic updates

Project: `77d77412-91fc-4ac2-aa57-16abb1aeff1c`. It is linked in `apps/mobile/app.config.ts`; do not create another project. Preview API and web URLs are `https://cafe-rene.onrender.com`. Default config also uses these hosted URLs to avoid accidentally shipping localhost in an update. For local development, explicitly set EXPO_PUBLIC_API_URL/WEB_URL in your ignored local environment file.

## One new build is required

expo-updates and its native configuration have now been added. An older installed app cannot acquire them over the air. On Windows PowerShell:

```powershell
cd C:\Users\Asus\cafe-rene
git pull origin feat/rene-demo
npm.cmd ci
cd apps\mobile
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest device:create
npx.cmd eas-cli@latest build --platform ios --profile preview
```

Register the iPhone through the Safari registration link if it is not already registered. Choose the correct Apple team, allow EAS to manage signing credentials, include the registered device, then install the completed build using its EAS link. Confirm the permanent bundle identifier `uk.co.caferene.gloucester` before the first App ID/signing registration. No Mac is required for an EAS cloud build. Android uses `--platform android --profile preview` and produces an APK.

## Enable automatic preview publishing

1. In your Expo account settings, create a personal access token. In GitHub repository **Settings → Secrets and variables → Actions → New repository secret**, save it as **EXPO_TOKEN**. Do not paste it in chat, source files, EXPO_PUBLIC variables or the app.
2. In the EAS project **Environment variables**, choose **preview** and create plaintext `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL`, both `https://cafe-rene.onrender.com`. Only public service URLs go here; Neon, payment and EPOS keys stay on the server. Updates do not inherit the env block in an EAS build profile.
3. In GitHub **Actions → Publish mobile preview update → Run workflow**, start the first publication. The workflow is also triggered by later mobile/shared/package changes pushed to `feat/rene-demo`. It publishes to **preview only**. A missing Expo token fails with an explicit setup message; it does not silently report a successful publication.
4. Launch the update-enabled app with connectivity, allow the download, then close/reopen it. A compatible downloaded update is applied on launch. No forced reload interrupts a basket or message.

Manual publication from `apps/mobile`:

```powershell
npx.cmd eas-cli@latest update --channel preview --environment preview --message "René refresh"
```

## What updates automatically

Compatible JavaScript, text, layout and bundled image changes can use EAS Update. The app checks on launch and waits up to three seconds, then uses its cached bundle while downloading if necessary; a completed update is used on a later launch. Offline launches retain the cached version. This is launch-based updating, not a forced refresh of an app left open indefinitely.

Fingerprint runtime compatibility prevents an update for a different native configuration from loading. Native dependencies, entitlements, permissions and other fingerprint-changing changes require another signed EAS build. Keep matching configuration/public environment values between a build and its updates. Test both platforms and EAS rollback behaviour on actual devices before broader distribution.

Render backend/web updates are separate and do not require a phone rebuild when their API remains compatible. The current backend still simulates payments and POS delivery; automatic updates do not connect a till or enable live commerce.

## TestFlight and release

Internal preview installs work only on provisioned iPhones. To distribute through TestFlight, configure a production environment, App Store Connect app and signing, then build with `--profile production` and submit the approved build with `eas submit --platform ios --profile production --latest`. Uploading to TestFlight does not release the app to the App Store. Prepare real-device QA, icon/screenshots, app metadata, reviewed privacy disclosures, account deletion and support details first.

Permissions are camera for QR scanning and optional foreground location. No microphone, background location or Contacts access is enabled. Universal links are not configured; private app links use `caferene://`.

No Expo token is stored by this source change. No cloud update, signed build, TestFlight upload or real-device run has been performed here. Authenticate through EAS and GitHub’s secure credential settings; never send Apple/Expo passwords or recovery codes in chat.
