// アンテナ仕様・概算係数は antenna-data.js の ANTENNA_CATALOG から取得します。
// このファイルは「選択中の機種＋周波数帯」を入力としてUI全体を駆動します。

const MATERIALS = {
  fr4: { label: "FR-4", er: 4.3, shiftRatio: 0 },
  lowloss: { label: "低損失材", er: 3.5, shiftRatio: 12 / 2442 },
  highk: { label: "高誘電率材", er: 4.8, shiftRatio: -9 / 2442 }
};

const SHAPE_LABELS = {
  rectangle: "RECTANGLE",
  chamfer: "CHAMFERED",
  lshape: "L-SHAPE"
};

const GND_LABELS = {
  full: "FULL GND",
  partial: "PARTIAL GND",
  split: "SPLIT GND"
};

// 帯域共通の基準値（mm）。帯域固有の基準は band.refBoard を参照。
const REF_GAP = 2.2;
const REF_THICKNESS = 1.6;
const BASE_F0 = 2442; // 係数スケーリングの基準周波数（521A 2.4GHz帯）

// 板金アンテナはGND-freeなクリアランスへの実装が設計前提。
// アンテナ周辺のGND抜き(gndGap)が基板端のGND抜きマージン(gndEdge)に届かず、
// 間にGNDが残る＝アンテナがGNDの内側にある配置は設計対象外(NG)とする。
//   判定: 最寄り基板端までの距離(nearest) > gndEdge + gndGap + 許容
const EDGE_TOLERANCE_MM = 0.5; // 配置スナップ等の数値許容

const state = {
  antennaIndex: 0,
  bandIndex: 0,
  placement: { x: 3, y: 5 },
  dragging: false
};

function activeAntenna() {
  return ANTENNA_CATALOG[state.antennaIndex];
}

function activeBand() {
  return activeAntenna().bands[state.bandIndex];
}

