import { Route, Routes } from "react-router-dom";
import SiteHeader from "./components/SiteHeader.jsx";
import MobileNav from "./components/MobileNav.jsx";
import BloomIntro from "./components/BloomIntro.jsx";
import PetalTrail from "./components/PetalTrail.jsx";
import ScrollReveal from "./components/ScrollReveal.jsx";
import GardenStickers from "./components/GardenStickers.jsx";
import Home from "./pages/Home.jsx";
import Workshops from "./pages/Workshops.jsx";
import WorkshopDetail from "./pages/WorkshopDetail.jsx";
import Booking from "./pages/Booking.jsx";
import About from "./pages/About.jsx";
import FAQ from "./pages/FAQ.jsx";
import PrivateEvents from "./pages/PrivateEvents.jsx";
import Cart from "./pages/Cart.jsx";
import Account from "./pages/Account.jsx";
import Membership from "./pages/Membership.jsx";
import Shop from "./pages/Shop.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <div className="app">
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workshops" element={<Workshops />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/workshops/:slug" element={<WorkshopDetail />} />
        <Route path="/book/:slug" element={<Booking />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/private-events" element={<PrivateEvents />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/account" element={<Account />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <MobileNav />
    </div>
  );
}
