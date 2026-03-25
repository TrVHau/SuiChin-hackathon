import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import { MintResultCard, MintCraftingCard, MintCraftForm } from "@/components/mint";
import { useMintCraftFlow } from "@/hooks/useMintCraftFlow";

export default function WorkshopScreen() {
  const navigate = useNavigate();

  const handleBack = () => navigate("/dashboard");
  const {
    crafting,
    craftResult,
    craftCost,
    displayChunRaw,
    canCraft,
    treasuryConfigured,
    cfg,
    handleCraft,
    handleReset,
  } = useMintCraftFlow();

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <PageHeader
          onBack={handleBack}
          title="Workshop"
          emoji="⚒️"
          backBorderClass="border-playful-purple"
          backIconClass="text-playful-purple"
        />

        <AnimatePresence mode="wait">
          {craftResult && cfg ? (
            <MintResultCard
              craftResult={craftResult}
              cfg={cfg}
              onReset={handleReset}
              onBack={handleBack}
            />
          ) : crafting ? (
            <MintCraftingCard />
          ) : (
            <MintCraftForm
              craftCost={craftCost}
              displayChunRaw={displayChunRaw}
              canCraft={canCraft}
              crafting={crafting}
              treasuryConfigured={treasuryConfigured}
              onCraft={handleCraft}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
