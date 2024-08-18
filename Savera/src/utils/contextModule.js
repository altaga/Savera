// Basic Imports
import React from 'react';
import {blockchain} from './constants';

const ContextModule = React.createContext();

// Context Provider Component

class ContextProvider extends React.Component {
  // define all the values you want to use in the context
  constructor(props) {
    super(props);
    this.state = {
      value: {
        // Main Wallet
        accountId: null,
        publicKey: null,
        balances: blockchain.tokens.map(() => 0),
        activeTokens: blockchain.tokens.map(() => true),
        // Savings
        accountIdSavings: null,
        publicKeySavings: null,
        balancesSavings: blockchain.tokens.map(() => 0),
        activeTokensSavings: blockchain.tokens.map(() => true),
        // State Flag of Savings
        savingsActive: false,
        periodSelected: 1,
        protocolSelected: 1,
        savingsDate: 0,
        percentage: 0,
        // Card
        accountIdCard: null, // null
        publicKeyCard: null,
        balancesCard: blockchain.tokens.map(() => 0),
        activeTokensCard: blockchain.tokens.map(() => true),
        // Utils
        usdConversion: blockchain.tokens.map(() => 1),
        // Transaction Active
        isTransactionActive: false, // false
        isSavingsTransaction : false,
        transactionData: {
          command: '',
          toAccountId: '',
          label: '',
          amount: '0.0',
          token: blockchain.tokens[0].symbol,
          tokenId: '0.0.0',
          gas: '0.0',
          tokenGas: blockchain.tokens[0].symbol,
        },
      },
    };
  }

  setValue = (value, then = () => {}) => {
    this.setState(
      {
        value: {
          ...this.state.value,
          ...value,
        },
      },
      () => then(),
    );
  };

  render() {
    const {children} = this.props;
    const {value} = this.state;
    // Fill this object with the methods you want to pass down to the context
    const {setValue} = this;

    return (
      <ContextModule.Provider
        // Provide all the methods and values defined above
        value={{
          value,
          setValue,
        }}>
        {children}
      </ContextModule.Provider>
    );
  }
}

// Dont Change anything below this line

export {ContextProvider};
export const ContextConsumer = ContextModule.Consumer;
export default ContextModule;
