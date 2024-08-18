import Slider from '@react-native-community/slider';
import nodejs from 'nodejs-mobile-react-native';
import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import GlobalStyles, {mainColor} from '../../../styles/styles';
import {blockchain, refreshRate} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  arraySum,
  epsilonRound,
  formatDate,
  getAsyncStorageValue,
  getEncryptedStorageValue,
  setAsyncStorageValue,
  setEncryptedStorageValue,
} from '../../../utils/utils';
import LinearGradient from 'react-native-linear-gradient';

const periodsAvailable = [
  {
    label: 'Daily',
    value: 1,
    periodValue: 86400,
  },
  {
    label: 'Weekly',
    value: 2,
    periodValue: 604800,
  },
  {
    label: 'Monthly',
    value: 3,
    periodValue: 2629800,
  },
  {
    label: 'Yearly',
    value: 4,
    periodValue: 31557600,
  },
];

const protocolsAvailable = [
  {
    label: 'Balanced',
    value: 1,
  },
  {
    label: 'Percentage',
    value: 2,
  },
];

const baseTab2State = {
  refreshing: false,
  loading: false,
};

export default class Tab2 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab2State;
  }

  static contextType = ContextModule;

  async onceRefresh() {
    const savingsDate = Date.now() + periodsAvailable[0].periodValue * 1000;
    await setAsyncStorageValue({savingsDate});
    await setAsyncStorageValue({periodSelected: 1});
    await setAsyncStorageValue({protocolSelected: 1});
    const publicKeySavings = await this.checkAA(this.state.publicKey);
    this.setState({
      ...baseTab2State,
      publicKeySavings,
    });
  }

  async getSavingsDate() {
    try {
      const savingsDate = await getAsyncStorageValue('savingsDate');
      if (savingsDate === null) throw 'Set First Date';
      return savingsDate;
    } catch (err) {
      await setAsyncStorageValue({savingsDate: 0});
      return 0;
    }
  }

  async getLastRefreshSavings() {
    try {
      const lastRefreshSavings = await getAsyncStorageValue(
        'lastRefreshSavings',
      );
      if (lastRefreshSavings === null) throw 'Set First Date';
      return lastRefreshSavings;
    } catch (err) {
      await setAsyncStorageValue({lastRefreshSavings: 0});
      return 0;
    }
  }

  async componentDidMount() {
    if (this.context.value.accountIdSavings) {
      const refreshCheck = Date.now();
      const lastRefresh = await this.getLastRefreshSavings();
      if (refreshCheck - lastRefresh >= refreshRate) {
        // 2.5 minutes
        console.log('Refreshing...');
        await setAsyncStorageValue({lastRefreshSavings: Date.now()});
        this.refresh();
      } else {
        console.log(
          `Next refresh Available: ${Math.round(
            (refreshRate - (refreshCheck - lastRefresh)) / 1000,
          )} Seconds`,
        );
      }
    }
  }

  async createAccountNode() {
    const myPrivateKey = await getEncryptedStorageValue('privateKey');
    const myAccountId = this.context.value.accountId;
    const res = await new Promise((resolve, reject) => {
      nodejs.channel.addListener(
        'createAccountId',
        msg => {
          resolve(msg);
        },
        this,
      );
      nodejs.channel.post('createAccountId', {
        myAccountId,
        myPrivateKey,
      });
    });
    return res;
  }

  async createAccount() {
    this.setState({loading: true});
    const {publicKey, privateKey, mnemonic, accountId} =
      await this.createAccountNode();
    await setEncryptedStorageValue({
      privateKeySavings: privateKey,
      mnemonicSavings: mnemonic,
    });
    await setAsyncStorageValue({
      publicKeySavings: publicKey,
      accountIdSavings: accountId,
    });
    this.context.setValue({
      publicKeySavings: publicKey,
      accountIdSavings: accountId,
    });
    await this.setStateAsync({loading: false});
  }

  async refresh() {
    await this.setStateAsync({refreshing: true});
    await this.getSavingsBalance();
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
        accountId: this.context.value.accountIdSavings,
      });
    });
    return res;
  }

  async getSavingsBalance() {
    const balancesSavings = await this.getBalanceNode();
    const activeTokensSavings = balancesSavings.map(balance =>
      balance !== null ? true : false,
    );
    await setAsyncStorageValue({balancesSavings, activeTokensSavings});
    this.context.setValue({balancesSavings, activeTokensSavings});
  }

  // Period
  async changePeriod() {
    const savingsDate =
      Date.now() +
      periodsAvailable[this.context.value.periodSelected - 1].periodValue *
        1000;
    await setAsyncStorageValue({savingsDate});
    this.context.setValue({savingsDate});
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
      <View
        style={{
          width: Dimensions.get('window').width,
          justifyContent: 'space-evenly',
          alignItems: 'center',
          height: '100%',
        }}>
        <ScrollView
          contentContainerStyle={[
            {
              height: '100%',
              width: '100%',
              alignItems: 'center',
            },
          ]}>
          {this.context.value.accountIdSavings ? (
            <Fragment>
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
                  Savings Account Balance{' '}
                </Text>
                <Text
                  style={{
                    fontSize: 38,
                    color: 'white',
                    marginTop: 10,
                  }}>
                  {`$ ${epsilonRound(
                    arraySum(
                      this.context.value.balancesSavings.map(
                        (x, i) => x * this.context.value.usdConversion[i],
                      ),
                    ),
                    2,
                  )} USD`}
                </Text>
              </LinearGradient>
              <View
                style={{
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  width: '90%',
                  gap: 10,
                }}>
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignContent: 'center',
                    width: '100%',
                    paddingBottom: 20,
                    paddingTop: 20,
                    borderColor: mainColor,
                  }}>
                  <Text style={[GlobalStyles.titleSaves]}>
                    Activate Savings
                  </Text>
                  <Switch
                    style={{
                      transform: [{scaleX: 1.3}, {scaleY: 1.3}],
                      marginRight: 10,
                    }}
                    trackColor={{
                      false: '#3e3e3e',
                      true: mainColor + '77',
                    }}
                    thumbColor={
                      this.context.value.savingsActive ? mainColor : '#f4f3f4'
                    }
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={async () => {
                      await setAsyncStorageValue({
                        savingsActive: !this.context.value.savingsActive,
                      });
                      this.context.setValue({
                        savingsActive: !this.context.value.savingsActive,
                      });
                    }}
                    value={this.context.value.savingsActive}
                  />
                </View>
                {this.context.value.savingsActive && (
                  <React.Fragment>
                    <View
                      style={{
                        paddingBottom: 20,
                        borderColor: mainColor,
                      }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}>
                        <Text style={[GlobalStyles.titleSaves]}>
                          Savings Period
                        </Text>
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
                              width: '55%',
                            },
                          }}
                          value={this.context.value.periodSelected}
                          items={periodsAvailable}
                          onValueChange={async value => {
                            await setAsyncStorageValue({
                              periodSelected: value,
                            });
                            this.context.setValue({
                              periodSelected: value,
                            });
                          }}
                        />
                      </View>
                      <Pressable
                        disabled={this.state.loading}
                        style={[
                          GlobalStyles.buttonStyle,
                          this.state.loading ? {opacity: 0.5} : {},
                        ]}
                        onPress={async () => {
                          await this.setStateAsync({loading: true});
                          await this.changePeriod();
                          await this.setStateAsync({loading: false});
                        }}>
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 18,
                            fontWeight: 'bold',
                          }}>
                          {this.state.loading
                            ? 'Changing...'
                            : 'Change Savings Period'}
                        </Text>
                      </Pressable>
                    </View>
                    <View
                      style={
                        ({
                          width: '100%',
                        },
                        this.context.value.protocolSelected === 1 && {
                          borderColor: mainColor,
                        })
                      }>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}>
                        <Text style={[GlobalStyles.titleSaves]}>
                          Savings Protocol
                        </Text>
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
                              width: Dimensions.get('screen').width * 0.5,
                            },
                          }}
                          value={this.context.value.protocolSelected}
                          items={protocolsAvailable}
                          onValueChange={async protocolSelected => {
                            await setAsyncStorageValue({
                              protocolSelected,
                            });
                            this.context.setValue({
                              protocolSelected,
                            });
                          }}
                        />
                      </View>
                    </View>
                    {this.context.value.protocolSelected === 1 ? (
                      <View
                        style={{
                          width: '100%',
                          marginBottom: 20,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignContent: 'center',
                          width: '100%',
                          marginBottom: 20,
                          paddingBottom: 20,
                          borderColor: mainColor,
                        }}>
                        <Slider
                          value={this.context.value.percentage}
                          style={{
                            width: '85%',
                            height: 40,
                          }}
                          step={1}
                          minimumValue={1}
                          maximumValue={15}
                          minimumTrackTintColor="#FFFFFF"
                          maximumTrackTintColor={mainColor}
                          onValueChange={async value => {
                            await setAsyncStorageValue({
                              percentage: value,
                            });
                            this.context.setValue({
                              percentage: value,
                            });
                          }}
                        />
                        <Text
                          style={{
                            width: '20%',
                            fontSize: 24,
                            color: '#FFF',
                            fontWeight: 'bold',
                          }}>
                          {this.context.value.percentage}%
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignContent: 'center',
                        marginBottom: 20,
                        width: '100%',
                      }}>
                      <Text style={[GlobalStyles.titleSaves]}>
                        Next Withdraw Date
                      </Text>
                      <Pressable
                        disabled={
                          this.state.loading ||
                          !(this.context.value.savingsDate < Date.now())
                        }
                        style={[
                          GlobalStyles.buttonStyle,
                          {width: '50%'},
                          this.state.loading ||
                          !(this.context.value.savingsDate < Date.now())
                            ? {opacity: 0.5}
                            : {},
                        ]}
                        onPress={async () => {
                          await this.changePeriod();
                          this.context.setValue({
                            isTransactionActive: true,
                            isSavingsTransaction: true,
                            transactionData: {
                              command: 'transfer',
                              toAccountId: this.context.value.accountId,
                              label: 'Withdraw Savings',
                              amount: epsilonRound(
                                this.context.value.balancesSavings[0] -
                                  '0.0005' /
                                    this.context.value.usdConversion[0],
                                8,
                              ),
                              tokenId: null,
                              token: blockchain.tokens[0].symbol,
                              gas: epsilonRound(
                                '0.0005' / this.context.value.usdConversion[0],
                                8,
                              ), // Fixed Cost in USD we multiply by 5 to avoid error
                              tokenGas: blockchain.tokens[0].symbol,
                            },
                          });
                        }}>
                        <Text
                          style={{
                            color: 'white',
                            fontSize: 18,
                            fontWeight: 'bold',
                          }}>
                          {!(this.context.value.savingsDate < Date.now())
                            ? formatDate(
                                new Date(this.context.value.savingsDate),
                              )
                            : this.state.loading
                            ? 'Withdrawing...'
                            : 'Withdraw Now'}
                        </Text>
                      </Pressable>
                    </View>
                  </React.Fragment>
                )}
              </View>
            </Fragment>
          ) : (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                width: '90%',
                height: '100%',
              }}>
              <Text
                style={[
                  GlobalStyles.exoTitle,
                  {
                    textAlign: 'center',
                    fontSize: 24,
                    paddingBottom: 20,
                  },
                ]}>
                Create Savings Account
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
                  onPress={() => this.createAccount()}>
                  <Text style={[GlobalStyles.buttonText]}>
                    {this.state.loading ? 'Creating...' : 'Create Account'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }
}
