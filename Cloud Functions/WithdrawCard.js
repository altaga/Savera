const functions = require('@google-cloud/functions-framework');
const crypto = require("crypto");
const Firestore = require("@google-cloud/firestore");
const {
  Hbar,
  Client,
  TransferTransaction,
  PrivateKey
} = require("@hashgraph/sdk");

const privateKey = ``;

const db = new Firestore({
  projectId: "",
  keyFilename: "credential.json",
});

const Accounts = db.collection("CardAccounts");
functions.http('helloHttp', async (req, res) => {
   try {
    const decrypted = decryptText(req.body.data);
    const amount = req.body.amount;
    const toAccountId = req.body.toAccountId;
    const tokenId = req.body.tokenId;
    const query = await Accounts.where("cardHash", "==", decrypted.toString()).get();
    if (query.empty) {
      res.send(`Bad Request`);
    } else {
      const accountId = query.docs[0].data().cardAccountId;
      const privateKey = PrivateKey.fromStringDer(query.docs[0].data().cardPrivateKey);
      const client = Client.forMainnet();
      client.setOperator(accountId, privateKey);
      client.setDefaultMaxTransactionFee(new Hbar(100));
      client.setDefaultMaxQueryPayment(new Hbar(50));
      if(tokenId === '0.0.000000'){
        const sendHbar = await new TransferTransaction()
        .addHbarTransfer(accountId, Hbar.from(-amount))
        .addHbarTransfer(toAccountId, Hbar.from(amount))
        .execute(client);
        const transactionReceipt = await sendHbar.getRecord(client);
        res.send(Buffer.from(transactionReceipt.transactionHash).toString(
            'hex',
          ));
      }
      else{
        const transaction = await new TransferTransaction()
        .addTokenTransfer(tokenId, accountId, -amount * Math.pow(10, 6))
        .addTokenTransfer(tokenId, toAccountId, amount * Math.pow(10, 6))
        .freezeWith(client);
        const signTx = await transaction.sign(privateKey);
        const txResponse = await signTx.execute(client);
        const transactionReceipt = await txResponse.getRecord(client);
        res.send(Buffer.from(transactionReceipt.transactionHash).toString(
            'hex',
          ));
      }
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