import {Button, Text, View} from 'react-native';
import React, {Component} from 'react';
import nodejs from 'nodejs-mobile-react-native';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }
  async componentDidMount() {
    nodejs.start('main.js');
    nodejs.channel.addListener(
      'message',
      msg => {
        console.log(msg);
      },
      this,
    );
    nodejs.channel.addListener(
      'mnemonic',
      msg => {
        console.log(msg);
      },
      this,
    );
    nodejs.channel.addListener(
      'transaction',
      msg => {
        console.log(msg);
      },
      this,
    );
    nodejs.channel.post('message', 'Hello World');
    nodejs.channel.post('mnemonic', null);
  }

  componentWillUnmount() {
    nodejs.channel.removeListener('message', this);
    nodejs.channel.removeListener('mnemonic', this);
    nodejs.stop();
  }
  render() {
    return (
      <View>
        <Text>App</Text>
        <Button
          title="Press"
          onPress={() => {
            console.log('Start');
            nodejs.channel.post('transaction', {
              fromAccountId: '0.0.6463073',
              privateKey:
                '3030020100300706052b8104000a04220420f5c47eddd9e05ae0f36372b8ba8029a38a91847aba184173ed8b83527a02bf65',
              amount: 1,
              toAccountId: '0.0.6475336',
            });
          }}
        />
      </View>
    );
  }
}
