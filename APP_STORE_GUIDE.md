# JobSynk — App Store Submission Guide

## Prerequisites Checklist
- [x] PWA live at https://jobsynk.qq-studios.com
- [x] manifest.json with PNG icons (192, 512, 1024)
- [x] Service worker (sw.js) with offline caching
- [x] HTTPS with valid SSL
- [x] Privacy Policy: https://jobsynk.qq-studios.com/privacy.html
- [x] Terms of Service: https://jobsynk.qq-studios.com/terms.html
- [x] Support email: support@qq-studios.com

---

## 1. Google Play Store (Android)

### Developer Account
- **Cost**: $25 one-time
- **URL**: https://play.google.com/console/signup
- **Sign up with**: helloworld@qq-studios.com (or your Google account)

### Generate TWA Package (Option A: PWABuilder)
1. Go to https://www.pwabuilder.com
2. Enter: `https://jobsynk.qq-studios.com`
3. Click "Start" → It validates your PWA
4. Click "Build" → Select "Android"
5. Fill in:
   - Package ID: `com.qqstudios.jobsynk`
   - App name: `JobSynk`
   - Display mode: Standalone
   - Status bar color: `#C47B3A`
   - Splash screen color: `#FFFFFF`
6. Download the APK/AAB bundle
7. Upload to Google Play Console

### Generate TWA Package (Option B: Bubblewrap CLI)
```bash
npm install -g @nicolo-ribaudo/bubblewrap
bubblewrap init --manifest https://jobsynk.qq-studios.com/manifest.json
bubblewrap build
```

### Google Play Console Submission
1. Create new app → "JobSynk"
2. Upload the AAB (Android App Bundle)
3. Store listing:
   - Title: JobSynk — AI Career Management
   - Short description: Search jobs, optimize resumes, generate cover letters, track your pipeline.
   - Full description: (see below)
   - Screenshots: 3-5 phone screenshots + 1 tablet
   - Feature graphic: 1024x500 banner
   - Icon: 512x512 PNG (assets/icons/icon-512.png)
   - Category: Productivity
   - Content rating: Everyone
   - Contact email: support@qq-studios.com
   - Privacy policy URL: https://jobsynk.qq-studios.com/privacy.html

### Full Description (Google Play)
```
JobSynk is your AI-powered career management platform. Search jobs across 4 sources, optimize your resume for ATS systems, generate tailored cover letters, and track your entire application pipeline — all in one app.

KEY FEATURES:
• Unified Job Search — One search across Remotive, Arbeitnow, Adzuna, and JSearch
• ATS Keyword Optimizer — 200+ patterns to beat applicant tracking systems
• AI Cover Letters — Google Gemini generates personalized letters in seconds
• Pipeline Tracking — Kanban board, table view, and visual timeline
• Automated Job Agent — Searches on a schedule, deduplicates, scores matches
• Interview Prep — 10 tailored questions for any role
• Cross-Device Sync — Firebase keeps everything synced in real-time
• Dark Mode — Full dark theme support

POWERED BY:
Google Gemini AI, Firebase, Groq LLM, and 4 job search APIs.

Free to use with optional Pro plans for unlimited access.

Built by QQ Studios LLC — qq-studios.com
```

---

## 2. Microsoft Store (Windows)

### Developer Account
- **Cost**: Free (for individuals)
- **URL**: https://partner.microsoft.com/dashboard
- **Sign up with**: helloworld@qq-studios.com

### Generate Package (PWABuilder — easiest for Microsoft)
1. Go to https://www.pwabuilder.com
2. Enter: `https://jobsynk.qq-studios.com`
3. Click "Build" → Select "Windows"
4. Fill in:
   - Package ID: `com.qqstudios.jobsynk`
   - Publisher display name: QQ Studios LLC
   - App display name: JobSynk
5. Download the MSIX package
6. Upload to Microsoft Partner Center

### Microsoft Store Listing
- Title: JobSynk — AI Career Management
- Description: (same as Google Play)
- Screenshots: 3-5 desktop screenshots
- Icon: 512x512 PNG
- Category: Productivity
- Age rating: 3+
- Privacy policy: https://jobsynk.qq-studios.com/privacy.html

---

## 3. Apple App Store (iOS/macOS)

### Developer Account
- **Cost**: $99/year
- **URL**: https://developer.apple.com/programs/enroll
- **Sign up with**: Apple ID linked to helloworld@qq-studios.com

### Option A: PWABuilder (Simplest)
1. Go to https://www.pwabuilder.com
2. Enter: `https://jobsynk.qq-studios.com`
3. Click "Build" → Select "iOS"
4. Download the Xcode project
5. Open in Xcode, build, and submit to App Store Connect

### Option B: Capacitor (More Control)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init JobSynk com.qqstudios.jobsynk
npx cap add ios
npx cap copy
npx cap open ios
# Build in Xcode → Archive → Submit
```

### App Store Connect Submission
- App name: JobSynk
- Subtitle: AI Career Management
- Bundle ID: com.qqstudios.jobsynk
- SKU: jobsynk-001
- Screenshots: iPhone 6.7" + iPad 12.9" (required sizes)
- App icon: 1024x1024 PNG (assets/icons/icon-1024.png)
- Category: Productivity
- Content rating: 4+
- Privacy policy: https://jobsynk.qq-studios.com/privacy.html
- Support URL: https://jobsynk.qq-studios.com
- Marketing URL: https://qq-studios.com

---

## Recommended Order
1. **Microsoft Store** — Free account, fastest approval (1-3 days)
2. **Google Play** — $25, moderate approval (1-2 days)
3. **Apple App Store** — $99/year, slowest approval (1-2 weeks)

---

## Screenshot Requirements

### Google Play
- Phone: 1080x1920 (min 320px, max 3840px)
- Tablet 7": 1024x600
- Feature graphic: 1024x500

### Microsoft Store
- Desktop: 1366x768 or larger
- Min 1, max 10 screenshots

### Apple App Store
- iPhone 6.7": 1290x2796
- iPhone 6.5": 1284x2778
- iPad 12.9": 2048x2732
- Min 3, max 10 per device
