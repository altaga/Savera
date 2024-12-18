import {ethers, Wallet} from 'ethers';
import React, {Component} from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  Modal,
  NativeEventEmitter,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Renders from '../../assets/logoHeader.png';
import Title from '../../assets/title.png';
import {abiMonoChainChat} from '../../contracts/monoChainChat';
import GlobalStyles, {
  header,
  main,
  mainColor,
  secondaryColor,
} from '../../styles/styles';
import {blockchain, USDCicon} from '../../utils/constants';
import ContextModule from '../../utils/contextModule';
import {
  decrypt,
  encrypt,
  getAsyncStorageValue,
  getEncryptedStorageValue,
  removeDuplicatesByKey,
  setAsyncStorageValue,
} from '../../utils/utils';
import {abiERC20} from '../../contracts/erc20';

const chatBaseState = {
  publicKey: '',
  loading: false,
  chainSelectorVisible: false,
  usdcVisible: false,
  inputHeight: 'auto',
  message: '',
  amount: '',
};

export default class Chat extends Component {
  constructor(props) {
    super(props);
    this.state = chatBaseState;
    this.provider = new ethers.providers.JsonRpcProvider(
      'https://mainnet.hashio.io/api',
    );
    this.controller = new AbortController();
    this.EventEmitter = new NativeEventEmitter();
    this.scrollView = null;
    this.refresh = null;
  }

  static contextType = ContextModule;

  async componentDidMount() {
    this.props.navigation.addListener('focus', async () => {
      console.log(this.props.route.name);
      this.scrollView.scrollToEnd({animated: true});
      this.refresh = setInterval(async () => {
        await this.getMessages();
      }, 10000);
    });
    this.props.navigation.addListener('blur', async () => {
      this.setState(chatBaseState);
      this.EventEmitter.removeAllListeners('refresh');
      this.refresh && clearInterval(this.refresh);
    });
  }

  componentWillUnmount() {
    this.EventEmitter.removeAllListeners('refresh');
    this.refresh && clearInterval(this.refresh);
  }

