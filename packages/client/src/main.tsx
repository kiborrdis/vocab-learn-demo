import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./theme.css";
import {
  RouterProvider,
  createRoutesFromElements,
  Route,
  createBrowserRouter,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LayoutRoute from "./routes/_layout";
import IndexRoute from "./routes/index";
import TrainingRoute from "./routes/training";
import AuthCallback from "./routes/auth-callback";
import AuthRoute from "./routes/auth";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/auth/telegram/:token" element={<AuthCallback />} />
      <Route path="/" element={<LayoutRoute />}>
        <Route index element={<IndexRoute />} />
        <Route path="training" element={<TrainingRoute />} />
      </Route>
    </>
  )
);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
