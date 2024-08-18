import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import CreditCard from 'react-native-credit-card';
import * as Crypto from 'react-native-crypto';
import RNPickerSelect from 'react-native-picker-select';
import GlobalStyles, {mainColor} from '../../../styles/styles';
import {
  CloudPublicKeyEncryption,
  blockchain,
  refreshRate,
} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  arraySum,
  epsilonRound,
  getAsyncStorageValue,
  randomNumber,
  setAsyncStorageValue,
} from '../../../utils/utils';
import ReadCard from '../components/readCard';
import {RN_SPONSOR_CARD_URL} from '@env';
import nodejs from 'nodejs-mobile-react-native';
import LinearGradient from 'react-native-linear-gradient';

function setTokens(array) {
  return array.map((item, index) => {
    return {
      ...item,
      value: index + 1,
      label: item.name,
      key: item.symbol,
    };
  });
}

const generator = require('creditcard-generator');

const baseTab3State = {
  // Utils
  tokenSelected: setTokens(blockchain.tokens)[0], // 0
  // Card
  cvc: randomNumber(111, 999),
  expiry: '1228',
  name: 'Savera Card',
  number: generator.GenCC('VISA'),
  imageFront: require('../../../assets/cardAssets/card-front.png'),
  imageBack: require('.../../../assets/cardAssets/card-back.png'),
  // Utils
  stage: 0,
  nfcSupported: true,
  loading: false,
  keyboardHeight: 0,
  cardInfo: {
    card: '',
    exp: '',
  },
  // Card Transactions
  amountAdd: '',
  amountRemove: '',
  explorerURL: '',
};

