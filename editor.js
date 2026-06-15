// =============================================================
// 【社内用】機種データ編集ページのロジック
// -------------------------------------------------------------
// ・antenna-data.js の ANTENNA_CATALOG を読み込み、フォームで編集
// ・編集内容は localStorage に下書き保存（ブラウザ内のみ）
// ・「生成」で置き換え用 antenna-data.js を出力（コピー/ダウンロード）
// ・係数チェックはツール本体 app.js の model() の基準条件
//   （推奨基板・全面GND・両面・gndEdge=1mm・gap=2mm）を再現しています
// =============================================================

const DRAFT_KEY = "staf-antenna-editor-draft-v1";

const BAND_TEMPLATE = {
  id: "", label: "", use: "",
  startMHz: null, endMHz: null,
  chartStartMHz: null, chartEndMHz: null,
  checkMHz: [null, null, null],
  f0Base: null, minBase: 1.4, halfWidthBase: null,
  refBoard: { width: null, height: null }
};

const MODEL_TEMPLATE = {
  id: "", name: "", category: "", productUrl: "", image: "",
  form: "λ/4型・無指向性", mount: "SMTリフロー実装", bandSummary: "",
  dims: { length: null, width: null, height: null },
  calibrated: false,
  bands: []
};

let catalog = loadDraft() || deepCopy(ANTENNA_CATALOG);
let selectedIndex = 0;

const $ = selector => document.querySelector(selector);

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(catalog));
}

// ------------------------------------------------------------------
// 機種一覧
// ------------------------------------------------------------------

function renderModelList() {
  const list = $("#modelList");
  list.replaceChildren();
  catalog.forEach((model, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.classList.toggle("active", index === selectedIndex);
    const title = document.createElement("b");
    title.textContent = model.id || "（型番未入力）";
    const sub = document.createElement("small");
    sub.textContent = `${model.bands.length}帯域 / ${model.calibrated ? "校正済" : "仮係数"}`;
    button.append(title, sub);
    button.addEventListener("click", () => {
      selectedIndex = index;
      renderModelList();
      loadModelToForm();
    });
    item.append(button);
    list.append(item);
  });
}

// ------------------------------------------------------------------
// フォーム
// ------------------------------------------------------------------

function setNumber(input, value) {
  input.value = value === null || value === undefined || Number.isNaN(value) ? "" : value;
}

function getNumber(input) {
  const value = input.value.trim();
  return value === "" ? null : Number(value);
}

function loadModelToForm() {
  const model = catalog[selectedIndex];
  $("#formTitle").textContent = model.id ? `機種データ: ${model.id}` : "機種データ（新規）";
  $("#fId").value = model.id;
  $("#fName").value = model.name;
  $("#fCategory").value = model.category;
  $("#fForm").value = model.form;
  $("#fMount").value = model.mount;
  $("#fProductUrl").value = model.productUrl;
  $("#fImage").value = model.image;
  $("#fBandSummary").value = model.bandSummary;
  setNumber($("#fDimL"), model.dims.length);
  setNumber($("#fDimW"), model.dims.width);
  setNumber($("#fDimH"), model.dims.height);
  $("#fCalibrated").checked = Boolean(model.calibrated);
  renderBandEditors(model);
  renderPreview();
}

function bandFieldRow(labelText, hint, input) {
  const label = document.createElement("label");
  label.className = "editor-field";
  const span = document.createElement("span");
  span.textContent = labelText;
  if (hint) {
    const small = document.createElement("small");
    small.textContent = hint;
    span.append(small);
  }
  label.append(span, input);
  return label;
}

function numberInput(value, step = "any") {
  const input = document.createElement("input");
  input.type = "number";
  input.step = step;
  setNumber(input, value);
  return input;
}

function textInput(value) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  return input;
}

function renderBandEditors(model) {
  const container = $("#bandList");
  container.replaceChildren();
  model.bands.forEach((band, index) => {
    container.append(buildBandEditor(band, index));
  });
  if (!model.bands.length) {
    const empty = document.createElement("p");
    empty.className = "panel-sub";
    empty.textContent = "帯域がありません。「＋ 帯域を追加」で対応帯域を登録してください。";
    container.append(empty);
  }
}

