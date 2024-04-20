import { BrowserRouter, Route, Routes } from "react-router-dom"
import Create from "./pages/Create"
import Home from "./pages/Home"
import Join from "./pages/Join"
import Play from "./pages/Play"
import Redirect from "./pages/Redirect"

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Join />} />
        <Route path="/create" element={<Create />} />
        <Route path="/play" element={<Play />} />
        <Route path="/r" element={<Redirect />} />
      </Routes>
    </BrowserRouter>
  )
}
