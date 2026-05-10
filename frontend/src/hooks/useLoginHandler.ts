import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useGame } from "@/providers/GameContext";

export function useLoginHandler() {
  const navigate = useNavigate();
  const {
    account,
    profile,
    loading,
    hasProfile,
    createProfile,
    refreshProfile,
  } = useGame();

  const handleLogin = async () => {
    if (!account) {
      toast.info("Vui long ket noi vi de tiep tuc");
      return;
    }

    if (loading) {
      toast.info("Dang dong bo profile on-chain, thu lai sau 1-2 giay");
      return;
    }

    if (hasProfile && profile) {
      toast.success("Chao mung tro lai");
      navigate("/dashboard", { replace: true });
      return;
    }

    toast.loading("Dang kiem tra profile cu...", { id: "createProfile" });
    const syncedProfile = await refreshProfile();

    if (syncedProfile) {
      toast.success("Chao mung tro lai", { id: "createProfile" });
      navigate("/dashboard", { replace: true });
      return;
    }

    await createProfile(
      () => {
        toast.success("Dang nhap thanh cong", { id: "createProfile" });
        navigate("/dashboard", { replace: true });
      },
      () => {
        toast.error("Khong the tao profile on-chain luc nay", {
          id: "createProfile",
        });
        navigate("/dashboard", { replace: true });
      },
    );
  };

  return { handleLogin };
}
