import { useEffect, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import "./App.css";
import Router from "./Router";
import ConnectionStatus from "./components/ConnectionStatus";
import Header from "./components/Header";
import { CustomPreview } from "./components/Piece";
import { socket } from "./socket";

function App() {
  const [connected, setConnected] = useState(false);

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
    <DndProvider backend={HTML5Backend}>
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
    </DndProvider>
  );
}

export default App;
