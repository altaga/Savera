import {ethers} from 'ethers';
import nodejs from 'nodejs-mobile-react-native';
import React, {Component} from 'react';
import {Pressable, RefreshControl, ScrollView, Text, View} from 'react-native';
import IconIonicons from 'react-native-vector-icons/Ionicons';
import GlobalStyles, {mainColor} from '../../../styles/styles';
import {blockchain, refreshRate} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  arraySum,
  epsilonRound,
  getAsyncStorageValue,
  setAsyncStorageValue,
} from '../../../utils/utils';
import LinearGradient from 'react-native-linear-gradient';

const baseTab1State = {
  refreshing: false,
  nfcSupported: true,
};

class Tab1 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab1State;
    this.controller = new AbortController();
  }
  static contextType = ContextModule;

  async componentDidMount() {
    const refreshCheck = Date.now();
    const lastRefresh = await this.getLastRefresh();
    if (refreshCheck - lastRefresh >= refreshRate) {
      // 2.5 minutes
      await setAsyncStorageValue({lastRefresh: Date.now().toString()});
      this.refresh();
    } else {
      console.log(
        `Next refresh Available: ${Math.round(
          (refreshRate - (refreshCheck - lastRefresh)) / 1000,
        )} Seconds`,
      );
    }
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

  async refresh() {
    await this.setStateAsync({refreshing: true});
    await Promise.all([this.getUSD(), this.getBalances()]);
    await this.setStateAsync({refreshing: false});
  }

  // Get Balances

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
        accountId: this.context.value.accountId,
      });
    });
    return res;
  }

  async getBalances() {
    const balances = await this.getBalanceNode();
    const activeTokens = balances.map(balance =>
      balance !== null ? true : false,
    );
    setAsyncStorageValue({balances, activeTokens});
    this.context.setValue({balances, activeTokens});
  }

  // USD Conversions

  async getUSD() {
    const array = blockchain.tokens.map(token => token.coingecko);
    var myHeaders = new Headers();
    myHeaders.append('accept', 'application/json');
    var requestOptions = {
      signal: this.controller.signal,
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow',
    };
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${array.toString()}&vs_currencies=usd`,
      requestOptions,
    );
    const result = await response.json();
    const usdConversion = array.map(x => result[x].usd);
    setAsyncStorageValue({usdConversion});
    this.context.setValue({usdConversion});
  }

  async getLastRefresh() {
    try {
      const lastRefresh = await getAsyncStorageValue('lastRefresh');
      if (lastRefresh === null) throw 'Set First Date';
      return lastRefresh;
    } catch (err) {
      await setAsyncStorageValue({lastRefresh: '0'.toString()});
      return 0;
    }
  }

  render() {
    const iconSize = 38;
    return (
      <View
        style={{
          width: '100%',
          height: '100%',
        }}>
        <View style={GlobalStyles.balanceContainer}>
          <LinearGradient
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              paddingBottom: 20,
            }}
            colors={['#000000', '#1a1a1a', '#000000']}>
            <Text
              style={{
                fontSize: 28,
                fontFamily: 'Exo2-Regular',
                color: 'white',
              }}>
              Balance
            </Text>
            <Text
              style={{
                fontSize: 38,
                color: 'white',
                marginTop: 10,
              }}>
              {`$ ${epsilonRound(
                arraySum(
                  this.context.value.balances.map(
                    (x, i) => x * this.context.value.usdConversion[i],
                  ),
                ),
                2,
              )} USD`}
            </Text>
          </LinearGradient>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
              alignItems: 'center',
              width: '100%',
            }}>
            <View style={{justifyContent: 'center', alignItems: 'center'}}>
              <Pressable
                onPress={() => this.props.navigation.navigate('SendWallet')}
                style={GlobalStyles.singleButton}>
                <IconIonicons
                  name="arrow-up-outline"
                  size={iconSize}
                  color={'white'}
                />
              </Pressable>
              <Text style={GlobalStyles.singleButtonText}>Send</Text>
            </View>
            <View style={{justifyContent: 'center', alignItems: 'center'}}>
              <Pressable
                onPress={() => this.props.navigation.navigate('DepositWallet')}
                style={GlobalStyles.singleButton}>
                <IconIonicons
                  name="arrow-down-outline"
                  size={iconSize}
                  color={'white'}
                />
              </Pressable>
              <Text style={GlobalStyles.singleButtonText}>Receive</Text>
            </View>
            {this.state.nfcSupported && (
              <View style={{justifyContent: 'center', alignItems: 'center'}}>
                <Pressable
                  onPress={() =>
                    this.props.navigation.navigate('PaymentWallet')
                  }
                  style={GlobalStyles.singleButton}>
                  <IconIonicons name="card" size={iconSize} color={'white'} />
                </Pressable>
                <Text style={GlobalStyles.singleButtonText}>{'Payment'}</Text>
              </View>
            )}
          </View>
        </View>
        <ScrollView
          refreshControl={
            <RefreshControl
              progressBackgroundColor={mainColor}
              refreshing={this.state.refreshing}
              onRefresh={async () => {
                await setAsyncStorageValue({
                  lastRefresh: Date.now().toString(),
                });
                await this.refresh();
              }}
            />
          }
          showsVerticalScrollIndicator={false}
          style={GlobalStyles.tokensContainer}
          contentContainerStyle={{
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}>
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
                      {this.context.value.balances[index] === 0
                        ? '0'
                        : this.context.value.balances[index] < 0.001
                        ? '<0.01'
                        : epsilonRound(
                            this.context.value.balances[index],
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
                {this.context.value.activeTokens[index] ? (
                  <Text style={{color: 'white'}}>
                    $
                    {epsilonRound(
                      this.context.value.balances[index] *
                        this.context.value.usdConversion[index],
                      2,
                    )}{' '}
                    USD
                  </Text>
                ) : (
                  <Pressable
                    onPress={() =>
                      this.context.setValue({
                        isTransactionActive: true,
                        isSavingsTransaction: false,
                        transactionData: {
                          command: 'associate',
                          toAccountId: null,
                          tokenId: blockchain.tokens[index].tokenId,
                          label: 'Associate Token',
                          amount: '0.0',
                          token: blockchain.tokens[index].symbol,
                          gas: '0.05' / this.context.value.usdConversion[0], // Fixed Cost in USD
                          tokenGas: blockchain.tokens[0].symbol,
                        },
                      })
                    }>
                    <Text style={{color: 'white', textAlign: 'center'}}>
                      Associate{'\n'}Token
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }
}

export default Tab1;
