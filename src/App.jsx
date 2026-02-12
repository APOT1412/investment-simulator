import { useState, useMemo, useCallback } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Line, LineChart, ReferenceLine } from "recharts";

const PRESET_FUNDS = [
  { id: "allworld", name: "全世界株式", defaultRate: { conservative: 5, base: 7, optimistic: 9 }, color: "#4ecdc4", isForeign: true },
  { id: "sp500", name: "S&P 500", defaultRate: { conservative: 3, base: 5, optimistic: 7 }, color: "#6c5ce7", isForeign: true },
  { id: "nasdaq", name: "NASDAQ 100", defaultRate: { conservative: 2, base: 4, optimistic: 7 }, color: "#a29bfe", isForeign: true },
  { id: "india", name: "インド株", defaultRate: { conservative: 7, base: 9, optimistic: 11 }, color: "#fd79a8", isForeign: true },
  { id: "fang", name: "FANG+", defaultRate: { conservative: 1, base: 3.5, optimistic: 6 }, color: "#fdcb6e", isForeign: true },
  { id: "japan", name: "日本個別株", defaultRate: { conservative: 4, base: 6, optimistic: 8 }, color: "#ff6b6b", isForeign: false },
  { id: "us", name: "米国個別株", defaultRate: { conservative: 4, base: 7, optimistic: 10 }, color: "#e056fd", isForeign: true },
  { id: "espp", name: "持株会・定期預金", defaultRate: { conservative: 0, base: 0, optimistic: 0 }, color: "#ffd93d", isForeign: false },
];

let nextId = 100;

function formatYen(val) {
  if (val >= 100000000) return `${(val / 100000000).toFixed(2)}億円`;
  if (val >= 10000) return `${Math.round(val / 10000).toLocaleString()}万円`;
  return `${Math.round(val).toLocaleString()}円`;
}

function formatYenShort(val) {
  if (val >= 100000000) return `${(val / 100000000).toFixed(1)}億`;
  if (val >= 10000000) return `${(val / 10000000).toFixed(1)}千万`;
  if (val >= 10000) return `${Math.round(val / 10000)}万`;
  return `${Math.round(val)}`;
}

function NumberInput({ value, onChange, suffix = "円", small = false }) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState("");

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: "rgba(30,30,45,0.5)",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.12)",
      padding: small ? "10px 14px" : "12px 16px",
      gap: 6,
    }}>
      <input
        type="text"
        inputMode="numeric"
        value={editing ? tempVal : value.toLocaleString()}
        onFocus={() => { setEditing(true); setTempVal(value.toString()); }}
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const num = parseInt(tempVal.replace(/,/g, ""), 10);
          if (!isNaN(num) && num >= 0) onChange(num);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
        style={{
          background: "none", border: "none", color: "#fff",
          fontSize: small ? 17 : 19, fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, width: "100%", outline: "none", textAlign: "right",
        }}
      />
      <span style={{ fontSize: small ? 15 : 16, color: "#8a8aa0", whiteSpace: "nowrap" }}>{suffix}</span>
    </div>
  );
}

function RateInput({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState("");

  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "rgba(30,30,45,0.5)", borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.12)", padding: "8px 12px", gap: 4, width: 85,
    }}>
      <input
        type="text" inputMode="decimal"
        value={editing ? tempVal : value.toString()}
        onFocus={() => { setEditing(true); setTempVal(value.toString()); }}
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const num = parseFloat(tempVal);
          if (!isNaN(num)) onChange(num);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
        style={{
          background: "none", border: "none", color: "#4ecdc4",
          fontSize: 17, fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, width: "100%", outline: "none", textAlign: "right",
        }}
      />
      <span style={{ fontSize: 15, color: "#8a8aa0" }}>%</span>
    </div>
  );
}

const COLORS = ["#4ecdc4", "#ff6b6b", "#ffd93d", "#6c5ce7", "#a29bfe", "#fd79a8", "#fdcb6e", "#e056fd", "#00b894", "#fab1a0", "#74b9ff", "#55efc4"];

const MILESTONES = [
  { amount: 5000000, label: "500万" },
  { amount: 10000000, label: "1,000万" },
  { amount: 20000000, label: "2,000万" },
  { amount: 30000000, label: "3,000万" },
  { amount: 50000000, label: "5,000万" },
  { amount: 100000000, label: "1億" },
];

