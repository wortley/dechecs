import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import "react-toastify/dist/ReactToastify.min.css";
import { mainnet, sepolia } from "wagmi/chains";
import "./App.css";
import { WC_PROJECT_ID } from "./constants";

const metadata = {
  name: "unichess",
  description: "unichess is a decentralized chess platform on Ethereum.",
  url: "https://unichess.netlify.app",
  icons: [],
};

const chains = [mainnet, sepolia] as const;

export const config = defaultWagmiConfig({
  chains,
  projectId: WC_PROJECT_ID,
  metadata,
});
