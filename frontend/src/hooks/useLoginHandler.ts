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
      toast.info("Vui lòng kết nối ví để tiếp tục");
      return;
    }

    if (loading) {
      toast.info("Đang đồng bộ profile on-chain, thử lại sau 1-2 giây");
      return;
    }

    if (hasProfile && profile) {
      toast.success("Chào mừng trở lại");
      navigate("/dashboard", { replace: true });
      return;
    }

    toast.loading("Đang kiểm tra profile cũ...", { id: "createProfile" });
    await refreshProfile();

    await createProfile(
      () => {
        toast.success("Đăng nhập thành công", { id: "createProfile" });
        navigate("/dashboard", { replace: true });
      },
      () => {
        navigate("/dashboard", { replace: true });
      },
    );
  };

  return { handleLogin };
}
