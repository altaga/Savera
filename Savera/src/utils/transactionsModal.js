import nodejs from 'nodejs-mobile-react-native';
import React, { Component } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import checkMark from '../assets/checkMark.png';
import GlobalStyles, { header, mainColor, secondaryColor } from '../styles/styles';
import { blockchain } from './constants';
import ContextModule from './contextModule';
import {
  balancedSaving,
  epsilonRound,
  findIndexByProperty,
  getEncryptedStorageValue,
  percentageSaving,
} from './utils';

const baseTransactionsModalState = {
  stage: 0, // 0
  loading: false,
  explorerURL: '',
};

export default class TransactionsModal extends Component {
  constructor(props) {
    super(props);
    this.state = baseTransactionsModalState;
  }

  static contextType = ContextModule;

  async componentDidMount() {
    nodejs.channel.addListener(
      'transaction',
      msg => {
        console.log(msg);
        if (msg.res.result !== null) {
          this.setState({
            explorerURL: `${blockchain.blockExplorer}transaction/${msg.res.result}`,
            loading: false,
          });
        } else {
          this.setState({
            stage: 0,
            loading: false,
            explorerURL: '',
          });
        }
      },
      this,
    );
    nodejs.channel.addListener(
      'transactionShadow',
      msg => {
        console.log(`Shadow: ${msg.res.result}`);
      },
      this,
    );
  }

  async setStateAsync(value) {
    return new Promise(resolve => {
      this.setState(
        {
          ...value,
        },
        () => resolve(),
      );
    });
  }

  async processTransaction() {
    let privateKey;
    let fromAccountId;
    if (this.context.value.isSavingsTransaction) {
      privateKey = await getEncryptedStorageValue('privateKeySavings');
      fromAccountId = this.context.value.accountIdSavings;
    } else {
      privateKey = await getEncryptedStorageValue('privateKey');
      fromAccountId = this.context.value.accountId;
      if (
        this.context.value.savingsActive &&
        (this.context.value.transactionData.command === 'transfer' ||
          this.context.value.transactionData.command === 'transferToken')
      ) {
        let amount = this.context.value.transactionData.amount;
        if (this.context.value.transactionData.command === 'transferToken') {
          // Only for USDC for this moment
          amount =
            this.context.value.transactionData.amount /
            this.context.value.usdConversion[0];
        }
        const savedAmount =
          this.context.value.protocolSelected === 1
            ? balancedSaving(amount, this.context.value.usdConversion[0])
            : percentageSaving(amount, this.context.value.percentage);
        nodejs.channel.post('transactionShadow', {
          command: 'transfer',
          fromAccountId,
          privateKey,
          amount: epsilonRound(savedAmount, 8),
          toAccountId: this.context.value.accountIdSavings,
        });
      }
    }
    nodejs.channel.post('transaction', {
      command: this.context.value.transactionData.command,
      fromAccountId,
      privateKey,
      amount: this.context.value.transactionData.amount,
      toAccountId: this.context.value.transactionData.toAccountId,
      tokenId: this.context.value.transactionData.tokenId,
    });
  }

