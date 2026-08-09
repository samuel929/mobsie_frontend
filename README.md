# Mobsie Connect — Expo SDK 54

The application flow now requires the previous school name and telephone number, captures
where the parent heard about Mobsie Connect, and generates the final reference from the first
four branch letters plus nine digits. Privacy Policy and Terms & Conditions are linked from
sign-up and the final application consent section.

Cross-platform Expo SDK 54 / React Native 0.81 implementation of the supplied school-app design. It includes the original screens plus daily activity, consent forms, feedback, newsletter, notifications, reports, school shop, cart, brand story, and delivery-plan views.

The rebuilt navigation follows the complete parent journey: welcome → login or sign-up → three-step application → application success → enrolment confirmation → parent app. Poppins is loaded globally, the supplied visual assets are stored in `assets/`, the main app uses persistent bottom tabs, and the front drawer covers 72% of the screen.

The production API mode connects parent signup/login to signed JWT endpoints,
loads branches and team members from Neon-backed API routes, creates and updates
applications in Neon, selects five required files natively, uploads them through
the API to Cloudinary, records consent, and submits the application for review.

The active bundle uses only the clean artwork under `assets/clean/` and `assets/shop/`; none of the earlier Visily-watermarked exports are referenced. The drawer includes a school shop and cart with product imagery, while Shop, Cart, Services & Fees, Team, Gallery, and Branches expose bottom navigation.

## Run

```bash
npm install
npm start
```

Press `i` for iOS Simulator, `a` for Android Emulator, or scan the Expo QR code.
Sign-up and login use the dashboard's parent JWT endpoints; sessions are restored
securely from AsyncStorage.

Copy `.env.example` to `.env` to configure API mode. Set `EXPO_PUBLIC_API_URL`
to the deployed admin dashboard's `/api` URL and use the tenant UUID created by
`npm run db:seed`. For local-device testing, use your computer's LAN IP rather
than `localhost`.

## Structure

- `App.tsx` — typed root navigation and provider composition
- `src/components/ui.tsx` — reusable screen, card, header, field, button, avatar, and progress components
- `src/auth/AuthContext.tsx` — parent JWT authentication and persistent session
- `src/application/ApplicationContext.tsx` — Neon application workflow and Cloudinary document uploads
- `src/data/SchoolContext.tsx` — parent feed, messages, events, academics, shop, cart, orders, and checkout
- `src/screens/features/` — independently editable feature screens
- `src/data/` — typed spreadsheet imports and replaceable dummy content
- `src/services/api/` — mock/REST API contracts, client, and adapters
- `src/config/environment.ts` — environment-driven runtime configuration
- `src/theme.ts` — shared colors, radii, and elevation tokens

The supplied clean logos, people, branch, learning, gallery and shop assets are
organised under `assets/` and referenced from a central image registry.

## Connected functionality

- Parent sign-up/login and JWT session restoration
- Three validated application steps saved to Neon
- Required native document selection and Cloudinary upload
- Branches, team, students, academics, attendance and events loaded from the dashboard
- Parent messages and feedback visible in the principal dashboard
- Principal message replies returned to the mobile app
- Neon-backed products, cart checkout, stock changes and parent order history
- Enrolment confirmation creates/updates the learner record

## Deploy for testers

The project includes `eas.json`, SDK-compatible `expo-updates`, stable iOS and Android identifiers, and preview/production deployment scripts.

Run these final account-specific commands:

```bash
# 1. Sign into your Expo account
npx eas-cli@latest login

# 2. Link/create the EAS project and configure the update URL/project ID
npm run eas:configure

# 3. Create a shareable Android APK
npm run build:preview:android
```

Expo prints an installation URL and QR code when the build finishes. For an iOS preview, register tester devices first and then build:

```bash
npx eas-cli@latest device:create
npm run build:preview:ios
```

After the first preview build is installed, publish JavaScript, styling, and asset updates with:

```bash
npm run update:preview -- --message "Describe the update"
```

Create App Store and Google Play production builds with `npm run build:production`.
