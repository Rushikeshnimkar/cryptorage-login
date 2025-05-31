import { Providers } from "./provider";
import WalletConnectInner from "./components/WalletConnectInner";

export default function Home() {
  return (
    <Providers>
      <WalletConnectInner />
    </Providers>
  );
}
