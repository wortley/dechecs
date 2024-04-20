import { polygon, polygonAmoy } from "wagmi/chains";

export const DraggableTypes = {
  PIECE: "piece",
};
export const WC_PROJECT_ID = import.meta.env.VITE_WC_PROJECT_ID;
export const chainId = import.meta.env.PROD ? polygon.id : polygonAmoy.id;
export const SC_ADDRESS = import.meta.env.VITE_SC_ADDRESS;