function buildBandEditor(band, index) {
  const wrap = document.createElement("div");
  wrap.className = "band-editor";
  wrap.dataset.bandIndex = index;

  const head = document.createElement("div");
  head.className = "band-editor-head";
  const title = document.createElement("b");
  title.textContent = `帯域 ${index + 1}`;
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "editor-button danger";
  removeButton.textContent = "この帯域を削除";
  removeButton.addEventListener("click", () => {
    catalog[selectedIndex].bands.splice(index, 1);
    renderBandEditors(catalog[selectedIndex]);
  });
  head.append(title, removeButton);
  wrap.append(head);

  const fields = {};

  const grid1 = document.createElement("div");
  grid1.className = "editor-grid-2";
  fields.label = textInput(band.label);
  fields.id = textInput(band.id);
  grid1.append(
    bandFieldRow("帯域名（画面表示）", "例: 2.4GHz帯", fields.label),
    bandFieldRow("帯域id（半角英数）", "例: wifi24", fields.id)
  );
  wrap.append(grid1);

  fields.use = textInput(band.use);
  wrap.append(bandFieldRow("用途表示", "例: Wi-Fi / BLE (2400–2500MHz)", fields.use));

  const grid2 = document.createElement("div");
  grid2.className = "editor-grid-2";
  fields.startMHz = numberInput(band.startMHz);
  fields.endMHz = numberInput(band.endMHz);
  grid2.append(
    bandFieldRow("利用帯域 下端 (MHz)", "カタログ値", fields.startMHz),
    bandFieldRow("利用帯域 上端 (MHz)", "カタログ値", fields.endMHz)
  );
  wrap.append(grid2);

  const tools = document.createElement("div");
  tools.className = "band-tools";
  const autoButton = document.createElement("button");
  autoButton.type = "button";
  autoButton.className = "editor-button";
  autoButton.textContent = "表示範囲・確認周波数を自動入力";
  const suggestButton = document.createElement("button");
  suggestButton.type = "button";
  suggestButton.className = "editor-button";
  suggestButton.textContent = "概算係数を自動算出";
  tools.append(autoButton, suggestButton);
  wrap.append(tools);

  const grid3 = document.createElement("div");
  grid3.className = "editor-grid-2";
  fields.chartStartMHz = numberInput(band.chartStartMHz);
  fields.chartEndMHz = numberInput(band.chartEndMHz);
  grid3.append(
    bandFieldRow("グラフ表示 下限 (MHz)", "", fields.chartStartMHz),
    bandFieldRow("グラフ表示 上限 (MHz)", "", fields.chartEndMHz)
  );
  wrap.append(grid3);

  const grid4 = document.createElement("div");
  grid4.className = "editor-grid-3";
  fields.check0 = numberInput(band.checkMHz?.[0]);
  fields.check1 = numberInput(band.checkMHz?.[1]);
  fields.check2 = numberInput(band.checkMHz?.[2]);
  grid4.append(
    bandFieldRow("確認周波数1 (MHz)", "帯域下端", fields.check0),
    bandFieldRow("確認周波数2 (MHz)", "中央付近", fields.check1),
    bandFieldRow("確認周波数3 (MHz)", "帯域上端", fields.check2)
  );
  wrap.append(grid4);

  const grid5 = document.createElement("div");
  grid5.className = "editor-grid-3";
  fields.f0Base = numberInput(band.f0Base);
  fields.minBase = numberInput(band.minBase, "0.01");
  fields.halfWidthBase = numberInput(band.halfWidthBase);
  grid5.append(
    bandFieldRow("基準共振点 f0Base (MHz)", "", fields.f0Base),
    bandFieldRow("基準最小VSWR minBase", "", fields.minBase),
    bandFieldRow("帯域幅係数 halfWidthBase", "", fields.halfWidthBase)
  );
  wrap.append(grid5);

  const grid6 = document.createElement("div");
  grid6.className = "editor-grid-2";
  fields.refW = numberInput(band.refBoard?.width);
  fields.refH = numberInput(band.refBoard?.height);
  grid6.append(
    bandFieldRow("推奨基板 横幅 (mm)", "「初期値へ」の値", fields.refW),
    bandFieldRow("推奨基板 縦幅 (mm)", "", fields.refH)
  );
  wrap.append(grid6);

  const validation = document.createElement("div");
  validation.className = "band-validation";
  validation.textContent = "数値を入力すると基準条件での妥当性チェックを表示します。";
  wrap.append(validation);

  const readBand = () => ({
    id: fields.id.value.trim(),
    label: fields.label.value.trim(),
    use: fields.use.value.trim(),
    startMHz: getNumber(fields.startMHz),
    endMHz: getNumber(fields.endMHz),
    chartStartMHz: getNumber(fields.chartStartMHz),
    chartEndMHz: getNumber(fields.chartEndMHz),
    checkMHz: [getNumber(fields.check0), getNumber(fields.check1), getNumber(fields.check2)],
    f0Base: getNumber(fields.f0Base),
    minBase: getNumber(fields.minBase),
    halfWidthBase: getNumber(fields.halfWidthBase),
    refBoard: { width: getNumber(fields.refW), height: getNumber(fields.refH) }
  });
  wrap.readBand = readBand;

  const refreshValidation = () => {
    const report = validateBand(readBand());
    validation.className = `band-validation ${report.level}`;
    validation.replaceChildren();
    report.lines.forEach(line => {
      const p = document.createElement("div");
      p.textContent = line;
      validation.append(p);
    });
  };

  autoButton.addEventListener("click", () => {
    const start = getNumber(fields.startMHz);
    const end = getNumber(fields.endMHz);
    if (start === null || end === null || end <= start) {
      alert("先に利用帯域の下端・上端 (MHz) を入力してください。");
      return;
    }
    const span = end - start;
    const pad = Math.max(40, Math.round(span * 0.18));
    setNumber(fields.chartStartMHz, Math.max(1, Math.round((start - pad) / 10) * 10));
    setNumber(fields.chartEndMHz, Math.round((end + pad) / 10) * 10);
    setNumber(fields.check0, start);
    setNumber(fields.check1, Math.round((start + end) / 2));
    setNumber(fields.check2, end);
    setNumber(fields.f0Base, Math.round((start + end) / 2));
    refreshValidation();
  });

  suggestButton.addEventListener("click", () => {
    const draft = readBand();
    if (draft.startMHz === null || draft.endMHz === null || draft.f0Base === null) {
      alert("先に利用帯域と基準共振点 f0Base を入力してください（「自動入力」ボタンでも設定できます）。");
      return;
    }
    if (draft.minBase === null) {
      draft.minBase = 1.4;
      setNumber(fields.minBase, 1.4);
    }
    // 推奨基板: λ/4カウンターポイズを目安に長辺を決定
    const lambdaQuarter = 74948 / draft.f0Base;
    if (draft.refBoard.width === null || draft.refBoard.height === null) {
      const width = Math.max(40, Math.ceil(lambdaQuarter * 0.95 / 5) * 5);
      const height = Math.max(25, Math.ceil(width * 0.55 / 5) * 5);
      setNumber(fields.refW, width);
      setNumber(fields.refH, height);
      draft.refBoard = { width, height };
    }
    // halfWidthBase: 基準条件で帯域端VSWR≈1.95になるよう逆算
    const reference = referenceCondition(draft);
    const target = 1.95;
    if (reference.effMin >= target - 0.03) {
      alert(`基準条件の最小VSWRが約${reference.effMin.toFixed(2)}となり、帯域端目標(${target})に近すぎます。minBaseを下げるか、推奨基板を大きくしてください。`);
      refreshValidation();
      return;
    }
    const maxDelta = Math.max(Math.abs(draft.startMHz - reference.f0), Math.abs(draft.endMHz - reference.f0));
    const required = maxDelta / Math.sqrt((target - reference.effMin) / 0.78);
    const suggested = Math.ceil(required / reference.widthFactor / 5) * 5;
    setNumber(fields.halfWidthBase, suggested);
    refreshValidation();
  });

  wrap.addEventListener("input", refreshValidation);
  if (band.startMHz !== null && band.startMHz !== undefined) refreshValidation();

  return wrap;
}

