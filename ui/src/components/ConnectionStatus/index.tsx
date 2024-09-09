import styles from "./connectionStatus.module.css"

type ConnectionStatusProps = {
  connected: boolean
}

export default function ConnectionStatus({ connected }: Readonly<ConnectionStatusProps>) {
  return (
    <div>
      <h6 className={styles.statusText}>
        <span className={`${styles.statusCircle} ${connected && styles.connected}`} />
        {connected ? "Connected to server" : "Disconnected from server"}
      </h6>
    </div>
  )
}
