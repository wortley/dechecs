import styles from "./connectionStatus.module.css";

type ConnectionStatusProps = {
  connected: boolean;
};

export default function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div>
      <h6>
        <span
          className={`${styles.statusCircle} ${connected && styles.connected}`}
        />
        {connected ? "Connected to server" : "Disconnected from server"}
      </h6>
    </div>
  );
}