// ------------------------------------------------------------------
// 妥当性チェック（app.js model() の基準条件を再現）
// ------------------------------------------------------------------

function referenceCondition(band) {
  const scale = band.f0Base / 2442;
  const lambdaQuarter = 74948 / band.f0Base;
  const longSide = Math.max(band.refBoard.width || 0, band.refBoard.height || 0);
  const counterpoiseRatio = clamp(longSide / lambdaQuarter, 0, 1.6);
  const counterpoisePenalty = clamp((1 - counterpoiseRatio) * 1.4, 0, 1.2);
  // 基準条件の固定ペナルティ: gndEdge 1mm (0.025) + gap 2mm (0.011)
  const effMin = (band.minBase ?? 1.4) + 0.036 + counterpoisePenalty;
  const widthFactor = clamp(1 - counterpoisePenalty * 0.5 * 0.24 - 0.0036, 0.48, 1.12);
  const f0 = band.f0Base + clamp(1 - counterpoiseRatio, 0, 1) * 0.04 * band.f0Base - 1.04 * scale;
  return { lambdaQuarter, counterpoiseRatio, counterpoisePenalty, effMin, widthFactor, f0 };
}

function validateBand(band) {
  const lines = [];
  let level = "ok";
  const warn = message => { lines.push(`⚠ ${message}`); if (level !== "error") level = "warn"; };
  const error = message => { lines.push(`✕ ${message}`); level = "error"; };

  const required = [
    ["label", band.label, "帯域名"],
    ["id", band.id, "帯域id"],
    ["startMHz", band.startMHz, "利用帯域 下端"],
    ["endMHz", band.endMHz, "利用帯域 上端"],
    ["chartStartMHz", band.chartStartMHz, "グラフ表示 下限"],
    ["chartEndMHz", band.chartEndMHz, "グラフ表示 上限"],
    ["f0Base", band.f0Base, "基準共振点"],
    ["minBase", band.minBase, "基準最小VSWR"],
    ["halfWidthBase", band.halfWidthBase, "帯域幅係数"]
  ];
  const missing = required.filter(([, value]) => value === null || value === "" || value === undefined);
  if (missing.length) {
    error(`未入力: ${missing.map(([, , name]) => name).join("、")}`);
    return { level, lines };
  }
  if (band.refBoard.width === null || band.refBoard.height === null) {
    error("推奨基板サイズが未入力です（「概算係数を自動算出」で目安を設定できます）");
    return { level, lines };
  }

  if (band.endMHz <= band.startMHz) error("利用帯域の上端が下端以下です");
  if (band.chartStartMHz > band.startMHz || band.chartEndMHz < band.endMHz) {
    warn("グラフ表示範囲が利用帯域を含んでいません");
  }
  if (band.checkMHz.some(value => value === null)) {
    warn("確認周波数（3点）が未入力です");
  } else if (band.checkMHz.some(value => value < band.chartStartMHz || value > band.chartEndMHz)) {
    warn("確認周波数がグラフ表示範囲の外にあります");
  }
  if (band.f0Base < band.startMHz || band.f0Base > band.endMHz) {
    warn("基準共振点 f0Base が利用帯域の外にあります");
  }
  if (level === "error") return { level, lines };

  const reference = referenceCondition(band);
  const halfWidth = band.halfWidthBase * reference.widthFactor;
  const vswrAt = frequency => clamp(reference.effMin + 0.78 * ((frequency - reference.f0) / halfWidth) ** 2, 1, 6);
  const low = vswrAt(band.startMHz);
  const high = vswrAt(band.endMHz);
  lines.push(`基準条件（推奨基板・全面GND）の概算: 最小VSWR ${reference.effMin.toFixed(2)} / 帯域端 ${low.toFixed(2)}（下端）・${high.toFixed(2)}（上端）`);
  if (reference.counterpoiseRatio < 0.95) {
    warn(`推奨基板の長辺がλ/4（約${Math.round(reference.lambdaQuarter)}mm）より短く、基準でもGND不足ペナルティ(+${reference.counterpoisePenalty.toFixed(2)})が掛かります`);
  }
  if (low > 2 || high > 2) {
    warn("基準条件で帯域端がVSWR 2.0を超えます。「概算係数を自動算出」でhalfWidthBaseを調整してください");
  } else if (level === "ok") {
    lines.unshift("✓ 基準条件で帯域全体がVSWR 2.0以下に収まります");
  }
  return { level, lines };
}

