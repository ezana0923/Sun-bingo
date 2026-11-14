# ቅዳሜ Games (Kidame Games) & Ezi Bingo — የመጫኛ እና የማስተናገጃ መመሪያ (Deployment Guide)

ይህ መተግበሪያ **ቅዳሜ Games — የሉዶ ማስተር (Ludo Master)**፣ **መደበኛ Bingo (Regular Bingo)** እና **Fast Bingo (ፈጣን ቢንጎ)** ያካተተ የተሟላ የReact + Vite + TypeScript ፕሮጀክት ነው።

---

## 1. ፋይሎቹን ከዌቡ በቀጥታ ለማውረድ (Direct ZIP Downloads)
ከአፕሊኬሽኑ ዳሽቦርድ ላይ ወይም ከታች በተጠቀሱት ሊንኮች በቀጥታ ማውረድ ይችላሉ፦
- **ሙሉ የምንጭ ኮድ (Source Code ZIP):** `/kidame_bingo_source_code.zip`
- **ዝግጁ የምርት ፋይል (Production Dist ZIP):** `/kidame_bingo_production_build.zip`

---

## 2. በኮምፒውተር ላይ ለማስኬድ (Local Run)
1. ዚፕ ፋይሉን (ZIP) ይፍቱ (Extract)።
2. ተርሚናል (Terminal / CMD) ከፍተው ወደ ፎልደሩ ይግቡ፦
```bash
npm install
```
3. የሙከራ ሰርቨሩን (Dev Server) ያስጀምሩ፦
```bash
npm run dev
```
ብሮውዘርዎን ከፍተው `http://localhost:3000` ላይ ይጫወቱ።

---

## 3. በ Render (Onrender.com) ላይ ለመጫን
Render ላይ **Static Site** ወይም **Web Service** አድርገው መጫን ይችላሉ፦

### መንገድ 1፦ እንደ Static Site (የሚመከር — ፈጣን እና ነፃ)
1. ወደ [dashboard.render.com](https://dashboard.render.com) ይግቡ።
2. **New +** የሚለውን ተጭነው **Static Site** ይምረጡ።
3. ኮዱን የጫኑበትን የ GitHub Repository ያገናኙ።
4. የሚከተሉትን ቅንብሮች ያስገቡ፦
   - **Name:** `kidame-games`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
5. **Create Static Site** የሚለውን ይጫኑ። በደቂቃዎች ውስጥ ድረ-ገጹ ላይቭ ይሆናል።

---

## 4. በ Vercel ላይ ለመጫን (1-Click Deploy)
1. ወደ [vercel.com](https://vercel.com) ይግቡ።
2. **Add New Project** ይምረጡና የ GitHub ፕሮጀክትዎን ያስገቡ።
3. Vercel ራሱ **Vite** መሆኑን ለይቶ ያውቀዋል፦
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Deploy** የሚለውን ይጫኑ።

---

## 5. ወደ cPanel፣ Nginx ወይም Apache ሰርቨር Drag & Drop ለማድረግ
1. `kidame_bingo_production_build.zip` የተሰኘውን ፋይል ያውርዱ።
2. ፋይሉን ይፍቱ (ውስጡ `index.html` እና `assets/` አለው)።
3. ሁሉንም ፋይሎች በቀጥታ ወደ ሰርቨርዎ `public_html/` ፎልደር ይጫኑ (Upload)።

---

## 6. የ Telegram Mini App (Web App) ማገናኘት
1. ወደ Telegram `@BotFather` ይሂዱ።
2. `/newapp` ብለው ቦትዎን ይምረጡ።
3. አፑን ከላይ በ Render ወይም Vercel ያስተናገዱበትን URL (ለምሳሌ `https://your-app.onrender.com`) ያስገቡ።
4. ተጠቃሚዎች በቴሌግራም ውስጥ በቀጥታ እንዲጫወቱ ያድርጉ!

---

## 7. Render የደህንነት ማሻሻያ (Render Security Advisory: Node.js 22.23.4)
የ Render የደህንነት ማስጠንቀቂያ (eMudhra Certificate Compromise & Node.js Vulnerabilities Patch) መሰረት፡
- በ `render.yaml` ላይ የ Node.js ስሪት ወደ **`22.23.4`** ተቀናብሯል (`NODE_VERSION: 22.23.4`)።
- በፕሮጀክቱ root ውስጥ `.node-version` (`22.23.4`) እና በ `package.json` ውስጥ `"engines": { "node": ">=22.23.4" }` ተቀምጧል።
- Render ዳሽቦርድ ላይ አገልግሎትዎን **Manual Deploy -> Clear build cache & deploy** በማድረግ የተሻሻለውን ስሪት በቀላሉ በሰከንዶች ውስጥ ይጫኑ!

