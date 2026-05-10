import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { LanguagePage } from "./pages/LanguagePage";
import { MyPostsPage } from "./pages/MyPostsPage";
import { EditRidePage, PostRidePage } from "./pages/PostRidePage";
import { RideDetailPage } from "./pages/RideDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/my-posts" element={<MyPostsPage />} />
          <Route path="/language" element={<LanguagePage />} />
          <Route path="/post/:mode" element={<PostRidePage />} />
          <Route path="/edit/:id" element={<EditRidePage />} />
          <Route path="/ride/:id" element={<RideDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