// ------------------------------------------------------------------
// フォーム→モデル収集・反映
// ------------------------------------------------------------------

function collectForm() {
  // 既存モデルの未編集フィールド（heroWidth等）を保持したままフォーム値で上書きする
  const model = Object.assign(deepCopy(MODEL_TEMPLATE), deepCopy(catalog[selectedIndex] || {}));
  model.id = $("#fId").value.trim();
  model.name = $("#fName").value.trim();
  model.category = $("#fCategory").value.trim();
  model.form = $("#fForm").value.trim();
  model.mount = $("#fMount").value.trim();
  model.productUrl = $("#fProductUrl").value.trim();
  model.image = $("#fImage").value.trim();
  model.bandSummary = $("#fBandSummary").value.trim();
  model.dims = {
    length: getNumber($("#fDimL")),
    width: getNumber($("#fDimW")),
    height: getNumber($("#fDimH"))
  };
  model.calibrated = $("#fCalibrated").checked;
  model.bands = [...$("#bandList").querySelectorAll(".band-editor")].map(editor => editor.readBand());
  return model;
}

function validateModel(model) {
  const problems = [];
  if (!model.id) problems.push("型番（id）");
  if (!model.name) problems.push("製品名");
  if (!model.productUrl) problems.push("製品ページURL");
  if (!model.image) problems.push("製品画像URL");
  if (!model.bandSummary) problems.push("対応帯域の要約表示");
  if (model.dims.length === null || model.dims.width === null || model.dims.height === null) problems.push("外形寸法");
  if (!model.bands.length) problems.push("対応周波数帯（1つ以上）");
  const duplicate = catalog.some((other, index) => index !== selectedIndex && other.id === model.id);
  const bandReports = model.bands.map(validateBand);
  return { problems, duplicate, bandReports };
}

