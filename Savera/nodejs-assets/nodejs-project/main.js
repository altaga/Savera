var rn_bridge = require('rn-bridge');
const {
  Mnemonic,
  Client,
  Hbar,
  TransferTransaction,
  AccountBalanceQuery,
  TokenAssociateTransaction,
  PublicKey,
  PrivateKey,
  AccountCreateTransaction,
} = require('@hashgraph/sdk');
var crypto = require('crypto');

// Echo every message received from react-native.
rn_bridge.channel.on('message', async msg => {
  rn_bridge.channel.send(msg);
});

rn_bridge.channel.on('mnemonic', async () => {
  const mnemonicObject = await Mnemonic.generate12();
  const privateKeyObject = await mnemonicObject.toStandardEd25519PrivateKey();
  const publicKey = privateKeyObject.publicKey.toStringDer();
  const privateKey = privateKeyObject.toStringDer();
  const mnemonic = mnemonicObject.toString();
  rn_bridge.channel.post('mnemonic', {publicKey, privateKey, mnemonic});
});

rn_bridge.channel.on('createAccountId', async data => {
  const {myAccountId, myPrivateKey} = data;
  const client = Client.forMainnet();
  client.setOperator(myAccountId, myPrivateKey);
  client.setDefaultMaxTransactionFee(new Hbar(100));
  client.setDefaultMaxQueryPayment(new Hbar(50));
  const mnemonicObject = await Mnemonic.generate12();
  const privateKeyObject = await mnemonicObject.toStandardEd25519PrivateKey();
  const publicKey = privateKeyObject.publicKey.toStringDer();
  const privateKey = privateKeyObject.toStringDer();
  const mnemonic = mnemonicObject.toString();
  const newAccount = await new AccountCreateTransaction()
    .setKey(PublicKey.fromString(publicKey))
    .setInitialBalance(Hbar.fromTinybars(0))
    .execute(client);
  const getReceipt = await newAccount.getReceipt(client);
  const accountId = getReceipt.accountId;
  rn_bridge.channel.post('createAccountId', {
    publicKey,
    privateKey,
    mnemonic,
    accountId: accountId.toString(),
  });
});

rn_bridge.channel.on('balances', async data => {
  const client = Client.forMainnet();
  const {accountId} = data;
  const balance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);
  const balances = [
    balance.hbars.toBigNumber(),
    balance.tokens._map.get('0.0.456858') / Math.pow(10, 6),
  ];
  rn_bridge.channel.post('balances', balances);
});

rn_bridge.channel.on('transaction', async data => {
  try {
    const {command, fromAccountId, privateKey, amount, toAccountId, tokenId} =
      data;
    if (command === 'transfer') {
      const client = Client.forMainnet();
      client.setOperator(fromAccountId, privateKey);
      client.setDefaultMaxTransactionFee(new Hbar(100));
      client.setDefaultMaxQueryPayment(new Hbar(50));
      const sendHbar = await new TransferTransaction()
        .addHbarTransfer(fromAccountId, Hbar.from(-amount))
        .addHbarTransfer(toAccountId, Hbar.from(amount))
        .execute(client);
      const transactionReceipt = await sendHbar.getRecord(client);
      rn_bridge.channel.post('transaction', {
        res: {
          error: null,
          result: Buffer.from(transactionReceipt.transactionHash).toString(
            'hex',
          ),
        },
      });
    } else if (command === 'transferToken') {
      // token transfer USDC for this moment
      const client = Client.forMainnet();
      client.setOperator(fromAccountId, privateKey);
      const privateKeyObj = PrivateKey.fromStringDer(privateKey);
      client.setDefaultMaxTransactionFee(new Hbar(100));
      client.setDefaultMaxQueryPayment(new Hbar(50));
      const transaction = await new TransferTransaction()
        .addTokenTransfer(tokenId, fromAccountId, -amount * Math.pow(10, 6))
        .addTokenTransfer(tokenId, toAccountId, amount * Math.pow(10, 6))
        .freezeWith(client);
      const signTx = await transaction.sign(privateKeyObj);
      const txResponse = await signTx.execute(client);
      const transactionReceipt = await txResponse.getRecord(client);
      rn_bridge.channel.post('transaction', {
        res: {
          error: null,
          result: Buffer.from(transactionReceipt.transactionHash).toString(
            'hex',
          ),
        },
      });
    } else if (command === 'associate') {
      const client = Client.forMainnet();
      const privateKeyObj = PrivateKey.fromStringDer(privateKey);
      client.setOperator(fromAccountId, privateKeyObj);
      client.setDefaultMaxTransactionFee(new Hbar(100));
      client.setDefaultMaxQueryPayment(new Hbar(50));
      const associateTx = await new TokenAssociateTransaction()
        .setAccountId(fromAccountId)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(privateKeyObj);
      const associateTxSubmit = await associateTx.execute(client);
      const transactionReceipt = await associateTxSubmit.getRecord(client);
      rn_bridge.channel.post('transaction', {
        res: {
          error: null,
          result: Buffer.from(transactionReceipt.transactionHash).toString(
            'hex',
          ),
        },
      });
    }
  } catch (e) {
    rn_bridge.channel.post('transaction', {res: {error: e, result: null}});
  }
});

rn_bridge.channel.on('transactionShadow', async data => {
  try {
    const {command, fromAccountId, privateKey, amount, toAccountId} = data;
    if (command === 'transfer') {
      const client = Client.forMainnet();
      client.setOperator(fromAccountId, privateKey);
      client.setDefaultMaxTransactionFee(new Hbar(100));
      client.setDefaultMaxQueryPayment(new Hbar(50));
      const sendHbar = await new TransferTransaction()
        .addHbarTransfer(fromAccountId, Hbar.from(-amount))
        .addHbarTransfer(toAccountId, Hbar.from(amount))
        .execute(client);
      const transactionReceipt = await sendHbar.getRecord(client);
      rn_bridge.channel.post('transactionShadow', {
        res: {
          error: null,
          result: Buffer.from(transactionReceipt.transactionHash).toString(
            'hex',
          ),
        },
      });
    }
  } catch (e) {
    rn_bridge.channel.post('transactionShadow', {
      res: {error: e, result: null},
    });
  }
});

// Crypto utils

rn_bridge.channel.on('encrypt', async data => {
  const encrypted = crypto.publicEncrypt(
    {
      key: data.CloudPublicKeyEncryption,
    },
    Buffer.from(data.cardData, 'utf8'),
  );
  rn_bridge.channel.post('encrypt', encrypted.toString('base64'));
});
