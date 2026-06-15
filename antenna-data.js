// =============================================================
// STAF 板金アンテナ 製品カタログ
// -------------------------------------------------------------
// 機種を追加するときは ANTENNA_CATALOG に1エントリ追加するだけで
// 機種選択カード・周波数帯切替・VSWR概算に反映されます。
//
// 寸法・周波数帯・実装方法は公式製品ページの公開仕様に基づきます。
//   https://www.staf.co.jp/product/antenna/
//
// surrogate（f0Base / minBase / halfWidthBase など）はUI検証用の
// 概算モデル係数です。実測値・電磁界解析に基づく校正値ではない
// 機種は calibrated: false とし、画面上に「仮係数」と表示します。
// =============================================================

const ANTENNA_CATALOG = [
  {
    id: "1018-521A",
    name: "SMT対応省スペース板金アンテナ",
    category: "MULTI-BAND SMT SHEET-METAL ANTENNA",
    productUrl: "https://www.staf.co.jp/product/antenna/1018-521.html",
    image: "images/1018-521A.png",
    form: "λ/4型・無指向性",
    mount: "SMTリフロー実装",
    bandSummary: "814–960 MHz / 1.71–2.69 GHz（2.4GHz帯含む）",
    guide: { pick: "サブGHz〜2.7GHzをSMTで使う", freq: "0.8–0.9G / 1.7–2.7G（2.4G含む）", mount: "SMTリフロー実装", sizeClass: "標準・背が高い" },
    dims: { length: 20, width: 8, height: 13.5 },
    calibrated: true,
    bands: [
      {
        id: "wifi24",
        label: "2.4GHz帯",
        use: "Wi-Fi / BLE / ZigBee",
        startMHz: 2400,
        endMHz: 2483.5,
        chartStartMHz: 2300,
        chartEndMHz: 2500,
        checkMHz: [2400, 2450, 2483.5],
        f0Base: 2442,
        minBase: 1.24,
        halfWidthBase: 58,
        refBoard: { width: 50, height: 30 }
      },
      {
        id: "cell800",
        label: "800/900MHz帯",
        use: "LPWA / セルラー (814–960MHz)",
        startMHz: 814,
        endMHz: 960,
        chartStartMHz: 760,
        chartEndMHz: 1010,
        checkMHz: [814, 887, 960],
        f0Base: 887,
        minBase: 1.45,
        halfWidthBase: 105,
        refBoard: { width: 80, height: 45 }
      },
      {
        id: "cell1700",
        label: "1.7–2.7GHz帯",
        use: "LTE / 5G sub-6 (1710–2690MHz)",
        startMHz: 1710,
        endMHz: 2690,
        chartStartMHz: 1600,
        chartEndMHz: 2800,
        checkMHz: [1710, 2200, 2690],
        f0Base: 2200,
        minBase: 1.5,
        halfWidthBase: 660,
        refBoard: { width: 60, height: 35 }
      }
    ]
  },
  {
    id: "1019-107A",
    name: "Wi-Fi 7 / BLE対応トライバンドSMD板金アンテナ",
    category: "TRI-BAND SMD SHEET-METAL ANTENNA",
    productUrl: "https://www.staf.co.jp/product/antenna/1019-107A.html",
    image: "images/1019-107A.png",
    form: "λ/4モノポール・無指向性",
    mount: "SMTリフロー実装",
    bandSummary: "2.4 / 5 / 6 GHz（Wi-Fi 7・BLE）",
    guide: { pick: "5GHz / 6GHz（Wi-Fi 6E/7）が必要", freq: "2.4 / 5 / 6 GHz", mount: "SMTリフロー実装", sizeClass: "超小型・低背" },
    heroWidth: 140,
    dims: { length: 6.6, width: 8, height: 3.7 },
    calibrated: false,
    bands: [
      {
        id: "wifi24",
        label: "2.4GHz帯",
        use: "Wi-Fi / BLE (2400–2500MHz)",
        startMHz: 2400,
        endMHz: 2500,
        chartStartMHz: 2300,
        chartEndMHz: 2600,
        checkMHz: [2400, 2450, 2500],
        f0Base: 2450,
        minBase: 1.35,
        halfWidthBase: 78,
        refBoard: { width: 40, height: 30 }
      },
      {
        id: "wifi5",
        label: "5GHz帯",
        use: "Wi-Fi 5/6 (5150–5850MHz)",
        startMHz: 5150,
        endMHz: 5850,
        chartStartMHz: 5000,
        chartEndMHz: 6000,
        checkMHz: [5150, 5500, 5850],
        f0Base: 5500,
        minBase: 1.4,
        halfWidthBase: 440,
        refBoard: { width: 40, height: 30 }
      },
      {
        id: "wifi6e",
        label: "6GHz帯",
        use: "Wi-Fi 6E/7 (5925–7125MHz)",
        startMHz: 5925,
        endMHz: 7125,
        chartStartMHz: 5700,
        chartEndMHz: 7350,
        checkMHz: [5925, 6525, 7125],
        f0Base: 6525,
        minBase: 1.45,
        halfWidthBase: 780,
        refBoard: { width: 40, height: 30 }
      }
    ]
  },
  {
    id: "1018-456A",
    name: "挿入実装対応板金アンテナ",
    category: "THROUGH-HOLE SHEET-METAL ANTENNA",
    productUrl: "https://www.staf.co.jp/product/antenna/1018-456.html",
    image: "images/1018-456A.png",
    form: "λ/4モノポール・無指向性",
    mount: "挿入実装（溶融はんだ）",
    bandSummary: "814–960 MHz / 1.575–2.17 GHz",
    guide: { pick: "GNSS / 挿入実装で使う", freq: "0.8–0.9G / 1.575–2.17G", mount: "挿入実装（スルーホール）", sizeClass: "長尺・低背" },
    dims: { length: 45, width: 8, height: 5 },
    calibrated: false,
    bands: [
      {
        id: "cell800",
        label: "800/900MHz帯",
        use: "LPWA / セルラー (814–960MHz)",
        startMHz: 814,
        endMHz: 960,
        chartStartMHz: 760,
        chartEndMHz: 1010,
        checkMHz: [814, 887, 960],
        f0Base: 887,
        minBase: 1.4,
        halfWidthBase: 100,
        refBoard: { width: 80, height: 45 }
      },
      {
        id: "gnss",
        label: "1.5–2.1GHz帯",
        use: "GNSS / 3G / LTE (1575–2170MHz)",
        startMHz: 1575.42,
        endMHz: 2170,
        chartStartMHz: 1480,
        chartEndMHz: 2280,
        checkMHz: [1575.42, 1873, 2170],
        f0Base: 1873,
        minBase: 1.45,
        halfWidthBase: 400,
        refBoard: { width: 70, height: 40 }
      }
    ]
  }
];