const el = {
  officialLink: document.querySelector("#officialLink"),
  heroCategory: document.querySelector("#heroCategory"),
  heroLead: document.querySelector("#heroLead"),
  heroSpecs: document.querySelector("#heroSpecs"),
  heroImage: document.querySelector("#heroImage"),
  ringValue: document.querySelector("#ringValue"),
  ringUnit: document.querySelector("#ringUnit"),
  captionModel: document.querySelector("#captionModel"),
  captionForm: document.querySelector("#captionForm"),
  modelCards: document.querySelector("#modelCards"),
  guideCards: document.querySelector("#guideCards"),
  bandSelect: document.querySelector("#bandSelect"),
  bandUse: document.querySelector("#bandUse"),
  boardWidth: document.querySelector("#boardWidth"),
  boardHeight: document.querySelector("#boardHeight"),
  boardWidthNum: document.querySelector("#boardWidthNum"),
  boardHeightNum: document.querySelector("#boardHeightNum"),
  gndMode: document.querySelector("#gndMode"),
  gndEdge: document.querySelector("#gndEdge"),
  gndEdgeNum: document.querySelector("#gndEdgeNum"),
  gndGap: document.querySelector("#gndGap"),
  gndGapNum: document.querySelector("#gndGapNum"),
  thickness: document.querySelector("#thickness"),
  thicknessNum: document.querySelector("#thicknessNum"),
  material: document.querySelector("#material"),
  sizeSketchBody: document.querySelector("#sizeSketchBody"),
  sizeLengthLabel: document.querySelector("#sizeLengthLabel"),
  sizeWidthLabel: document.querySelector("#sizeWidthLabel"),
  antennaCardKicker: document.querySelector("#antennaCardKicker"),
  antennaCardDims: document.querySelector("#antennaCardDims"),
  antennaCardNote: document.querySelector("#antennaCardNote"),
  pcbCanvas: document.querySelector("#pcbCanvas"),
  pcbBoard: document.querySelector("#pcbBoard"),
  gndPlane: document.querySelector("#gndPlane"),
  antennaBlock: document.querySelector("#antennaBlock"),
  antennaBodyLabel: document.querySelector("#antennaBodyLabel"),
  antennaKeepout: document.querySelector("#antennaKeepout"),
  gapLabel: document.querySelector("#gapLabel"),
  antennaLengthLabel: document.querySelector("#antennaLengthLabel"),
  antennaWidthLabel: document.querySelector("#antennaWidthLabel"),
  antennaHeightLabel: document.querySelector("#antennaHeightLabel"),
  widthDimension: document.querySelector("#widthDimension"),
  heightDimension: document.querySelector("#heightDimension"),
  boardShapeLabel: document.querySelector("#boardShapeLabel"),
  positionX: document.querySelector("#positionX"),
  positionY: document.querySelector("#positionY"),
  nearestEdge: document.querySelector("#nearestEdge"),
  chartRangeEyebrow: document.querySelector("#chartRangeEyebrow"),
  riskPill: document.querySelector("#riskPill"),
  customerVerdict: document.querySelector("#customerVerdict"),
  verdictIcon: document.querySelector("#verdictIcon"),
  verdictTitle: document.querySelector("#verdictTitle"),
  verdictSummary: document.querySelector("#verdictSummary"),
  minVswr: document.querySelector("#minVswr"),
  resonanceFrequency: document.querySelector("#resonanceFrequency"),
  reflectedPower: document.querySelector("#reflectedPower"),
  baselineDelta: document.querySelector("#baselineDelta"),
  baselineDeltaLabel: document.querySelector(".baseline-delta span"),
  bandRangeKicker: document.querySelector("#bandRangeKicker"),
  bandRangeText: document.querySelector("#bandRangeText"),
  bandCoverage: document.querySelector("#bandCoverage"),
  bandSegments: document.querySelector("#bandSegments"),
  bandAxisStart: document.querySelector("#bandAxisStart"),
  bandAxisMid: document.querySelector("#bandAxisMid"),
  bandAxisEnd: document.querySelector("#bandAxisEnd"),
  coverageBandName: document.querySelector("#coverageBandName"),
  coverageStatement: document.querySelector("#coverageStatement"),
  passBandwidth: document.querySelector("#passBandwidth"),
  diagnosisTitle: document.querySelector("#diagnosisTitle"),
  diagnosisText: document.querySelector("#diagnosisText"),
  improvementList: document.querySelector("#improvementList"),
  baselinePath: document.querySelector("#baselinePath"),
  vswrArea: document.querySelector("#vswrArea"),
  vswrPath: document.querySelector("#vswrPath"),
  chartPoints: document.querySelector("#chartPoints"),
  chartPointLabels: document.querySelector("#chartPointLabels"),
  chartGrid: document.querySelector("#chartGrid"),
  axisLabels: document.querySelector("#axisLabels"),
  wifiBandZone: document.querySelector("#wifiBandZone"),
  resonanceLine: document.querySelector("#resonanceLine"),
  resonanceChartLabel: document.querySelector("#resonanceChartLabel"),
  vswrChart: document.querySelector("#vswrChart"),
  chartMessage: document.querySelector("#chartMessage"),
  showBaseline: document.querySelector("#showBaseline"),
  cards: [
    {
      card: document.querySelector("#cardF0"),
      label: document.querySelector("#freqLabelF0"),
      judgment: document.querySelector("#judgmentF0"),
      vswr: document.querySelector("#vswrF0"),
      reflection: document.querySelector("#reflectionF0")
    },
    {
      card: document.querySelector("#cardF1"),
      label: document.querySelector("#freqLabelF1"),
      judgment: document.querySelector("#judgmentF1"),
      vswr: document.querySelector("#vswrF1"),
      reflection: document.querySelector("#reflectionF1")
    },
    {
      card: document.querySelector("#cardF2"),
      label: document.querySelector("#freqLabelF2"),
      judgment: document.querySelector("#judgmentF2"),
      vswr: document.querySelector("#vswrF2"),
      reflection: document.querySelector("#reflectionF2")
    }
  ]
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function freqDisp(mhz) {
  return mhz < 1000 ? `${Math.round(mhz)} MHz` : `${(mhz / 1000).toFixed(3)} GHz`;
}

function freqShort(mhz) {
  return mhz < 1000 ? `${Math.round(mhz)}` : (mhz / 1000).toFixed(mhz % 1000 === 0 ? 1 : 3);
}

function lambdaQuarterMm(frequencyMHz) {
  return 74948 / frequencyMHz;
}

function getInputs() {
  return {
    width: Number(el.boardWidth.value),
    height: Number(el.boardHeight.value),
    shape: selectedValue("boardShape"),
    gndMode: el.gndMode.value,
    gndLayer: selectedValue("gndLayer"),
    gndEdge: Number(el.gndEdge.value),
    gndGap: Number(el.gndGap.value),
    orientation: Number(selectedValue("orientation")),
    thickness: Number(el.thickness.value),
    material: el.material.value
  };
}

function effectiveBoardArea(input) {
  const shapeFactor = input.shape === "rectangle" ? 1 : input.shape === "chamfer" ? 0.91 : 0.72;
  return input.width * input.height * shapeFactor;
}

function placementInfo(input) {
  const antenna = activeAntenna().dims;
  const antennaWidthMm = input.orientation === 0 ? antenna.length : antenna.width;
  const antennaHeightMm = input.orientation === 0 ? antenna.width : antenna.length;
  const xMm = input.width * state.placement.x / 100;
  const yMm = input.height * state.placement.y / 100;
  const rightMm = input.width - xMm - antennaWidthMm;
  const bottomMm = input.height - yMm - antennaHeightMm;
  const nearest = Math.max(0, Math.min(xMm, yMm, rightMm, bottomMm));
  const fits = antennaWidthMm <= input.width && antennaHeightMm <= input.height;
  return { antennaWidthMm, antennaHeightMm, xMm, yMm, rightMm, bottomMm, nearest, fits };
}

// 選択帯域の係数で駆動する概算サロゲートモデル。
// 各ペナルティ／シフトは f0Base / BASE_F0 でスケールし、
// λ/4に対するGND長（カウンターポイズ）不足を帯域共通で評価します。
function model(input) {
  const band = activeBand();
  const scale = band.f0Base / BASE_F0;
  const area = effectiveBoardArea(input);
  const refArea = band.refBoard.width * band.refBoard.height;
  const areaRatio = area / refArea;
  const placement = placementInfo(input);
  const material = MATERIALS[input.material];

  const lambdaQuarter = lambdaQuarterMm(band.f0Base);
  const counterpoiseRatio = clamp(Math.max(input.width, input.height) / lambdaQuarter, 0, 1.6);
  const counterpoisePenalty = clamp((1 - counterpoiseRatio) * 1.4, 0, 1.2);

  const shapePenalty = input.shape === "rectangle" ? 0 : input.shape === "chamfer" ? 0.12 : 0.3;
  const gndPenalty = input.gndMode === "full" ? 0 : input.gndMode === "partial" ? 0.22 : 0.5;
  const layerPenalty = input.gndLayer === "both" ? 0 : input.gndLayer === "bottom" ? 0.1 : 0.16;
  const edgePenalty = clamp((placement.nearest - 3) / 12, 0, 1) * 0.58;
  const gapPenalty = Math.abs(input.gndGap - REF_GAP) * 0.055;
  const gndEdgePenalty = input.gndEdge * 0.025;
  const thicknessPenalty = Math.abs(input.thickness - REF_THICKNESS) * 0.1;
  const smallBoardPenalty = clamp((1 - areaRatio) * 0.72, 0, 0.8);
  const fitPenalty = placement.fits ? 0 : 0.8;

  const minimum = clamp(
    band.minBase
      + shapePenalty
      + gndPenalty
      + layerPenalty
      + edgePenalty
      + gapPenalty
      + gndEdgePenalty
      + thicknessPenalty
      + smallBoardPenalty
      + counterpoisePenalty
      + fitPenalty,
    1.06,
    5
  );

  const areaShift = clamp((1 - areaRatio) * 58, -34, 68) * scale;
  const shapeShift = (input.shape === "rectangle" ? 0 : input.shape === "chamfer" ? 8 : 24) * scale;
  const gndShift = (input.gndMode === "full" ? 0 : input.gndMode === "partial" ? 13 : 31) * scale;
  const layerShift = (input.gndLayer === "both" ? 0 : input.gndLayer === "bottom" ? 5 : 9) * scale;
  const gapShift = (input.gndGap - REF_GAP) * 5.2 * scale;
  const edgeShift = clamp(placement.nearest - 2, 0, 20) * 1.8 * scale;
  const thicknessShift = (input.thickness - REF_THICKNESS) * -11 * scale;
  const orientationShift = (input.orientation === 90 ? 4 : 0) * scale;
  const counterpoiseShift = clamp(1 - counterpoiseRatio, 0, 1) * 0.04 * band.f0Base;
  const materialShift = material.shiftRatio * band.f0Base;

  const f0 = clamp(
    band.f0Base + areaShift + shapeShift + gndShift + layerShift + gapShift
      + edgeShift + thicknessShift + orientationShift + counterpoiseShift + materialShift,
    band.f0Base * 0.95,
    band.f0Base * 1.05
  );

  const qualityPenalty = gndPenalty + shapePenalty + smallBoardPenalty + edgePenalty + counterpoisePenalty * 0.5;
  const widthFactor = clamp(1 - qualityPenalty * 0.24 - Math.abs(input.gndGap - REF_GAP) * 0.018, 0.48, 1.12);
  const halfWidth = band.halfWidthBase * widthFactor;

  function valueAt(frequencyMHz) {
    const normalized = (frequencyMHz - f0) / halfWidth;
    return clamp(minimum + 0.78 * normalized * normalized, 1, 6);
  }

  const passHalfWidth = minimum < 2
    ? halfWidth * Math.sqrt((2 - minimum) / 0.78)
    : 0;
  const passStart = f0 - passHalfWidth;
  const passEnd = f0 + passHalfWidth;
  const overlap = Math.max(0, Math.min(passEnd, band.endMHz) - Math.max(passStart, band.startMHz));
  const coverage = overlap / (band.endMHz - band.startMHz) * 100;

  return {
    area,
    areaRatio,
    placement,
    lambdaQuarter,
    counterpoiseRatio,
    minimum,
    f0,
    halfWidth,
    valueAt,
    passStart,
    passEnd,
    coverage,
    penalties: { shapePenalty, gndPenalty, layerPenalty, edgePenalty, gapPenalty, smallBoardPenalty, counterpoisePenalty }
  };
}

function referenceModel() {
  const band = activeBand();
  return {
    valueAt(frequencyMHz) {
      const normalized = (frequencyMHz - band.f0Base) / band.halfWidthBase;
      return clamp(band.minBase + 0.78 * normalized * normalized, 1, 6);
    }
  };
}

// ------------------------------------------------------------------
// 実データ駆動モデル（dataDriven機種：1018-456A）
// お試しシミュレーター由来の VSWR / 放射効率 を 基板幅×基板長×周波数 で
// 連続補間（シームレス化）。実データに無い実装条件（GND構成・基材・板厚・
// 外形）は軽い補正として加える。
// ------------------------------------------------------------------
function gridSeg(vals, x) {
  if (x <= vals[0]) return [0, 0, 0];
  if (x >= vals[vals.length - 1]) return [vals.length - 1, vals.length - 1, 0];
  for (let i = 0; i < vals.length - 1; i += 1) {
    if (x <= vals[i + 1]) return [i, i + 1, (x - vals[i]) / (vals[i + 1] - vals[i])];
  }
  return [vals.length - 1, vals.length - 1, 0];
}

// 幅×長さ×周波数の三線形補間
function interpGrid456(table, freqAxis, input, f) {
  const D = ANTENNA_456A_DATA;
  const W = D.widths, L = D.lengths;
  const w = clamp(input.width, W[0], W[W.length - 1]);
  const ln = clamp(input.height, L[0], L[L.length - 1]);
  const [wi0, wi1, wt] = gridSeg(W, w);
  const [li0, li1, lt] = gridSeg(L, ln);
  const [fi0, fi1, ft] = gridSeg(freqAxis, f);
  const at = (wi, li) => {
    const arr = table[String(W[wi])][String(L[li])];
    return arr[fi0] + (arr[fi1] - arr[fi0]) * ft;
  };
  const top = at(wi0, li0) + (at(wi1, li0) - at(wi0, li0)) * wt;
  const bot = at(wi0, li1) + (at(wi1, li1) - at(wi0, li1)) * wt;
  return top + (bot - top) * lt;
}

function model456(input) {
  const D = ANTENNA_456A_DATA;
  const band = activeBand();
  const placement = placementInfo(input);
  const lambdaQuarter = lambdaQuarterMm(band.f0Base);
  const counterpoiseRatio = clamp(Math.max(input.width, input.height) / lambdaQuarter, 0, 1.6);
  const material = MATERIALS[input.material];

  // 実データに無い実装条件の軽い補正（VSWRはデータ形状を保ったまま劣化させる）
  const condFactor = 1
    + (input.gndMode === "full" ? 0 : input.gndMode === "partial" ? 0.06 : 0.14)
    + (input.gndLayer === "both" ? 0 : input.gndLayer === "bottom" ? 0.03 : 0.05)
    + (input.shape === "rectangle" ? 0 : input.shape === "chamfer" ? 0.03 : 0.07)
    + Math.abs(input.thickness - REF_THICKNESS) * 0.03;
  const fShiftRatio = material.shiftRatio + (input.gndGap - REF_GAP) * 0.0015;

  function valueAt(frequencyMHz) {
    const f = frequencyMHz * (1 - fShiftRatio);
    const raw = interpGrid456(D.vswr, D.freqMHz, input, f);
    return clamp(1 + (raw - 1) * condFactor, 1, 12);
  }
  function efficiencyAt(frequencyMHz) {
    const f = frequencyMHz * (1 - fShiftRatio);
    return interpGrid456(D.eff, D.effFreqMHz, input, f);
  }

  // 帯域をサンプリングして最小VSWR・共振点・カバー率・通過帯域を求める
  const steps = 160;
  let minimum = 99, f0 = band.f0Base, inBand = 0, passStart = null, passEnd = null;
  for (let i = 0; i <= steps; i += 1) {
    const f = band.startMHz + (band.endMHz - band.startMHz) * i / steps;
    const v = valueAt(f);
    if (v < minimum) { minimum = v; f0 = f; }
    if (v <= 2) {
      inBand += 1;
      if (passStart === null) passStart = f;
      passEnd = f;
    }
  }
  const coverage = inBand / (steps + 1) * 100;
  if (passStart === null) { passStart = f0; passEnd = f0; }

  return {
    area: effectiveBoardArea(input),
    areaRatio: 1,
    placement,
    lambdaQuarter,
    counterpoiseRatio,
    minimum,
    f0,
    halfWidth: band.halfWidthBase,
    valueAt,
    efficiencyAt,
    centerEff: efficiencyAt(f0),
    passStart,
    passEnd,
    coverage,
    penalties: {}
  };
}

function referenceModel456() {
  const D = ANTENNA_456A_DATA;
  const band = activeBand();
  const refInput = {
    width: clamp(band.refBoard.width, D.widths[0], D.widths[D.widths.length - 1]),
    height: clamp(band.refBoard.height, D.lengths[0], D.lengths[D.lengths.length - 1])
  };
  return {
    valueAt(frequencyMHz) {
      return clamp(interpGrid456(D.vswr, D.freqMHz, refInput, frequencyMHz), 1, 12);
    }
  };
}

function isDataDriven() {
  return !!activeAntenna().dataDriven && typeof ANTENNA_456A_DATA !== "undefined";
}

function buildModel(input) {
  return isDataDriven() ? model456(input) : model(input);
}

function buildReference() {
  return isDataDriven() ? referenceModel456() : referenceModel();
}

// ------------------------------------------------------------------
// 機種・帯域セレクタ
// ------------------------------------------------------------------

// 機種選定ガイド（フローチャート）。カードを押すとその機種を選択し検討へ移動。
function renderFlowchart() {
  if (!el.guideCards) return;
  el.guideCards.replaceChildren();
  ANTENNA_CATALOG.forEach((antenna, index) => {
    const g = antenna.guide || {};
    const d = antenna.dims;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "guide-card";
    card.dataset.antennaId = antenna.id;
    card.classList.toggle("selected", index === state.antennaIndex);
    card.innerHTML = `
      <span class="guide-card-pick">${g.pick || antenna.bandSummary}</span>
      <span class="guide-card-visual"><img src="${antenna.image}" alt="${antenna.id}" loading="lazy"></span>
      <span class="guide-card-id">${antenna.id}</span>
      <span class="guide-card-freq">${g.freq || antenna.bandSummary}</span>
      <span class="guide-card-spec"><i>実装</i>${g.mount || antenna.mount}</span>
      <span class="guide-card-spec"><i>サイズ</i>L${d.length}×W${d.width}×H${d.height}mm（${g.sizeClass || ""}）</span>
      <span class="guide-card-cta">この機種で検討する →</span>`;
    card.addEventListener("click", () => {
      selectAntenna(index);
      document.querySelector(".model-select-block")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    el.guideCards.append(card);
  });
}

function renderModelCards() {
  el.modelCards.replaceChildren();
  ANTENNA_CATALOG.forEach((antenna, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "model-card";
    card.dataset.antennaId = antenna.id;
    card.classList.toggle("selected", index === state.antennaIndex);
    card.innerHTML = `
      <span class="model-card-check" aria-hidden="true">✓</span>
      <span class="model-card-visual"><img src="${antenna.image}" alt="${antenna.id}" loading="lazy"></span>
      <span class="model-card-id">${antenna.id}</span>
      <span class="model-card-name">${antenna.name}</span>
      <span class="model-card-bands">${antenna.bandSummary}</span>
      <span class="model-card-tags">
        <i class="model-tag">${antenna.mount}</i>
        ${antenna.dataDriven ? '<i class="model-tag data">実測/解析データ</i>' : antenna.calibrated ? "" : '<i class="model-tag preliminary">概算 仮係数</i>'}
      </span>`;
    card.addEventListener("click", () => selectAntenna(index));
    el.modelCards.append(card);
  });
}

function renderBandSelect() {
  const antenna = activeAntenna();
  el.bandSelect.replaceChildren();
  el.bandSelect.style.gridTemplateColumns = `repeat(${antenna.bands.length}, 1fr)`;
  antenna.bands.forEach((band, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "band-option";
    button.classList.toggle("active", index === state.bandIndex);
    button.textContent = band.label;
    button.addEventListener("click", () => selectBand(index));
    el.bandSelect.append(button);
  });
  el.bandUse.textContent = `${activeBand().use}｜${freqDisp(activeBand().startMHz)}–${freqDisp(activeBand().endMHz)}`;
}

function selectAntenna(index) {
  if (index === state.antennaIndex) return;
  state.antennaIndex = index;
  state.bandIndex = 0;
  state.placement = { x: 3, y: 5 };
  renderModelCards();
  renderFlowchart();
  renderBandSelect();
  applyModelToUI();
  renderAxes();
  updateOutputs();
}

function selectBand(index) {
  if (index === state.bandIndex) return;
  state.bandIndex = index;
  renderBandSelect();
  applyModelToUI();
  renderAxes();
  updateOutputs();
}

// 機種・帯域に応じて固定表示部（ヒーロー・設定カードなど）を更新
function applyModelToUI() {
  const antenna = activeAntenna();
  const band = activeBand();
  const dims = antenna.dims;

  el.officialLink.href = antenna.productUrl;
  el.officialLink.textContent = `${antenna.id} 公式仕様 ↗`;
  el.heroCategory.textContent = antenna.category;
  el.heroLead.textContent = `${antenna.id}を${band.label}で使う際の初期検討ツールです。基板サイズ、外形、GND構成、アンテナ位置を変更し、特性変化を同じ画面で確認できます。`;
  el.heroImage.src = antenna.image;
  el.heroImage.alt = `${antenna.id} ${antenna.name}`;
  // heroWidth指定がある機種（実物が小さい製品など）は控えめなサイズで表示
  el.heroImage.style.width = antenna.heroWidth ? `${antenna.heroWidth}px` : "";
  el.captionModel.textContent = antenna.id;
  el.captionForm.textContent = antenna.form;
  el.ringValue.textContent = (band.f0Base / 1000).toFixed(1);
  el.ringUnit.textContent = "GHz";

  el.heroSpecs.replaceChildren();
  const specs = [
    [`${antenna.bands.length}バンド`, "対応帯域"],
    ["50Ω", "公称インピーダンス"],
    [`L${dims.length} × W${dims.width} × H${dims.height} mm`, "外形"],
    [antenna.mount, ""]
  ];
  specs.forEach(([value, label]) => {
    const span = document.createElement("span");
    const b = document.createElement("b");
    b.textContent = value;
    span.append(b, document.createTextNode(label ? ` ${label}` : ""));
    el.heroSpecs.append(span);
  });

  // 設定パネルの外形カード（スケッチは76×52px枠に実寸比率で描画）
  const sketchScale = Math.min(58 / dims.length, 26 / dims.width);
  el.sizeSketchBody.style.width = `${Math.max(10, dims.length * sketchScale)}px`;
  el.sizeSketchBody.style.height = `${Math.max(8, dims.width * sketchScale)}px`;
  el.sizeLengthLabel.textContent = `L ${dims.length} mm`;
  el.sizeWidthLabel.textContent = `W ${dims.width} mm`;
  el.antennaCardKicker.textContent = `${antenna.id} 固定外形`;
  el.antennaCardDims.textContent = `L${dims.length} × W${dims.width} × H${dims.height} mm`;
  el.antennaCardNote.textContent = antenna.calibrated
    ? "基板表示は実寸比率で描画"
    : "概算係数は仮値（実測校正前）です";

  el.antennaBodyLabel.textContent = antenna.id;
  el.antennaLengthLabel.textContent = `L ${dims.length} mm`;
  el.antennaWidthLabel.textContent = `W ${dims.width} mm`;
  el.antennaHeightLabel.textContent = `H ${dims.height} mm`;

  el.chartRangeEyebrow.textContent =
    `${(band.chartStartMHz / 1000).toFixed(2)}–${(band.chartEndMHz / 1000).toFixed(2)} GHZ ESTIMATE`;
  el.bandRangeKicker.textContent = `${band.label} 利用帯域`;
  el.bandRangeText.textContent = `${freqDisp(band.startMHz)}–${freqDisp(band.endMHz)}`;
  el.coverageBandName.textContent = `${band.label}カバー率`;
  el.bandAxisStart.textContent = freqShort(band.startMHz);
  el.bandAxisMid.textContent = freqShort((band.startMHz + band.endMHz) / 2);
  el.bandAxisEnd.textContent = `${freqShort(band.endMHz)} ${band.endMHz < 1000 ? "MHz" : "GHz"}`;

  const labels = ["帯域下端", "中央付近", "帯域上端"];
  band.checkMHz.forEach((freq, index) => {
    el.cards[index].label.textContent = `${labels[index]}・${freqDisp(freq)}`;
  });

  // チャート上の利用帯域ゾーン
  const start = chartPoint(band.startMHz, 1);
  const end = chartPoint(band.endMHz, 1);
  el.wifiBandZone.setAttribute("x", start.x.toFixed(1));
  el.wifiBandZone.setAttribute("width", (end.x - start.x).toFixed(1));
}

// ------------------------------------------------------------------
// 表示更新
// ------------------------------------------------------------------

function updateOutputs() {
  const input = getInputs();
  syncNumberBox(el.boardWidthNum, input.width, 0);
  syncNumberBox(el.boardHeightNum, input.height, 0);
  syncNumberBox(el.gndEdgeNum, input.gndEdge, 1);
  syncNumberBox(el.gndGapNum, input.gndGap, 1);
  syncNumberBox(el.thicknessNum, input.thickness, 1);
  updateBoard();
  updateVswr();
}

// 数値ボックスへスライダー値を反映（入力中のボックスは上書きしない）
function syncNumberBox(numberInput, value, decimals) {
  if (!numberInput || document.activeElement === numberInput) return;
  numberInput.value = decimals ? value.toFixed(decimals) : String(value);
}

// 数値ボックス⇔スライダーの双方向同期。
// 入力中は範囲内の値だけ即時反映し、確定時（Enter/フォーカス外し/矢印）に上下限へクランプする。
function bindNumberBox(numberInput, slider, decimals) {
  if (!numberInput) return;
  const min = Number(slider.min);
  const max = Number(slider.max);

  numberInput.addEventListener("input", () => {
    const value = Number(numberInput.value);
    if (numberInput.value !== "" && !Number.isNaN(value) && value >= min && value <= max) {
      slider.value = value;
      updateOutputs();
    }
  });

  numberInput.addEventListener("change", () => {
    const value = Number(numberInput.value);
    if (numberInput.value === "" || Number.isNaN(value)) {
      numberInput.value = decimals ? Number(slider.value).toFixed(decimals) : slider.value;
      return;
    }
    slider.value = clamp(value, min, max);
    numberInput.value = decimals ? Number(slider.value).toFixed(decimals) : slider.value;
    updateOutputs();
  });
}

function updateBoard() {
  const input = getInputs();
  const antenna = activeAntenna().dims;
  const canvasRect = el.pcbCanvas.getBoundingClientRect();
  const canvasWidth = canvasRect.width || el.pcbCanvas.parentElement.clientWidth || 600;
  // 描画サイズに上限を設け、広い画面でも基板が巨大化しないようにする
  const availableWidth = Math.max(180, Math.min(620, canvasWidth - 80));
  const availableHeight = clamp((canvasRect.height || 480) - 80, 260, 430);
  const scale = Math.min(availableWidth / input.width, availableHeight / input.height);
  const boardWidthPx = input.width * scale;
  const boardHeightPx = input.height * scale;

  el.pcbBoard.style.setProperty("width", `${boardWidthPx}px`, "important");
  el.pcbBoard.style.setProperty("height", `${boardHeightPx}px`, "important");
  el.pcbBoard.className = `pcb-board shape-${input.shape}`;
  el.boardShapeLabel.textContent = SHAPE_LABELS[input.shape];
  el.widthDimension.textContent = `${input.width} mm`;
  el.heightDimension.textContent = `${input.height} mm`;

  const gndInsetPx = input.gndEdge * scale;
  el.gndPlane.style.inset = `${gndInsetPx}px`;
  el.gndPlane.className = `gnd-plane mode-${input.gndMode}`;
  el.gndPlane.querySelector("span").textContent = `${GND_LABELS[input.gndMode]} / ${input.gndLayer.toUpperCase()}`;

  const orientationClass = input.orientation === 90 ? "vertical" : "horizontal";
  el.antennaBlock.className = `sheet-antenna ${orientationClass}`;
  const antennaWidthPx = (input.orientation === 0 ? antenna.length : antenna.width) * scale;
  const antennaHeightPx = (input.orientation === 0 ? antenna.width : antenna.length) * scale;
  el.antennaBlock.style.width = `${antennaWidthPx}px`;
  el.antennaBlock.style.height = `${antennaHeightPx}px`;

  normalizePlacement(input);
  el.antennaBlock.style.left = `${state.placement.x}%`;
  el.antennaBlock.style.top = `${state.placement.y}%`;

  const keepoutPx = input.gndGap * scale;
  el.antennaKeepout.style.left = `calc(${state.placement.x}% - ${keepoutPx}px)`;
  el.antennaKeepout.style.top = `calc(${state.placement.y}% - ${keepoutPx}px)`;
  el.antennaKeepout.style.width = `${antennaWidthPx + keepoutPx * 2}px`;
  el.antennaKeepout.style.height = `${antennaHeightPx + keepoutPx * 2}px`;
  el.gapLabel.textContent = `GND ${input.gndGap.toFixed(1)} mm`;

  const placement = placementInfo(input);
  el.positionX.textContent = `${Math.max(0, placement.xMm).toFixed(1)} mm`;
  el.positionY.textContent = `${Math.max(0, placement.yMm).toFixed(1)} mm`;
  el.nearestEdge.textContent = `${placement.nearest.toFixed(1)} mm`;
}

function normalizePlacement(input) {
  const antenna = activeAntenna().dims;
  const antennaWidthPercent = (input.orientation === 0 ? antenna.length : antenna.width) / input.width * 100;
  const antennaHeightPercent = (input.orientation === 0 ? antenna.width : antenna.length) / input.height * 100;
  state.placement.x = clamp(state.placement.x, 0, Math.max(0, 100 - antennaWidthPercent));
  state.placement.y = clamp(state.placement.y, 0, Math.max(0, 100 - antennaHeightPercent));

  if (input.shape === "lshape" && state.placement.x > 58 && state.placement.y > 42) {
    state.placement.x = Math.max(0, 56 - antennaWidthPercent);
  }
}

function chartGeometry() {
  const band = activeBand();
  return {
    left: 72,
    right: 658,
    top: 36,
    bottom: 342,
    minFreq: band.chartStartMHz,
    maxFreq: band.chartEndMHz,
    minVswr: 1,
    maxVswr: 5
  };
}

function chartPoint(frequency, vswr) {
  const g = chartGeometry();
  const x = g.left + (frequency - g.minFreq) / (g.maxFreq - g.minFreq) * (g.right - g.left);
  const y = g.bottom - (clamp(vswr, g.minVswr, g.maxVswr) - g.minVswr) / (g.maxVswr - g.minVswr) * (g.bottom - g.top);
  return { x, y };
}

function buildPath(valueAt) {
  const g = chartGeometry();
  const step = (g.maxFreq - g.minFreq) / 50;
  const points = [];
  for (let frequency = g.minFreq; frequency <= g.maxFreq + step / 2; frequency += step) {
    const point = chartPoint(Math.min(frequency, g.maxFreq), valueAt(Math.min(frequency, g.maxFreq)));
    points.push(point);
  }
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  return {
    line,
    area: `${line} L ${points.at(-1).x.toFixed(2)} 342 L ${points[0].x.toFixed(2)} 342 Z`
  };
}

function renderAxes() {
  const g = chartGeometry();
  el.chartGrid.replaceChildren();
  el.axisLabels.replaceChildren();

  [1, 2, 3, 4, 5].forEach(vswr => {
    const point = chartPoint(g.minFreq, vswr);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", g.left);
    line.setAttribute("x2", g.right);
    line.setAttribute("y1", point.y);
    line.setAttribute("y2", point.y);
    el.chartGrid.append(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", g.left - 16);
    text.setAttribute("y", point.y + 4);
    text.setAttribute("text-anchor", "end");
    text.textContent = vswr.toFixed(1);
    el.axisLabels.append(text);
  });

  const tickCount = 5;
  for (let index = 0; index < tickCount; index += 1) {
    const frequency = g.minFreq + (g.maxFreq - g.minFreq) * index / (tickCount - 1);
    const point = chartPoint(frequency, 1);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", point.x);
    line.setAttribute("x2", point.x);
    line.setAttribute("y1", g.top);
    line.setAttribute("y2", g.bottom);
    el.chartGrid.append(line);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", point.x);
    text.setAttribute("y", g.bottom + 27);
    text.setAttribute("text-anchor", "middle");
    const ghz = (frequency / 1000).toFixed(2);
    text.textContent = index === tickCount - 1 ? `${ghz} GHz` : ghz;
    el.axisLabels.append(text);
  }
}

function reflectedPowerPercent(vswr) {
  const coefficient = (vswr - 1) / (vswr + 1);
  return coefficient * coefficient * 100;
}

function judgmentFor(vswr) {
  if (vswr <= 1.5) return { label: "余裕あり", className: "ideal" };
  if (vswr <= 2) return { label: "OK", className: "pass" };
  if (vswr <= 3) return { label: "要調整", className: "adjust" };
  return { label: "見直し", className: "poor" };
}

function updateFrequencyCard(slot, vswr) {
  const judgment = judgmentFor(vswr);
  slot.card.classList.remove("ideal", "pass", "adjust", "poor");
  slot.card.classList.add(judgment.className);
  slot.judgment.textContent = judgment.label;
  slot.vswr.textContent = vswr.toFixed(2);
  slot.reflection.textContent = `反射電力の目安 ${reflectedPowerPercent(vswr).toFixed(1)}%`;
}

function renderBandSegments(result) {
  const band = activeBand();
  el.bandSegments.replaceChildren();
  const segmentCount = 17;
  for (let index = 0; index < segmentCount; index += 1) {
    const frequency = band.startMHz + (band.endMHz - band.startMHz) * index / (segmentCount - 1);
    const vswr = result.valueAt(frequency);
    const segment = document.createElement("span");
    segment.className = judgmentFor(vswr).className;
    segment.title = `${freqDisp(frequency)}: VSWR ${vswr.toFixed(2)}`;
    el.bandSegments.append(segment);
  }
}

function renderImprovements(result, input, values) {
  const band = activeBand();
  const antenna = activeAntenna();
  const improvements = [];
  if (!result.placement.fits) {
    improvements.push(`基板が${antenna.id}の外形（${antenna.dims.length}×${antenna.dims.width}mm）より小さいため、基板サイズを見直す`);
  }
  if (result.counterpoiseRatio < 0.9) {
    improvements.push(`基板の長辺を約${Math.ceil(result.lambdaQuarter)}mm以上に広げる（${band.label}のλ/4目安）`);
  }
  if (result.placement.nearest > 3) {
    improvements.push(`アンテナを基板端から3mm以内へ移動する（現在 ${result.placement.nearest.toFixed(1)}mm）`);
  }
  if (input.gndMode !== "full") {
    improvements.push("GNDパターンを全面GNDへ変更して有効GND面積を確保する");
  }
  if (input.gndLayer !== "both") {
    improvements.push("GND層を両面にして電流経路を安定させる");
  }
  if (Math.abs(input.gndGap - REF_GAP) > 1) {
    improvements.push(`アンテナとGNDの距離を2mm前後へ調整する（現在 ${input.gndGap.toFixed(1)}mm）`);
  }
  if (input.shape !== "rectangle") {
    improvements.push("四角基板の基準条件と比較し、外形による共振ずれを確認する");
  }
  if (values.some(item => item.value > 2) && improvements.length === 0) {
    improvements.push("整合回路の定数調整をスタッフへ相談する");
  }
  if (improvements.length === 0) {
    improvements.push("現在の配置を維持して評価基板で実測する");
    improvements.push("筐体・周辺部品を含めた最終状態でVSWRを確認する");
  }

  el.improvementList.replaceChildren();
  improvements.slice(0, 3).forEach(text => {
    const item = document.createElement("li");
    item.textContent = text;
    el.improvementList.append(item);
  });
}

// 設計対象外（基板内側）配置でのグラフ表示の切り替え。
// VSWRカーブ・基準カーブ・共振点を隠し、対象外メッセージを表示する。
// out-of-designクラスはリサイズで上書きされない pcb-canvas 側へ付与する。
function setDesignState(outOfDesign) {
  el.pcbCanvas.classList.toggle("out-of-design", outOfDesign);
  el.nearestEdge.classList.toggle("value-risk", outOfDesign);
  el.vswrChart.classList.toggle("chart-disabled", outOfDesign);
  if (el.chartMessage) el.chartMessage.style.display = outOfDesign ? "" : "none";

  const display = outOfDesign ? "none" : "";
  el.vswrPath.style.display = display;
  el.vswrArea.style.display = display;
  el.resonanceLine.style.display = display;
  el.resonanceChartLabel.style.display = display;
  if (outOfDesign) {
    el.baselinePath.style.display = "none";
    el.chartPoints.replaceChildren();
    el.chartPointLabels.replaceChildren();
  }
}

// 基板内側＝設計対象外。VSWR等を一切出さず「設計対象外（NG）」を明示する。
function renderOutOfDesign(input, placement, band) {
  // ヒーロー指標はすべて非表示（ダッシュ）
  el.minVswr.textContent = "—";
  el.resonanceFrequency.textContent = "—";
  el.reflectedPower.textContent = "—";
  el.baselineDelta.textContent = "—";
  el.baselineDelta.className = "";

  // 3周波数カードは判定対象外
  el.cards.forEach(slot => {
    slot.card.classList.remove("ideal", "pass", "adjust", "poor");
    slot.card.classList.add("out-of-design");
    slot.judgment.textContent = "対象外";
    slot.vswr.textContent = "—";
    slot.reflection.textContent = "設計対象外の配置";
  });

  // 帯域カバー率・通過帯域も対象外
  el.passBandwidth.textContent = "—";
  el.bandCoverage.textContent = "—";
  el.bandCoverage.className = "coverage-risk";
  el.coverageStatement.textContent = "判定対象外";
  el.bandSegments.replaceChildren();
  for (let index = 0; index < 17; index += 1) {
    const segment = document.createElement("span");
    segment.className = "disabled";
    el.bandSegments.append(segment);
  }

  // 顧客向け判定：NG
  el.riskPill.className = "status-pill risk";
  el.riskPill.textContent = "設計対象外";
  el.customerVerdict.className = "customer-verdict risk";
  el.verdictIcon.textContent = "NG";
  el.verdictTitle.textContent = "この配置は設計対象外です（アンテナがGNDの内側）";
  el.verdictSummary.textContent = `アンテナと基板端の間にGNDが残り、アンテナがGND面の内側にあります。板金アンテナは基板端のGND抜き領域（クリアランス）への実装が前提で、GNDに囲まれた状態では放射特性が得られないため、VSWRは判定しません。`;

  // 診断
  el.diagnosisTitle.textContent = "アンテナがGNDの内側に配置されています";
  el.diagnosisText.textContent = `板金アンテナは「基板端のGND抜きマージン＋アンテナ周辺のGND抜き（クリアランス）」が連続する位置への実装を前提に設計されています。現在はアンテナと基板端の間にGNDが残っており、GNDに囲まれて強く離調し放射効率が大きく低下するため、設計対象外です。アンテナを基板端側へ動かし、周辺のGND抜きが基板端のGND抜き領域につながる位置へ配置してください。`;

  // 改善ガイド
  el.improvementList.replaceChildren();
  [
    `アンテナを基板端側へ移動してGNDの内側から出す（現在 最寄り端から ${placement.nearest.toFixed(1)}mm）`,
    `基板端のGND抜き（現在 ${input.gndEdge.toFixed(1)}mm）やアンテナ周辺クリアランス（現在 ${input.gndGap.toFixed(1)}mm）を広げ、GND-free領域を基板端までつなげる`,
    "再配置後にVSWR・放射効率を評価基板で実測する"
  ].forEach(text => {
    const item = document.createElement("li");
    item.textContent = text;
    el.improvementList.append(item);
  });

  // 上部ティッカー
  if (ticker.bar) {
    ticker.model.textContent = `${activeAntenna().id}・${band.label}`;
    ticker.pill.className = "ticker-pill risk";
    ticker.pill.textContent = "設計対象外";
    ticker.minV.textContent = "—";
    ticker.coverage.textContent = "—";
    ticker.f0.textContent = "—";
  }
}

function updateVswr() {
  const band = activeBand();
  const input = getInputs();

  // アンテナがGNDの内側にある配置（アンテナ周辺のGND抜きが基板端のGND抜き
  // マージンに届かず、間にGNDが残る）はVSWR等を表示せずNG判定にする
  const placement = placementInfo(input);
  const clearanceReach = input.gndEdge + input.gndGap + EDGE_TOLERANCE_MM;
  const outOfDesign = placement.nearest > clearanceReach;
  setDesignState(outOfDesign);
  if (outOfDesign) {
    renderOutOfDesign(input, placement, band);
    return;
  }

  const result = buildModel(input);
  const path = buildPath(result.valueAt);
  const baseline = buildPath(buildReference().valueAt);

  el.vswrPath.setAttribute("d", path.line);
  el.vswrArea.setAttribute("d", path.area);
  el.baselinePath.setAttribute("d", baseline.line);
  el.baselinePath.style.display = el.showBaseline.checked ? "" : "none";

  const values = band.checkMHz.map(frequency => ({ frequency, value: result.valueAt(frequency) }));

  el.chartPoints.replaceChildren();
  el.chartPointLabels.replaceChildren();
  values.forEach(({ frequency, value }) => {
    const point = chartPoint(frequency, value);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", "6");
    circle.classList.toggle("fail-point", value > 2);
    el.chartPoints.append(circle);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", point.x);
    label.setAttribute("y", Math.max(46, point.y - 13));
    label.setAttribute("text-anchor", "middle");
    label.classList.toggle("fail-label-value", value > 2);
    label.textContent = value.toFixed(2);
    el.chartPointLabels.append(label);
  });

  const resonancePoint = chartPoint(result.f0, result.minimum);
  el.resonanceLine.setAttribute("x1", resonancePoint.x);
  el.resonanceLine.setAttribute("x2", resonancePoint.x);
  el.resonanceChartLabel.setAttribute("x", clamp(resonancePoint.x + 7, 86, 615));
  el.resonanceChartLabel.textContent = `共振 ${freqDisp(result.f0)}`;

  el.minVswr.textContent = result.minimum.toFixed(2);
  el.resonanceFrequency.textContent = freqDisp(result.f0);
  el.reflectedPower.textContent = `${reflectedPowerPercent(result.minimum).toFixed(1)}%`;
  // データ駆動機種は「基準条件との差」セルを放射効率の表示に切り替える
  if (typeof result.centerEff === "number") {
    if (el.baselineDeltaLabel) el.baselineDeltaLabel.textContent = "帯域中心の放射効率";
    el.baselineDelta.textContent = `${result.centerEff.toFixed(1)} dB`;
    el.baselineDelta.className = result.centerEff >= -3 ? "delta-good" : result.centerEff >= -6 ? "delta-caution" : "delta-risk";
  } else {
    if (el.baselineDeltaLabel) el.baselineDeltaLabel.textContent = "基準条件との差";
    const delta = result.minimum - band.minBase;
    el.baselineDelta.textContent = `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`;
    el.baselineDelta.className = delta <= .15 ? "delta-good" : delta <= .5 ? "delta-caution" : "delta-risk";
  }

  values.forEach((item, index) => updateFrequencyCard(el.cards[index], item.value));

  el.passBandwidth.textContent = result.minimum < 2
    ? `${freqDisp(result.passStart)}–${freqDisp(result.passEnd)}`
    : "該当範囲なし";
  el.bandCoverage.textContent = `${Math.round(clamp(result.coverage, 0, 100))}%`;
  el.bandCoverage.className = result.coverage >= 96
    ? "coverage-good"
    : result.coverage >= 70
      ? "coverage-caution"
      : "coverage-risk";
  el.coverageStatement.textContent = result.coverage >= 96
    ? "全帯域をカバー"
    : result.coverage >= 70
      ? "帯域端に要調整"
      : result.coverage > 0
        ? "一部のみカバー"
        : "カバーできません";

  renderBandSegments(result);
  renderImprovements(result, input, values);
  updateDiagnosis(result, input, values);
}

function updateDiagnosis(result, input, values) {
  const band = activeBand();
  const allPass = values.every(item => item.value <= 2);
  const centerPass = values[1].value <= 2;
  el.riskPill.className = "status-pill";
  el.customerVerdict.className = "customer-verdict";

  if (allPass && result.coverage >= 96) {
    el.riskPill.textContent = "帯域内 良好";
    el.customerVerdict.classList.add("good");
    el.verdictIcon.textContent = "OK";
    el.verdictTitle.textContent = `${band.label}で採用検討を進められます`;
    el.verdictSummary.textContent = `帯域カバー率${Math.round(result.coverage)}%。確認した3周波数すべてでVSWR 2.0以下です。`;
    el.diagnosisTitle.textContent = `${band.label}をカバーできる見込みです`;
  } else if (centerPass) {
    el.riskPill.textContent = "帯域端 要調整";
    el.riskPill.classList.add("caution");
    el.customerVerdict.classList.add("caution");
    el.verdictIcon.textContent = "△";
    el.verdictTitle.textContent = "帯域端の調整後に採用判断してください";
    el.verdictSummary.textContent = `中央付近はVSWR 2.0以下ですが、${band.label}のカバー率は${Math.round(result.coverage)}%です。`;
    el.diagnosisTitle.textContent = "中心周波数は良好ですが、帯域端に余裕がありません";
  } else {
    el.riskPill.textContent = "再配置推奨";
    el.riskPill.classList.add("risk");
    el.customerVerdict.classList.add("risk");
    el.verdictIcon.textContent = "×";
    el.verdictTitle.textContent = "この条件のままでは採用を推奨できません";
    el.verdictSummary.textContent = `中央付近のVSWRが${values[1].value.toFixed(2)}です。GNDとアンテナ配置を見直してください。`;
    el.diagnosisTitle.textContent = "VSWR 2.0を超えるため、GNDと配置の見直しを推奨します";
  }

  const reasons = [];
  if (!result.placement.fits) {
    reasons.push("アンテナ外形が基板からはみ出しています");
  }
  if (result.counterpoiseRatio < 0.85) {
    reasons.push(`基板長辺が${band.label}のλ/4（約${Math.round(result.lambdaQuarter)}mm）より短く、GNDが不足気味です`);
  }
  if (result.placement.nearest <= 3) reasons.push("アンテナは基板端に近い配置です");
  else reasons.push(`最寄り基板端から${result.placement.nearest.toFixed(1)}mm離れており、共振ずれの要因になります`);

  if (input.gndMode === "full") reasons.push("全面GNDを選択しています");
  else if (input.gndMode === "partial") reasons.push("部分GNDにより有効GND面積が減少しています");
  else reasons.push("分割GNDにより電流経路が不連続です");

  if (Math.abs(input.gndGap - REF_GAP) <= 1) {
    reasons.push("アンテナとGNDの距離は基準付近です");
  } else {
    reasons.push(`GND距離${input.gndGap.toFixed(1)}mmが基準から外れています`);
  }

  if (input.shape === "lshape") reasons.push("L字外形のためGND電流経路の個別確認が必要です");

  // データ駆動機種は実測/解析ベースである旨と放射効率を明示
  if (typeof result.centerEff === "number") {
    reasons.unshift(`お試しシミュレーター実データ（基板幅×長さ）に基づく表示です`);
    const eff = result.centerEff;
    const effNote = eff >= -3 ? "良好" : eff >= -6 ? "やや低い" : "低い（基板を大きくすると改善）";
    reasons.push(`帯域中心の放射効率は約${eff.toFixed(1)}dB（${effNote}）`);
  }
  const reasonLimit = typeof result.centerEff === "number" ? 5 : 4;
  el.diagnosisText.textContent = `${reasons.slice(0, reasonLimit).join("。")}。`;

  updateTicker(result, band);
}

// 判定サマリーバー（画面上部に常時表示）の更新
function updateTicker(result, band) {
  if (!ticker.bar) return;
  ticker.model.textContent = `${activeAntenna().id}・${band.label}`;
  ticker.pill.textContent = el.riskPill.textContent;
  ticker.pill.className = "ticker-pill";
  if (el.riskPill.classList.contains("caution")) ticker.pill.classList.add("caution");
  if (el.riskPill.classList.contains("risk")) ticker.pill.classList.add("risk");
  ticker.minV.textContent = result.minimum.toFixed(2);
  ticker.coverage.textContent = `${Math.round(clamp(result.coverage, 0, 100))}%`;
  ticker.f0.textContent = freqDisp(result.f0);
}

function setPlacementFromPoint(clientX, clientY) {
  const input = getInputs();
  const rect = el.pcbBoard.getBoundingClientRect();
  const antennaRect = el.antennaBlock.getBoundingClientRect();
  const x = (clientX - rect.left - antennaRect.width / 2) / rect.width * 100;
  const y = (clientY - rect.top - antennaRect.height / 2) / rect.height * 100;
  state.placement.x = x;
  state.placement.y = y;
  normalizePlacement(input);
  updateBoard();
  updateVswr();
}

function reset() {
  const band = activeBand();
  el.boardWidth.value = band.refBoard.width;
  el.boardHeight.value = band.refBoard.height;
  document.querySelector('input[name="boardShape"][value="rectangle"]').checked = true;
  el.gndMode.value = "full";
  document.querySelector('input[name="gndLayer"][value="both"]').checked = true;
  el.gndEdge.value = 1;
  el.gndGap.value = 2;
  document.querySelector('input[name="orientation"][value="0"]').checked = true;
  el.thickness.value = 1.6;
  el.material.value = "fr4";
  el.showBaseline.checked = true;
  state.placement = { x: 3, y: 5 };
  updateOutputs();
}

document.querySelector(".settings-panel").addEventListener("input", event => {
  // 数値ボックスは専用ハンドラ（bindNumberBox）で処理する
  if (event.target.closest(".num-box")) return;
  updateOutputs();
});
document.querySelector(".settings-panel").addEventListener("change", event => {
  if (event.target.closest(".num-box")) return;
  updateOutputs();
});

bindNumberBox(el.boardWidthNum, el.boardWidth, 0);
bindNumberBox(el.boardHeightNum, el.boardHeight, 0);
bindNumberBox(el.gndEdgeNum, el.gndEdge, 1);
bindNumberBox(el.gndGapNum, el.gndGap, 1);
bindNumberBox(el.thicknessNum, el.thickness, 1);
document.querySelector("#resetButton").addEventListener("click", reset);
el.showBaseline.addEventListener("change", updateVswr);

el.antennaBlock.addEventListener("pointerdown", event => {
  event.preventDefault();
  event.stopPropagation();
  state.dragging = true;
  el.antennaBlock.setPointerCapture(event.pointerId);
});

document.addEventListener("pointermove", event => {
  if (!state.dragging) return;
  event.preventDefault();
  setPlacementFromPoint(event.clientX, event.clientY);
});

document.addEventListener("pointerup", event => {
  if (!state.dragging) return;
  state.dragging = false;
  if (el.antennaBlock.hasPointerCapture(event.pointerId)) {
    el.antennaBlock.releasePointerCapture(event.pointerId);
  }
});

document.addEventListener("pointercancel", () => {
  state.dragging = false;
});

el.pcbBoard.addEventListener("pointerdown", event => {
  if (event.target.closest("#antennaBlock")) return;
  setPlacementFromPoint(event.clientX, event.clientY);
});

window.addEventListener("resize", updateBoard);

const ticker = {
  bar: document.querySelector("#resultTicker"),
  model: document.querySelector("#tickerModel"),
  pill: document.querySelector("#tickerPill"),
  minV: document.querySelector("#tickerMinV"),
  coverage: document.querySelector("#tickerCov"),
  f0: document.querySelector("#tickerF0")
};

ticker.bar?.addEventListener("click", () => {
  document.querySelector(".vswr-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

renderModelCards();
renderFlowchart();
renderBandSelect();
applyModelToUI();
renderAxes();
updateOutputs();
setTimeout(updateOutputs, 0);
