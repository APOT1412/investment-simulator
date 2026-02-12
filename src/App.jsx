import { useState, useMemo, useCallback } from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const PRESET_FUNDS = [
  { id: "allworld", name: "全世界株式", defaultRate: { conservative: 5, base: 7, optimistic: 9 }, color: "#4ecdc4" },
  { id: "sp500", name: "S&P 500", defaultRate: { conservative: 3, base: 5, optimistic: 7 }, color: "#6c5ce7" },
  { id: "nasdaq", name: "NASDAQ 100", defaultRate: { conservative: 2, base: 4, optimistic: 7 }, color: "#a29bfe" },
  { id: "india", name: "インド株", defaultRate: { conservative: 7, base: 9, optimistic: 11 }, color: "#fd79a8" },
  { id: "fang", name: "FANG+", defaultRate: { conservative: 1, base: 3.5, optimistic: 6 }, color: "#fdcb6e" },
  { id: "japan", name: "日本個別株", defaultRate: { conservative: 4, base: 6, optimistic: 8 }, color: "#ff6b6b" },
  { id: "us", name: "米国個別株", defaultRate: { conservative: 4, base: 7, optimistic: 10 }, color: "#e056fd" },
  { id: "espp", name: "持株会・定期預金", defaultRate: { conservative: 0, base: 0, optimistic: 0 }, color: "#ffd93d" },
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
      background: "rgba(255,255,255,0.05)",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.08)",
      padding: small ? "8px 12px" : "10px 14px",
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
          fontSize: small ? 16 : 18, fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, width: "100%", outline: "none", textAlign: "right",
        }}
      />
      <span style={{ fontSize: small ? 14 : 15, color: "#6b6b80", whiteSpace: "nowrap" }}>{suffix}</span>
    </div>
  );
}

