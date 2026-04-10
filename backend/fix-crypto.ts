import { bcs } from '@mysten/sui/bcs';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/bcs';

async function test() {
  const kp = новым Ed25519Keypair();
  const res = await kp.signPersonalMessage(new Uint8Array([1,2,3]));
  console.log(res);
}