function applyModel() {
  const model = collectForm();
  const check = validateModel(model);
  if (check.problems.length) {
    alert(`未入力の項目があります:\n・${check.problems.join("\n・")}`);
    return;
  }
  if (check.duplicate) {
    alert(`型番「${model.id}」は既にカタログに存在します。編集する場合は左の一覧から選択してください。`);
    return;
  }
  if (check.bandReports.some(report => report.level === "error")) {
    alert("帯域設定にエラーがあります。各帯域のチェック表示を確認してください。");
    return;
  }
  catalog[selectedIndex] = model;
  saveDraft();
  renderModelList();
  loadModelToForm();
  renderReport(check);
  $("#codeOut").value = "";
}

function deleteModel() {
  const model = catalog[selectedIndex];
  if (!confirm(`「${model.id || "（新規）"}」をカタログから削除しますか？\n（antenna-data.js を生成・置き換えするまで公開ツールには影響しません）`)) return;
  catalog.splice(selectedIndex, 1);
  if (!catalog.length) catalog.push(deepCopy(MODEL_TEMPLATE));
  selectedIndex = Math.max(0, selectedIndex - 1);
  saveDraft();
  renderModelList();
  loadModelToForm();
}

// ------------------------------------------------------------------
// プレビュー・レポート
// ------------------------------------------------------------------

function renderPreview() {
  const model = collectForm();
  const preview = $("#cardPreview");
  preview.replaceChildren();
  const card = document.createElement("div");
  card.className = "model-card selected";
  card.innerHTML = `
    <span class="model-card-check" aria-hidden="true">✓</span>
    <span class="model-card-visual"><img src="${model.image || ""}" alt="" onerror="this.style.visibility='hidden'"></span>
    <span class="model-card-id">${model.id || "（型番未入力）"}</span>
    <span class="model-card-name">${model.name || ""}</span>
    <span class="model-card-bands">${model.bandSummary || ""}</span>
    <span class="model-card-tags">
      <i class="model-tag">${model.mount || ""}</i>
      ${model.calibrated ? "" : '<i class="model-tag preliminary">概算 仮係数</i>'}
    </span>`;
  preview.append(card);
}

function renderReport(check) {
  const area = $("#reportArea");
  area.replaceChildren();
  const ok = document.createElement("p");
  ok.textContent = "✓ カタログ（下書き）へ反映しました。「antenna-data.js を生成」で置き換え用ファイルを出力してください。";
  ok.style.color = "#08764b";
  ok.style.fontWeight = "800";
  area.append(ok);
  if (check && check.bandReports.some(report => report.level === "warn")) {
    const caution = document.createElement("p");
    caution.textContent = "⚠ 一部の帯域に注意事項があります（フォーム内のチェック表示を参照）。";
    caution.style.color = "#8a5a00";
    area.append(caution);
  }
}

