import { useRoutes } from "react-router-dom";
import { Toaster } from "sonner";
import { routes } from "@/config/routes";

export default function App() {
  const element = useRoutes(routes);

  return (
    <>
      <Toaster position="top-center" richColors />
      {element}
    </>
  );
}