export default class Tab3 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab3State;
  }

  static contextType = ContextModule;

  async getLastRefreshCard() {
    try {
      const lastRefreshCard = await getAsyncStorageValue('lastRefreshCard');
      if (lastRefreshCard === null) throw 'Set First Date';
      return lastRefreshCard;
    } catch (err) {
      await setAsyncStorageValue({lastRefreshCard: 0});
      return 0;
    }
  }

  async encryptNodeData(data) {
    const res = await new Promise((resolve, reject) => {
      nodejs.channel.addListener(
        'encrypt',
        msg => {
          resolve(msg);
        },
        this,
      );
      nodejs.channel.post('encrypt', data);
    });
    return res;
  }

  async encryptCardData(cardData) {
    const encrypted = await this.encryptNodeData({
      cardData,
      CloudPublicKeyEncryption,
    });
    return encrypted;
  }

  async componentDidMount() {
    if (this.context.value.accountIdCard) {
      const refreshCheck = Date.now();
      const lastRefresh = await this.getLastRefreshCard();
      if (refreshCheck - lastRefresh >= refreshRate) {
        // 2.5 minutes
        console.log('Refreshing...');
        await setAsyncStorageValue({lastRefreshCard: Date.now()});
        await this.refresh();
      } else {
        console.log(
          `Next refresh Available: ${Math.round(
            (refreshRate - (refreshCheck - lastRefresh)) / 1000,
          )} Seconds`,
        );
      }
    }
  }

  async refresh() {
    await this.setStateAsync({refreshing: true});
    await this.getCardBalance();
    await this.setStateAsync({refreshing: false});
  }

  async getBalanceNode() {
    const res = await new Promise((resolve, reject) => {
      nodejs.channel.addListener(
        'balances',
        msg => {
          resolve(msg);
        },
        this,
      );
      nodejs.channel.post('balances', {
        accountId: this.context.value.accountIdCard,
      });
    });
    return res;
  }

  async getCardBalance() {
    const balancesCard = await this.getBalanceNode();
    const activeTokensCard = balancesCard.map(balance =>
      balance !== null ? true : false,
    );
    console.log({balancesCard, activeTokensCard});
    await setAsyncStorageValue({balancesCard, activeTokensCard});
    this.context.setValue({balancesCard, activeTokensCard});
  }

  async createAccount() {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    const data = await this.encryptCardData(
      `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
    );

    const raw = JSON.stringify({
      accountId: this.context.value.accountId,
      data,
    });

    console.log(raw);

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow',
    };

    fetch(RN_SPONSOR_CARD_URL, requestOptions)
      .then(response => response.text())
      .then(async result => {
        if (result === 'Bad Request') {
          console.log('Error');
        } else {
          await setAsyncStorageValue({
            accountIdCard: result,
          });
          this.context.setValue({
            accountIdCard: result,
          });
        }
      })
      .catch(error => console.error(error));
  }

  // Utils
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

  render() {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          justifyContent: this.context.value.accountIdCard
            ? 'flex-start'
            : 'center',
          alignItems: 'center',
          height: this.context.value.accountIdCard ? 'auto' : '100%',
          width: Dimensions.get('window').width,
          paddingBottom: 10,
        }}>
        {this.context.value.accountIdCard ? (
          <Fragment>
            <View style={{height: 180, marginVertical: 20}}>
              <CreditCard
                type={this.state.type}
                imageFront={this.state.imageFront}
                imageBack={this.state.imageBack}
                shiny={false}
                bar={false}
                number={this.state.number}
                name={this.state.name}
                expiry={this.state.expiry}
                cvc={this.state.cvc}
              />
            </View>
            <LinearGradient
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                width: Dimensions.get('window').width,
                paddingTop: 10,
                paddingBottom: 30,
              }}
              colors={['#000000', '#1a1a1a', '#000000']}>
              <Text
                style={{
                  fontSize: 28,
                  fontFamily: 'Exo2-Regular',
                  color: 'white',
                }}>
                Card Balance{' '}
              </Text>
              <Text
                style={{
                  fontSize: 38,
                  color: 'white',
                  marginTop: 10,
                }}>
                {`$ ${epsilonRound(
                  arraySum(
                    this.context.value.balancesCard.map(
                      (x, i) => x * this.context.value.usdConversion[i],
                    ),
                  ),
                  2,
                )} USD`}
              </Text>
            </LinearGradient>
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                borderBottomWidth: 0,
                paddingBottom: 5,
                marginBottom: 5,
                borderColor: mainColor,
                width: '90%',
              }}>
              <Text style={GlobalStyles.formTitle}>Select Token</Text>
              <RNPickerSelect
                style={{
                  inputAndroidContainer: {
                    textAlign: 'center',
                  },
                  inputAndroid: {
                    textAlign: 'center',
                    color: 'gray',
                  },
                  viewContainer: {
                    ...GlobalStyles.input,
                    width: Dimensions.get('screen').width * 0.9,
                  },
                }}
                value={this.state.tokenSelected.value}
                items={setTokens(blockchain.tokens).filter(
                  (_, index) => this.context.value.activeTokensCard[index],
                )}
                onValueChange={token => {
                  this.setState({
                    tokenSelected: setTokens(blockchain.tokens)[token - 1],
                  });
                }}
              />
              <Text style={GlobalStyles.formTitle}>Add Balance</Text>
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                }}>
                <TextInput
                  style={[GlobalStyles.input, {width: '60%'}]}
                  keyboardType="decimal-pad"
                  value={this.state.amountAdd}
                  onChangeText={value => this.setState({amountAdd: value})}
                />
                <Pressable
                  disabled={this.state.loading}
                  style={[
                    GlobalStyles.buttonStyle,
                    {
                      width: '35%',
                      padding: 10,
                      marginLeft: '5%',
                    },
                    this.state.loading ? {opacity: 0.5} : {},
                  ]}
                  onPress={async () => {
                    this.context.setValue({
                      isTransactionActive: true,
                      isSavingsTransaction: false,
                      transactionData: {
                        command:
                          this.state.tokenSelected.tokenId === '0.0.000000'
                            ? 'transfer'
                            : 'transferToken',
                        toAccountId: this.context.value.accountIdCard,
                        tokenId: this.state.tokenSelected.tokenId,
                        label: `Transfer ${this.state.tokenSelected.symbol}`,
                        amount: epsilonRound(
                          this.state.amountAdd,
                          this.state.tokenSelected.decimals,
                        ),
                        token: this.state.tokenSelected.symbol,
                        gas: epsilonRound(
                          '0.0001' / this.context.value.usdConversion[0],
                          8,
                        ),
                        tokenGas: blockchain.tokens[0].symbol,
                      },
                    });
                  }}>
                  <Text style={[GlobalStyles.buttonText, {fontSize: 18}]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            </View>
            {blockchain.tokens.map((token, index) => (
              <View key={index} style={GlobalStyles.network}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                  }}>
                  <View style={{marginHorizontal: 20}}>
                    <View>{token.icon}</View>
                  </View>
                  <View style={{justifyContent: 'center'}}>
                    <Text style={{fontSize: 18, color: 'white'}}>
                      {token.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                      }}>
                      <Text style={{fontSize: 12, color: 'white'}}>
                        {this.context.value.balancesCard[index] === 0
                          ? '0'
                          : this.context.value.balancesCard[index] < 0.001
                          ? '<0.01'
                          : epsilonRound(
                              this.context.value.balancesCard[index],
                              2,
                            )}{' '}
                        {token.symbol}
                      </Text>
                      <Text style={{fontSize: 12, color: 'white'}}>
                        {`  -  ($${epsilonRound(
                          this.context.value.usdConversion[index],
                          4,
                        )} USD)`}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{marginHorizontal: 20}}>
                  {this.context.value.activeTokensCard[index] ? (
                    <Text style={{color: 'white'}}>
                      $
                      {epsilonRound(
                        this.context.value.balancesCard[index] *
                          this.context.value.usdConversion[index],
                        2,
                      )}{' '}
                      USD
                    </Text>
                  ) : (
                    <Pressable onPress={() => console.log('associate token')}>
                      <Text
                        style={{
                          color: 'white',
                          textAlign: 'center',
                        }}>
                        Associate{'\n'}Token
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </Fragment>
        ) : (
          <Fragment>
            {
              // Stage 0
              this.state.stage === 0 && (
                <Fragment>
                  <Text
                    style={[
                      GlobalStyles.exoTitle,
                      {
                        textAlign: 'center',
                        fontSize: 24,
                        paddingBottom: 20,
                      },
                    ]}>
                    Create Card Account
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      width: '100%',
                    }}>
                    <Pressable
                      disabled={this.state.loading}
                      style={[
                        GlobalStyles.buttonStyle,
                        this.state.loading ? {opacity: 0.5} : {},
                      ]}
                      onPress={() => this.setState({stage: 1})}>
                      <Text style={[GlobalStyles.buttonText]}>
                        {this.state.loading ? 'Creating...' : 'Create Account'}
                      </Text>
                    </Pressable>
                  </View>
                </Fragment>
              )
            }
            {
              // Stage 1
              this.state.stage === 1 && (
                <Fragment>
                  <View
                    style={{
                      justifyContent: 'space-evenly',
                      alignItems: 'center',
                      height: '100%',
                    }}>
                    <Text style={GlobalStyles.title}>
                      {' '}
                      Merge Physical Card to Card Account
                    </Text>
                    <ReadCard
                      cardInfo={async cardInfo => {
                        if (cardInfo) {
                          console.log(cardInfo);
                          await this.setStateAsync({cardInfo});
                          this.createAccount();
                        }
                      }}
                    />
                  </View>
                </Fragment>
              )
            }
          </Fragment>
        )}
      </ScrollView>
    );
  }
}