// ------------------------------------------------------------------
// antenna-data.js 生成
// ------------------------------------------------------------------

function serialize(value, indent) {
  const pad = "  ".repeat(indent);
  const padInner = "  ".repeat(indent + 1);
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.every(item => typeof item === "number")) {
      return `[${value.join(", ")}]`;
    }
    return `[\n${value.map(item => `${padInner}${serialize(item, indent + 1)}`).join(",\n")}\n${pad}]`;
  }
  const entries = Object.entries(value);
  const inline = entries.every(([, v]) => typeof v === "number" || typeof v === "boolean") && entries.length <= 3;
  if (inline) {
    return `{ ${entries.map(([key, v]) => `${key}: ${serialize(v, 0)}`).join(", ")} }`;
  }
  return `{\n${entries.map(([key, v]) => `${padInner}${key}: ${serialize(v, indent + 1)}`).join(",\n")}\n${pad}}`;
}

function generateFile() {
  const stamp = new Date().toISOString().slice(0, 10);
  const header = `// =============================================================
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
//
// ※ このファイルは editor.html（社内用）で ${stamp} に生成されました。
// =============================================================

const ANTENNA_CATALOG = `;
  return `${header}${serialize(catalog, 0)};\n`;
}

function handleGenerate() {
  const reports = catalog.map(model => ({
    id: model.id,
    bandErrors: model.bands.map(validateBand).filter(report => report.level === "error").length
  }));
  const broken = reports.filter(report => report.bandErrors > 0);
  if (broken.length) {
    alert(`次の機種に未入力/エラーの帯域があります: ${broken.map(report => report.id).join(", ")}\n該当機種を開いて修正し、「カタログへ反映」してから生成してください。`);
    return;
  }
  $("#codeOut").value = generateFile();
}

async function handleCopy() {
  if (!$("#codeOut").value) handleGenerate();
  if (!$("#codeOut").value) return;
  try {
    await navigator.clipboard.writeText($("#codeOut").value);
  } catch {
    $("#codeOut").select();
    document.execCommand("copy");
  }
  const button = $("#copyButton");
  button.classList.add("copy-done");
  button.textContent = "コピーしました ✓";
  setTimeout(() => {
    button.classList.remove("copy-done");
    button.textContent = "コードをコピー";
  }, 1600);
}

function handleDownload() {
  if (!$("#codeOut").value) handleGenerate();
  if (!$("#codeOut").value) return;
  const blob = new Blob([$("#codeOut").value], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "antenna-data.js";
  link.click();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------
// 初期化
// ------------------------------------------------------------------

$("#newModelButton").addEventListener("click", () => {
  catalog.push(deepCopy(MODEL_TEMPLATE));
  selectedIndex = catalog.length - 1;
  catalog[selectedIndex].bands.push(deepCopy(BAND_TEMPLATE));
  renderModelList();
  loadModelToForm();
});

$("#discardDraftButton").addEventListener("click", () => {
  if (!confirm("ブラウザ内の下書きを破棄して、antenna-data.js の内容を読み込み直しますか？")) return;
  localStorage.removeItem(DRAFT_KEY);
  catalog = deepCopy(ANTENNA_CATALOG);
  selectedIndex = 0;
  renderModelList();
  loadModelToForm();
  $("#codeOut").value = "";
});

$("#addBandButton").addEventListener("click", () => {
  catalog[selectedIndex] = collectForm();
  catalog[selectedIndex].bands.push(deepCopy(BAND_TEMPLATE));
  renderBandEditors(catalog[selectedIndex]);
});

$("#applyButton").addEventListener("click", applyModel);
$("#deleteButton").addEventListener("click", deleteModel);
$("#generateButton").addEventListener("click", handleGenerate);
$("#copyButton").addEventListener("click", handleCopy);
$("#downloadButton").addEventListener("click", handleDownload);

document.querySelector(".editor-form, .editor-panel:nth-child(2)")?.addEventListener("input", renderPreview);

renderModelList();
loadModelToForm();
