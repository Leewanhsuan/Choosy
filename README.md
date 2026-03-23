# 🏠 家居選購 Agent

用 AI 即時搜尋台灣電器／傢俱的比價、規格比對與論壇評價。

---

## 功能

| 功能        | 說明                                              |
| ----------- | ------------------------------------------------- |
| 🎯 規格推薦 | 輸入尺寸、預算、環境需求，AI 推薦最符合條件的商品 |
| ⚡ 規格比對 | 2–4 款商品並排比較，產出規格表與優缺點分析        |
| 💬 論壇評價 | 整理 PTT / Dcard / Mobile01 真實使用者評價        |
| 🔍 價格查詢 | 搜尋 PChome / momo / 蝦皮各平台現售價比較         |

---

## 使用方式

### 線上版（推薦）

1. 申請 [Anthropic API Key](https://console.anthropic.com)（新帳號有 $5 免費額度，約可查詢 300+ 次）
2. 開啟專案網頁
3. 點右上角 **⚙️** 填入你的 API Key
4. 開始使用

> API Key 只存在你自己的瀏覽器 localStorage，不會上傳至任何伺服器。

### 本地執行

```bash
git clone https://github.com/你的帳號/home-agent.git
cd home-agent
npm install
npm run dev
```

開啟 http://localhost:5173，同樣點 ⚙️ 填入 API Key 即可。

---

## 技術架構

- **Frontend**：React + Vite
- **AI**：Claude Sonnet 4（Anthropic API）
- **搜尋**：Anthropic Web Search Tool（即時搜尋台灣各大電商與論壇）
- **資料儲存**：無後端，所有狀態存於瀏覽器 localStorage

---

## 費用說明

每次查詢約消耗 **NT$0.4–0.5**（約 $0.014 USD）。

建議在 [Anthropic Console](https://console.anthropic.com/settings/limits) 的 **Settings → Limits** 設定每月消費上限，避免意外超支。

---

## 注意事項

- 搜尋結果來自即時 Web Search，每次結果可能略有不同
- 每次查詢約需 15–30 秒（包含 Web Search 時間）
- 本專案為個人練習作品，搜尋結果僅供參考，購買前請自行確認最新價格