  async sendMessage() {
    this.setState({loading: true});
    const to = this.props.route.params?.address;
    const mnemonic = await getEncryptedStorageValue('mnemonic');
    const wallet = Wallet.fromMnemonic(mnemonic);
    const signer = wallet.connect(this.provider);
    const [iv, messFrom] = await encrypt(
      this.state.message,
      this.context.value.publicKey,
    );
    const [_, messTo] = await encrypt(this.state.message, to, iv);
    const chat = new ethers.Contract(
      blockchain.monoChainChat,
      abiMonoChainChat,
      signer,
    );
    const usdc = new ethers.Contract(
      blockchain.tokens[1].evmAddress,
      abiERC20,
      signer,
    );
    const amount = ethers.utils.parseUnits(
      this.state.amount === '' ? '0' : this.state.amount,
      6,
    );
    const tx = await chat.addMessage(to, amount, messFrom, messTo, iv);
    await tx.wait();
    if (amount.gt(ethers.BigNumber.from(0))) {
      const tx2 = await usdc.transfer(
        to,
        ethers.utils.parseUnits(this.state.amount, 6),
      );
      await tx2.wait();
    }
    this.setState(chatBaseState);
    Keyboard.dismiss();
    await setAsyncStorageValue({lastRefreshChat: Date.now()});
    this.getMessages();
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
    let messages = memoryMessages;
    if (chatCounter > memoryChatCounter) {
      // Avoid fetching if there are no messages in the chat
      for (let i = 0; chatCounter > i; i++) {
        const message = await chatContract.chatHistory(
          this.context.value.publicKey,
          i,
        );
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
      this.scrollView.scrollToEnd({animated: true});
    } else {
      //ToastAndroid.show('No new messages', ToastAndroid.SHORT);
    }
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
      <SafeAreaView style={GlobalStyles.container}>
        <View style={[GlobalStyles.headerMain]}>
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
        <Modal
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
          visible={this.state.usdcVisible}
          transparent={true}
          animationType="slide">
          <View
            style={{
              height: Dimensions.get('window').height,
              width: Dimensions.get('window').width,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
            }}>
            <View
              style={{
                marginTop: Dimensions.get('window').height * 0.35,
                height: Dimensions.get('window').height * 0.3,
                width: '100%',
                justifyContent: 'space-around',
                alignItems: 'center',
                borderWidth: 2,
                borderRadius: 25,
                borderColor: mainColor,
                backgroundColor: '#000000',
              }}>
              <Text style={GlobalStyles.formTitleCard}>USDC Amount</Text>
              <View
                style={{
                  width: Dimensions.get('screen').width,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                }}>
                <View style={{width: '100%'}}>
                  <TextInput
                    onPressOut={() =>
                      this.scrollView.scrollToEnd({animated: true})
                    }
                    onChange={() =>
                      this.scrollView.scrollToEnd({animated: true})
                    }
                    onFocus={() =>
                      this.scrollView.scrollToEnd({animated: true})
                    }
                    style={[GlobalStyles.input]}
                    keyboardType="decimal-pad"
                    value={this.state.amount}
                    onChangeText={amount => {
                      this.setState({amount});
                    }}
                  />
                </View>
              </View>
              <Pressable
                onPress={() => {
                  this.setState({usdcVisible: false});
                  this.scrollView.scrollToEnd({animated: true});
                }}
                style={[GlobalStyles.buttonStyle, {marginBottom: 12}]}>
                <Text
                  style={{
                    color: 'white',
                    textAlign: 'center',
                    textAlignVertical: 'center',
                    fontFamily: 'Exo2-Regular',
                    fontSize: 24,
                  }}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Text
          style={{
            position: 'absolute',
            top: header,
            height: 40,
            fontSize: 16,
            color: 'white',
            textAlign: 'center',
          }}>
          {'To: '}
          {this.props.route.params?.address.substring(0, 12)}
          {'...'}
          {this.props.route.params?.address.substring(
            this.props.route.params?.address.length - 10,
            this.props.route.params?.address.length,
          )}
        </Text>
        <ScrollView
          ref={view => {
            this.scrollView = view;
          }}
          showsVerticalScrollIndicator={false}
          style={{
            height: main,
            width: Dimensions.get('window').width,
            marginTop: header + 40,
          }}
          contentContainerStyle={[
            GlobalStyles.tab3ScrollContainer,
            {
              height: 'auto',
              paddingHorizontal: 10,
            },
          ]}>
          {this.context.value.chatGeneral
            .filter(
              x =>
                x.address.toLowerCase() ===
                this.props.route.params?.address.toLowerCase(),
            )[0]
            .messages.map((message, i, array) => {
              let flag = false;
              let crosschainFlag = false;
              if (i !== 0) {
                flag = message.from !== array[i - 1].from;
                crosschainFlag = message.fromChainId !== message.toChainId;
              }
              return (
                <LinearGradient
                  angle={90}
                  useAngle={true}
                  key={i}
                  style={{
                    marginTop: flag ? 15 : 5,
                    borderRadius: 10,
                    borderBottomRightRadius:
                      message.from.toLowerCase() ===
                      this.context.value.publicKey.toLowerCase()
                        ? 0
                        : 10,
                    borderBottomLeftRadius:
                      message.from.toLowerCase() ===
                      this.context.value.publicKey.toLowerCase()
                        ? 10
                        : 0,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    maxWidth: '80%',
                    alignSelf:
                      message.from.toLowerCase() ===
                      this.context.value.publicKey.toLowerCase()
                        ? 'flex-end'
                        : 'flex-start',
                  }}
                  colors={[
                    message.from.toLowerCase() ===
                    this.context.value.publicKey.toLowerCase()
                      ? mainColor + 'cc'
                      : secondaryColor + '40',
                    message.from.toLowerCase() ===
                    this.context.value.publicKey.toLowerCase()
                      ? mainColor + 'cc'
                      : secondaryColor + '40',
                  ]}>
                  <Text
                    style={{
                      color: 'white',
                      textAlign: 'justify',
                      marginBottom: 10,
                      fontSize: 16,
                    }}>
                    {message.message}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}>
                    {message.amount > 0 ? (
                      <Text style={{color: 'white', fontSize: 12}}>
                        {message.amount} USDC{' '}
                        {crosschainFlag ? 'with CCTP' : ''}
                      </Text>
                    ) : (
                      <View />
                    )}
                    <Text
                      style={{
                        color: '#cccccc',
                        alignSelf: 'flex-end',
                        fontSize: 12,
                        marginRight: -10,
                        marginBottom: -5,
                      }}>
                      {new Date(message.blocktime).toLocaleTimeString()}
                    </Text>
                  </View>
                </LinearGradient>
              );
            })}
        </ScrollView>
        {parseFloat(this.state.amount ?? '0') > 0 && (
          <View
            style={{
              marginTop: 14,
              width: '100%',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}>
            <Text style={{color: 'white', fontSize: 20}}>
              Amount Transferred: {this.state.amount} USDC
            </Text>
            {USDCicon}
          </View>
        )}
        <View
          style={[
            {
              height: 'auto',
              width: '100%',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 10,
            },
          ]}>
          <Pressable
            onPress={() => this.setState({usdcVisible: true})}
            style={{
              width: '10%',
              height: 'auto',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: mainColor,
              borderRadius: 50,
              aspectRatio: 1,
              marginBottom: 5,
            }}>
            <FontAwesome name="dollar" size={22} color="white" />
          </Pressable>
          <TextInput
            onPressOut={() => this.scrollView.scrollToEnd({animated: true})}
            onChange={() => this.scrollView.scrollToEnd({animated: true})}
            onFocus={() => this.scrollView.scrollToEnd({animated: true})}
            multiline
            onContentSizeChange={async event => {
              if (event.nativeEvent.contentSize.height < 120) {
                await this.setStateAsync({
                  inputHeight: event.nativeEvent.contentSize.height,
                });
                this.scrollView.scrollToEnd({animated: true});
              }
            }}
            style={[
              GlobalStyles.inputChat,
              {
                height: this.state.inputHeight,
              },
            ]}
            keyboardType="default"
            value={this.state.message}
            onChangeText={value => {
              this.setState({message: value});
            }}
          />
          <Pressable
            disabled={this.state.loading}
            onPress={async () => {
              await this.sendMessage();
            }}
            style={{
              width: '10%',
              height: 'auto',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: this.state.loading
                ? mainColor + '40'
                : mainColor,
              borderRadius: 50,
              aspectRatio: 1,
              marginBottom: 5,
            }}>
            <Ionicons
              name="send"
              size={22}
              color={this.state.loading ? 'gray' : 'white'}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}
