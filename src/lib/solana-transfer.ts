import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
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

async function signAndSend(walletProvider: any, tx: Transaction): Promise<string> {
  const connection = new Connection(RPC_URL, "confirmed");
  tx.feePayer = walletProvider.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  if (walletProvider.signAndSendTransaction) {
    const { signature } = await walletProvider.signAndSendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return signature;
  }

  if (walletProvider.signTransaction) {
    const signed = await walletProvider.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return signature;
  }

  throw new Error("Wallet does not support transaction signing");
}

/**
 * Send SOL to treasury wallet. Returns tx signature.
 */
export async function sendSolToTreasury(
  walletProvider: any,
  amountSol: number,
): Promise<string> {
  if (!walletProvider?.publicKey) throw new Error("Wallet not connected");

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: walletProvider.publicKey,
      toPubkey: TREASURY,
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    }),
  );

  return signAndSend(walletProvider, tx);
}

/**
 * Send $MEEET SPL tokens to treasury. Returns tx signature.
 */
export async function sendMeeetToTreasury(
  walletProvider: any,
  amountRaw: number,
): Promise<string> {
  if (!walletProvider?.publicKey) throw new Error("Wallet not connected");

  const connection = new Connection(RPC_URL, "confirmed");
  const sender = walletProvider.publicKey;

  const senderAta = await getAssociatedTokenAddress(MEEET_MINT, sender);
  const treasuryAta = await getAssociatedTokenAddress(MEEET_MINT, TREASURY);

  const tx = new Transaction();

  try {
    await getAccount(connection, treasuryAta);
  } catch {
    tx.add(createAssociatedTokenAccountInstruction(sender, treasuryAta, TREASURY, MEEET_MINT));
  }

  tx.add(createTransferInstruction(senderAta, treasuryAta, sender, amountRaw));

  return signAndSend(walletProvider, tx);
}
