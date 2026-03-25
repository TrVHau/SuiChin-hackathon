import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import RefreshButton from "@/components/common/RefreshButton";
import {
  TradeModeSelector,
  TradeInfoCard,
  TradeResultCard,
  TradeProcessingCard,
  TradeSelectionPanel,
} from "@/components/tradeup";
import { TRADE_CONFIG, useTradeUpFlow } from "@/hooks/useTradeUpFlow";

export default function TradeUpScreen() {
  const navigate = useNavigate();
  const handleBack = () => navigate("/dashboard");
  const {
    loading,
    refetch,
    mode,
    selected,
    trading,
    result,
    config,
    eligible,
    canTrade,
    handleModeChange,
    toggleSelect,
    handleTradeUp,
    clearSelection,
    clearResult,
    resultConfig,
  } = useTradeUpFlow();

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <PageHeader
          onBack={handleBack}
          title="Trade-up"
          emoji="⬆️"
          backBorderClass="border-playful-orange"
          backIconClass="text-playful-orange"
          rightSlot={
            <RefreshButton
              onClick={() => {
                refetch();
                clearSelection();
              }}
              loading={loading}
            />
          }
        />

        <TradeModeSelector
          mode={mode}
          configMap={TRADE_CONFIG}
          onChange={handleModeChange}
        />

        <TradeInfoCard
          inputEmoji={config.inputEmoji}
          outputEmoji={config.outputEmoji}
          inputRequired={config.inputRequired}
          successChance={config.successChance}
        />

        {/* Result card */}
        <AnimatePresence>
          {result && (
            <TradeResultCard
              result={result}
              cfg={resultConfig!}
              onReset={clearResult}
            />
          )}
        </AnimatePresence>

        {trading ? (
          <TradeProcessingCard selectedCount={selected.length} />
        ) : (
          <TradeSelectionPanel
            loading={loading}
            eligible={eligible}
            selected={selected}
            inputRequired={config.inputRequired}
            title={config.title}
            inputEmoji={config.inputEmoji}
            borderColor={config.borderColor}
            canTrade={canTrade}
            onToggleSelect={toggleSelect}
            onTradeUp={handleTradeUp}
          />
        )}
      </div>
    </div>
  );
}