  render() {
    return (
      <View
        style={{
          flex: 1,
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}>
        <Modal
          visible={this.context.value.isTransactionActive}
          transparent={true}
          onShow={() => {
            this.setState(baseTransactionsModalState);
          }}
          animationType="slide">
          <View
            style={{
              backgroundColor: '#1E2423',
              width: '100%',
              height: '100%',
              borderWidth: 2,
              borderColor: mainColor,
              padding: 20,
              borderRadius: 25,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            {this.state.stage === 0 && (
              <React.Fragment>
                <View style={{width: '100%', gap: 40, alignItems: 'center'}}>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    Transaction:
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 26,
                      width: '100%',
                    }}>
                    {this.context.value.transactionData.label}
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    Amount:
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 24,
                      width: '100%',
                    }}>
                    {`${epsilonRound(
                      this.context.value.transactionData.amount,
                      8,
                    )}`}{' '}
                    {this.context.value.transactionData.token}
                    {'\n ( $'}
                    {epsilonRound(
                      this.context.value.transactionData.amount *
                        this.context.value.usdConversion[
                          findIndexByProperty(
                            blockchain.tokens,
                            'symbol',
                            this.context.value.transactionData.token,
                          )
                        ],
                      6,
                    )}
                    {' USD )'}
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 20,
                      width: '100%',
                    }}>
                    Gas:
                  </Text>
                  <Text
                    style={{
                      textAlign: 'center',
                      color: 'white',
                      fontSize: 24,
                      width: '100%',
                    }}>
                    {epsilonRound(this.context.value.transactionData.gas, 8)}{' '}
                    {blockchain.token}
                    {'\n ( $'}
                    {epsilonRound(
                      this.context.value.transactionData.gas *
                        this.context.value.usdConversion[0],
                      6,
                    )}
                    {' USD )'}
                  </Text>
                </View>
                <View style={{gap: 10, width: '100%', alignItems: 'center'}}>
                  <Pressable
                    disabled={this.state.loading}
                    style={[
                      GlobalStyles.buttonStyle,
                      this.state.loading ? {opacity: 0.5} : {},
                    ]}
                    onPress={() => {
                      this.setState({
                        loading: true,
                        stage: 1,
                      });
                      this.processTransaction();
                    }}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                      }}>
                      Execute
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      GlobalStyles.buttonStyleOutline,
                    ]}
                    onPress={async () => {
                      this.context.setValue({
                        isTransactionActive: false,
                      });
                    }}>
                    <Text
                      style={{
                        color: "#aaaaaa",
                        fontSize: 24,
                        fontWeight: 'bold',
                      }}>
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </React.Fragment>
            )}
            {this.state.stage === 1 && (
              <React.Fragment>
                <Image
                  source={checkMark}
                  alt="check"
                  style={{width: 200, height: 200, marginTop: header}}
                />
                <Text
                  style={{
                    textShadowRadius: 1,
                    fontSize: 36,
                    fontWeight: 'bold',
                    color: this.state.loading ? mainColor : secondaryColor,
                  }}>
                  {this.state.loading ? 'Processing...' : 'Completed'}
                </Text>
                <View style={{gap: 10, width: '100%', alignItems: 'center'}}>
                  <View
                    style={[
                      GlobalStyles.networkShow,
                      {width: Dimensions.get('screen').width * 0.9},
                    ]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                      }}>
                      <View style={{marginHorizontal: 20}}>
                        <Text style={{fontSize: 20, color: 'white'}}>
                          Transaction
                        </Text>
                        <Text style={{fontSize: 14, color: 'white'}}>
                          {this.context.value.transactionData.label}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        marginHorizontal: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <View style={{marginHorizontal: 10}}>
                        {
                          blockchain.tokens[
                            findIndexByProperty(
                              blockchain.tokens,
                              'symbol',
                              this.context.value.transactionData.token,
                            )
                          ].icon
                        }
                      </View>
                      <Text style={{color: 'white'}}>
                        {`${epsilonRound(
                          this.context.value.transactionData.amount,
                          8,
                        )}`}{' '}
                        {blockchain.token[0].symbol}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{gap: 10, width: '100%', alignItems: 'center'}}>
                  <Pressable
                    disabled={this.state.loading}
                    style={[
                      GlobalStyles.buttonStyle,
                      this.state.loading ? {opacity: 0.5} : {},
                    ]}
                    onPress={() => Linking.openURL(this.state.explorerURL)}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: 'white',
                        textAlign: 'center',
                      }}>
                      View on Explorer
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      GlobalStyles.buttonStyle,
                      {
                        backgroundColor: secondaryColor,
                      },
                      this.state.loading ? {opacity: 0.5} : {},
                    ]}
                    onPress={async () => {
                      this.context.setValue(
                        {
                          isTransactionActive: false,
                        },
                        () => this.setState(baseTransactionsModalState),
                      );
                    }}
                    disabled={this.state.loading}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 24,
                        fontWeight: 'bold',
                      }}>
                      Done
                    </Text>
                  </Pressable>
                </View>
              </React.Fragment>
            )}
          </View>
        </Modal>
      </View>
    );
  }
}