function RateInput({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState("");

  return (
    <div style={{
      display: "flex", alignItems: "center",
      background: "rgba(255,255,255,0.05)", borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.08)", padding: "6px 10px", gap: 4, width: 80,
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
          fontSize: 16, fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600, width: "100%", outline: "none", textAlign: "right",
        }}
      />
      <span style={{ fontSize: 14, color: "#6b6b80" }}>%</span>
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
      initialAmount: 0, monthlyAmount: 0,
      rates: { conservative: 3, base: 5, optimistic: 7 },
      defaultRate: { conservative: 3, base: 5, optimistic: 7 },
    }]);
    setNewFundName("");
  }, [newFundName]);

  const removeFund = useCallback((id) => {
    setFunds((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const totalInitial = funds.reduce((s, f) => s + f.initialAmount, 0);
  const totalMonthly = funds.reduce((s, f) => s + f.monthlyAmount, 0);

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
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <div style={{ fontSize: 14, letterSpacing: 4, color: "#4ecdc4", fontWeight: 600, marginBottom: 10 }}>
            INVESTMENT PORTFOLIO SIMULATOR
          </div>
          <h1 style={{
            fontSize: 36, fontWeight: 900, margin: 0,
            background: "linear-gradient(135deg, #ffffff 0%, #8b8bb8 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1.3,
          }}>
            資産運用シミュレーター
          </h1>
          <p style={{ color: "#666", fontSize: 16, marginTop: 10 }}>
            初期資産・毎月積立額・想定リターンを自由に設定して将来の資産を予測
          </p>
        </div>

        {/* Setup Toggle */}
        <button onClick={() => setShowSetup(!showSetup)} style={{
          width: "100%", padding: "20px 28px", borderRadius: 16,
          border: "1px solid rgba(78,205,196,0.2)",
          background: showSetup ? "rgba(78,205,196,0.1)" : "rgba(255,255,255,0.03)",
          color: "#4ecdc4", cursor: "pointer", fontSize: 18, fontWeight: 600, marginBottom: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>⚙️ 投資条件を設定</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 15, color: "#6b6b80" }}>
              初期 {formatYen(totalInitial)} ／ 月 {formatYen(totalMonthly)}
            </span>
            <span style={{ fontSize: 24, transition: "transform 0.2s", transform: showSetup ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
          </div>
        </button>

        {/* Setup Panel */}
        {showSetup && (
          <div style={{
            background: "rgba(255,255,255,0.02)", borderRadius: 20,
            padding: "28px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 1fr 1fr 48px",
                gap: 14, marginBottom: 14, padding: "0 4px",
              }}>
                <span style={{ fontSize: 14, color: "#6b6b80", fontWeight: 600 }}>銘柄・ファンド名</span>
                <span style={{ fontSize: 14, color: "#6b6b80", fontWeight: 600, textAlign: "right" }}>現在の保有額</span>
                <span style={{ fontSize: 14, color: "#6b6b80", fontWeight: 600, textAlign: "right" }}>毎月積立額</span>
                <span></span>
              </div>

              {funds.map((fund) => (
                <div key={fund.id} style={{
                  display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 1fr 1fr 48px",
                  gap: 14, marginBottom: 12, alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 500, color: fund.color, overflow: "hidden" }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: fund.color, flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fund.name}</span>
                  </div>
                  <NumberInput value={fund.initialAmount} onChange={(v) => updateFund(fund.id, "initialAmount", v)} small />
                  <NumberInput value={fund.monthlyAmount} onChange={(v) => updateFund(fund.id, "monthlyAmount", v)} small />
                  <button onClick={() => removeFund(fund.id)} style={{
                    background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)",
                    borderRadius: 10, color: "#ff6b6b", cursor: "pointer", fontSize: 20,
                    padding: "8px", lineHeight: 1, width: 40, height: 40,
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
                  flex: 1, background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
                  padding: "14px 18px", color: "#fff", fontSize: 16, outline: "none",
                }}
              />
              <button onClick={addFund} style={{
                background: "rgba(78,205,196,0.15)", border: "1px solid rgba(78,205,196,0.3)",
                borderRadius: 12, color: "#4ecdc4", cursor: "pointer", fontSize: 16,
                fontWeight: 600, padding: "14px 24px", whiteSpace: "nowrap",
              }}>＋ 追加</button>
            </div>

            {/* Totals */}
            <div style={{
              display: "flex", gap: 24, padding: "20px 24px",
              background: "rgba(78,205,196,0.06)", borderRadius: 16,
              border: "1px solid rgba(78,205,196,0.12)", marginBottom: 24, flexWrap: "wrap",
            }}>
              {[
                { label: "初期資産合計", val: formatYen(totalInitial) },
                { label: "毎月積立合計", val: `${formatYen(totalMonthly)}/月` },
                { label: "年間投資額", val: `${formatYen(totalMonthly * 12)}/年` },
              ].map((item) => (
                <div key={item.label} style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 14, color: "#6b6b80", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: "#4ecdc4", fontFamily: "'JetBrains Mono', monospace" }}>{item.val}</div>
                </div>
              ))}
            </div>

            {/* Return Rates */}
            <button onClick={() => setShowRates(!showRates)} style={{
              width: "100%", padding: "16px 20px", borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)",
              color: "#8b8b9e", cursor: "pointer", fontSize: 16, fontWeight: 500,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>📊 想定リターン（年率）を編集</span>
              <span style={{ fontSize: 20, transform: showRates ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            </button>

            {showRates && (
              <div style={{ marginTop: 20 }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 90px 90px 90px",
                  gap: 14, marginBottom: 14, padding: "0 4px",
                }}>
                  <span style={{ fontSize: 14, color: "#6b6b80" }}></span>
                  <span style={{ fontSize: 14, color: "#6b6b80", textAlign: "center" }}>保守的</span>
                  <span style={{ fontSize: 14, color: "#6b6b80", textAlign: "center" }}>基本</span>
                  <span style={{ fontSize: 14, color: "#6b6b80", textAlign: "center" }}>楽観的</span>
                </div>
                {funds.map((fund) => (
                  <div key={fund.id} style={{
                    display: "grid", gridTemplateColumns: "minmax(120px, 1.2fr) 90px 90px 90px",
                    gap: 14, marginBottom: 10, alignItems: "center",
                  }}>
                    <span style={{ fontSize: 15, color: fund.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fund.name}</span>
                    <RateInput value={fund.rates.conservative} onChange={(v) => updateRate(fund.id, "conservative", v)} />
                    <RateInput value={fund.rates.base} onChange={(v) => updateRate(fund.id, "base", v)} />
                    <RateInput value={fund.rates.optimistic} onChange={(v) => updateRate(fund.id, "optimistic", v)} />
                  </div>
                ))}
                <div style={{ fontSize: 13, color: "#555", marginTop: 14, lineHeight: 1.7 }}>
                  ※ デフォルト値はGoldman Sachs, Vanguard, JPMorgan, BlackRock等の10年予測に基づきます。自由に変更可能です。
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ fontSize: 15, color: "#6b6b80", marginBottom: 12, fontWeight: 600 }}>シナリオ選択</div>
            <div style={{ display: "flex", gap: 10 }}>
              {["conservative", "base", "optimistic"].map((key) => (
                <button key={key} onClick={() => setScenario(key)} style={{
                  flex: 1, padding: "16px 14px", borderRadius: 14,
                  border: scenario === key ? "2px solid #4ecdc4" : "1px solid rgba(255,255,255,0.08)",
                  background: scenario === key ? "rgba(78,205,196,0.12)" : "rgba(255,255,255,0.03)",
                  color: scenario === key ? "#4ecdc4" : "#8b8b9e",
                  cursor: "pointer", fontSize: 17, fontWeight: scenario === key ? 700 : 400,
                }}>{scenarioLabels[key]}</button>
              ))}
            </div>
          </div>
          <div style={{ minWidth: 220 }}>
            <div style={{ fontSize: 15, color: "#6b6b80", marginBottom: 12, fontWeight: 600 }}>
              期間: <span style={{ color: "#4ecdc4", fontSize: 18 }}>{years}年</span>
            </div>
            <input type="range" min={5} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#4ecdc4", marginTop: 12, height: 10 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#555", marginTop: 6 }}>
              <span>5年</span><span>30年</span>
            </div>
          </div>
        </div>

        {/* Result Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: `${years}年後の総資産`, value: formatYen(finalData.total), color: "#4ecdc4", bg: "rgba(78,205,196,0.08)", border: "rgba(78,205,196,0.15)" },
            { label: "運用益", value: `+${formatYen(totalGain)}`, color: "#ff6b6b", bg: "rgba(255,107,107,0.08)", border: "rgba(255,107,107,0.15)" },
            { label: "累計投資額", value: formatYen(finalData.contributed), color: "#aaa", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.06)" },
          ].map((card) => (
            <div key={card.label} style={{ background: card.bg, borderRadius: 18, padding: "22px 24px", border: `1px solid ${card.border}` }}>
              <div style={{ fontSize: 14, color: "#6b6b80", marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: card.color, fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* 3 Scenario Chart */}
        <div style={{
          background: "rgba(255,255,255,0.02)", borderRadius: 22,
          padding: "28px 20px 20px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#aaa", marginBottom: 20, paddingLeft: 12 }}>3シナリオ比較</div>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 14 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} interval={Math.max(1, Math.floor(years / 7))} />
              <YAxis tickFormatter={formatYenShort} tick={{ fill: "#666", fontSize: 14 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} width={65} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: "rgba(15,15,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "16px 20px", fontSize: 15, color: "#e0e0e0" }}>
                    <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 17 }}>{d.label}</div>
                    <div style={{ color: "#ffd93d", marginBottom: 6 }}>楽観的: {formatYen(d.optimistic)}</div>
                    <div style={{ color: "#4ecdc4", marginBottom: 6 }}>基本: {formatYen(d.base)}</div>
                    <div style={{ color: "#8b8b9e", marginBottom: 6 }}>保守的: {formatYen(d.conservative)}</div>
                    <div style={{ color: "#666", marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>投資元本: {formatYen(d.contributed)}</div>
                  </div>
                );
              }} />
              <Area type="monotone" dataKey="contributed" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" strokeWidth={1} />
              <Area type="monotone" dataKey="optimistic" fill="url(#gradOpt)" stroke="#ffd93d" strokeWidth={2.5} />
              <Area type="monotone" dataKey="base" fill="url(#gradBase)" stroke="#4ecdc4" strokeWidth={3} />
              <Area type="monotone" dataKey="conservative" fill="url(#gradCon)" stroke="#8b8b9e" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16, flexWrap: "wrap" }}>
            {[{ l: "楽観的", c: "#ffd93d" }, { l: "基本", c: "#4ecdc4" }, { l: "保守的", c: "#8b8b9e" }, { l: "投資元本", c: "rgba(255,255,255,0.3)" }].map((i) => (
              <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#8b8b9e" }}>
                <span style={{ width: 20, height: 4, background: i.c, display: "inline-block", borderRadius: 2 }} />{i.l}
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown Chart */}
        <div style={{
          background: "rgba(255,255,255,0.02)", borderRadius: 22,
          padding: "28px 20px 20px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#aaa", marginBottom: 20, paddingLeft: 12 }}>
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 14 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} interval={Math.max(1, Math.floor(years / 7))} />
              <YAxis tickFormatter={formatYenShort} tick={{ fill: "#666", fontSize: 14 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} width={65} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ background: "rgba(15,15,20,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "16px 20px", fontSize: 15, color: "#e0e0e0" }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 17 }}>{d.label}</div>
                    {funds.map((f) => (
                      <div key={f.id} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 6 }}>
                        <span style={{ color: f.color }}>{f.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatYen(d[f.id] || 0)}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
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
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#8b8b9e" }}>
                <span style={{ width: 14, height: 14, borderRadius: 5, background: f.color, display: "inline-block" }} />{f.name}
              </div>
            ))}
          </div>
        </div>

        {/* Milestones */}
        <div style={{
          background: "rgba(255,255,255,0.02)", borderRadius: 22,
          padding: "28px 32px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#aaa", marginBottom: 20 }}>
            🎯 マイルストーン到達予測（{scenarioLabels[scenario]}）
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
            {MILESTONES.map((m) => {
              const y = milestoneYears[m.label];
              const reached = y !== undefined && y <= 30;
              return (
                <div key={m.label} style={{
                  background: reached ? "rgba(78,205,196,0.06)" : "rgba(255,255,255,0.02)",
                  borderRadius: 16, padding: "18px 20px",
                  border: reached ? "1px solid rgba(78,205,196,0.15)" : "1px solid rgba(255,255,255,0.04)",
                  textAlign: "center", opacity: reached ? 1 : 0.35,
                }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: reached ? "#4ecdc4" : "#555", fontFamily: "'JetBrains Mono', monospace" }}>
                    {reached ? `${y}年後` : "30年+"}
                  </div>
                  <div style={{ fontSize: 15, color: "#8b8b9e", marginTop: 6 }}>{m.label}達成</div>
                  {reached && <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>({2026 + y}年)</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Year Table */}
        <div style={{
          background: "rgba(255,255,255,0.02)", borderRadius: 22,
          padding: "28px 24px", marginBottom: 28, border: "1px solid rgba(255,255,255,0.05)", overflowX: "auto",
        }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#aaa", marginBottom: 20 }}>
            📋 年次推移（{scenarioLabels[scenario]}）
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15, minWidth: 480 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["年", "総資産", "累計投資", "運用益", "利益率"].map((h) => (
                  <th key={h} style={{ padding: "12px 10px", textAlign: "right", color: "#6b6b80", fontWeight: 600, fontSize: 14 }}>{h}</th>
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
                  <tr key={d.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "12px 10px", textAlign: "right", color: "#4ecdc4", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      {d.year === 0 ? "現在" : `${d.year}年`}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatYen(d.total)}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right", color: "#8b8b9e", fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatYen(d.contributed)}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right", color: gain >= 0 ? "#ff6b6b" : "#4ecdc4", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                      {gain >= 0 ? "+" : ""}{formatYen(gain)}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right", color: "#ffd93d", fontFamily: "'JetBrains Mono', monospace" }}>
                      {rate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize: 13, color: "#4a4a5a", textAlign: "center", padding: "16px 24px", lineHeight: 1.8 }}>
          ※ 本シミュレーションは参考値です。税金・手数料・為替変動・インフレは考慮していません。投資判断はご自身の責任でお願いします。
        </div>
      </div>
    </div>
  );
}
