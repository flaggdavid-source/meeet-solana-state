import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const MEEET_MINT = new PublicKey("EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump");
const TREASURY = new PublicKey("4zkqErmzJhFQ7ahgTKfqTHutPk5GczMMXyAaEgbEpN1e");

/**
 * Build, sign via wallet, and send a $MEEET SPL token transfer to treasury.
 * Returns the transaction signature automatically — no manual input needed.
 */
export async function sendMeeetToTreasury(
  walletProvider: any,
  amountRaw: number, // raw token amount (no decimals applied — pass the integer price)
): Promise<string> {
  if (!walletProvider?.publicKey) throw new Error("Wallet not connected");

  const connection = new Connection(RPC_URL, "confirmed");
  const sender = walletProvider.publicKey;

  // Derive ATAs
  const senderAta = await getAssociatedTokenAddress(MEEET_MINT, sender);
  const treasuryAta = await getAssociatedTokenAddress(MEEET_MINT, TREASURY);

  const tx = new Transaction();

  // Ensure treasury ATA exists (idempotent — skipped if already created)
  try {
    await getAccount(connection, treasuryAta);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(sender, treasuryAta, TREASURY, MEEET_MINT),
    );
  }

  // Transfer instruction
  tx.add(
    createTransferInstruction(senderAta, treasuryAta, sender, amountRaw),
  );

  tx.feePayer = sender;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  // Sign + send via wallet provider
  if (walletProvider.signAndSendTransaction) {
    const { signature } = await walletProvider.signAndSendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Wait for confirmation
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    return signature;
  }

  // Fallback: sign only, then send manually
  if (walletProvider.signTransaction) {
    const signed = await walletProvider.signTransaction(tx);
    const rawTx = signed.serialize();
    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed",
    );

    return signature;
  }

  throw new Error("Wallet does not support transaction signing");
}
