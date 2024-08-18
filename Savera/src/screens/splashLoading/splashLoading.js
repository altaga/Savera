// Basic Imports
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { Component } from 'react';
import { Dimensions, Image, View } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import logoSplash from '../../assets/logoHeader.png';
import GlobalStyles from '../../styles/styles';
import ContextModule from '../../utils/contextModule';
import { getAsyncStorageValue } from '../../utils/utils';

class SplashLoading extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  static contextType = ContextModule;

  async componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      // DEBUG ONLY
      //await this.erase()
      console.log(this.props.route.name);
      const accountId = await getAsyncStorageValue('accountId');
      const publicKey = await getAsyncStorageValue('publicKey');
      const balances = await getAsyncStorageValue('balances');
      const activeTokens = await getAsyncStorageValue('activeTokens');
      // Savings
      const accountIdSavings = await getAsyncStorageValue('accountIdSavings');
      const publicKeySavings = await getAsyncStorageValue('publicKeySavings');
      const balancesSavings = await getAsyncStorageValue('balancesSavings');
      const activeTokensSavings = await getAsyncStorageValue(
        'activeTokensSavings',
      );
      const savingsActive = await getAsyncStorageValue('savingsActive');
      const periodSelected = await getAsyncStorageValue('periodSelected');
      const protocolSelected = await getAsyncStorageValue('protocolSelected');
      const savingsDate = await getAsyncStorageValue('savingsDate');
      const percentage = await getAsyncStorageValue('percentage');
      // Cards
      const accountIdCard = await getAsyncStorageValue('accountIdCard');
      const publicKeyCard = await getAsyncStorageValue('publicKeyCard');
      const balancesCard = await getAsyncStorageValue('balancesCard');
      const activeTokensCard = await getAsyncStorageValue('activeTokensCard');
      const usdConversion = await getAsyncStorageValue('usdConversion');
      this.context.setValue({
        accountId: accountId ?? this.context.value.accountId,
        publicKey: publicKey ?? this.context.value.publicKey,
        balances: balances ?? this.context.value.balances,
        activeTokens: activeTokens ?? this.context.value.activeTokens,
        // Savings
        accountIdSavings:
          accountIdSavings ?? this.context.value.accountIdSavings,
        publicKeySavings:
          publicKeySavings ?? this.context.value.publicKeySavings,
        balancesSavings: balancesSavings ?? this.context.value.balancesSavings,
        activeTokensSavings:
          activeTokensSavings ?? this.context.value.activeTokensSavings,
        savingsActive: savingsActive !== null ? true : false,
        periodSelected: periodSelected ?? this.context.value.periodSelected,
        protocolSelected:
          protocolSelected ?? this.context.value.protocolSelected,
        savingsDate: savingsDate ?? this.context.value.savingsDate,
        percentage: percentage ?? this.context.value.percentage,
        // Cards
        accountIdCard: accountIdCard ?? this.context.value.accountIdCard,
        publicKeyCard: publicKeyCard ?? this.context.value.publicKeyCard,
        balancesCard: balancesCard ?? this.context.value.balancesCard,
        activeTokensCard:
          activeTokensCard ?? this.context.value.activeTokensCard,
        usdConversion: usdConversion ?? this.context.value.usdConversion,
      });
      if (accountId) {
        //this.props.navigation.navigate('Lock');
        this.props.navigation.navigate('Main');
      } else {
        this.props.navigation.navigate('Setup');
      }
    });
    this.props.navigation.addListener('blur', async () => {});
  }

  async erase() {
    // Debug Only
    try {
      await EncryptedStorage.clear();
      await AsyncStorage.clear();
    } catch (error) {
      console.log(error);
    }
  }

  render() {
    return (
      <View style={[GlobalStyles.container, {justifyContent: 'center'}]}>
        <Image
          resizeMode="contain"
          source={logoSplash}
          alt="Main Logo"
          style={{
            width: Dimensions.get('window').width,
          }}
        />
      </View>
    );
  }
}

export default SplashLoading;
