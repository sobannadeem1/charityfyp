import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { NotificationProvider } from "./context/NotificationContext.jsx";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <NotificationProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </NotificationProvider>
    <Toaster position="top-center" richColors closeButton />
  </StrictMode>
);
