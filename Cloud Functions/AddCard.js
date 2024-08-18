const functions = require('@google-cloud/functions-framework');
const crypto = require("crypto");
const Firestore = require("@google-cloud/firestore");
const {
  Hbar,
  Client,
  AccountCreateTransaction,
  PrivateKey
} = require("@hashgraph/sdk");

// Secrets
const myAccountId=""
const myPrivateKey=""

// Server Secret

const privateKey = ``;

const db = new Firestore({
  projectId: "",
  keyFilename: "credential.json",
});

const Accounts = db.collection("CardAccounts");

functions.http('helloHttp', async (req, res) => {
   try {
    const decrypted = decryptText(req.body.data);
    const accountId = req.body.accountId;
    const query = await Accounts.where("accountId", "==", accountId).get();
    if (query.empty) {
        const client = Client.forMainnet();
        client.setOperator(myAccountId, myPrivateKey);
        client.setDefaultMaxTransactionFee(new Hbar(100));
        client.setDefaultMaxQueryPayment(new Hbar(50));
        const newAccountPrivateKey = PrivateKey.generateED25519();
        const newAccountPublicKey = newAccountPrivateKey.publicKey;
        const newAccount = await new AccountCreateTransaction()
            .setKey(newAccountPublicKey)
            .setInitialBalance(Hbar.fromTinybars(0))
            .execute(client);
        const getReceipt = await newAccount.getReceipt(client);
        const newAccountId = getReceipt.accountId;
        await Accounts.doc(accountId).set({
            cardHash: decrypted.toString(),
            accountId,
            cardAccountId:newAccountId.toString(),
            cardPublicKey: newAccountPublicKey.toStringDer(),
            cardPrivateKey: newAccountPrivateKey.toStringDer(),
        });
        res.send(`${newAccountId.toString()}`);
    } else {
        throw "Bad Request";
    }
  } catch (e) {
    res.send(`Bad Request`);
  }
});

// utils

function decryptText(encryptedText) {
  return crypto.privateDecrypt(
    {
      key: privateKey,
    },
    Buffer.from(encryptedText, "base64")
  );
}

function HexString(uint8Array) {
  return Array.from(uint8Array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}