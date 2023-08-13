import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Play from "./pages/Play";
import Redirect from "./pages/Redirect";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
        <Route path="/r" element={<Redirect />} />
      </Routes>
    </BrowserRouter>
  );
}
