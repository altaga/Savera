import {ethers, Wallet} from 'ethers';
import React, {Component, Fragment} from 'react';
import {
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import GlobalStyles, {
  main,
  mainColor,
  secondaryColor,
} from '../../../styles/styles';
import {blockchain, refreshRate} from '../../../utils/constants';
import ContextModule from '../../../utils/contextModule';
import {
  decrypt,
  getAsyncStorageValue,
  getEncryptedStorageValue,
  removeDuplicatesByKey,
  setAsyncStorageValue,
} from '../../../utils/utils';

import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {abiMonoChainChat} from '../../../contracts/monoChainChat';
import Cam from '../components/cam';

const baseTab4State = {
  loading: false,
  scanner: false,
  publicKey: '',
};

class Tab4 extends Component {
  constructor(props) {
    super(props);
    this.state = baseTab4State;
    this.provider = new ethers.providers.JsonRpcProvider(
      'https://mainnet.hashio.io/api',
    );
    this.controller = new AbortController();
  }
  static contextType = ContextModule;

  async componentDidMount() {
    const refreshCheck = Date.now();
    const lastRefresh = await this.getLastRefreshChat();
    if (refreshCheck - lastRefresh >= refreshRate) {
      // Delete this multiplier
      console.log('Refreshing...');
      await setAsyncStorageValue({lastRefreshChat: Date.now()});
      await this.refresh();
    } else {
      console.log(
        `Next refresh Available: ${Math.round(
          (refreshRate - (refreshCheck - lastRefresh)) / 1000,
        )} Seconds`,
      );
    }
  }

  async getMessages() {
    const chatContract = new ethers.Contract(
      blockchain.monoChainChat,
      abiMonoChainChat,
      this.provider,
    );
    const counterByAddresses = await chatContract.chatCounter(
      this.context.value.publicKey,
    );
    // Chat Counters
    const chatCounter = counterByAddresses.toNumber();
    console.log(chatCounter);
    let memoryChatCounter = await getAsyncStorageValue('memoryChatCounter');
    if (memoryChatCounter === null) {
      console.log('memoryChatCounters is null');
      setAsyncStorageValue({memoryChatCounter: 0});
      memoryChatCounter = 0;
    }
    let memoryMessages = await getAsyncStorageValue('memoryMessages');
    if (memoryMessages === null) {
      console.log('memoryMessages is null');
      setAsyncStorageValue({memoryMessages: []});
      memoryMessages = [];
    }
    if (chatCounter === 0) {
      console.log('Chat Counter is 0');
      await setAsyncStorageValue({
        chatGeneral: [],
        memoryMessages: [],
        memoryChatCounter: 0,
      });
      this.context.setValue({
        chatGeneral: [],
        memoryMessages: [],
        memoryChatCounter: 0,
      });
    }
    let messages = memoryMessages;
    if (chatCounter > memoryChatCounter) {
      // Avoid fetching if there are no messages in the chat
      for (let i = memoryChatCounter; chatCounter > i; i++) {
        const message = await chatContract.chatHistory(
          this.context.value.publicKey,
          i,
        );
        console.log(message);
        let myJson;
        if (
          this.context.value.publicKey.toLowerCase() ===
          message.to.toLowerCase()
        ) {
          myJson = {
            from: message.from,
            to: message.to,
            message: decrypt(
              message.messTo,
              this.context.value.publicKey,
              message.iv,
            ),
            amount: ethers.utils.formatUnits(message.amount, 6),
            blocktime: message.blocktime.toNumber() * 1000,
            index: i,
          };
          messages.push(myJson);
        } else if (
          this.context.value.publicKey.toLowerCase() ===
          message.from.toLowerCase()
        ) {
          myJson = {
            from: message.from,
            to: message.to,
            message: decrypt(
              message.messFrom,
              this.context.value.publicKey,
              message.iv,
            ),
            amount: ethers.utils.formatUnits(message.amount, 6),
            blocktime: message.blocktime.toNumber() * 1000,
            index: i,
          };
          messages.push(myJson);
        }
      }
      console.log(messages);
      // This function can be optimized
      const chat = messages
        .sort((a, b) => a.blocktime - b.blocktime)
        .map((x, _, arr) => {
          let json = {};
          if (
            x.from.toLowerCase() === this.context.value.publicKey.toLowerCase()
          ) {
            json['address'] = x.to;
          } else {
            json['address'] = x.from;
          }
          json['messages'] = arr.filter(
            y => y.to === json['address'] || y.from === json['address'],
          );
          json['messages'] = removeDuplicatesByKey(
            [...json['messages']],
            'blocktime',
          );
          json['timestamp'] = x.blocktime;
          return json;
        });
      let chatGeneral = removeDuplicatesByKey(chat, 'address');
      chatGeneral = chatGeneral.sort((a, b) => b.timestamp - a.timestamp);
      await setAsyncStorageValue({chatGeneral});
      await setAsyncStorageValue({memoryMessage: messages});
      await setAsyncStorageValue({memoryChatCounter: chatCounter});
      this.context.setValue({
        chatGeneral,
      });
    } else {
      ToastAndroid.show('No new messages', ToastAndroid.SHORT);
    }
  }

  async refresh() {
    await this.setStateAsync({loading: true});
    await this.getMessages();
    await this.setStateAsync({loading: false});
  }

  async getLastRefreshChat() {
    try {
      const lastRefreshChat = await getAsyncStorageValue('lastRefreshChat');
      if (lastRefreshChat === null) throw 'Set First Date';
      return lastRefreshChat;
    } catch (err) {
      await setAsyncStorageValue({lastRefreshChat: 0});
      return 0;
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

  render() {
    return (
      <Fragment>
        {!this.state.scanner && (
          <Fragment>
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  progressBackgroundColor={mainColor}
                  refreshing={this.state.loading}
                  onRefresh={async () => {
                    await setAsyncStorageValue({
                      lastRefreshCard: Date.now().toString(),
                    });
                    await this.refresh();
                  }}
                />
              }
              style={GlobalStyles.tab3Container}
              contentContainerStyle={[
                GlobalStyles.tab3ScrollContainer,
                {
                  height: 'auto',
                },
              ]}>
              {this.context.value.chatGeneral.map((chat, i) => (
                <TouchableOpacity
                  key={i}
                  onLongPress={() => {
                    Linking.openURL(
                      'https://hashscan.io/mainnet/account/' + chat.address,
                    );
                  }}
                  onPress={() => {
                    this.props.navigation.navigate('Chat', {
                      address: chat.address,
                    });
                  }}
                  activeOpacity={0.6}
                  style={{
                    width: '100%',
                    height: 'auto',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: 'row',
                    marginTop: 25,
                  }}>
                  <View
                    style={{
                      backgroundColor: '#' + chat.address.substring(2, 10),
                      width: 50,
                      height: 50,
                      borderRadius: 50,
                      marginHorizontal: 20,
                    }}
                  />
                  <View
                    style={{
                      width: '100%',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                    }}>
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 18,
                        fontWeight: 'bold',
                      }}>
                      {' '}
                      {chat.address.substring(0, 12)}
                      {'...'}
                      {chat.address.substring(
                        chat.address.length - 10,
                        chat.address.length,
                      )}
                    </Text>
                    {chat.messages.length > 0 && (
                      <Text
                        style={{
                          color: '#cccccc',
                          fontSize: 14,
                          fontWeight: 'bold',
                        }}>
                        {' '}
                        {chat.messages[
                          chat.messages.length - 1
                        ].message.substring(0, 30)}
                        {chat.messages[chat.messages.length - 1].message
                          .length > 30
                          ? '...'
                          : ''}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => this.setState({scanner: true})}
              style={[
                GlobalStyles.buttonStyle,
                {
                  position: 'absolute',
                  bottom: 25,
                  right: 25,
                  width: 64,
                  height: 'auto',
                  aspectRatio: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 20,
                },
              ]}>
              <MaterialIcons
                style={{transform: [{rotate: '90deg'}, {scaleY: 1.4}]}}
                name="chat-bubble"
                size={22}
                color={'white'}
              />
              <FontAwesome5
                style={{
                  position: 'absolute',
                  paddingLeft: 5.5,
                  paddingTop: 1.5,
                }}
                name="plus"
                size={10}
                color={mainColor}
              />
            </Pressable>
          </Fragment>
        )}
        {this.state.scanner && (
          <View
            style={[
              {height: main, justifyContent: 'center', alignItems: 'center'},
            ]}>
            <View>
              <Text style={{color: 'white', fontSize: 28}}>Scan Address</Text>
            </View>
            <View
              style={{
                height: Dimensions.get('screen').height * 0.5,
                width: Dimensions.get('screen').width * 0.8,
                marginVertical: 20,
                borderColor: secondaryColor,
                borderWidth: 5,
                borderRadius: 10,
              }}>
              <Cam
                callbackAddress={async e => {
                  await this.setStateAsync({
                    scanner: false,
                  });
                  const chatGeneral = [...this.context.value.chatGeneral];
                  chatGeneral.unshift({
                    address: e,
                    messages: [],
                    timestamp: Date.now(),
                  });
                  this.context.setValue({chatGeneral}, () =>
                    this.props.navigation.navigate('Chat', {
                      address: e,
                    }),
                  );
                }}
              />
            </View>
            <Pressable
              style={[GlobalStyles.buttonCancelStyle]}
              onPress={async () => {
                await this.setStateAsync({
                  scanner: false,
                });
              }}>
              <Text style={GlobalStyles.buttonCancelText}>Cancel</Text>
            </Pressable>
          </View>
        )}
      </Fragment>
    );
  }
}

export default Tab4;