export default function InvestmentSimulation() {
  // ===== タブ切り替え =====
  const [activeTab, setActiveTab] = useState("simulation"); // "simulation" | "risk"

  // ===== 共通設定 =====
  const [scenario, setScenario] = useState("base");
  const [years, setYears] = useState(25);
  const [showSetup, setShowSetup] = useState(false);
  const [showRates, setShowRates] = useState(false);

  const [funds, setFunds] = useState(() =>
    PRESET_FUNDS.map((f) => ({
      ...f,
      initialAmount: f.id === "allworld" ? 300000 : f.id === "sp500" ? 200000 : f.id === "nasdaq" ? 100000 :
        f.id === "india" ? 50000 : f.id === "fang" ? 50000 : f.id === "japan" ? 500000 :
        f.id === "us" ? 200000 : f.id === "espp" ? 300000 : 0,
      monthlyAmount: f.id === "allworld" ? 50000 : f.id === "sp500" ? 20000 : f.id === "nasdaq" ? 20000 :
        f.id === "india" ? 10000 : f.id === "fang" ? 10000 : f.id === "espp" ? 50000 : 0,
      rates: { ...f.defaultRate },
    }))
  );

  const [newFundName, setNewFundName] = useState("");

  // ===== リスクシナリオ設定 =====
  const [crashYear, setCrashYear] = useState(5);
  const [showCrashScenario, setShowCrashScenario] = useState(true);
  const [showYenScenario, setShowYenScenario] = useState(true);
  const [showSavingsOnly, setShowSavingsOnly] = useState(true);

  // ===== ファンド操作 =====
  const updateFund = useCallback((id, field, value) => {
    setFunds((prev) => prev.map((f) => f.id === id ? { ...f, [field]: value } : f));
  }, []);

  const updateRate = useCallback((id, sc, value) => {
    setFunds((prev) => prev.map((f) =>
      f.id === id ? { ...f, rates: { ...f.rates, [sc]: value } } : f
    ));
  }, []);

  const addFund = useCallback(() => {
    if (!newFundName.trim()) return;
    const id = `custom_${nextId++}`;
    setFunds((prev) => [...prev, {
      id, name: newFundName.trim(), color: COLORS[prev.length % COLORS.length],
      initialAmount: 0, monthlyAmount: 0, isForeign: false,
      rates: { conservative: 3, base: 5, optimistic: 7 },
      defaultRate: { conservative: 3, base: 5, optimistic: 7 },
    }]);
    setNewFundName("");
  }, [newFundName]);

  const toggleForeign = useCallback((id) => {
    setFunds((prev) => prev.map((f) => f.id === id ? { ...f, isForeign: !f.isForeign } : f));
  }, []);

  const removeFund = useCallback((id) => {
    setFunds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // ===== 計算値 =====
  const totalInitial = funds.reduce((s, f) => s + f.initialAmount, 0);
  const totalMonthly = funds.reduce((s, f) => s + f.monthlyAmount, 0);

  // 海外資産比率を動的に計算
  const foreignRatio = useMemo(() => {
    if (totalInitial === 0) return 0;
    const foreignTotal = funds.filter(f => f.isForeign).reduce((s, f) => s + f.initialAmount, 0);
    return foreignTotal / totalInitial;
  }, [funds, totalInitial]);

  // 加重平均リターン
  const weightedReturn = useMemo(() => {
    if (totalInitial === 0) return 6;
    return funds.reduce((s, f) => s + (f.initialAmount / totalInitial) * f.rates.base, 0);
  }, [funds, totalInitial]);

  // ===== 通常シミュレーション =====
  const simulate = useCallback((sc, maxYears) => {
    const data = [];
    let balances = funds.map((f) => ({ ...f, balance: f.initialAmount }));
    const costBasis = funds.reduce((s, f) => s + f.initialAmount, 0);
    const yearlyContrib = funds.reduce((s, f) => s + f.monthlyAmount * 12, 0);

    data.push({
      year: 0, label: "現在",
      total: Math.round(balances.reduce((s, b) => s + b.balance, 0)),
      contributed: Math.round(costBasis),
      ...Object.fromEntries(balances.map((b) => [b.id, Math.round(b.balance)])),
    });

    for (let y = 1; y <= maxYears; y++) {
      for (let m = 0; m < 12; m++) {
        balances.forEach((b) => {
          const annualRate = b.rates[sc] / 100;
          const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
          b.balance = b.balance * (1 + monthlyRate) + b.monthlyAmount;
        });
      }
      data.push({
        year: y, label: `${y}年後`,
        total: Math.round(balances.reduce((s, b) => s + b.balance, 0)),
        contributed: Math.round(costBasis + yearlyContrib * y),
        ...Object.fromEntries(balances.map((b) => [b.id, Math.round(b.balance)])),
      });
    }
    return data;
  }, [funds]);

  const allData = useMemo(() => ({
    conservative: simulate("conservative", 30),
    base: simulate("base", 30),
    optimistic: simulate("optimistic", 30),
  }), [simulate]);

  const chartData = useMemo(() => {
    const result = [];
    for (let y = 0; y <= years; y++) {
      result.push({
        year: y, label: y === 0 ? "現在" : `${y}年`,
        conservative: allData.conservative[y]?.total || 0,
        base: allData.base[y]?.total || 0,
        optimistic: allData.optimistic[y]?.total || 0,
        contributed: allData.base[y]?.contributed || 0,
      });
    }
    return result;
  }, [allData, years]);

  const selectedData = allData[scenario].slice(0, years + 1);
  const finalData = selectedData[selectedData.length - 1];
  const totalGain = finalData.total - finalData.contributed;

  const milestoneYears = useMemo(() => {
    const results = {};
    MILESTONES.forEach((m) => {
      for (let y = 0; y < allData[scenario].length; y++) {
        if (allData[scenario][y].total >= m.amount) { results[m.label] = y; break; }
      }
    });
    return results;
  }, [allData, scenario]);

  const scenarioLabels = { conservative: "保守的", base: "基本", optimistic: "楽観的" };

  // ===== リスクシナリオシミュレーション =====
  const riskSimulationData = useMemo(() => {
    const data = [];
    const annualContrib = totalMonthly * 12;
    const expectedReturn = weightedReturn / 100;

    let balanceNormal = totalInitial;
    let balanceCrash = totalInitial;
    let balanceYen = totalInitial;
    let balanceSavings = totalInitial;
    let contributed = totalInitial;

    data.push({
      year: 0, label: "現在",
      normal: Math.round(balanceNormal),
      crash: Math.round(balanceCrash),
      yen: Math.round(balanceYen),
      savings: Math.round(balanceSavings),
      contributed: Math.round(contributed),
    });

    for (let y = 1; y <= 30; y++) {
      contributed += annualContrib;

      // === 順調シナリオ ===
      balanceNormal = (balanceNormal + annualContrib) * (1 + expectedReturn);

      // === 貯金のみ（0%成長） ===
      balanceSavings = balanceSavings + annualContrib;

      // === 株式暴落シナリオ ===
      if (y === crashYear) {
        balanceCrash = (balanceCrash + annualContrib) * 0.60;
      } else if (y === crashYear + 1) {
        balanceCrash = (balanceCrash + annualContrib) * 0.90;
      } else if (y > crashYear + 1 && y <= crashYear + 4) {
        balanceCrash = (balanceCrash + annualContrib) * 1.15;
      } else {
        balanceCrash = (balanceCrash + annualContrib) * (1 + expectedReturn);
      }

      // === 円高シナリオ ===
      if (y === crashYear) {
        const foreignAssets = balanceYen * foreignRatio;
        const domesticAssets = balanceYen * (1 - foreignRatio);
        balanceYen = (domesticAssets + foreignAssets * 0.70 + annualContrib) * (1 + expectedReturn * 0.5);
      } else if (y > crashYear && y <= crashYear + 3) {
        balanceYen = (balanceYen + annualContrib) * (1 + expectedReturn * 0.7);
      } else {
        balanceYen = (balanceYen + annualContrib) * (1 + expectedReturn);
      }

      data.push({
        year: y, label: `${y}年後`,
        normal: Math.round(balanceNormal),
        crash: Math.round(balanceCrash),
        yen: Math.round(balanceYen),
        savings: Math.round(balanceSavings),
        contributed: Math.round(contributed),
      });
    }

    return data;
  }, [totalInitial, totalMonthly, weightedReturn, foreignRatio, crashYear]);

  const riskCurrentData = riskSimulationData.slice(0, years + 1);
  const riskFinalData = riskCurrentData[riskCurrentData.length - 1];

  // ===== レンダリング =====
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a0a0f 0%, #12121f 40%, #0d1117 100%)",
      color: "#e0e0e0",
      fontFamily: "'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "32px 20px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 15, letterSpacing: 4, color: "#4ecdc4", fontWeight: 600, marginBottom: 12 }}>
            INVESTMENT PORTFOLIO SIMULATOR
          </div>
          <h1 style={{
            fontSize: 38, fontWeight: 900, margin: 0,
            background: "linear-gradient(135deg, #ffffff 0%, #8b8bb8 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.3,
          }}>
            資産運用シミュレーター
          </h1>
          <p style={{ color: "#7a7a90", fontSize: 17, marginTop: 12 }}>
            初期資産・毎月積立額・想定リターンを自由に設定して将来の資産を予測
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: "flex", gap: 8, marginBottom: 24,
          background: "rgba(0,0,0,0.3)", borderRadius: 16, padding: 6,
          border: "1px solid rgba(255,255,255,0.12)",
        }}>
          <button
            onClick={() => setActiveTab("simulation")}
            style={{
              flex: 1, padding: "16px 20px", borderRadius: 12,
              border: "none",
              background: activeTab === "simulation" ? "rgba(78,205,196,0.2)" : "transparent",
              color: activeTab === "simulation" ? "#4ecdc4" : "#9090a0",
              cursor: "pointer", fontSize: 17, fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            📊 資産シミュレーション
          </button>
          <button
            onClick={() => setActiveTab("risk")}
            style={{
              flex: 1, padding: "16px 20px", borderRadius: 12,
              border: "none",
              background: activeTab === "risk" ? "rgba(255,107,107,0.2)" : "transparent",
              color: activeTab === "risk" ? "#ff6b6b" : "#9090a0",
              cursor: "pointer", fontSize: 17, fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            ⚠️ リスクシナリオ比較
          </button>
        </div>

        {/* Setup Toggle - 共通 */}
        <button onClick={() => setShowSetup(!showSetup)} style={{
          width: "100%", padding: "22px 28px", borderRadius: 16,
          border: "1px solid rgba(78,205,196,0.2)",
          background: showSetup ? "rgba(78,205,196,0.1)" : "rgba(15,15,25,0.6)",
          color: "#4ecdc4", cursor: "pointer", fontSize: 19, fontWeight: 600, marginBottom: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>⚙️ 投資条件を設定</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 16, color: "#8a8aa0" }}>
              初期 {formatYen(totalInitial)} ／ 月 {formatYen(totalMonthly)}
            </span>
            <span style={{ fontSize: 24, transition: "transform 0.2s", transform: showSetup ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </div>
        </button>

        {/* Setup Panel - 共通 */}
        {showSetup && (
          <div style={{
            background: "rgba(15,15,25,0.5)", borderRadius: 20,
            padding: "28px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 1fr 1fr 60px 48px",
                gap: 14, marginBottom: 14, padding: "0 4px",
              }}>
                <span style={{ fontSize: 15, color: "#8a8aa0", fontWeight: 600 }}>銘柄・ファンド名</span>
                <span style={{ fontSize: 15, color: "#8a8aa0", fontWeight: 600, textAlign: "right" }}>現在の保有額</span>
                <span style={{ fontSize: 15, color: "#8a8aa0", fontWeight: 600, textAlign: "right" }}>毎月積立額</span>
                <span style={{ fontSize: 15, color: "#8a8aa0", fontWeight: 600, textAlign: "center" }}>海外</span>
                <span></span>
              </div>

              {funds.map((fund) => (
                <div key={fund.id} style={{
                  display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 1fr 1fr 60px 48px",
                  gap: 14, marginBottom: 12, alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 500, color: fund.color, overflow: "hidden" }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: fund.color, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fund.name}</span>
                  </div>
                  <NumberInput value={fund.initialAmount} onChange={(v) => updateFund(fund.id, "initialAmount", v)} small />
                  <NumberInput value={fund.monthlyAmount} onChange={(v) => updateFund(fund.id, "monthlyAmount", v)} small />
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      onClick={() => toggleForeign(fund.id)}
                      style={{
                        width: 38, height: 38, borderRadius: 8,
                        border: fund.isForeign ? "1px solid rgba(78,205,196,0.4)" : "1px solid rgba(255,255,255,0.2)",
                        background: fund.isForeign ? "rgba(78,205,196,0.15)" : "rgba(15,15,25,0.6)",
                        color: fund.isForeign ? "#4ecdc4" : "#7a7a90",
                        cursor: "pointer", fontSize: 17,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      title={fund.isForeign ? "海外資産" : "国内資産"}
                    >
                      {fund.isForeign ? "🌍" : "🇯🇵"}
                    </button>
                  </div>
                  <button onClick={() => removeFund(fund.id)} style={{
                    background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)",
                    borderRadius: 10, color: "#ff6b6b", cursor: "pointer", fontSize: 22,
                    padding: "8px", lineHeight: 1, width: 42, height: 42,
                  }} title="削除">×</button>
                </div>
              ))}
            </div>

            {/* Add Fund */}
            <div style={{ display: "flex", gap: 14, marginBottom: 24, alignItems: "center" }}>
              <input
                type="text" placeholder="ファンド名を入力して追加..."
                value={newFundName} onChange={(e) => setNewFundName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFund()}
                style={{
                  flex: 1, background: "rgba(30,30,45,0.5)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
                  padding: "16px 18px", color: "#fff", fontSize: 17, outline: "none",
                }}
              />
              <button onClick={addFund} style={{
                background: "rgba(78,205,196,0.15)", border: "1px solid rgba(78,205,196,0.3)",
                borderRadius: 12, color: "#4ecdc4", cursor: "pointer", fontSize: 17,
                fontWeight: 600, padding: "16px 24px", whiteSpace: "nowrap",
              }}>＋ 追加</button>
            </div>

            {/* Totals */}
            <div style={{
              display: "flex", gap: 24, padding: "22px 26px",
              background: "rgba(78,205,196,0.06)", borderRadius: 16,
              border: "1px solid rgba(78,205,196,0.15)", marginBottom: 24, flexWrap: "wrap",
            }}>
              {[
                { label: "初期資産合計", val: formatYen(totalInitial) },
                { label: "毎月積立合計", val: `${formatYen(totalMonthly)}/月` },
                { label: "年間投資額", val: `${formatYen(totalMonthly * 12)}/年` },
                { label: "海外資産比率", val: `${(foreignRatio * 100).toFixed(0)}%` },
              ].map((item) => (
                <div key={item.label} style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 14, color: "#8a8aa0", marginBottom: 6 }}>{item.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#4ecdc4", fontFamily: "'JetBrains Mono', monospace" }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Return Rates - シミュレーションタブ時のみ表示 */}
            {activeTab === "simulation" && (
              <>
                <button onClick={() => setShowRates(!showRates)} style={{
                  width: "100%", padding: "18px 22px", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,15,25,0.5)",
                  color: "#9b9bae", cursor: "pointer", fontSize: 17, fontWeight: 500,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span>📊 想定リターン（年率）を編集</span>
                  <span style={{ fontSize: 22, transform: showRates ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
                </button>

                {showRates && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{
                      display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 95px 95px 95px",
                      gap: 14, marginBottom: 14, padding: "0 4px",
                    }}>
                      <span style={{ fontSize: 15, color: "#8a8aa0" }}></span>
                      <span style={{ fontSize: 15, color: "#8a8aa0", textAlign: "center" }}>保守的</span>
                      <span style={{ fontSize: 15, color: "#8a8aa0", textAlign: "center" }}>基本</span>
                      <span style={{ fontSize: 15, color: "#8a8aa0", textAlign: "center" }}>楽観的</span>
                    </div>
                    {funds.map((fund) => (
                      <div key={fund.id} style={{
                        display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 95px 95px 95px",
                        gap: 14, marginBottom: 10, alignItems: "center",
                      }}>
                        <span style={{ fontSize: 16, color: fund.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fund.name}</span>
                        <RateInput value={fund.rates.conservative} onChange={(v) => updateRate(fund.id, "conservative", v)} />
                        <RateInput value={fund.rates.base} onChange={(v) => updateRate(fund.id, "base", v)} />
                        <RateInput value={fund.rates.optimistic} onChange={(v) => updateRate(fund.id, "optimistic", v)} />
                      </div>
                    ))}
                    <div style={{ fontSize: 14, color: "#6a7080", marginTop: 14, lineHeight: 1.7 }}>
                      ※ デフォルト値はGoldman Sachs, Vanguard, JPMorgan, BlackRock等の10年予測に基づきます。
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===================== */}
        {/* 資産シミュレーションタブ */}
        {/* ===================== */}
        {activeTab === "simulation" && (
          <>
            {/* Controls */}
            <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ fontSize: 16, color: "#8a8aa0", marginBottom: 12, fontWeight: 600 }}>シナリオ選択</div>
                <div style={{ display: "flex", gap: 10 }}>
                  {["conservative", "base", "optimistic"].map((key) => (
                    <button key={key} onClick={() => setScenario(key)} style={{
                      flex: 1, padding: "18px 16px", borderRadius: 14,
                      border: scenario === key ? "2px solid #4ecdc4" : "1px solid rgba(255,255,255,0.12)",
                      background: scenario === key ? "rgba(78,205,196,0.12)" : "rgba(15,15,25,0.6)",
                      color: scenario === key ? "#4ecdc4" : "#9b9bae",
                      cursor: "pointer", fontSize: 18, fontWeight: scenario === key ? 700 : 400,
                    }}>{scenarioLabels[key]}</button>
                  ))}
                </div>
              </div>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontSize: 16, color: "#8a8aa0", marginBottom: 12, fontWeight: 600 }}>
                  期間: <span style={{ color: "#4ecdc4", fontSize: 20 }}>{years}年</span>
                </div>
                <input type="range" min={5} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#4ecdc4", marginTop: 12, height: 10 }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#6a7080", marginTop: 6 }}>
                  <span>5年</span><span>30年</span>
                </div>
              </div>
            </div>

            {/* Result Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: `${years}年後の総資産`, value: formatYen(finalData.total), color: "#4ecdc4", bg: "rgba(78,205,196,0.08)", border: "rgba(78,205,196,0.2)" },
                { label: "運用益", value: `+${formatYen(totalGain)}`, color: "#ff6b6b", bg: "rgba(255,107,107,0.08)", border: "rgba(255,107,107,0.2)" },
                { label: "累計投資額", value: formatYen(finalData.contributed), color: "#aaa", bg: "rgba(15,15,25,0.6)", border: "rgba(255,255,255,0.1)" },
              ].map((card) => (
                <div key={card.label} style={{ background: card.bg, borderRadius: 18, padding: "24px 26px", border: `1px solid ${card.border}` }}>
                  <div style={{ fontSize: 15, color: "#8a8aa0", marginBottom: 10 }}>{card.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: card.color, fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* 3 Scenario Chart */}
            <div style={{
              background: "rgba(15,15,25,0.5)", borderRadius: 22,
              padding: "28px 20px 20px", marginBottom: 28, border: "1px solid rgba(30,30,45,0.5)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#bbb", marginBottom: 20, paddingLeft: 12 }}>3シナリオ比較</div>
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={chartData} margin={{ top: 10, right: 24, left: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOpt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffd93d" stopOpacity={0.3} /><stop offset="100%" stopColor="#ffd93d" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ecdc4" stopOpacity={0.3} /><stop offset="100%" stopColor="#4ecdc4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b8b9e" stopOpacity={0.15} /><stop offset="100%" stopColor="#8b8b9e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" tick={{ fill: "#7a7a90", fontSize: 15 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} interval={Math.max(1, Math.floor(years / 7))} />
                  <YAxis tickFormatter={formatYenShort} tick={{ fill: "#7a7a90", fontSize: 15 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} width={65} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: "rgba(15,15,20,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "18px 22px", fontSize: 16, color: "#e0e0e0" }}>
                        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>{d.label}</div>
                        <div style={{ color: "#ffd93d", marginBottom: 8 }}>楽観的: {formatYen(d.optimistic)}</div>
                        <div style={{ color: "#4ecdc4", marginBottom: 8 }}>基本: {formatYen(d.base)}</div>
                        <div style={{ color: "#8b8b9e", marginBottom: 8 }}>保守的: {formatYen(d.conservative)}</div>
                        <div style={{ color: "#7a7a90", marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12 }}>投資元本: {formatYen(d.contributed)}</div>
                      </div>
                    );
                  }} />
                  <Area type="monotone" dataKey="contributed" fill="rgba(15,15,25,0.6)" stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" strokeWidth={1} />
                  <Area type="monotone" dataKey="optimistic" fill="url(#gradOpt)" stroke="#ffd93d" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="base" fill="url(#gradBase)" stroke="#4ecdc4" strokeWidth={3} />
                  <Area type="monotone" dataKey="conservative" fill="url(#gradCon)" stroke="#8b8b9e" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
                {[{ l: "楽観的", c: "#ffd93d" }, { l: "基本", c: "#4ecdc4" }, { l: "保守的", c: "#8b8b9e" }, { l: "投資元本", c: "rgba(255,255,255,0.35)" }].map((i) => (
                  <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#9b9bae" }}>
                    <span style={{ width: 20, height: 4, background: i.c, display: "inline-block", borderRadius: 2 }} />{i.l}
                  </div>
                ))}
              </div>
            </div>

            {/* Breakdown Chart */}
            <div style={{
              background: "rgba(15,15,25,0.5)", borderRadius: 22,
              padding: "28px 20px 20px", marginBottom: 28, border: "1px solid rgba(30,30,45,0.5)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#bbb", marginBottom: 20, paddingLeft: 12 }}>
                {scenarioLabels[scenario]}シナリオ — 資産内訳推移
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={selectedData} margin={{ top: 10, right: 24, left: 12, bottom: 0 }}>
                  <defs>
                    {funds.map((f) => (
                      <linearGradient key={f.id} id={`grad_${f.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={f.color} stopOpacity={0.4} /><stop offset="100%" stopColor={f.color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" tick={{ fill: "#7a7a90", fontSize: 15 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} interval={Math.max(1, Math.floor(years / 7))} />
                  <YAxis tickFormatter={formatYenShort} tick={{ fill: "#7a7a90", fontSize: 15 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} width={65} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: "rgba(15,15,20,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "18px 22px", fontSize: 16, color: "#e0e0e0" }}>
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 18 }}>{d.label}</div>
                        {funds.map((f) => (
                          <div key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 8 }}>
                            <span style={{ color: f.color }}>{f.name}</span>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatYen(d[f.id] || 0)}</span>
                          </div>
                        ))}
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 14, paddingTop: 14, display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 600 }}>合計</span>
                          <span style={{ fontWeight: 700, color: "#4ecdc4" }}>{formatYen(d.total)}</span>
                        </div>
                      </div>
                    );
                  }} />
                  {funds.map((f) => (
                    <Area key={f.id} type="monotone" dataKey={f.id} stackId="1" fill={`url(#grad_${f.id})`} stroke={f.color} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 16, flexWrap: "wrap" }}>
                {funds.map((f) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#9b9bae" }}>
                    <span style={{ width: 14, height: 14, borderRadius: 5, background: f.color, display: "inline-block" }} />{f.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div style={{
              background: "rgba(15,15,25,0.5)", borderRadius: 22,
              padding: "28px 32px", marginBottom: 28, border: "1px solid rgba(30,30,45,0.5)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#bbb", marginBottom: 20 }}>
                🎯 マイルストーン到達予測（{scenarioLabels[scenario]}）
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
                {MILESTONES.map((m) => {
                  const y = milestoneYears[m.label];
                  const reached = y !== undefined && y <= 30;
                  return (
                    <div key={m.label} style={{
                      background: reached ? "rgba(78,205,196,0.06)" : "rgba(15,15,25,0.5)",
                      borderRadius: 16, padding: "20px 22px",
                      border: reached ? "1px solid rgba(78,205,196,0.2)" : "1px solid rgba(255,255,255,0.06)",
                      textAlign: "center", opacity: reached ? 1 : 0.35,
                    }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: reached ? "#4ecdc4" : "#6a7080", fontFamily: "'JetBrains Mono', monospace" }}>
                        {reached ? `${y}年後` : "30年+"}
                      </div>
                      <div style={{ fontSize: 16, color: "#9b9bae", marginTop: 8 }}>{m.label}達成</div>
                      {reached && <div style={{ fontSize: 14, color: "#6a7080", marginTop: 6 }}>({2026 + y}年)</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Year Table */}
            <div style={{
              background: "rgba(15,15,25,0.5)", borderRadius: 22,
              padding: "28px 24px", marginBottom: 28, border: "1px solid rgba(30,30,45,0.5)", overflowX: "auto",
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#bbb", marginBottom: 20 }}>
                📋 年次推移（{scenarioLabels[scenario]}）
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16, minWidth: 480 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    {["年", "総資産", "累計投資", "運用益", "利益率"].map((h) => (
                      <th key={h} style={{ padding: "14px 12px", textAlign: "right", color: "#8a8aa0", fontWeight: 600, fontSize: 15 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedData.filter((_, i) => {
                    if (i === 0 || i === selectedData.length - 1) return true;
                    if (years <= 10) return true;
                    if (years <= 20) return i % 2 === 0;
                    return i % 5 === 0;
                  }).map((d) => {
                    const gain = d.total - d.contributed;
                    const rate = d.contributed > 0 ? ((gain / d.contributed) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={d.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                        <td style={{ padding: "14px 12px", textAlign: "right", color: "#4ecdc4", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                          {d.year === 0 ? "現在" : `${d.year}年`}
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "right", fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatYen(d.total)}
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "right", color: "#9b9bae", fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatYen(d.contributed)}
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "right", color: gain >= 0 ? "#ff6b6b" : "#4ecdc4", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                          {gain >= 0 ? "+" : ""}{formatYen(gain)}
                        </td>
                        <td style={{ padding: "14px 12px", textAlign: "right", color: "#ffd93d", fontFamily: "'JetBrains Mono', monospace" }}>
                          {rate}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ===================== */}
        {/* リスクシナリオ比較タブ */}
        {/* ===================== */}
        {activeTab === "risk" && (
          <>
            {/* Scenario Toggles */}
            <div style={{
              background: "rgba(15,15,25,0.5)", borderRadius: 20,
              padding: "26px 28px", marginBottom: 24, border: "1px solid rgba(255,255,255,0.1)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#bbb", marginBottom: 18 }}>
                📊 表示するシナリオ
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {/* 順調シナリオ */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "14px 22px",
                  background: "rgba(78,205,196,0.1)", borderRadius: 12,
                  border: "1px solid rgba(78,205,196,0.3)",
                }}>
                  <span style={{ width: 18, height: 5, background: "#4ecdc4", borderRadius: 2 }} />
                  <span style={{ fontSize: 16, color: "#4ecdc4", fontWeight: 600 }}>📈 順調に成長</span>
                </div>

                {/* 暴落シナリオ */}
                <label style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "14px 22px",
                  background: showCrashScenario ? "rgba(255,107,107,0.1)" : "rgba(15,15,25,0.6)",
                  borderRadius: 12, cursor: "pointer",
                  border: showCrashScenario ? "1px solid rgba(255,107,107,0.3)" : "1px solid rgba(255,255,255,0.12)",
                }}>
                  <input type="checkbox" checked={showCrashScenario} onChange={(e) => setShowCrashScenario(e.target.checked)}
                    style={{ accentColor: "#ff6b6b", width: 20, height: 20 }} />
                  <span style={{ width: 18, height: 5, background: "#ff6b6b", borderRadius: 2 }} />
                  <span style={{ fontSize: 16, color: showCrashScenario ? "#ff6b6b" : "#9090a0", fontWeight: 500 }}>📉 株式暴落（-40%）</span>
                </label>

                {/* 円高シナリオ */}
                <label style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "14px 22px",
                  background: showYenScenario ? "rgba(255,217,61,0.1)" : "rgba(15,15,25,0.6)",
                  borderRadius: 12, cursor: "pointer",
                  border: showYenScenario ? "1px solid rgba(255,217,61,0.3)" : "1px solid rgba(255,255,255,0.12)",
                }}>
                  <input type="checkbox" checked={showYenScenario} onChange={(e) => setShowYenScenario(e.target.checked)}
                    style={{ accentColor: "#ffd93d", width: 20, height: 20 }} />
                  <span style={{ width: 18, height: 5, background: "#ffd93d", borderRadius: 2 }} />
                  <span style={{ fontSize: 16, color: showYenScenario ? "#ffd93d" : "#9090a0", fontWeight: 500 }}>💴 急激な円高（-30%）</span>
                </label>

                {/* 貯金のみ */}
                <label style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "14px 22px",
                  background: showSavingsOnly ? "rgba(139,139,158,0.1)" : "rgba(15,15,25,0.6)",
                  borderRadius: 12, cursor: "pointer",
                  border: showSavingsOnly ? "1px solid rgba(139,139,158,0.3)" : "1px solid rgba(255,255,255,0.12)",
                }}>
                  <input type="checkbox" checked={showSavingsOnly} onChange={(e) => setShowSavingsOnly(e.target.checked)}
                    style={{ accentColor: "#8b8b9e", width: 20, height: 20 }} />
                  <span style={{ width: 18, height: 5, background: "#8b8b9e", borderRadius: 2 }} />
                  <span style={{ fontSize: 16, color: showSavingsOnly ? "#8b8b9e" : "#9090a0", fontWeight: 500 }}>🏦 貯金のみ（0%成長）</span>
                </label>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              <div style={{
                background: "rgba(15,15,25,0.5)", borderRadius: 16,
                padding: "22px 26px", border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{ fontSize: 16, color: "#8a8aa0", marginBottom: 12, fontWeight: 600 }}>
                  投資期間: <span style={{ color: "#4ecdc4", fontSize: 22 }}>{years}年</span>
                </div>
                <input type="range" min={5} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#4ecdc4", height: 8 }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#6a7080", marginTop: 6 }}>
                  <span>5年</span><span>30年</span>
                </div>
              </div>

              <div style={{
                background: "rgba(255,107,107,0.05)", borderRadius: 16,
                padding: "22px 26px", border: "1px solid rgba(255,107,107,0.2)",
              }}>
                <div style={{ fontSize: 16, color: "#8a8aa0", marginBottom: 12, fontWeight: 600 }}>
                  ショック発生時期: <span style={{ color: "#ff6b6b", fontSize: 22 }}>{crashYear}年目</span>
                </div>
                <input type="range" min={1} max={30} value={crashYear}
                  onChange={(e) => setCrashYear(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#ff6b6b", height: 8 }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#6a7080", marginTop: 6 }}>
                  <span>1年目</span><span>30年目</span>
                </div>
              </div>
            </div>

            {/* Result Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              <div style={{
                background: "rgba(78,205,196,0.08)", borderRadius: 16, padding: "20px 22px",
                border: "1px solid rgba(78,205,196,0.2)",
              }}>
                <div style={{ fontSize: 14, color: "#8a8aa0", marginBottom: 8 }}>📈 順調</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#4ecdc4", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatYen(riskFinalData.normal)}
                </div>
                <div style={{ fontSize: 14, color: "#4ecdc4", marginTop: 6 }}>
                  +{formatYen(riskFinalData.normal - riskFinalData.contributed)}
                </div>
              </div>

              <div style={{
                background: showCrashScenario ? "rgba(255,107,107,0.08)" : "rgba(15,15,25,0.5)",
                borderRadius: 16, padding: "20px 22px",
                border: showCrashScenario ? "1px solid rgba(255,107,107,0.2)" : "1px solid rgba(255,255,255,0.1)",
                opacity: showCrashScenario ? 1 : 0.4,
              }}>
                <div style={{ fontSize: 14, color: "#8a8aa0", marginBottom: 8 }}>📉 暴落</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#ff6b6b", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatYen(riskFinalData.crash)}
                </div>
                <div style={{ fontSize: 14, color: riskFinalData.crash >= riskFinalData.contributed ? "#4ecdc4" : "#ff6b6b", marginTop: 6 }}>
                  {riskFinalData.crash >= riskFinalData.contributed ? "+" : ""}{formatYen(riskFinalData.crash - riskFinalData.contributed)}
                </div>
              </div>

              <div style={{
                background: showYenScenario ? "rgba(255,217,61,0.08)" : "rgba(15,15,25,0.5)",
                borderRadius: 16, padding: "20px 22px",
                border: showYenScenario ? "1px solid rgba(255,217,61,0.2)" : "1px solid rgba(255,255,255,0.1)",
                opacity: showYenScenario ? 1 : 0.4,
              }}>
                <div style={{ fontSize: 14, color: "#8a8aa0", marginBottom: 8 }}>💴 円高</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#ffd93d", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatYen(riskFinalData.yen)}
                </div>
                <div style={{ fontSize: 14, color: riskFinalData.yen >= riskFinalData.contributed ? "#4ecdc4" : "#ff6b6b", marginTop: 6 }}>
                  {riskFinalData.yen >= riskFinalData.contributed ? "+" : ""}{formatYen(riskFinalData.yen - riskFinalData.contributed)}
                </div>
              </div>

              <div style={{
                background: showSavingsOnly ? "rgba(139,139,158,0.08)" : "rgba(15,15,25,0.5)",
                borderRadius: 16, padding: "20px 22px",
                border: showSavingsOnly ? "1px solid rgba(139,139,158,0.2)" : "1px solid rgba(255,255,255,0.1)",
                opacity: showSavingsOnly ? 1 : 0.4,
              }}>
                <div style={{ fontSize: 14, color: "#8a8aa0", marginBottom: 8 }}>🏦 貯金のみ</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#8b8b9e", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatYen(riskFinalData.savings)}
                </div>
                <div style={{ fontSize: 14, color: "#7a7a90", marginTop: 6 }}>
                  ±0円
                </div>
              </div>
            </div>

            {/* Main Chart */}
            <div style={{
              background: "rgba(15,15,25,0.5)", borderRadius: 22,
              padding: "28px 20px 20px", marginBottom: 28, border: "1px solid rgba(30,30,45,0.5)",
            }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#bbb", marginBottom: 20, paddingLeft: 12 }}>
                📈 シナリオ別 資産推移
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={riskCurrentData} margin={{ top: 10, right: 24, left: 12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="label" tick={{ fill: "#7a7a90", fontSize: 14 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    interval={Math.max(1, Math.floor(years / 8))} />
                  <YAxis tickFormatter={formatYenShort} tick={{ fill: "#7a7a90", fontSize: 14 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} width={60} />
                  {(showCrashScenario || showYenScenario) && crashYear <= years && (
                    <ReferenceLine x={`${crashYear}年後`} stroke="#ff6b6b" strokeDasharray="4 4" strokeWidth={2}
                      label={{ value: "⚠️ ショック", position: "top", fill: "#ff6b6b", fontSize: 13 }} />
                  )}
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div style={{ background: "rgba(15,15,20,0.95)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: "18px 22px", fontSize: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 18 }}>{d.label}</div>
                        <div style={{ color: "#4ecdc4", marginBottom: 8 }}>📈 順調: {formatYen(d.normal)}</div>
                        {showCrashScenario && <div style={{ color: "#ff6b6b", marginBottom: 8 }}>📉 暴落: {formatYen(d.crash)}</div>}
                        {showYenScenario && <div style={{ color: "#ffd93d", marginBottom: 8 }}>💴 円高: {formatYen(d.yen)}</div>}
                        {showSavingsOnly && <div style={{ color: "#8b8b9e", marginBottom: 8 }}>🏦 貯金: {formatYen(d.savings)}</div>}
                        <div style={{ color: "#7a7a90", marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12 }}>
                          投資元本: {formatYen(d.contributed)}
                        </div>
                      </div>
                    );
                  }} />
                  <Line type="monotone" dataKey="contributed" stroke="rgba(255,255,255,0.3)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="normal" stroke="#4ecdc4" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#4ecdc4" }} />
                  {showCrashScenario && <Line type="monotone" dataKey="crash" stroke="#ff6b6b" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#ff6b6b" }} />}
                  {showYenScenario && <Line type="monotone" dataKey="yen" stroke="#ffd93d" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: "#ffd93d" }} />}
                  {showSavingsOnly && <Line type="monotone" dataKey="savings" stroke="#8b8b9e" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#8b8b9e" }} />}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#4ecdc4" }}>
                  <span style={{ width: 20, height: 4, background: "#4ecdc4", borderRadius: 2 }} />順調
                </div>
                {showCrashScenario && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#ff6b6b" }}>
                  <span style={{ width: 20, height: 4, background: "#ff6b6b", borderRadius: 2 }} />暴落
                </div>}
                {showYenScenario && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#ffd93d" }}>
                  <span style={{ width: 20, height: 4, background: "#ffd93d", borderRadius: 2 }} />円高
                </div>}
                {showSavingsOnly && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "#8b8b9e" }}>
                  <span style={{ width: 20, height: 4, background: "#8b8b9e", borderRadius: 2 }} />貯金のみ
                </div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: "rgba(255,255,255,0.45)" }}>
                  <span style={{ width: 20, height: 4, background: "rgba(255,255,255,0.35)", borderRadius: 2, border: "1px dashed rgba(255,255,255,0.5)" }} />投資元本
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div style={{
              background: "rgba(78,205,196,0.06)", borderRadius: 20,
              padding: "26px 28px", marginBottom: 28, border: "1px solid rgba(78,205,196,0.2)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#4ecdc4", marginBottom: 18 }}>
                💡 このシミュレーションからわかること
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {showCrashScenario && (
                  <div style={{ background: "rgba(255,107,107,0.08)", borderRadius: 12, padding: "18px 22px", border: "1px solid rgba(255,107,107,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>📉</span>
                      <span style={{ fontSize: 17, fontWeight: 600, color: "#ff6b6b" }}>株式暴落シナリオ</span>
                    </div>
                    <div style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>
                      {crashYear}年目にリーマンショック級の暴落（-40%）が発生した場合でも、
                      積立投資を継続することで<strong style={{ color: "#4ecdc4" }}>{years}年後には{formatYen(riskFinalData.crash)}</strong>まで回復。
                      {riskFinalData.crash >= riskFinalData.contributed ? (
                        <span> 投資元本{formatYen(riskFinalData.contributed)}に対して<strong style={{ color: "#4ecdc4" }}>+{formatYen(riskFinalData.crash - riskFinalData.contributed)}</strong>の利益。</span>
                      ) : (
                        <span> この期間ではまだ元本割れ。</span>
                      )}
                      {showSavingsOnly && riskFinalData.crash > riskFinalData.savings && (
                        <span> それでも<strong style={{ color: "#ffd93d" }}>貯金のみより{formatYen(riskFinalData.crash - riskFinalData.savings)}多い</strong>結果に。</span>
                      )}
                    </div>
                  </div>
                )}

                {showYenScenario && (
                  <div style={{ background: "rgba(255,217,61,0.08)", borderRadius: 12, padding: "18px 22px", border: "1px solid rgba(255,217,61,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>💴</span>
                      <span style={{ fontSize: 17, fontWeight: 600, color: "#ffd93d" }}>円高シナリオ</span>
                    </div>
                    <div style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>
                      急激な円高（ドル円150円→105円程度）が発生した場合、海外資産（ポートフォリオの約{(foreignRatio * 100).toFixed(0)}%）が
                      円換算で目減りします。{years}年後の資産は<strong style={{ color: "#ffd93d" }}>{formatYen(riskFinalData.yen)}</strong>となり、
                      順調シナリオと比べて<strong style={{ color: "#ff6b6b" }}>{formatYen(riskFinalData.normal - riskFinalData.yen)}</strong>少なくなります。
                    </div>
                  </div>
                )}

                {showSavingsOnly && (
                  <div style={{ background: "rgba(139,139,158,0.08)", borderRadius: 12, padding: "18px 22px", border: "1px solid rgba(139,139,158,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 22 }}>🏦</span>
                      <span style={{ fontSize: 17, fontWeight: 600, color: "#8b8b9e" }}>貯金のみとの比較</span>
                    </div>
                    <div style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>
                      同じ金額を貯金だけした場合は{years}年後に<strong style={{ color: "#8b8b9e" }}>{formatYen(riskFinalData.savings)}</strong>。
                      順調に成長した場合との差は<strong style={{ color: "#4ecdc4" }}>{formatYen(riskFinalData.normal - riskFinalData.savings)}</strong>。
                      {showCrashScenario && riskFinalData.crash > riskFinalData.savings && (
                        <span> <strong style={{ color: "#ffd93d" }}>暴落を経験しても、貯金より{formatYen(riskFinalData.crash - riskFinalData.savings)}多い</strong>結果になります。</span>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ background: "rgba(78,205,196,0.08)", borderRadius: 12, padding: "18px 22px", border: "1px solid rgba(78,205,196,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>🎯</span>
                    <span style={{ fontSize: 17, fontWeight: 600, color: "#4ecdc4" }}>長期投資のポイント</span>
                  </div>
                  <div style={{ fontSize: 15, color: "#ccc", lineHeight: 1.8 }}>
                    どのシナリオでも、<strong style={{ color: "#4ecdc4" }}>積立投資を継続する</strong>ことが重要です。
                    暴落時に積立を止めたり、パニック売りをすると、回復の恩恵を受けられません。
                    {years >= 15 && " 15年以上の長期投資では、歴史的にほとんどのケースでプラスリターンを達成しています。"}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div style={{
              background: "rgba(15,15,25,0.5)", borderRadius: 20,
              padding: "26px 28px", marginBottom: 28, border: "1px solid rgba(30,30,45,0.5)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#bbb", marginBottom: 18 }}>
                📋 シナリオ別 最終結果比較（{years}年後）
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                    <th style={{ padding: "14px 10px", textAlign: "left", color: "#8a8aa0", fontWeight: 600 }}>シナリオ</th>
                    <th style={{ padding: "14px 10px", textAlign: "right", color: "#8a8aa0", fontWeight: 600 }}>最終資産</th>
                    <th style={{ padding: "14px 10px", textAlign: "right", color: "#8a8aa0", fontWeight: 600 }}>運用益</th>
                    <th style={{ padding: "14px 10px", textAlign: "right", color: "#8a8aa0", fontWeight: 600 }}>貯金との差</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: "16px 10px", color: "#4ecdc4", fontWeight: 600 }}>📈 順調に成長</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#fff", fontWeight: 700 }}>{formatYen(riskFinalData.normal)}</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#4ecdc4" }}>+{formatYen(riskFinalData.normal - riskFinalData.contributed)}</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#4ecdc4" }}>+{formatYen(riskFinalData.normal - riskFinalData.savings)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: showCrashScenario ? 1 : 0.3 }}>
                    <td style={{ padding: "16px 10px", color: "#ff6b6b", fontWeight: 600 }}>📉 株式暴落</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#fff", fontWeight: 700 }}>{formatYen(riskFinalData.crash)}</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: riskFinalData.crash >= riskFinalData.contributed ? "#4ecdc4" : "#ff6b6b" }}>
                      {riskFinalData.crash >= riskFinalData.contributed ? "+" : ""}{formatYen(riskFinalData.crash - riskFinalData.contributed)}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: riskFinalData.crash >= riskFinalData.savings ? "#4ecdc4" : "#ff6b6b" }}>
                      {riskFinalData.crash >= riskFinalData.savings ? "+" : ""}{formatYen(riskFinalData.crash - riskFinalData.savings)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", opacity: showYenScenario ? 1 : 0.3 }}>
                    <td style={{ padding: "16px 10px", color: "#ffd93d", fontWeight: 600 }}>💴 円高</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#fff", fontWeight: 700 }}>{formatYen(riskFinalData.yen)}</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: riskFinalData.yen >= riskFinalData.contributed ? "#4ecdc4" : "#ff6b6b" }}>
                      {riskFinalData.yen >= riskFinalData.contributed ? "+" : ""}{formatYen(riskFinalData.yen - riskFinalData.contributed)}
                    </td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: riskFinalData.yen >= riskFinalData.savings ? "#4ecdc4" : "#ff6b6b" }}>
                      {riskFinalData.yen >= riskFinalData.savings ? "+" : ""}{formatYen(riskFinalData.yen - riskFinalData.savings)}
                    </td>
                  </tr>
                  <tr style={{ opacity: showSavingsOnly ? 1 : 0.3 }}>
                    <td style={{ padding: "16px 10px", color: "#8b8b9e", fontWeight: 600 }}>🏦 貯金のみ</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#fff", fontWeight: 700 }}>{formatYen(riskFinalData.savings)}</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#9090a0" }}>±0</td>
                    <td style={{ padding: "16px 10px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#9090a0" }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Disclaimer */}
            <div style={{
              background: "rgba(255,217,61,0.06)", borderRadius: 14,
              padding: "18px 22px", marginBottom: 20, border: "1px solid rgba(255,217,61,0.2)",
            }}>
              <div style={{ fontSize: 14, color: "#aaa", lineHeight: 1.8 }}>
                ⚠️ <strong style={{ color: "#ffd93d" }}>注意:</strong> このシミュレーションは過去の事例を参考にした仮想的なシナリオです。
                実際の市場では、これより大きな変動や、複数のショックが連続して発生する可能性もあります。
                投資判断はご自身の責任で行ってください。
              </div>
            </div>
          </>
        )}

        {/* Footer Disclaimer */}
        <div style={{ fontSize: 13, color: "#5a5a6a", textAlign: "center", padding: "14px 20px", lineHeight: 1.8 }}>
          ※ 本シミュレーションは参考値です。税金・手数料・為替変動・インフレは考慮していません。投資判断はご自身の責任でお願いします。
        </div>
      </div>
    </div>
  );
}
