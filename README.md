# Choosy

用 AI 即時搜尋台灣電器／傢俱的比價、規格比對與論壇評價。

**Demo** → https://leewanhsuan.github.io/Choosy/

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

### 方式一：線上版（免安裝）

1. 前往 [Anthropic Console](https://console.anthropic.com) 申請 API Key
2. 開啟 https://leewanhsuan.github.io/Choosy/
3. 點右上角 **⚙️** → 貼上你的 API Key → 儲存
4. 開始使用

> API Key 只存在你的瀏覽器 localStorage，不會上傳至任何伺服器。

### 方式二：Clone 到本地執行

```bash
git clone git@github.com:Leewanhsuan/Choosy.git
cd Choosy
npm install
```

建立 `.env.local` 檔案，填入你的 API Key：

```bash
VITE_ANTHROPIC_KEY=sk-ant-你的key
```

啟動開發伺服器：

```bash
npm run dev
```

開啟 http://localhost:5173 即可使用。

> 本地模式下會優先使用 `.env.local` 的 Key，不需要在網頁上手動設定。
> 如果沒有 `.env.local`，也可以跟線上版一樣點 ⚙️ 手動輸入。

---

## 技術架構

- **Frontend**：React + Vite
- **AI**：Claude Sonnet 4（Anthropic API + Web Search）
- **Markdown 渲染**：react-markdown + remark-gfm
- **部署**：GitHub Pages（gh-pages）
- **資料儲存**：無後端，所有狀態存於瀏覽器 localStorage
- **快取**：相同查詢結果快取 1 小時，減少 token 消耗

---

## 費用說明

每次查詢約消耗 **NT$0.4–0.5**（約 $0.014 USD）。

建議在 [Anthropic Console → Settings → Limits](https://console.anthropic.com/settings/limits) 設定每月消費上限，避免意外超支。

---

## 注意事項

- 搜尋結果來自即時 Web Search，每次結果可能略有不同
- 每次查詢約需 15–30 秒（包含 Web Search 時間）
- 本專案為個人練習作品，搜尋結果僅供參考，購買前請自行確認最新價格
