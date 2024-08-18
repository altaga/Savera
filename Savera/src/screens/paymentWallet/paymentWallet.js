import {RN_GET_ACCOUNT_ID, RN_WITHDRAW_FUNDS} from '@env';
import nodejs from 'nodejs-mobile-react-native';
import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNPrint from 'react-native-print';
import QRCode from 'react-native-qrcode-svg';
import VirtualKeyboard from 'react-native-virtual-keyboard';
import checkMark from '../../assets/checkMark.png';
import {logo} from '../../assets/logo';
import Renders from '../../assets/logoHeader.png';
import Title from '../../assets/title.png';
import GlobalStyles, {
  footer,
  header,
  main,
  mainColor,
  quaternaryColor,
  secondaryColor,
  tertiaryColor,
} from '../../styles/styles';
import {CloudPublicKeyEncryption, blockchain} from '../../utils/constants';
import ContextModule from '../../utils/contextModule';
import {
  deleteLeadingZeros,
  epsilonRound,
  findIndexByProperty,
  formatInputText,
} from '../../utils/utils';
import ReadCard from './components/readCard';
import LinearGradient from 'react-native-linear-gradient';

const BaseStatePaymentWallet = {
  // Base
  accountId: '',
  stage: 0, // 0
  amount: '0.00', // "0.00"
  cardInfo: null,
  loading: false,
  status: 'Processing...',
  explorerURL: '',
  transactionDisplay: {
    name: 'GLMR',
    amount: 0,
  },
  // QR print
  saveData: '',
};

class PaymentWallet extends Component {
  constructor(props) {
    super(props);
    this.state = BaseStatePaymentWallet;
    this.svg = null;
  }

  async getDataURL() {
    return new Promise(async (resolve, reject) => {
      this.svg.toDataURL(async data => {
        this.setState(
          {
            saveData: data,
          },
          () => resolve('ok'),
        );
      });
    });
  }

  async print() {
    await this.getDataURL();
    const results = await RNHTMLtoPDF.convert({
      html: `
        <div style="text-align: center;">
          <img src='${logo}' width="400px"></img>
          <h1 style="font-size: 3rem;">--------- Original Reciept ---------</h1>
          <h1 style="font-size: 3rem;">Date: ${new Date().toLocaleDateString()}</h1>
          <h1 style="font-size: 3rem;">Type: Execute Transaction</h1>
          <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
          <h1 style="font-size: 3rem;">Transaction</h1>
          <h1 style="font-size: 3rem;">Amount: ${
            this.state.transactionDisplay.amount
          } ${this.state.transactionDisplay.name}</h1>
          <h1 style="font-size: 3rem;">------------------ • ------------------</h1>
          <img style="width:70%" src='${
            'data:image/png;base64,' + this.state.saveData
          }'></img>
      </div>
      `,
      fileName: 'print',
      base64: true,
    });
    await RNPrint.print({filePath: results.filePath});
  }

  static contextType = ContextModule;

  componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      this.setState(BaseStatePaymentWallet);
    });
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

  async processPayment(hash) {
    await this.setStateAsync({
      explorerURL: `${blockchain.blockExplorer}transaction/${hash}`,
      status: 'Confirmed',
      loading: false,
    });
  }

  async payFromCard(token) {
    let index = findIndexByProperty(
      blockchain.tokens,
      'tokenId',
      token.tokenId,
    );
    if (index === -1) {
      throw new Error('Token not found');
    }
    let usdConversion = this.context.value.usdConversion[index];
    await this.setStateAsync({loading: true});
    return new Promise(async (resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');

      const data = await this.encryptCardData(
        `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
      );

      const raw = JSON.stringify({
        data,
        amount: epsilonRound(
          parseFloat(deleteLeadingZeros(formatInputText(this.state.amount))) /
            usdConversion,
          token.decimals,
        ).toString(),
        toAccountId: this.context.value.accountId,
        tokenId: token.tokenId,
      });
      console.log(raw);
      await this.setStateAsync({
        transactionDisplay: {
          amount: epsilonRound(
            parseFloat(deleteLeadingZeros(formatInputText(this.state.amount))) /
              usdConversion,
            token.decimals,
          ).toString(),
          name: token.symbol,
          icon: token.icon,
        },
      });
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(RN_WITHDRAW_FUNDS, requestOptions)
        .then(response => response.text())
        .then(result => {
          if (result === 'Bad Request') {
            reject('Bad Request');
          } else {
            resolve(result);
          }
        })
        .catch(error => reject(error));
    });
  }

  async getAddressFromCard() {
    return new Promise(async (resolve, reject) => {
      const myHeaders = new Headers();
      myHeaders.append('Content-Type', 'application/json');

      const data = await this.encryptCardData(
        `${this.state.cardInfo.card}${this.state.cardInfo.exp}`,
      );

      const raw = JSON.stringify({
        data,
      });

      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
      };

      fetch(RN_GET_ACCOUNT_ID, requestOptions)
        .then(response => response.text())
        .then(result => {
          if (result === 'Bad Request') {
            reject();
          } else {
            resolve(result);
          }
        })
        .catch(error => reject(error));
    });
  }

  async getBalanceNode() {
    const res = await new Promise((resolve, reject) => {
      nodejs.channel.addListener(
        'balances',
        msg => {
          console.log(msg);
          resolve(msg);
        },
        this,
      );
      nodejs.channel.post('balances', {
        accountId: this.state.accountId,
      });
    });
    return res;
  }

  async getBalances() {
    const balances = await this.getBalanceNode();
    const activeTokens = balances.map(balance =>
      balance !== null ? true : false,
    );
    await this.setStateAsync({balances, activeTokens});
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
      <Fragment>
        <SafeAreaView style={[GlobalStyles.container]}>
          <View
            style={[
              GlobalStyles.headerMain,
              {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignContent: 'center',
              },
            ]}>
            <View style={GlobalStyles.headerItem}>
              <Image
                source={Renders}
                alt="Logo"
                style={{
                  width: 192 / 3.4,
                  height: 192 / 3.4,
                  alignSelf: 'flex-start',
                  marginLeft: 20,
                }}
              />
            </View>
            <View style={GlobalStyles.headerItem}>
              <Image
                source={Title}
                alt="Logo"
                style={{
                  width: 589 * (header / (120 * 2)),
                  height: 120 * (header / (120 * 2)),
                }}
              />
            </View>
          </View>
          <View
            style={[
              GlobalStyles.mainSend,
              {
                height: main + footer,
                justifyContent: 'space-around',
                alignItems: 'center',
              },
            ]}>
            {this.state.stage === 0 && (
              <View
                style={{
                  flex: Dimensions.get('window').height - 100,
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                }}>
                <LinearGradient
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: Dimensions.get('window').width,
                    paddingVertical: 30,
                  }}
                  colors={['#000000', '#1a1a1a', '#000000']}>
                  <Text
                    style={{
                      fontSize: 28,
                      fontFamily: 'Exo2-Regular',
                      color: 'white',
                    }}>
                    Enter Amount (USD)
                  </Text>
                  <Text
                    style={{
                      fontSize: 38,
                      color: 'white',
                      marginTop: 10,
                    }}>
                    {deleteLeadingZeros(formatInputText(this.state.amount))}
                  </Text>
                </LinearGradient>
                <VirtualKeyboard
                  style={{
                    width: '80vw',
                    fontSize: 40,
                    textAlign: 'center',
                    marginTop: -10,
                  }}
                  cellStyle={{
                    width: 50,
                    height: 50,
                    borderWidth: 2,
                    borderColor: tertiaryColor + '7f',
                    borderRadius: 5,
                    margin: 1,
                  }}
                  color="white"
                  pressMode="string"
                  onPress={amount => this.setState({amount})}
                  decimal
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-evenly',
                    width: Dimensions.get('window').width,
                  }}>
                  <Pressable
                    style={GlobalStyles.buttonStyle}
                    onPress={() => this.setState({stage: 1})}>
                    <Text style={GlobalStyles.buttonText}>Pay with Card</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {this.state.stage === 1 && (
              <React.Fragment>
                <View
                  style={{
                    justifyContent: 'space-evenly',
                    alignItems: 'center',
                  }}>
                  <LinearGradient
                    style={{
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: Dimensions.get('window').width,
                    }}
                    colors={['#000000', '#1a1a1a', '#000000']}>
                    <Text
                      style={{
                        fontSize: 28,
                        fontFamily: 'Exo2-Regular',
                        color: 'white',
                      }}>
                      Amount (USD)
                    </Text>
                    <Text
                      style={{
                        fontSize: 38,
                        color: 'white',
                        marginTop: 10,
                      }}>
                      $ {deleteLeadingZeros(formatInputText(this.state.amount))}
                    </Text>
                  </LinearGradient>
                </View>
                <ReadCard
                  cardInfo={async cardInfo => {
                    if (cardInfo) {
                      await this.setStateAsync({cardInfo});
                      try {
                        const accountId = await this.getAddressFromCard();
                        await this.setStateAsync({accountId});
                        await this.getBalances();
                        await this.setStateAsync({stage: 2});
                      } catch (error) {
                        this.setState({stage: 0});
                      }
                    }
                  }}
                />
              </React.Fragment>
            )}
            {this.state.stage === 2 && (
              <React.Fragment>
                <Text style={[GlobalStyles.title, {marginVertical: 50}]}>
                  Select Payment Token
                </Text>
                <ScrollView>
                  {blockchain.tokens
                    .filter((_, index) => this.state.activeTokens[index])
                    .map((token, index, array) => (
                      <View
                        key={index}
                        style={{
                          paddingBottom: array.length === index + 1 ? 0 : 20,
                          marginBottom: 20,
                          borderBottomWidth: array.length === index + 1 ? 0 : 0,
                        }}>
                        <Pressable
                          disabled={this.state.loading}
                          style={[
                            GlobalStyles.buttonStyle,
                            this.state.loading ? {opacity: 0.5} : {},
                          ]}
                          onPress={async () => {
                            await this.setStateAsync({loading: true, stage: 3});
                            try {
                              const result = await this.payFromCard(token);
                              this.processPayment(result);
                            } catch (error) {
                              console.log(error);
                            }
                            await this.setStateAsync({loading: false});
                          }}>
                          <Text style={GlobalStyles.buttonText}>
                            Pay with {token.symbol}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                </ScrollView>
              </React.Fragment>
            )}
            {
              // Stage 2
              this.state.stage === 3 && (
                <React.Fragment>
                  <Image
                    source={checkMark}
                    alt="check"
                    style={{width: 200, height: 200}}
                  />
                  <Text
                    style={{
                      textShadowRadius: 1,
                      fontSize: 36,
                      fontWeight: 'bold',
                      color:
                        this.state.status === 'Processing...'
                          ? mainColor
                          : secondaryColor,
                    }}>
                    {this.state.status}
                  </Text>
                  <View
                    style={[
                      GlobalStyles.networkShow,
                      {
                        width: Dimensions.get('screen').width * 0.9,
                      },
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
                          Card Payment
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
                        {this.state.transactionDisplay.icon}
                      </View>
                      <Text style={{color: 'white'}}>
                        {`${this.state.transactionDisplay.amount}`}{' '}
                        {this.state.transactionDisplay.name}
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Pressable
                      disabled={this.state.explorerURL === ''}
                      style={[
                        GlobalStyles.buttonStyle,
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
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
                          backgroundColor: mainColor,
                        },
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={async () => {
                        this.print();
                      }}
                      disabled={this.state.explorerURL === ''}>
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: 'bold',
                        }}>
                        Print Reciept
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        GlobalStyles.buttonStyle,
                        {
                          backgroundColor: quaternaryColor,
                        },
                        this.state.explorerURL === '' ? {opacity: 0.5} : {},
                      ]}
                      onPress={async () => {
                        this.setState(BaseStatePaymentWallet);
                      }}
                      disabled={this.state.explorerURL === ''}>
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
              )
            }
          </View>
        </SafeAreaView>
        <View style={{position: 'absolute', bottom: -1000}}>
          <QRCode
            value={
              this.state.explorerURL === ''
                ? 'placeholder'
                : this.state.explorerURL
            }
            size={Dimensions.get('window').width * 0.6}
            ecl="L"
            getRef={c => (this.svg = c)}
          />
        </View>
      </Fragment>
    );
  }
}

export default PaymentWallet;
