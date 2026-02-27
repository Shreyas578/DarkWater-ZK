import { StrKey, Keypair } from '@stellar/stellar-sdk';
import { derivePath } from 'ed25519-hd-key';
import * as bip39 from 'bip39';

const mnemonic = process.argv[2];
if (!mnemonic) {
    console.error('Please provide mnemonic');
    process.exit(1);
}

async function derive() {
    try {
        const seed = await bip39.mnemonicToSeed(mnemonic);
        // BIP44 path for Stellar is m/44'/148'/0'
        const result = derivePath("m/44'/148'/0'", seed.toString('hex'));
        const keypair = Keypair.fromRawEd25519Seed(result.key);
        console.log(keypair.secret());
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

derive();
