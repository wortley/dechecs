import { createWeb3Modal } from "@web3modal/wagmi/react";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import "./App.css";
import Router from "./Router";
import ConnectionStatus from "./components/ConnectionStatus";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { CustomPreview } from "./components/Piece";
import { socket } from "./socket";

// METAMASK SDK TIPS AND TRICKS: https://medium.com/hackernoon/tips-and-tricks-for-adding-metamask-to-your-ui-32728b437194
// TUTORIAL: https://www.youtube.com/watch?v=Y-njlhGmNMU&ab_channel=ETHGlobal
// IMPERSONATE OTHER WALLETS: https://ethereum.stackexchange.com/questions/122695/fake-an-address-from-my-browser-metamask

const metadata = {
  name: "unichess",
  description: "unichess is a decentralized chess platform on Ethereum.",
  url: "https://unichess.netlify.app",
  icons: [],
};

const chains = [mainnet, sepolia] as const;

const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID;

if (!WC_PROJECT_ID) {
  throw new Error("WC_PROJECT_ID not set");
}

const config = defaultWagmiConfig({
  chains,
  projectId: WC_PROJECT_ID ?? "",
  metadata,
});

createWeb3Modal({
  wagmiConfig: config,
  projectId: WC_PROJECT_ID ?? "",
  enableAnalytics: true,
});

function App() {
  const [connected, setConnected] = useState(false);
  const dndBackend = window.innerWidth <= 768 ? TouchBackend : HTML5Backend;

  useEffect(() => {
    function onConnect() {
      setConnected(true);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onError(message: string) {
      toast.error(message);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("error", onError);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("error", onError);
      socket.disconnect();
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <DndProvider backend={dndBackend} options={{ enableMouseEvents: true }}>
        <CustomPreview />
        <ToastContainer
          autoClose={2500}
          hideProgressBar
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable={false}
          pauseOnHover
          theme="colored"
        />
        <Header />
        <ConnectionStatus connected={connected} />
        <Router />
        <Footer />
      </DndProvider>
    </WagmiProvider>
  );
}

export default App;
